export const EMBEDDING_MODEL = "text-embedding-3-small";

export const createEmbedding = (): Promise<number[]> =>
  Promise.resolve(Array.from({ length: 1536 }, () => 0));

export const summarize = (): Promise<string> =>
  Promise.resolve("Mock summary of the document.");

export async function* streamAnswer(): AsyncGenerator<string> {
  await Promise.resolve();
  yield "Mock ";
  yield "answer.";
}
