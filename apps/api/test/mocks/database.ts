export const EMBEDDING_DIMENSIONS = 1536;

export const prisma = {
  $connect: (): Promise<void> => Promise.resolve(),
  $disconnect: (): Promise<void> => Promise.resolve(),
  $executeRaw: (): Promise<number> => Promise.resolve(0),
  $queryRaw: (): Promise<unknown[]> => Promise.resolve([]),
};

export type PrismaClientType = typeof prisma;

export class PrismaClient {}

export type SimilarChunkResult = {
  id: string;
  documentId: string;
  pageNumber: number;
  content: string;
  similarity: number;
};

export const setChunkEmbedding = (): Promise<void> => Promise.resolve();

export const searchSimilarChunks = (): Promise<SimilarChunkResult[]> =>
  Promise.resolve([]);
