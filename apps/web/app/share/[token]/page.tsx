import { ConversationView } from "@/app/(main)/c/[conversationId]/conversation-view";
import { SharedConversationContinue } from "@/components/shared-conversation-continue";
import { fetchSharedConversation } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function SharedConversationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const conversation = await fetchSharedConversation(token).catch(() => null);

  if (!conversation) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border flex items-center justify-between border-b px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <Image src="/logo.png" alt="AI Research" width={24} height={24} />
          AI Research
        </Link>
        <span className="text-muted-foreground text-xs">
          Shared conversation
        </span>
      </header>
      <main className="flex-1">
        <ConversationView
          conversationId={conversation.id}
          initialConversation={conversation}
          readOnly
        />
        <SharedConversationContinue shareToken={token} />
      </main>
    </div>
  );
}
