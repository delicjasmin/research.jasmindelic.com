import { authClient } from "@/lib/auth-client";

export async function getAuthHeaders(
  token?: string,
): Promise<Record<string, string>> {
  const sessionToken =
    token ?? (await authClient.getSession()).data?.session?.token;

  if (!sessionToken) {
    throw new Error("Not authenticated");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionToken}`,
  };
}
