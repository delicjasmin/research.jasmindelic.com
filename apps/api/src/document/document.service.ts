import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "database";
import { PrismaService } from "../prisma/prisma.service";
import { ConversationService } from "../conversation/conversation.service";
import { UsageService } from "../usage/usage.service";
import { PdfProcessingService } from "../pdf/pdf-processing.service";

const documentSummarySelect = {
  id: true,
  url: true,
  title: true,
  summary: true,
  status: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DocumentSelect;

type DocumentRow = Prisma.DocumentGetPayload<{
  select: typeof documentSummarySelect;
}>;

export type DocumentSummary = DocumentRow;

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationService: ConversationService,
    private readonly usageService: UsageService,
    private readonly pdfProcessing: PdfProcessingService,
  ) {}

  async createDocument(
    url: string,
    userId: string,
  ): Promise<{ id: string; conversationId: string; status: string }> {
    await this.usageService.assertWithinDailyDocumentLimit(userId);

    const document = await this.prisma.db.document.create({
      data: { url, status: "PENDING", userId },
      select: { id: true, status: true },
    });

    const conversation = await this.conversationService.createForDocument(
      document.id,
      userId,
    );

    this.pdfProcessing.start(document.id);

    return {
      id: document.id,
      conversationId: conversation.id,
      status: document.status,
    };
  }

  async getDocument(id: string): Promise<DocumentSummary> {
    const document = await this.prisma.db.document.findUnique({
      where: { id },
      select: documentSummarySelect,
    });

    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    return document;
  }

  async getDocumentForUser(
    id: string,
    userId: string,
  ): Promise<DocumentSummary> {
    const document = await this.prisma.db.document.findFirst({
      where: { id, userId },
      select: documentSummarySelect,
    });

    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    return document;
  }

  async assertDocumentOwner(documentId: string, userId: string): Promise<void> {
    const document = await this.prisma.db.document.findFirst({
      where: { id: documentId, userId },
      select: { id: true },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
  }
}
