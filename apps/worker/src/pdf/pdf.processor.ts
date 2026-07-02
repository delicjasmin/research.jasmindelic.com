import "dotenv/config";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job, UnrecoverableError } from "bullmq";
import { PDFParse } from "pdf-parse";
import { createEmbedding, summarize } from "ai";
import {
  MAX_PDF_PAGES,
  MAX_PDF_SIZE_BYTES,
  prisma,
  setChunkEmbedding,
} from "database";
import {
  PDF_JOB_NAME,
  PDF_QUEUE,
  type PdfJobData,
  type PdfJobResult,
} from "./pdf.types.js";

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

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

async function failDocument(documentId: string, message: string): Promise<void> {
  await prisma.document.update({
    where: { id: documentId },
    data: { status: "FAILED", errorMessage: message },
  });
}

@Processor(PDF_QUEUE)
export class PdfProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfProcessor.name);

  async process(job: Job<PdfJobData, PdfJobResult, typeof PDF_JOB_NAME>): Promise<PdfJobResult> {
    const { documentId, url } = job.data;
    this.logger.log(`Processing PDF for document ${documentId}`);

    try {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "PROCESSING" },
      });
      await job.updateProgress(10);

      const response = await fetch(url);
      if (!response.ok) {
        throw new UnrecoverableError(`Failed to fetch PDF: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > MAX_PDF_SIZE_BYTES) {
        const maxMb = Math.round(MAX_PDF_SIZE_BYTES / (1024 * 1024));
        throw new UnrecoverableError(`PDF exceeds the ${maxMb} MB size limit`);
      }

      await prisma.document.update({
        where: { id: documentId },
        data: { fileSizeBytes: buffer.length },
      });
      await job.updateProgress(25);

      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();

      const fullText = textResult.text;
      const pageTexts: Array<{ text: string; pageNumber: number }> =
        textResult.pages.map((p, i) => ({ text: p.text, pageNumber: i + 1 }));

      if (pageTexts.length > MAX_PDF_PAGES) {
        throw new UnrecoverableError(
          `PDF exceeds the ${MAX_PDF_PAGES} page limit (${pageTexts.length} pages)`,
        );
      }

      await prisma.document.update({
        where: { id: documentId },
        data: { pageCount: pageTexts.length },
      });
      await job.updateProgress(40);

      const chunks: Array<{ content: string; pageNumber: number }> = [];
      for (const { text, pageNumber } of pageTexts) {
        if (!text.trim()) continue;
        if (text.length <= CHUNK_SIZE) {
          chunks.push({ content: text.trim(), pageNumber });
        } else {
          for (const c of splitIntoChunks(text)) {
            chunks.push({ content: c, pageNumber });
          }
        }
      }

      this.logger.log(`Created ${chunks.length} chunks from ${pageTexts.length} pages`);

      const createdChunks = await Promise.all(
        chunks.map((chunk) =>
          prisma.documentChunk.create({
            data: { documentId, pageNumber: chunk.pageNumber, content: chunk.content },
          }),
        ),
      );
      await job.updateProgress(50);

      const EMBED_BATCH = 5;
      for (let i = 0; i < createdChunks.length; i += EMBED_BATCH) {
        const batch = createdChunks.slice(i, i + EMBED_BATCH);
        await Promise.all(
          batch.map(async (chunk) => {
            const embedding = await createEmbedding(chunk.content);
            await setChunkEmbedding(prisma, chunk.id, embedding);
          }),
        );
        const progress = 50 + Math.floor(((i + EMBED_BATCH) / createdChunks.length) * 30);
        await job.updateProgress(Math.min(progress, 80));
      }

      await job.updateProgress(82);
      const summary = await summarize(fullText);
      await job.updateProgress(92);

      const title =
        fullText
          .split("\n")
          .map((l) => l.trim())
          .find((l) => l.length > 10)
          ?.slice(0, 120) ?? url;

      await prisma.document.update({
        where: { id: documentId },
        data: { summary, title, status: "READY", errorMessage: null },
      });

      await job.updateProgress(100);
      this.logger.log(`Finished processing document ${documentId}`);

      return { documentId, summary, chunkCount: createdChunks.length };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "PDF processing failed";
      await failDocument(documentId, message);
      throw err;
    }
  }
}
