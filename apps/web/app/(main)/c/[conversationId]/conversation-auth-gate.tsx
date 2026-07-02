"use client";

import { useState } from "react";
import { AuthDialog } from "@/components/auth-dialog";

export function ConversationAuthGate() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <p className="text-sm font-medium">Sign in to view this conversation</p>
      <p className="text-muted-foreground max-w-sm text-sm">
        You need an account to access your research history and ask questions.
      </p>
      <AuthDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
