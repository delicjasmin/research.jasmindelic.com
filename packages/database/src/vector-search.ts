import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import { EMBEDDING_DIMENSIONS } from "./constants.js";
import type { PrismaClientType } from "./client.js";

type SqlExecutor = Pick<PrismaClient, "$executeRaw">;

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

export async function setChunkEmbeddings(
  db: SqlExecutor,
  pairs: Array<{ id: string; embedding: number[] }>,
): Promise<void> {
  if (pairs.length === 0) return;

  for (const pair of pairs) {
    assertEmbeddingDimensions(pair.embedding);
  }

  const values = Prisma.join(
    pairs.map(
      (pair) =>
        Prisma.sql`(${pair.id}::text, ${toVectorLiteral(pair.embedding)}::vector)`,
    ),
  );

  await db.$executeRaw`
    UPDATE "DocumentChunk" AS c
    SET embedding = v.embedding
    FROM (VALUES ${values}) AS v(id, embedding)
    WHERE c.id = v.id
  `;
}

export async function setChunkEmbedding(
  db: SqlExecutor,
  chunkId: string,
  embedding: number[],
): Promise<void> {
  await setChunkEmbeddings(db, [{ id: chunkId, embedding }]);
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
