"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AuthDialog } from "@/components/auth-dialog";
import { UsageLimits } from "@/components/usage-limits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { submitDocument } from "@/lib/api";

export function SubmitForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    if (!session) {
      setAuthOpen(true);
      return;
    }

    setLoading(true);
    try {
      const { conversationId } = await submitDocument(url.trim());
      router.push(`/c/${conversationId}`);
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["usage"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit document");
      setLoading(false);
    }
  }

  return (
    <>
      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="pdf-url" className="text-sm font-medium">
                PDF URL
              </label>
              <Input
                id="pdf-url"
                type="url"
                placeholder="https://arxiv.org/pdf/…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading || isPending}
                className="font-mono text-sm"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || isPending || !url.trim()}
            >
              {loading ? "Submitting…" : "Analyse PDF"}
            </Button>
            {session && <UsageLimits showQuestions={false} className="text-center" />}
          </form>
        </CardContent>
      </Card>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
