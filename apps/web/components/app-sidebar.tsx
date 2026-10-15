"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@/components/sign-in-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";
import { deleteConversation, fetchConversations } from "@/lib/api";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import Image from "next/image";

function formatRelativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

type SidebarContentProps = {
  onNavigate?: () => void;
  className?: string;
};

export function SidebarContent({ onNavigate, className }: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const sessionPending = !mounted || isPending;

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => fetchConversations(),
    enabled: !!session,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (pathname === `/c/${deletedId}`) {
        router.push("/");
      }
      toast.success("Conversation deleted");
    },
    onError: () => toast.error("Failed to delete conversation"),
  });

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="border-border space-y-4 border-b p-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <Image src="/logo.png" alt="Research" width={32} height={32} />
          AI Research
        </Link>
        <Button asChild className="w-full" size="sm">
          <Link href="/" onClick={onNavigate}>
            <HugeiconsIcon
              icon={PlusSignIcon}
              strokeWidth={2}
              className="mr-1 h-4 w-4"
            />
            New research
          </Link>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <p className="text-muted-foreground px-2 py-2 text-[0.8125rem] font-medium">
          Conversations
        </p>

        {(sessionPending || (session && isLoading)) && (
          <p className="text-muted-foreground px-2 py-4 text-[0.8125rem]">
            Loading…
          </p>
        )}

        {!sessionPending && !session && (
          <p className="text-muted-foreground px-2 py-4 text-[0.8125rem]">
            Sign in to see your conversations.
          </p>
        )}

        {session && !isLoading && conversations.length === 0 && (
          <p className="text-muted-foreground px-2 py-4 text-[0.8125rem]">
            No conversations yet. Start by analysing a PDF.
          </p>
        )}

        <ul className="space-y-1">
          {conversations.map((conversation) => {
            const href = `/c/${conversation.id}`;
            const isActive = pathname === href;
            const label = conversation.documentTitle ?? "Untitled research";

            return (
              <li key={conversation.id}>
                <div
                  className={cn(
                    "group flex items-center gap-1 rounded-lg px-2.5 py-2",
                    isActive
                      ? "bg-foreground/10 shadow-sm ring-1 ring-foreground/20"
                      : "hover:bg-foreground/5",
                  )}
                >
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className="min-w-0 flex-1"
                  >
                    <p
                      className={cn(
                        "truncate text-sm",
                        isActive ? "font-semibold" : "font-medium",
                      )}
                    >
                      {label}
                    </p>
                    <p className="text-muted-foreground truncate text-[0.8125rem]">
                      {formatRelativeTime(conversation.updatedAt)}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(conversation.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0 rounded p-1 text-[0.8125rem] opacity-0 transition group-hover:opacity-100"
                    aria-label="Delete conversation"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-border space-y-2 border-t p-4">
        <ThemeToggle />
        <SignInButton />
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="bg-muted/30 border-border hidden h-full w-64 shrink-0 flex-col border-r md:flex">
      <SidebarContent />
    </aside>
  );
}
