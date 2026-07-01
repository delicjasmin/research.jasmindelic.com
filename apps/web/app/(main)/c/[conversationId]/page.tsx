import { notFound } from "next/navigation";
import { fetchConversation } from "@/lib/api";
import { ConversationView } from "./conversation-view";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const conversation = await fetchConversation(conversationId).catch(() => null);

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
