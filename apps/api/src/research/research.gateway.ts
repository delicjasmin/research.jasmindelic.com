import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { QueueEvents } from "bullmq";
import { streamAnswer } from "ai";
import { SearchService } from "../search/search.service";
import {
  DocumentService,
  DocumentSummary,
  PDF_QUEUE,
} from "../document/document.service";
import {
  ConversationService,
  type MessageSource,
} from "../conversation/conversation.service";

type SubscribePayload = { documentId: string };
type AskPayload = {
  documentId: string;
  conversationId: string;
  question: string;
};

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
      .split(",")
      .map((o) => o.trim()),
    credentials: true,
  },
})
export class ResearchGateway
  implements OnGatewayInit, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(ResearchGateway.name);
  private queueEvents!: QueueEvents;

  constructor(
    private readonly searchService: SearchService,
    private readonly documentService: DocumentService,
    private readonly conversationService: ConversationService,
  ) {}

  afterInit() {
    this.logger.log("WebSocket gateway initialised");
  }

  onModuleInit() {
    this.queueEvents = new QueueEvents(PDF_QUEUE, {
      connection: {
        host: process.env.REDIS_HOST ?? "localhost",
        port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
      },
    });

    this.queueEvents.on("progress", ({ jobId, data }) => {
      const progress = typeof data === "number" ? data : 0;
      this.server
        .to(jobId)
        .emit("document:progress", { documentId: jobId, progress });
    });

    this.queueEvents.on("completed", ({ jobId }) => {
      void this.handleJobCompleted(jobId);
    });

    this.queueEvents.on("failed", ({ jobId, failedReason }) => {
      this.server.to(jobId).emit("document:error", {
        documentId: jobId,
        message: failedReason ?? "Processing failed",
      });
    });
  }

  private async handleJobCompleted(jobId: string): Promise<void> {
    try {
      const doc: DocumentSummary =
        await this.documentService.getDocument(jobId);
      const title = doc.title;
      const summary = doc.summary;
      this.server.to(jobId).emit("document:ready", {
        documentId: jobId,
        title,
        summary,
      });
    } catch (err) {
      this.logger.error(`Failed to fetch completed document ${jobId}`, err);
    }
  }

  async onModuleDestroy() {
    await this.queueEvents?.close();
  }

  @SubscribeMessage("subscribe-document")
  async handleSubscribe(
    @MessageBody() payload: SubscribePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { documentId } = payload;
    void client.join(documentId);
    this.logger.log(`Client ${client.id} subscribed to document ${documentId}`);

    try {
      const doc: DocumentSummary =
        await this.documentService.getDocument(documentId);

      if (doc.status === "READY") {
        client.emit("document:ready", {
          documentId,
          title: doc.title,
          summary: doc.summary ?? "",
        });
        return;
      }

      if (doc.status === "FAILED") {
        client.emit("document:error", {
          documentId,
          message: "Processing failed",
        });
        return;
      }

      const progress = await this.documentService.getJobProgress(documentId);
      if (progress > 0) {
        client.emit("document:progress", { documentId, progress });
      }
    } catch (err) {
      this.logger.error(`Failed to sync document state for ${documentId}`, err);
    }
  }

  @SubscribeMessage("ask")
  async handleAsk(
    @MessageBody() payload: AskPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { documentId, conversationId, question } = payload;

    try {
      await this.conversationService.addUserMessage(conversationId, question);

      const chunks = await this.searchService.searchByQuery(question, {
        documentId,
        limit: 5,
      });

      if (chunks.length === 0) {
        const fallback =
          "I couldn't find relevant passages in this document to answer that question.";
        client.emit("answer:chunk", { content: fallback });
        const assistantMessage: { id: string } =
          await this.conversationService.addAssistantMessage(
            conversationId,
            fallback,
            [],
          );
        client.emit("answer:done", {
          sources: [],
          userMessageId: null,
          assistantMessageId: assistantMessage.id,
        });
        return;
      }

      let fullAnswer = "";
      for await (const token of streamAnswer(question, chunks)) {
        fullAnswer += token;
        client.emit("answer:chunk", { content: token });
      }

      const sources: MessageSource[] = chunks.map((c) => ({
        id: c.id,
        content: c.content,
        pageNumber: c.pageNumber,
        similarity: c.similarity,
      }));

      const assistantMessage: { id: string } =
        await this.conversationService.addAssistantMessage(
          conversationId,
          fullAnswer,
          sources,
        );

      client.emit("answer:done", {
        sources,
        assistantMessageId: assistantMessage.id,
      });
    } catch (err) {
      this.logger.error("Error handling ask event", err);
      client.emit("answer:error", {
        message: err instanceof Error ? err.message : "An error occurred",
      });
    }
  }
}
