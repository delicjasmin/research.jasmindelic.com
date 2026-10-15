import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job, UnrecoverableError } from "bullmq";
import { PDFParse } from "pdf-parse";
import { createEmbeddings, summarize } from "ai";
import {
  MAX_CHUNKS,
  MAX_PDF_PAGES,
  MAX_PDF_SIZE_BYTES,
  countDocumentChunks,
  getDirectPrisma,
  insertDocumentChunkBatch,
  listDocumentChunkTexts,
  listPendingChunkEmbeddings,
  setChunkEmbeddings,
  type PrismaClient,
} from "database";
import {
  PDF_JOB_NAME,
  PDF_QUEUE,
  type PdfJobData,
  type PdfJobResult,
} from "./pdf.types.js";

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;
const INSERT_BATCH = 50;
const EMBED_BATCH = 64;
const SUMMARY_SAMPLE_CHARS = 24_000;

type PageText = { text: string; pageNumber: number };
type TextChunk = { content: string; pageNumber: number };

function sanitizeText(text: string): string {
  return text.replaceAll("\u0000", "");
}

function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    const slice = text.slice(offset, offset + CHUNK_SIZE).trim();
    if (slice.length > 50) chunks.push(slice);
    offset += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

function chunkPages(pageTexts: PageText[]): TextChunk[] {
  const chunks: TextChunk[] = [];
  for (const { text, pageNumber } of pageTexts) {
    if (!text.trim()) continue;
    if (text.length <= CHUNK_SIZE) {
      chunks.push({ content: text.trim(), pageNumber });
    } else {
      for (const content of splitIntoChunks(text)) {
        chunks.push({ content, pageNumber });
      }
    }
  }
  return chunks;
}

function embeddingProgress(embedded: number, total: number): number {
  if (total <= 0) return 30;
  return Math.min(90, 30 + Math.floor((embedded / total) * 60));
}

function sampleChunkText(
  chunks: Array<{ content: string; pageNumber: number }>,
): string {
  if (chunks.length === 0) return "";

  const targetCount = Math.min(chunks.length, 24);
  const indexes: number[] = [];
  for (let i = 0; i < targetCount; i++) {
    const index =
      targetCount === 1
        ? 0
        : Math.round((i * (chunks.length - 1)) / (targetCount - 1));
    indexes.push(index);
  }

  let sample = "";
  for (const index of [...new Set(indexes)].sort((a, b) => a - b)) {
    const chunk = chunks[index];
    if (!chunk) continue;
    const piece = chunk.content.trim();
    if (!piece) continue;
    const block = `[Page ${chunk.pageNumber}]\n${piece}`;
    const next = sample ? `${sample}\n\n${block}` : block;
    if (next.length > SUMMARY_SAMPLE_CHARS) {
      if (!sample) return block.slice(0, SUMMARY_SAMPLE_CHARS);
      break;
    }
    sample = next;
  }
  return sample;
}

function titleFromChunks(
  chunks: Array<{ content: string }>,
  fallback: string,
): string {
  for (const chunk of chunks) {
    const line = chunk.content
      .split("\n")
      .map((part) => part.trim())
      .find((part) => part.length > 10);
    if (line) return line.slice(0, 120);
  }
  return fallback;
}

function isTerminalAttempt(job: Job, err: unknown): boolean {
  if (err instanceof UnrecoverableError) return true;
  return job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
}

async function failDocument(
  db: PrismaClient,
  documentId: string,
  message: string,
): Promise<void> {
  await db.document.update({
    where: { id: documentId },
    data: { status: "FAILED", errorMessage: message },
  });
}

