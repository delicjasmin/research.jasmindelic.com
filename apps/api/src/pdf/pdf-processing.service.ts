import { fork, type ChildProcess } from "node:child_process";
import path from "node:path";
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { countDocumentChunks, getDirectPrisma } from "database";
import { PrismaService } from "../prisma/prisma.service";
import { isPdfRunnerMessage, type PdfRunnerMessage } from "./pdf-messages";
import { embeddingProgress } from "./pdf-messages";

export type PdfProcessListener = {
  progress: (documentId: string, progress: number) => void;
  ready: (documentId: string, title: string | null, summary: string) => void;
  error: (documentId: string, message: string) => void;
};

@Injectable()
export class PdfProcessingService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(PdfProcessingService.name);
  private readonly children = new Map<string, ChildProcess>();
  private readonly progress = new Map<string, number>();
  private listener: PdfProcessListener | null = null;

  constructor(private readonly prisma: PrismaService) {}

  setListener(listener: PdfProcessListener): void {
    this.listener = listener;
  }

  async onApplicationBootstrap(): Promise<void> {
    const unfinished = await this.prisma.db.document.findMany({
      where: { status: { in: ["PENDING", "PROCESSING"] } },
      select: { id: true },
    });

    for (const document of unfinished) {
      this.start(document.id);
    }

    if (unfinished.length === 0) {
      this.logger.log("No unfinished PDF documents to resume");
    }
  }

  onModuleDestroy(): void {
    for (const child of this.children.values()) {
      child.kill();
    }
  }

  start(documentId: string): void {
    if (this.children.has(documentId)) return;

    const child = fork(path.join(__dirname, "pdf-runner.js"), [documentId], {
      execArgv: [],
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    });
    this.children.set(documentId, child);
    this.logger.log(`Started PDF runner ${child.pid} for ${documentId}`);

    child.on("message", (message: unknown) => {
      if (!isPdfRunnerMessage(message)) return;
      this.handleMessage(message);
    });

    child.on("exit", (code) => {
      this.children.delete(documentId);
      if (code !== 0) {
        this.logger.warn(
          `PDF runner for ${documentId} exited with code ${code}`,
        );
      }
    });

    child.on("error", (err) => {
      this.children.delete(documentId);
      this.logger.error(`PDF runner failed to start for ${documentId}`, err);
    });
  }

  async progressFor(documentId: string): Promise<number> {
    const live = this.progress.get(documentId);
    if (live !== undefined && live > 0) return live;

    const db = await getDirectPrisma();
    const counts = await countDocumentChunks(db, documentId);
    if (counts.total <= 0) return 0;
    return embeddingProgress(counts.total - counts.pending, counts.total);
  }

  private handleMessage(message: PdfRunnerMessage): void {
    if (message.type === "progress") {
      this.progress.set(message.documentId, message.progress);
      this.listener?.progress(message.documentId, message.progress);
      return;
    }

    this.progress.delete(message.documentId);
    if (message.type === "ready") {
      this.listener?.ready(message.documentId, message.title, message.summary);
      return;
    }

    this.listener?.error(message.documentId, message.message);
  }
}
