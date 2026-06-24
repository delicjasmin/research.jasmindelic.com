import { EMBEDDING_DIMENSIONS } from "./constants.js";
import type { PrismaClientType } from "./client.js";

export type SimilarChunkResult = {
  id: string;
  documentId: string;
  pageNumber: number;
  content: string;
  similarity: number;
};

export type SearchSimilarChunksOptions = {
  limit?: number;
  documentId?: string;
};

function assertEmbeddingDimensions(embedding: number[]): void {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected embedding with ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`,
    );
  }
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function setChunkEmbedding(
  db: PrismaClientType,
  chunkId: string,
  embedding: number[],
): Promise<void> {
  assertEmbeddingDimensions(embedding);

  await db.$executeRaw`
    UPDATE "DocumentChunk"
    SET embedding = ${toVectorLiteral(embedding)}::vector
    WHERE id = ${chunkId}
  `;
}

export async function searchSimilarChunks(
  db: PrismaClientType,
  embedding: number[],
  options: SearchSimilarChunksOptions = {},
): Promise<SimilarChunkResult[]> {
  assertEmbeddingDimensions(embedding);

  const limit = options.limit ?? 10;
  const vectorLiteral = toVectorLiteral(embedding);

  if (options.documentId) {
    return db.$queryRaw<SimilarChunkResult[]>`
      SELECT
        id,
        "documentId",
        "pageNumber",
        content,
        1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "DocumentChunk"
      WHERE embedding IS NOT NULL
        AND "documentId" = ${options.documentId}
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${limit}
    `;
  }

  return db.$queryRaw<SimilarChunkResult[]>`
    SELECT
      id,
      "documentId",
      "pageNumber",
      content,
      1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM "DocumentChunk"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `;
}
