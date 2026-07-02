import { getAuthHeaders } from "./api-auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type DocumentStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export type DocumentResponse = {
  id: string;
  url: string;
  title: string | null;
  summary: string | null;
  status: DocumentStatus;
  errorMessage: string | null;
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

export type UsageQuota = {
  used: number;
  limit: number | null;
  remaining: number | null;
};

export type UsageSummary = {
  plan: string;
  documents: UsageQuota;
  questions: UsageQuota;
};

function getErrorMessage(body: { message?: string | string[] }): string {
  if (Array.isArray(body.message)) {
    return body.message[0] ?? "Request failed";
  }
  return body.message ?? "Request failed";
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(getErrorMessage(error));
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
    headers: await getAuthHeaders(),
    body: JSON.stringify({ url }),
  });

  return handleResponse(res);
}

export async function fetchUsage(token?: string): Promise<UsageSummary> {
  const res = await fetch(`${API_BASE}/usage`, {
    cache: "no-store",
    headers: await getAuthHeaders(token),
  });
  return handleResponse(res);
}

export async function fetchDocument(
  id: string,
  token?: string,
): Promise<DocumentResponse> {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    cache: "no-store",
    headers: await getAuthHeaders(token),
  });
  return handleResponse(res);
}

export async function fetchConversations(
  documentId?: string,
  token?: string,
): Promise<ConversationListItem[]> {
  const query = documentId ? `?documentId=${documentId}` : "";
  const res = await fetch(`${API_BASE}/conversations${query}`, {
    cache: "no-store",
    headers: await getAuthHeaders(token),
  });
  return handleResponse(res);
}

export async function fetchConversation(
  id: string,
  token?: string,
): Promise<ConversationDetail> {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    cache: "no-store",
    headers: await getAuthHeaders(token),
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
    headers: await getAuthHeaders(),
    body: JSON.stringify({ documentId }),
  });
  return handleResponse(res);
}

export async function deleteConversation(id: string): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function enableConversationShare(
  id: string,
): Promise<{ shareToken: string }> {
  const res = await fetch(`${API_BASE}/conversations/${id}/share`, {
    method: "POST",
    headers: await getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function disableConversationShare(
  id: string,
): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/conversations/${id}/share`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });
  return handleResponse(res);
}
