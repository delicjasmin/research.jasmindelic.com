import OpenAI from "openai";

const MAX_INPUT_CHARS = 120_000;

export async function summarize(text: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a research assistant. Provide a comprehensive summary of the document. Cover the key objectives, methodology, main findings, and conclusions. Be thorough but concise.",
      },
      {
        role: "user",
        content: `Summarize this document:\n\n${text.slice(0, MAX_INPUT_CHARS)}`,
      },
    ],
    max_tokens: 1200,
  });

  return response.choices[0].message.content ?? "";
}
