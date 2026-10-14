"use client";

import { useState } from "react";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";

export function ConversationAuthGate() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <p className="text-base font-medium">Sign in to view this conversation</p>
      <p className="text-muted-foreground max-w-sm text-sm">
        You need an account to access your research history and ask questions.
      </p>
      <Button onClick={() => setOpen(true)}>Sign in with Google</Button>
      <AuthDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
