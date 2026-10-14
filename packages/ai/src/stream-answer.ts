import { streamText } from "ai-sdk";
import type { SimilarChunkResult } from "database";
import { DEFAULT_MODEL_ID, getChatModel, type ModelId } from "./models.js";

export async function* streamAnswer(
  question: string,
  chunks: SimilarChunkResult[],
  modelId: ModelId = DEFAULT_MODEL_ID,
): AsyncGenerator<string> {
  const context = chunks
    .map((c, i) => `[${i + 1}] (Page ${c.pageNumber}): ${c.content}`)
    .join("\n\n");

  const result = streamText({
    model: getChatModel(modelId),
    instructions: [
      "You are a research assistant. Answer questions based solely on the provided document excerpts.",
      "If the answer cannot be found in the provided excerpts, state that clearly.",
      "When a sentence or clause states a fact taken from an excerpt, end that sentence or clause with that excerpt's [n] marker, immediately after the claim.",
      "Do not gather citations into a bibliography at the end.",
      "Use only excerpt numbers that were provided. Never invent a number.",
      "When several excerpts support the same claim, place their markers adjacent, like [1][2].",
      "Do not cite a sentence that only frames the answer and contains no fact from an excerpt.",
    ].join(" "),
    messages: [
      {
        role: "user",
        content: `Document excerpts:\n\n${context}\n\nQuestion: ${question}`,
      },
    ],
  });

  for await (const part of result.textStream) {
    if (part) yield part;
  }
}

export { DEFAULT_MODEL_ID };
