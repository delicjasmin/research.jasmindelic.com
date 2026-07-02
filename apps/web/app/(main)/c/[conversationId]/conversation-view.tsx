"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UsageLimits } from "@/components/usage-limits";
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
import {
  type ConversationDetail,
  type ConversationMessage,
  disableConversationShare,
  enableConversationShare,
} from "@/lib/api";

type Message = ConversationMessage & {
  streaming?: boolean;
};

type Props = {
  conversationId: string;
  initialConversation: ConversationDetail;
  readOnly?: boolean;
};

export function ConversationView({
  conversationId,
  initialConversation,
  readOnly = false,
}: Props) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [conversation, setConversation] = useState(initialConversation);
  const [messages, setMessages] = useState<Message[]>(
    initialConversation.messages,
  );
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const document = conversation.document;
  const isReady = document.status === "READY";
  const isProcessing =
    document.status === "PENDING" || document.status === "PROCESSING";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const { ask } = useResearchSocket(
    document.id,
    {
    onProgress: useCallback(({ progress: p }: DocumentProgressEvent) => {
      setProgress(p);
      setConversation((prev) => ({
        ...prev,
        document: { ...prev.document, status: "PROCESSING" },
      }));
    }, []),

    onReady: useCallback(({ summary, title }: DocumentReadyEvent) => {
      setProgress(100);
      setConversation((prev) => ({
        ...prev,
        document: {
          ...prev.document,
          status: "READY",
          summary: summary ?? prev.document.summary,
          title: title ?? prev.document.title,
        },
      }));
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }, [queryClient]),

    onDocumentError: useCallback(({ message }: DocumentErrorEvent) => {
      toast.error(`Processing failed: ${message}`);
      setConversation((prev) => ({
        ...prev,
        document: {
          ...prev.document,
          status: "FAILED",
          errorMessage: message,
        },
      }));
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

    onAnswerDone: useCallback(
      ({ sources, assistantMessageId }: AnswerDoneEvent) => {
        setIsAsking(false);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.streaming) {
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                id: assistantMessageId ?? last.id,
                streaming: false,
                sources,
              },
            ];
          }
          return prev;
        });
        void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        void queryClient.invalidateQueries({
          queryKey: ["conversation", conversationId],
        });
        void queryClient.invalidateQueries({ queryKey: ["usage"] });
      },
      [conversationId, queryClient],
    ),

    onAnswerError: useCallback(({ message }: AnswerErrorEvent) => {
      setIsAsking(false);
      toast.error(message);
      setMessages((prev) => prev.filter((m) => !m.streaming));
    }, []),
  },
    !readOnly,
  );

  async function handleShare() {
    setIsSharing(true);
    try {
      if (conversation.shareToken) {
        const url = `${window.location.origin}/share/${conversation.shareToken}`;
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied");
        return;
      }

      const { shareToken } = await enableConversationShare(conversationId);
      const url = `${window.location.origin}/share/${shareToken}`;
      await navigator.clipboard.writeText(url);
      setConversation((prev) => ({ ...prev, shareToken }));
      toast.success("Share link created and copied");
    } catch {
      toast.error("Failed to share conversation");
    } finally {
      setIsSharing(false);
    }
  }

  async function handleUnshare() {
    setIsSharing(true);
    try {
      await disableConversationShare(conversationId);
      setConversation((prev) => ({ ...prev, shareToken: null }));
      toast.success("Sharing disabled");
    } catch {
      toast.error("Failed to disable sharing");
    } finally {
      setIsSharing(false);
    }
  }

  function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || isAsking || readOnly) return;

    setQuestion("");
    setIsAsking(true);

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: q,
        sources: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        sources: null,
        createdAt: new Date().toISOString(),
        streaming: true,
      },
    ]);

    ask(conversationId, q);
  }

  const title =
    conversation.title ??
    document.title ??
    "Analysing document…";

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate font-semibold">{title}</h1>
          <p className="text-muted-foreground truncate font-mono text-xs">
            {document.url}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!readOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                disabled={isSharing || !isReady}
              >
                {conversation.shareToken ? "Copy link" : "Share"}
              </Button>
              {conversation.shareToken && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUnshare}
                  disabled={isSharing}
                >
                  Unshare
                </Button>
              )}
            </>
          )}
          <StatusBadge status={document.status} />
        </div>
      </div>

      {document.status === "FAILED" && document.errorMessage && (
        <Card className="border-destructive/40">
          <CardContent className="pt-5">
            <p className="text-destructive text-sm">{document.errorMessage}</p>
          </CardContent>
        </Card>
      )}

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

      {(isReady || readOnly) && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-1 flex-col gap-4">
            {messages.length === 0 && !readOnly && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Ask a question about this document.
              </p>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {!readOnly && isReady && (
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
          )}
          {!readOnly && isReady && (
            <UsageLimits className="text-center" />
          )}
        </div>
      )}

      {readOnly && (
        <p className="text-muted-foreground text-center text-xs">
          This is a shared read-only conversation.
        </p>
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
  const sources = message.sources as Source[] | null;

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

      {!isUser && !message.streaming && sources && sources.length > 0 && (
        <div className="w-full max-w-[85%] space-y-1">
          <button
            type="button"
            onClick={() => setSourcesOpen((o) => !o)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 pl-1 text-xs"
          >
            <span>{sourcesOpen ? "▾" : "▸"}</span>
            {sources.length} source
            {sources.length !== 1 ? "s" : ""}
          </button>

          {sourcesOpen && (
            <div className="space-y-2">
              {sources.map((source, i) => (
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
