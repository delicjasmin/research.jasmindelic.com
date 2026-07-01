"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <Button variant="outline" size="sm" className="w-full" disabled>
        Loading…
      </Button>
    );
  }

  if (session) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground truncate px-1 text-xs">
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
