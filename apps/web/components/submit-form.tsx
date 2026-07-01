"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { submitDocument } from "@/lib/api";

export function SubmitForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    try {
      const { id } = await submitDocument(url.trim());
      router.push(`/document/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit document");
      setLoading(false);
    }
  }

  return (
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
              disabled={loading}
              className="font-mono text-sm"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !url.trim()}>
            {loading ? "Submitting…" : "Analyse PDF"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
