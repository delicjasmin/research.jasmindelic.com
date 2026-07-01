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

export type MessageSource = {
  id: string;
  content: string;
  pageNumber: number;
  similarity: number;
};

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: MessageSource[] | null;
  createdAt: string;
};

export type ConversationListItem = {
  id: string;
  title: string | null;
  documentId: string;
  documentTitle: string | null;
  documentStatus: DocumentStatus;
  shareToken: string | null;
  updatedAt: string;
  createdAt: string;
};

export type ConversationDetail = ConversationListItem & {
  messages: ConversationMessage[];
  document: DocumentResponse;
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export async function submitDocument(url: string): Promise<{
  id: string;
  conversationId: string;
  status: string;
}> {
  const res = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  return handleResponse(res);
}

export async function fetchDocument(id: string): Promise<DocumentResponse> {
  const res = await fetch(`${API_BASE}/documents/${id}`, { cache: "no-store" });
  return handleResponse(res);
}

export async function fetchConversations(
  documentId?: string,
): Promise<ConversationListItem[]> {
  const query = documentId ? `?documentId=${documentId}` : "";
  const res = await fetch(`${API_BASE}/conversations${query}`, {
    cache: "no-store",
  });
  return handleResponse(res);
}

export async function fetchConversation(id: string): Promise<ConversationDetail> {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    cache: "no-store",
  });
  return handleResponse(res);
}

export async function fetchSharedConversation(
  token: string,
): Promise<ConversationDetail> {
  const res = await fetch(`${API_BASE}/conversations/shared/${token}`, {
    cache: "no-store",
  });
  return handleResponse(res);
}

export async function createConversation(
  documentId: string,
): Promise<{ id: string; documentId: string; title: string | null }> {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId }),
  });
  return handleResponse(res);
}

export async function deleteConversation(id: string): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

export async function enableConversationShare(
  id: string,
): Promise<{ shareToken: string }> {
  const res = await fetch(`${API_BASE}/conversations/${id}/share`, {
    method: "POST",
  });
  return handleResponse(res);
}

export async function disableConversationShare(
  id: string,
): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/conversations/${id}/share`, {
    method: "DELETE",
  });
  return handleResponse(res);
}
