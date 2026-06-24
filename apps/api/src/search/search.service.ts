import { Injectable } from "@nestjs/common";
import { createEmbedding } from "ai";
import { searchSimilarChunks, type SimilarChunkResult } from "database";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchByQuery(
    query: string,
    options: { limit?: number; documentId?: string } = {},
  ): Promise<SimilarChunkResult[]> {
    const embedding = await createEmbedding(query);
    return searchSimilarChunks(this.prisma.db, embedding, options);
  }
}
