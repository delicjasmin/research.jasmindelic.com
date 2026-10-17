import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Logger, OnModuleInit } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { streamAnswer, resolveModelId } from "ai";
import { AuthService } from "../auth/auth.service";
import type { AuthUser } from "../auth/auth.types";
import { SearchService } from "../search/search.service";
import { DocumentService } from "../document/document.service";
import {
  ConversationService,
  type MessageSource,
} from "../conversation/conversation.service";
import { UsageService } from "../usage/usage.service";
import { PdfProcessingService } from "../pdf/pdf-processing.service";

type SubscribePayload = { documentId: string };
type AskPayload = {
  documentId: string;
  conversationId: string;
  question: string;
  modelId?: string;
};

type SocketData = {
  user?: AuthUser;
};

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
      .split(",")
      .map((o) => o.trim()),
    credentials: true,
  },
})
export class ResearchGateway implements OnGatewayInit, OnModuleInit {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(ResearchGateway.name);

  constructor(
    private readonly authService: AuthService,
    private readonly searchService: SearchService,
    private readonly documentService: DocumentService,
    private readonly conversationService: ConversationService,
    private readonly usageService: UsageService,
    private readonly pdfProcessing: PdfProcessingService,
  ) {}

  afterInit(server: Server) {
    server.use((socket, next) => {
      const token = (socket.handshake.auth as { token?: unknown } | undefined)
        ?.token;
      if (typeof token !== "string") {
        next(new Error("Authentication required"));
        return;
      }

      this.authService
        .validateSessionToken(token)
        .then((user) => {
          if (!user) {
            next(new Error("Invalid or expired session"));
            return;
          }

          (socket.data as SocketData).user = user;
          next();
        })
        .catch((err: unknown) => {
          next(err instanceof Error ? err : new Error("Authentication failed"));
        });
    });

    this.logger.log("WebSocket gateway initialised");
  }

  onModuleInit() {
    this.pdfProcessing.setListener({
      progress: (documentId, progress) => {
        this.server
          .to(documentId)
          .emit("document:progress", { documentId, progress });
      },
      ready: (documentId, title, summary) => {
        this.server.to(documentId).emit("document:ready", {
          documentId,
          title,
          summary,
        });
      },
      error: (documentId, message) => {
        this.server
          .to(documentId)
          .emit("document:error", { documentId, message });
      },
    });
  }

  private getSocketUser(client: Socket): AuthUser {
    const user = (client.data as SocketData).user;
    if (!user) {
      throw new Error("Authentication required");
    }
    return user;
  }

  @SubscribeMessage("subscribe-document")
  async handleSubscribe(
    @MessageBody() payload: SubscribePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { documentId } = payload;
    const user = this.getSocketUser(client);

    try {
      const doc = await this.documentService.getDocumentForUser(
        documentId,
        user.id,
      );

      void client.join(documentId);
      this.logger.log(
        `Client ${client.id} subscribed to document ${documentId}`,
      );

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
          message: doc.errorMessage ?? "Processing failed",
        });
        return;
      }

      const progress = await this.pdfProcessing.progressFor(documentId);
      if (progress > 0) {
        client.emit("document:progress", { documentId, progress });
      }
    } catch (err) {
      this.logger.error(`Failed to sync document state for ${documentId}`, err);
      client.emit("document:error", {
        documentId,
        message: err instanceof Error ? err.message : "Access denied",
      });
    }
  }

  @SubscribeMessage("ask")
  async handleAsk(
    @MessageBody() payload: AskPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const {
      documentId,
      conversationId,
      question,
      modelId: requestedModelId,
    } = payload;
    const user = this.getSocketUser(client);

    try {
      await this.documentService.assertDocumentOwner(documentId, user.id);
      await this.usageService.assertWithinDailyQuestionLimit(user.id);

      const plan = await this.usageService.getUserPlan(user.id);
      const modelId = resolveModelId(requestedModelId, plan);

      await this.conversationService.addUserMessage(
        conversationId,
        question,
        user.id,
      );

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
            modelId,
          );
        client.emit("answer:done", {
          sources: [],
          userMessageId: null,
          assistantMessageId: assistantMessage.id,
        });
        return;
      }

      let fullAnswer = "";
      for await (const token of streamAnswer(question, chunks, modelId)) {
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
          modelId,
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
