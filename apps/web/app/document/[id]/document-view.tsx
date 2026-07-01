"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useResearchSocket,
  type Source,
  type DocumentProgressEvent,
  type DocumentReadyEvent,
  type DocumentErrorEvent,
  type AnswerChunkEvent,
  type AnswerDoneEvent,
  type AnswerErrorEvent,
} from "@/hooks/use-research-socket";
import type { DocumentResponse } from "@/lib/api";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  streaming?: boolean;
};

type Props = {
  documentId: string;
  initialDocument: DocumentResponse | null;
};

export function DocumentView({ documentId, initialDocument }: Props) {
  const [progress, setProgress] = useState(0);
  const [document, setDocument] = useState<DocumentResponse | null>(
    initialDocument,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isReady = document?.status === "READY";
  const isProcessing =
    document?.status === "PENDING" || document?.status === "PROCESSING";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const { ask } = useResearchSocket(documentId, {
    onProgress: useCallback(({ progress: p }: DocumentProgressEvent) => {
      setProgress(p);
      setDocument((prev) => (prev ? { ...prev, status: "PROCESSING" } : prev));
    }, []),

    onReady: useCallback(({ summary, title }: DocumentReadyEvent) => {
      setProgress(100);
      setDocument((prev) =>
        prev
          ? {
              ...prev,
              status: "READY",
              summary: summary ?? prev.summary,
              title: title ?? prev.title,
            }
          : prev,
      );
    }, []),

    onDocumentError: useCallback(({ message }: DocumentErrorEvent) => {
      toast.error(`Processing failed: ${message}`);
      setDocument((prev) => (prev ? { ...prev, status: "FAILED" } : prev));
    }, []),

    onAnswerChunk: useCallback(({ content }: AnswerChunkEvent) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.streaming) {
          return [
            ...prev.slice(0, -1),
            { ...last, content: last.content + content },
          ];
        }
        return prev;
      });
    }, []),

    onAnswerDone: useCallback(({ sources }: AnswerDoneEvent) => {
      setIsAsking(false);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.streaming) {
          return [...prev.slice(0, -1), { ...last, streaming: false, sources }];
        }
        return prev;
      });
    }, []),

    onAnswerError: useCallback(({ message }: AnswerErrorEvent) => {
      setIsAsking(false);
      toast.error(message);
      setMessages((prev) => prev.filter((m) => !m.streaming));
    }, []),
  });

  function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || isAsking) return;

    setQuestion("");
    setIsAsking(true);

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: q },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        streaming: true,
      },
    ]);

    ask(q);
  }

  if (!document) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center">
        <p className="text-muted-foreground">Document not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground mb-1 block text-xs"
          >
            ← New document
          </Link>
          <h1 className="truncate font-semibold">
            {document.title ?? "Analysing document…"}
          </h1>
          <p className="text-muted-foreground truncate font-mono text-xs">
            {document.url}
          </p>
        </div>
        <StatusBadge status={document.status} />
      </div>

      {/* Processing state */}
      {isProcessing && (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {progress < 25
                  ? "Downloading PDF…"
                  : progress < 50
                    ? "Parsing and chunking…"
                    : progress < 82
                      ? "Generating embeddings…"
                      : "Summarising…"}
              </span>
              <span className="font-mono text-xs tabular-nums">
                {progress}%
              </span>
            </div>
            <Progress value={progress} />
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {isReady && document.summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {document.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Chat */}
      {isReady && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-1 flex-col gap-4">
            {messages.length === 0 && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Ask a question about this document.
              </p>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleAsk}
            className="sticky bottom-4 flex items-end gap-2"
          >
            <Textarea
              placeholder="Ask a question about this document…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isAsking}
              className="max-h-40 min-h-11 resize-none text-sm"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk(e);
                }
              }}
            />
            <Button
              type="submit"
              disabled={isAsking || !question.trim()}
              className="shrink-0"
            >
              {isAsking ? "…" : "Ask"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Pending", className: "bg-muted text-muted-foreground" },
    PROCESSING: {
      label: "Processing",
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    },
    READY: {
      label: "Ready",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    },
    FAILED: {
      label: "Failed",
      className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    },
  };
  const { label, className } = map[status] ?? map.PENDING;
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isUser = message.role === "user";

  return (
    <div
      className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        }`}
      >
        {message.content ||
          (message.streaming ? <span className="opacity-50">●●●</span> : null)}
      </div>

      {!isUser &&
        !message.streaming &&
        message.sources &&
        message.sources.length > 0 && (
          <div className="w-full max-w-[85%] space-y-1">
            <button
              onClick={() => setSourcesOpen((o) => !o)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 pl-1 text-xs"
            >
              <span>{sourcesOpen ? "▾" : "▸"}</span>
              {message.sources.length} source
              {message.sources.length !== 1 ? "s" : ""}
            </button>

            {sourcesOpen && (
              <div className="space-y-2">
                {message.sources.map((source, i) => (
                  <div
                    key={source.id}
                    className="border-border/60 bg-muted/40 space-y-1 rounded-lg border px-3 py-2 text-xs"
                  >
                    <div className="text-muted-foreground flex items-center justify-between">
                      <span className="font-medium">
                        [{i + 1}] Page {source.pageNumber}
                      </span>
                      <span>{Math.round(source.similarity * 100)}% match</span>
                    </div>
                    <p className="text-foreground/80 line-clamp-4 leading-relaxed">
                      {source.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
    </div>
  );
}
