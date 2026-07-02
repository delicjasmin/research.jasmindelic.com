import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { fetchConversation } from "@/lib/api";
import { ConversationAuthGate } from "./conversation-auth-gate";
import { ConversationView } from "./conversation-view";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return <ConversationAuthGate />;
  }

  const conversation = await fetchConversation(
    conversationId,
    session.session.token,
  ).catch(() => null);

  if (!conversation) {
    notFound();
  }

  return (
    <ConversationView
      conversationId={conversationId}
      initialConversation={conversation}
    />
  );
}
