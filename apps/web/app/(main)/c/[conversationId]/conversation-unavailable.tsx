import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ConversationUnavailable() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="text-lg font-semibold">Conversation unavailable</h1>
      <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
        This conversation doesn&apos;t exist or you don&apos;t have permission
        to view it. If someone shared it with you, ask them for the share link.
      </p>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
