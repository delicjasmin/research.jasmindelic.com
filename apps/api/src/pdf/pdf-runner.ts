import "dotenv/config";
import { randomUUID } from "node:crypto";
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
import type { PdfRunnerMessage } from "./pdf-messages";
import { embeddingProgress } from "./pdf-messages";

const MAX_ATTEMPTS = 3;
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;
const INSERT_BATCH = 50;
const EMBED_BATCH = 64;
const SUMMARY_SAMPLE_CHARS = 24_000;

type PageText = { text: string; pageNumber: number };
type TextChunk = { content: string; pageNumber: number };
type Report = (progress: number) => Promise<void>;

class PermanentPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentPdfError";
  }
}

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

function titleFromDocumentText(text: string, fallback: string): string {
  return (
    text
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 10)
      ?.slice(0, 120) ?? fallback
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function notify(message: PdfRunnerMessage): Promise<void> {
  return new Promise((resolve) => {
    if (!process.send) {
      resolve();
      return;
    }
    process.send(message, () => resolve());
  });
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

async function prepareChunks(
  db: PrismaClient,
  documentId: string,
  url: string,
  report: Report,
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new PermanentPdfError(`Failed to fetch PDF: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_PDF_SIZE_BYTES) {
    const maxMb = Math.round(MAX_PDF_SIZE_BYTES / (1024 * 1024));
    throw new PermanentPdfError(`PDF exceeds the ${maxMb} MB size limit`);
  }

  await db.document.update({
    where: { id: documentId },
    data: { fileSizeBytes: buffer.length },
  });
  await report(8);

  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText();
  const pageTexts: PageText[] = textResult.pages.map((page, index) => ({
    text: sanitizeText(page.text),
    pageNumber: index + 1,
  }));
  const title = titleFromDocumentText(
    pageTexts.map((page) => page.text).join("\n"),
    url,
  );

  if (pageTexts.length > MAX_PDF_PAGES) {
    throw new PermanentPdfError(
      `PDF exceeds the ${MAX_PDF_PAGES} page limit (${pageTexts.length} pages)`,
    );
  }

  await db.document.update({
    where: { id: documentId },
    data: { pageCount: pageTexts.length, title },
  });

  const chunks = chunkPages(pageTexts);
  if (chunks.length === 0) {
    throw new PermanentPdfError("PDF contains no extractable text");
  }
  if (chunks.length > MAX_CHUNKS) {
    throw new PermanentPdfError(
      `PDF exceeds the ${MAX_CHUNKS} chunk limit (${chunks.length} chunks)`,
    );
  }

  await report(15);
  console.log(
    `Storing ${chunks.length} chunks from ${pageTexts.length} pages for ${documentId}`,
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
    await report(Math.min(progress, 30));
  }

  return title;
}

async function processOnce(
  db: PrismaClient,
  documentId: string,
  url: string,
  report: Report,
): Promise<void> {
  await db.document.update({
    where: { id: documentId },
    data: { status: "PROCESSING" },
  });

  const existingChunks = await countDocumentChunks(db, documentId);
  if (existingChunks.total === 0) {
    await prepareChunks(db, documentId, url, report);
  }

  const counts = await countDocumentChunks(db, documentId);
  if (counts.total === 0) {
    throw new PermanentPdfError("PDF contains no extractable text");
  }

  const pending = await listPendingChunkEmbeddings(db, documentId);
  let embedded = counts.total - pending.length;
  await report(embeddingProgress(embedded, counts.total));
  console.log(
    `Embedding ${pending.length} of ${counts.total} chunks for document ${documentId}`,
  );

  for (let i = 0; i < pending.length; i += EMBED_BATCH) {
    const batch = pending.slice(i, i + EMBED_BATCH);
    const vectors = await createEmbeddings(batch.map((chunk) => chunk.content));
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
    await report(embeddingProgress(embedded, counts.total));
  }

  await report(92);

  const existing = await db.document.findUnique({
    where: { id: documentId },
    select: { summary: true, title: true },
  });

  if (existing?.summary) {
    await db.document.update({
      where: { id: documentId },
      data: { status: "READY", errorMessage: null },
    });
    await report(100);
    await notify({
      type: "ready",
      documentId,
      title: existing.title,
      summary: existing.summary,
    });
    console.log(`Finished processing document ${documentId}`);
    return;
  }

  const stored = await listDocumentChunkTexts(db, documentId);
  const summary = await summarize(sampleChunkText(stored));
  const title = existing?.title ?? url;

  await db.document.update({
    where: { id: documentId },
    data: { summary, title, status: "READY", errorMessage: null },
  });

  await report(100);
  await notify({ type: "ready", documentId, title, summary });
  console.log(`Finished processing document ${documentId}`);
}

async function runWithRetries(
  db: PrismaClient,
  documentId: string,
  url: string,
): Promise<void> {
  const report: Report = async (progress) => {
    await notify({ type: "progress", documentId, progress });
  };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await processOnce(db, documentId, url, report);
      return;
    } catch (err) {
      const terminal =
        err instanceof PermanentPdfError || attempt >= MAX_ATTEMPTS;
      if (!terminal) {
        const waitMs = 5000 * 2 ** (attempt - 1);
        console.error(
          `PDF processing attempt ${attempt} failed for ${documentId}; retrying in ${waitMs}ms`,
          err,
        );
        await delay(waitMs);
        continue;
      }

      const message =
        err instanceof Error ? err.message : "PDF processing failed";
      await failDocument(db, documentId, message);
      await notify({ type: "error", documentId, message });
      throw err;
    }
  }
}

async function main(): Promise<void> {
  const documentId = process.argv[2];
  if (!documentId) {
    console.error("pdf-runner requires a document id");
    process.exit(1);
  }

  const db = await getDirectPrisma();
  let failed = false;
  try {
    const document = await db.document.findUnique({
      where: { id: documentId },
      select: { url: true },
    });
    if (!document) {
      throw new PermanentPdfError(`Document ${documentId} not found`);
    }
    await runWithRetries(db, documentId, document.url);
  } catch (err) {
    failed = true;
    console.error(`PDF processing failed for ${documentId}`, err);
  } finally {
    await db.$disconnect().catch(() => undefined);
  }
  process.exit(failed ? 1 : 0);
}

void main();
