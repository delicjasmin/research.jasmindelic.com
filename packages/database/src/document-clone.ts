import type { PrismaClientType } from "./client.js";

export async function cloneDocumentChunks(
  db: PrismaClientType,
  sourceDocumentId: string,
  targetDocumentId: string,
): Promise<void> {
  await db.$executeRaw`
    INSERT INTO "DocumentChunk" (id, "documentId", "pageNumber", content, embedding, "createdAt")
    SELECT
      'chunk_' || substr(md5(random()::text || id), 1, 24),
      ${targetDocumentId},
      "pageNumber",
      content,
      embedding,
      NOW()
    FROM "DocumentChunk"
    WHERE "documentId" = ${sourceDocumentId}
  `;
}
