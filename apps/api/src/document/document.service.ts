import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";

export const PDF_QUEUE = "pdf-processing";
export const PDF_JOB_NAME = "process-pdf";

export type PdfJobData = {
  documentId: string;
  url: string;
};

export type DocumentSummary = {
  id: string;
  url: string;
  title: string | null;
  summary: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(PDF_QUEUE) private readonly pdfQueue: Queue,
  ) {}

  async createDocument(url: string) {
    const document = await this.prisma.db.document.create({
      data: { url, status: "PENDING" },
    });

    await this.pdfQueue.add(
      PDF_JOB_NAME,
      { documentId: document.id, url } satisfies PdfJobData,
      {
        jobId: document.id,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    );

    return { id: document.id, status: document.status };
  }

  async getJobProgress(documentId: string): Promise<number> {
    const job = await this.pdfQueue.getJob(documentId);
    if (!job) return 0;

    const state = await job.getState();
    if (state === "completed") return 100;

    return typeof job.progress === "number" ? job.progress : 0;
  }

  async getDocument(id: string): Promise<DocumentSummary> {
    const document = await this.prisma.db.document.findUnique({
      where: { id },
      select: {
        id: true,
        url: true,
        title: true,
        summary: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    return document;
  }
}
