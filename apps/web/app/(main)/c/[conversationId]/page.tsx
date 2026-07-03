import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "database";
import { auth } from "@/lib/auth";
import { fetchConversation } from "@/lib/api";
import { ConversationAuthGate } from "./conversation-auth-gate";
import { ConversationUnavailable } from "./conversation-unavailable";
import { ConversationView } from "./conversation-view";

async function getConversationAccess(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { shareToken: true },
  });
}

async function getUserForkId(conversationId: string, userId: string) {
  const fork = await prisma.conversation.findFirst({
    where: {
      forkedFromConversationId: conversationId,
      document: { userId },
    },
    select: { id: true },
  });

  return fork?.id ?? null;
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    const access = await getConversationAccess(conversationId);

    if (!access) {
      return <ConversationUnavailable />;
    }

    if (access.shareToken) {
      redirect(`/share/${access.shareToken}`);
    }

    return <ConversationAuthGate />;
  }

  const conversation = await fetchConversation(
    conversationId,
    session.session.token,
  ).catch(() => null);

  if (conversation) {
    return (
      <ConversationView
        conversationId={conversationId}
        initialConversation={conversation}
      />
    );
  }

  const access = await getConversationAccess(conversationId);

  if (!access) {
    return <ConversationUnavailable />;
  }

  if (access.shareToken) {
    redirect(`/share/${access.shareToken}`);
  }

  const forkId = await getUserForkId(conversationId, session.user.id);
  if (forkId) {
    redirect(`/c/${forkId}`);
  }

  return <ConversationUnavailable />;
}
