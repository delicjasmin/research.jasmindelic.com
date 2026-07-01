import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchSharedConversation } from "@/lib/api";
import { ConversationView } from "@/app/(main)/c/[conversationId]/conversation-view";

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
        <Link href="/" className="text-sm font-semibold">
          Research
        </Link>
        <span className="text-muted-foreground text-xs">Shared conversation</span>
      </header>
      <main className="flex-1">
        <ConversationView
          conversationId={conversation.id}
          initialConversation={conversation}
          readOnly
        />
      </main>
    </div>
  );
}