@Processor(PDF_QUEUE)
export class PdfProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfProcessor.name);

  async process(
    job: Job<PdfJobData, PdfJobResult, typeof PDF_JOB_NAME>,
  ): Promise<PdfJobResult> {
    const { documentId, url } = job.data;
    const db = await getDirectPrisma();
    this.logger.log(`Processing PDF for document ${documentId}`);

    try {
      await db.document.update({
        where: { id: documentId },
        data: { status: "PROCESSING" },
      });

      if (!job.data.chunksReady) {
        await this.prepareChunks(job, db);
      }

      const counts = await countDocumentChunks(db, documentId);
      if (counts.total === 0) {
        throw new UnrecoverableError("PDF contains no extractable text");
      }

      const pending = await listPendingChunkEmbeddings(db, documentId);
      let embedded = counts.total - pending.length;
      await job.updateProgress(embeddingProgress(embedded, counts.total));
      this.logger.log(
        `Embedding ${pending.length} of ${counts.total} chunks for document ${documentId}`,
      );

      for (let i = 0; i < pending.length; i += EMBED_BATCH) {
        const batch = pending.slice(i, i + EMBED_BATCH);
        const vectors = await createEmbeddings(
          batch.map((chunk) => chunk.content),
        );
        if (vectors.length !== batch.length) {
          throw new Error("Embedding response did not match the chunk batch");
        }

        await setChunkEmbeddings(
          db,
          batch.map((chunk, index) => {
            const embedding = vectors[index];
            if (!embedding) {
              throw new Error("Missing embedding for chunk");
            }
            return { id: chunk.id, embedding };
          }),
        );

        embedded += batch.length;
        await job.updateProgress(embeddingProgress(embedded, counts.total));
      }

      await job.updateProgress(92);

      const existing = await db.document.findUnique({
        where: { id: documentId },
        select: { summary: true },
      });

      if (existing?.summary) {
        await db.document.update({
          where: { id: documentId },
          data: { status: "READY", errorMessage: null },
        });
        await job.updateProgress(100);
        this.logger.log(`Finished processing document ${documentId}`);
        return {
          documentId,
          summary: existing.summary,
          chunkCount: counts.total,
        };
      }

      const stored = await listDocumentChunkTexts(db, documentId);
      const summary = await summarize(sampleChunkText(stored));
      const title = titleFromChunks(stored, url);

      await db.document.update({
        where: { id: documentId },
        data: { summary, title, status: "READY", errorMessage: null },
      });

      await job.updateProgress(100);
      this.logger.log(`Finished processing document ${documentId}`);
      return { documentId, summary, chunkCount: counts.total };
    } catch (err) {
      if (isTerminalAttempt(job, err)) {
        const message =
          err instanceof Error ? err.message : "PDF processing failed";
        await failDocument(db, documentId, message);
      }
      throw err;
    }
  }

  private async prepareChunks(
    job: Job<PdfJobData, PdfJobResult, typeof PDF_JOB_NAME>,
    db: PrismaClient,
  ): Promise<void> {
    const { documentId, url } = job.data;

    const response = await fetch(url);
    if (!response.ok) {
      throw new UnrecoverableError(
        `Failed to fetch PDF: ${response.statusText}`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_PDF_SIZE_BYTES) {
      const maxMb = Math.round(MAX_PDF_SIZE_BYTES / (1024 * 1024));
      throw new UnrecoverableError(`PDF exceeds the ${maxMb} MB size limit`);
    }

    await db.document.update({
      where: { id: documentId },
      data: { fileSizeBytes: buffer.length },
    });
    await job.updateProgress(8);

    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    const pageTexts: PageText[] = textResult.pages.map((page, index) => ({
      text: sanitizeText(page.text),
      pageNumber: index + 1,
    }));

    if (pageTexts.length > MAX_PDF_PAGES) {
      throw new UnrecoverableError(
        `PDF exceeds the ${MAX_PDF_PAGES} page limit (${pageTexts.length} pages)`,
      );
    }

    await db.document.update({
      where: { id: documentId },
      data: { pageCount: pageTexts.length },
    });

    const chunks = chunkPages(pageTexts);
    if (chunks.length === 0) {
      throw new UnrecoverableError("PDF contains no extractable text");
    }
    if (chunks.length > MAX_CHUNKS) {
      throw new UnrecoverableError(
        `PDF exceeds the ${MAX_CHUNKS} chunk limit (${chunks.length} chunks)`,
      );
    }

    await job.updateProgress(15);
    this.logger.log(
      `Storing ${chunks.length} chunks from ${pageTexts.length} pages`,
    );

    await db.documentChunk.deleteMany({ where: { documentId } });

    const rows = chunks.map((chunk) => ({
      id: randomUUID(),
      documentId,
      pageNumber: chunk.pageNumber,
      content: chunk.content,
    }));

    let inserted = 0;
    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const batch = rows.slice(i, i + INSERT_BATCH);
      await insertDocumentChunkBatch(db, batch);
      inserted += batch.length;
      const progress = 15 + Math.floor((inserted / rows.length) * 15);
      await job.updateProgress(Math.min(progress, 30));
    }

    await job.updateData({ ...job.data, chunksReady: true });
  }
}
