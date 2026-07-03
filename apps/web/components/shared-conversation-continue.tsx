"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/auth-dialog";
import { authClient } from "@/lib/auth-client";
import { forkSharedConversation } from "@/lib/api";

type Props = {
  shareToken: string;
};

export function SharedConversationContinue({ shareToken }: Props) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const [forking, setForking] = useState(false);

  async function handleContinue() {
    if (!session) {
      setAuthOpen(true);
      return;
    }

    setForking(true);
    try {
      const conversation = await forkSharedConversation(shareToken);
      router.push(`/c/${conversation.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to continue conversation",
      );
      setForking(false);
    }
  }

  return (
    <>
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 pb-8">
        <Button onClick={handleContinue} disabled={forking}>
          {forking
            ? "Starting…"
            : session
              ? "Continue this conversation"
              : "Sign in to continue"}
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          {session
            ? "Your questions are saved to your own copy. The original shared conversation stays unchanged."
            : "Anyone can view this conversation. Sign in only if you want to ask your own questions."}
        </p>
      </div>
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        title="Sign in to continue"
        description="Sign in to copy this conversation into your history and ask your own questions."
      />
    </>
  );
}
