export type PdfRunnerMessage =
  | { type: "progress"; documentId: string; progress: number }
  | {
      type: "ready";
      documentId: string;
      title: string | null;
      summary: string;
    }
  | { type: "error"; documentId: string; message: string };

export function isPdfRunnerMessage(value: unknown): value is PdfRunnerMessage {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return type === "progress" || type === "ready" || type === "error";
}

export function embeddingProgress(embedded: number, total: number): number {
  if (total <= 0) return 30;
  return Math.min(90, 30 + Math.floor((embedded / total) * 60));
}
