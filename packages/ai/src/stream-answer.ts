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
    messages: [
      {
        role: "system",
        content: [
          "You are a research assistant. Answer questions based solely on the provided document excerpts.",
          "When you reference specific information, use [n] notation to cite the excerpt number.",
          "If the answer cannot be found in the provided excerpts, state that clearly.",
        ].join(" "),
      },
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
