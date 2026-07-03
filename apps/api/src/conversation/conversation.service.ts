import { Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { cloneDocumentChunks } from "database";
import { PrismaService } from "../prisma/prisma.service";

export type MessageSource = {
  id: string;
  content: string;
  pageNumber: number;
  similarity: number;
};

export type ConversationMessage = {
  id: string;
  role: string;
  content: string;
  sources: MessageSource[] | null;
  createdAt: Date;
};

export type ConversationListItem = {
  id: string;
  title: string | null;
  documentId: string;
  documentTitle: string | null;
  documentStatus: string;
  shareToken: string | null;
  updatedAt: Date;
  createdAt: Date;
};

export type ConversationDetail = ConversationListItem & {
  messages: ConversationMessage[];
  document: {
    id: string;
    url: string;
    title: string | null;
    summary: string | null;
    status: string;
    errorMessage: string | null;
  };
};

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  async createForDocument(
    documentId: string,
    userId: string,
    title?: string | null,
  ) {
    const document = await this.prisma.db.document.findFirst({
      where: { id: documentId, userId },
      select: { id: true },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    return await this.prisma.db.conversation.create({
      data: {
        documentId,
        title: title ?? null,
      },
      select: { id: true, documentId: true, title: true },
    });
  }

  async listConversations(
    userId: string,
    documentId?: string,
  ): Promise<ConversationListItem[]> {
    const conversations = await this.prisma.db.conversation.findMany({
      where: {
        document: {
          userId,
          ...(documentId ? { id: documentId } : {}),
        },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        document: {
          select: {
            title: true,
            status: true,
          },
        },
      },
    });

    return conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      documentId: conversation.documentId,
      documentTitle: conversation.document.title,
      documentStatus: conversation.document.status,
      shareToken: conversation.shareToken,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
    }));
  }

  async getConversation(
    id: string,
    userId: string,
  ): Promise<ConversationDetail> {
    const conversation = await this.prisma.db.conversation.findFirst({
      where: {
        id,
        document: { userId },
      },
      include: {
        document: {
          select: {
            id: true,
            url: true,
            title: true,
            summary: true,
            status: true,
            errorMessage: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    return this.toConversationDetail(conversation);
  }

  async getSharedConversation(token: string): Promise<ConversationDetail> {
    const conversation = await this.prisma.db.conversation.findUnique({
      where: { shareToken: token },
      include: this.sharedConversationInclude(),
    });

    if (!conversation) {
      throw new NotFoundException("Shared conversation not found");
    }

    return this.toConversationDetail(conversation);
  }

  private sharedConversationInclude() {
    return {
      document: {
        select: {
          id: true,
          url: true,
          title: true,
          summary: true,
          status: true,
          errorMessage: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" as const },
      },
    };
  }

  async forkSharedConversation(
    shareToken: string,
    userId: string,
  ): Promise<ConversationDetail> {
    const source = await this.prisma.db.conversation.findUnique({
      where: { shareToken },
      include: {
        document: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!source) {
      throw new NotFoundException("Shared conversation not found");
    }

    if (source.document.userId === userId) {
      return this.getConversation(source.id, userId);
    }

    const existingFork = await this.prisma.db.conversation.findFirst({
      where: {
        forkedFromConversationId: source.id,
        document: { userId },
      },
      select: { id: true },
    });

    if (existingFork) {
      return this.getConversation(existingFork.id, userId);
    }

    const documentId = await this.cloneDocumentForUser(source.document, userId);

    const newConversation = await this.prisma.db.conversation.create({
      data: {
        documentId,
        title: source.title,
        forkedFromConversationId: source.id,
        messages: {
          create: source.messages.map((message) => ({
            role: message.role,
            content: message.content,
            sources: message.sources ?? undefined,
            createdAt: message.createdAt,
          })),
        },
      },
      select: { id: true },
    });

    return this.getConversation(newConversation.id, userId);
  }

  private async cloneDocumentForUser(
    source: {
      id: string;
      url: string;
      title: string | null;
      summary: string | null;
      status: string;
      errorMessage: string | null;
      pageCount: number | null;
      fileSizeBytes: number | null;
    },
    userId: string,
  ): Promise<string> {
    const existing = await this.prisma.db.document.findFirst({
      where: { userId, url: source.url, status: "READY" },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    const newDocument = await this.prisma.db.document.create({
      data: {
        userId,
        url: source.url,
        title: source.title,
        summary: source.summary,
        status: source.status,
        errorMessage: source.errorMessage,
        pageCount: source.pageCount,
        fileSizeBytes: source.fileSizeBytes,
      },
      select: { id: true },
    });

    if (source.status === "READY") {
      await cloneDocumentChunks(this.prisma.db, source.id, newDocument.id);
    }

    return newDocument.id;
  }

  private toConversationDetail(conversation: {
    id: string;
    title: string | null;
    documentId: string;
    shareToken: string | null;
    updatedAt: Date;
    createdAt: Date;
    document: {
      id: string;
      url: string;
      title: string | null;
      summary: string | null;
      status: string;
      errorMessage: string | null;
    };
    messages: Array<{
      id: string;
      role: string;
      content: string;
      sources: unknown;
      createdAt: Date;
    }>;
  }): ConversationDetail {
    return {
      id: conversation.id,
      title: conversation.title,
      documentId: conversation.documentId,
      documentTitle: conversation.document.title,
      documentStatus: conversation.document.status,
      shareToken: conversation.shareToken,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
      document: conversation.document,
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        sources: message.sources as MessageSource[] | null,
        createdAt: message.createdAt,
      })),
    };
  }

  async assertConversationOwner(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const conversation = await this.prisma.db.conversation.findFirst({
      where: {
        id: conversationId,
        document: { userId },
      },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }
  }

  async updateTitle(id: string, userId: string, title: string) {
    await this.assertConversationOwner(id, userId);

    const conversation = await this.prisma.db.conversation.update({
      where: { id },
      data: { title },
      select: { id: true, title: true },
    });

    return conversation;
  }

  async deleteConversation(id: string, userId: string) {
    await this.assertConversationOwner(id, userId);
    await this.prisma.db.conversation.delete({ where: { id } });
    return { id };
  }

  async enableSharing(id: string, userId: string) {
    await this.assertConversationOwner(id, userId);

    const existing = await this.prisma.db.conversation.findUnique({
      where: { id },
      select: { shareToken: true },
    });

    if (!existing) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    if (existing.shareToken) {
      return { shareToken: existing.shareToken };
    }

    const shareToken = randomBytes(16).toString("hex");
    const conversation = await this.prisma.db.conversation.update({
      where: { id },
      data: { shareToken },
      select: { shareToken: true },
    });

    return { shareToken: conversation.shareToken };
  }

  async disableSharing(id: string, userId: string) {
    await this.assertConversationOwner(id, userId);

    await this.prisma.db.conversation.update({
      where: { id },
      data: { shareToken: null },
    });

    return { id };
  }

  async addUserMessage(
    conversationId: string,
    content: string,
    userId?: string,
  ): Promise<{ id: string }> {
    if (userId) {
      await this.assertConversationOwner(conversationId, userId);
    }

    const message = await this.prisma.db.message.create({
      data: {
        conversationId,
        role: "user",
        content,
      },
      select: { id: true },
    });

    await this.prisma.db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const conversation = await this.prisma.db.conversation.findUnique({
      where: { id: conversationId },
      select: { title: true },
    });

    if (!conversation?.title) {
      await this.prisma.db.conversation.update({
        where: { id: conversationId },
        data: { title: content.slice(0, 80) },
      });
    }

    return { id: message.id };
  }

  async addAssistantMessage(
    conversationId: string,
    content: string,
    sources: MessageSource[],
  ): Promise<{ id: string }> {
    const message = await this.prisma.db.message.create({
      data: {
        conversationId,
        role: "assistant",
        content,
        sources: sources.length > 0 ? sources : undefined,
      },
      select: { id: true },
    });

    await this.prisma.db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return { id: message.id };
  }
}
