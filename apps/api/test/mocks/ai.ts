export const EMBEDDING_MODEL = "text-embedding-3-small";

export const createEmbedding = (): Promise<number[]> =>
  Promise.resolve(Array.from({ length: 1536 }, () => 0));
