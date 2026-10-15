"use client";

import { useSyncExternalStore } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserCircleIcon } from "@hugeicons/core-free-icons";

export function SignInButton() {
  const { data: session, isPending } = authClient.useSession();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted || isPending) {
    return (
      <div
        className="bg-muted h-7 w-full animate-pulse rounded-md"
        role="status"
        aria-label="Checking session"
      />
    );
  }

  if (session) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground flex items-center gap-2 truncate px-1 text-[0.8125rem]">
          <HugeiconsIcon
            icon={UserCircleIcon}
            strokeWidth={2}
            className="h-4 w-4"
          />
          {session.user.email}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => authClient.signOut()}
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      onClick={() =>
        authClient.signIn.social({
          provider: "google",
          callbackURL: "/",
        })
      }
    >
      Sign in with Google
    </Button>
  );
}
