const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type DocumentStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export type DocumentResponse = {
  id: string;
  url: string;
  title: string | null;
  summary: string | null;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
};

export async function submitDocument(url: string): Promise<{ id: string; status: string }> {
  const res = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to submit document" }));
    throw new Error(error.message ?? "Failed to submit document");
  }

  return res.json() as Promise<{ id: string; status: string }>;
}

export async function fetchDocument(id: string): Promise<DocumentResponse> {
  const res = await fetch(`${API_BASE}/documents/${id}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("Document not found");
  }

  return res.json() as Promise<DocumentResponse>;
}
