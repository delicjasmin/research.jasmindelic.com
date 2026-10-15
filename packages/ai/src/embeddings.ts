import OpenAI from "openai";
import { EMBEDDING_DIMENSIONS } from "database";

export const EMBEDDING_MODEL = "text-embedding-3-small";

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const openai = new OpenAI({ apiKey });
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return [...response.data]
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

export async function createEmbedding(text: string): Promise<number[]> {
  const [embedding] = await createEmbeddings([text]);
  if (!embedding) {
    throw new Error("Embedding response was empty");
  }
  return embedding;
}
