import "dotenv/config";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PDFParse } from "pdf-parse";
import { createEmbedding, summarize } from "ai";
import { prisma, setChunkEmbedding } from "database";
import { PDF_JOB_NAME, PDF_QUEUE, type PdfJobData, type PdfJobResult } from "./pdf.types.js";

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

@Processor(PDF_QUEUE)
export class PdfProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfProcessor.name);

  async process(job: Job<PdfJobData, PdfJobResult, typeof PDF_JOB_NAME>): Promise<PdfJobResult> {
    const { documentId, url } = job.data;
    this.logger.log(`Processing PDF for document ${documentId}`);

    await prisma.document.update({ where: { id: documentId }, data: { status: "PROCESSING" } });
    await job.updateProgress(10);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await job.updateProgress(25);

    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();

    const fullText = textResult.text;
    const pageTexts: Array<{ text: string; pageNumber: number }> = textResult.pages.map(
      (p, i) => ({ text: p.text, pageNumber: i + 1 }),
    );
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
      data: { summary, title, status: "READY" },
    });

    await job.updateProgress(100);
    this.logger.log(`Finished processing document ${documentId}`);

    return { documentId, summary, chunkCount: createdChunks.length };
  }
}
