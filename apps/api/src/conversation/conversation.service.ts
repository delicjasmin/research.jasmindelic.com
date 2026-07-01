import { Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
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
  };
};

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  async createForDocument(documentId: string, title?: string | null) {
    return await this.prisma.db.conversation.create({
      data: {
        documentId,
        title: title ?? null,
      },
      select: { id: true, documentId: true, title: true },
    });
  }

  async listConversations(
    documentId?: string,
  ): Promise<ConversationListItem[]> {
    const conversations = await this.prisma.db.conversation.findMany({
      where: documentId ? { documentId } : undefined,
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

  async getConversation(id: string): Promise<ConversationDetail> {
    const conversation = await this.prisma.db.conversation.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            id: true,
            url: true,
            title: true,
            summary: true,
            status: true,
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

  async getSharedConversation(token: string): Promise<ConversationDetail> {
    const conversation = await this.prisma.db.conversation.findUnique({
      where: { shareToken: token },
      include: {
        document: {
          select: {
            id: true,
            url: true,
            title: true,
            summary: true,
            status: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException("Shared conversation not found");
    }

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

  async updateTitle(id: string, title: string) {
    const conversation = await this.prisma.db.conversation.update({
      where: { id },
      data: { title },
      select: { id: true, title: true },
    });

    return conversation;
  }

  async deleteConversation(id: string) {
    await this.prisma.db.conversation.delete({ where: { id } });
    return { id };
  }

  async enableSharing(id: string) {
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

  async disableSharing(id: string) {
    await this.prisma.db.conversation.update({
      where: { id },
      data: { shareToken: null },
    });

    return { id };
  }

  async addUserMessage(
    conversationId: string,
    content: string,
  ): Promise<{ id: string }> {
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
