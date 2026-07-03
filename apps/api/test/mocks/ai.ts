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

export const DEFAULT_MODEL_ID = "gpt-4o-mini";

export const listAvailableChatModels = () => [
  {
    id: "gpt-4o-mini",
    label: "GPT-4o Mini",
    hint: "Fast",
    description: "Quick and affordable.",
    provider: "openai" as const,
    available: true,
  },
];

export const listChatModels = listAvailableChatModels;

export const resolveModelId = (modelId?: string) => modelId ?? DEFAULT_MODEL_ID;
