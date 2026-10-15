import { Prisma, type PrismaClient } from "../generated/prisma/client.js";

type SqlClient = Pick<PrismaClient, "$executeRaw" | "$queryRaw">;

export type ChunkInsertRow = {
  id: string;
  documentId: string;
  pageNumber: number;
  content: string;
};

export type PendingChunk = {
  id: string;
  content: string;
};

export type StoredChunkText = {
  content: string;
  pageNumber: number;
};

export async function insertDocumentChunkBatch(
  db: SqlClient,
  rows: ChunkInsertRow[],
): Promise<void> {
  if (rows.length === 0) return;

  const values = Prisma.join(
    rows.map(
      (row) =>
        Prisma.sql`(${row.id}, ${row.documentId}, ${row.pageNumber}, ${row.content}, NOW())`,
    ),
  );

  await db.$executeRaw`
    INSERT INTO "DocumentChunk" (id, "documentId", "pageNumber", content, "createdAt")
    VALUES ${values}
  `;
}

export async function countDocumentChunks(
  db: SqlClient,
  documentId: string,
): Promise<{ total: number; pending: number }> {
  const rows = await db.$queryRaw<Array<{ total: number; pending: number }>>`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE embedding IS NULL)::int AS pending
    FROM "DocumentChunk"
    WHERE "documentId" = ${documentId}
  `;
  const row = rows[0];
  return {
    total: Number(row?.total ?? 0),
    pending: Number(row?.pending ?? 0),
  };
}

export async function listPendingChunkEmbeddings(
  db: SqlClient,
  documentId: string,
): Promise<PendingChunk[]> {
  return db.$queryRaw<PendingChunk[]>`
    SELECT id, content
    FROM "DocumentChunk"
    WHERE "documentId" = ${documentId}
      AND embedding IS NULL
    ORDER BY "pageNumber", id
  `;
}

export async function listDocumentChunkTexts(
  db: SqlClient,
  documentId: string,
): Promise<StoredChunkText[]> {
  return db.$queryRaw<StoredChunkText[]>`
    SELECT content, "pageNumber"
    FROM "DocumentChunk"
    WHERE "documentId" = ${documentId}
    ORDER BY "pageNumber", id
  `;
}
