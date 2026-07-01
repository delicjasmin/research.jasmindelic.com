import OpenAI from "openai";
import type { SimilarChunkResult } from "database";

export async function* streamAnswer(
  question: string,
  chunks: SimilarChunkResult[],
): AsyncGenerator<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const openai = new OpenAI({ apiKey });

  const context = chunks
    .map((c, i) => `[${i + 1}] (Page ${c.pageNumber}): ${c.content}`)
    .join("\n\n");

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    stream: true,
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

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}
