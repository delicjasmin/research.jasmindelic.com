"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/components/chat-composer";
import { DocumentSummary } from "@/components/document-summary";
import { MarkdownContent } from "@/components/markdown-content";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Spinner } from "@/components/ui/spinner";
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
  fetchModels,
} from "@/lib/api";

type Message = ConversationMessage & {
  streaming?: boolean;
};

type Props = {
  conversationId: string;
  initialConversation: ConversationDetail;
  readOnly?: boolean;
};

function getProcessingLabel(progress: number) {
  if (progress < 25) return "Downloading PDF…";
  if (progress < 50) return "Parsing and chunking…";
  if (progress < 82) return "Generating embeddings…";
  return "Summarising…";
}

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
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: modelsData } = useQuery({
    queryKey: ["models"],
    queryFn: () => fetchModels(),
    enabled: !readOnly,
  });

  const models = modelsData?.models ?? [];
  const selectableModels = models.filter((model) => model.available);
  const preferredModelId =
    selectedModelId ??
    modelsData?.defaultModelId ??
    selectableModels[0]?.id ??
    null;
  const activeModelId = selectableModels.some(
    (model) => model.id === preferredModelId,
  )
    ? preferredModelId
    : (selectableModels[0]?.id ?? null);

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

      onReady: useCallback(
        ({ summary, title }: DocumentReadyEvent) => {
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
        },
        [queryClient],
      ),

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
    if (!q || isAsking || readOnly || !activeModelId) return;

    setQuestion("");
    setIsAsking(true);

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: q,
        sources: null,
        model: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        sources: null,
        model: activeModelId,
        createdAt: new Date().toISOString(),
        streaming: true,
      },
    ]);

    ask(conversationId, q, activeModelId);
  }

  const title = conversation.title ?? document.title ?? "Analysing document…";

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-3 py-4 md:px-4 md:py-8 lg:w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="truncate font-semibold">{title}</h1>
          <p className="text-muted-foreground truncate font-mono text-xs">
            {document.url}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          {!readOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                disabled={isSharing || !isReady}
                className="hidden sm:inline-flex"
              >
                {conversation.shareToken ? "Copy link" : "Share"}
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleShare}
                disabled={isSharing || !isReady}
                className="sm:hidden"
                aria-label={conversation.shareToken ? "Copy link" : "Share"}
              >
                <span aria-hidden>↗</span>
              </Button>
              {conversation.shareToken && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUnshare}
                  disabled={isSharing}
                  className="hidden sm:inline-flex"
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
            <Marker role="status" variant="border">
              <MarkerIcon>
                <Spinner className="size-3.5" />
              </MarkerIcon>
              <MarkerContent className="shimmer">
                {getProcessingLabel(progress)}
              </MarkerContent>
              <span className="ml-auto font-mono text-xs tabular-nums">
                {progress}%
              </span>
            </Marker>
            <Progress value={progress} />
          </CardContent>
        </Card>
      )}

      {isReady && document.summary && (
        <DocumentSummary
          summary={document.summary}
          hasMessages={messages.length > 0}
        />
      )}

      {(isReady || readOnly) && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-1 flex-col gap-4">
            {messages.length === 0 && !readOnly && (
              <p className="text-muted-foreground py-2 text-center text-sm">
                Ask a question about this document.
              </p>
            )}
            {messages.map((msg, index) => {
              const showStreamingMarker =
                msg.streaming && !msg.content && msg.role === "assistant";
              const prevMsg = index > 0 ? messages[index - 1] : null;

              return (
                <div key={msg.id} className="flex flex-col gap-2">
                  {showStreamingMarker && prevMsg?.role === "user" && (
                    <StreamingMarker />
                  )}
                  <MessageBubble
                    message={msg}
                    modelLabel={
                      msg.model
                        ? (() => {
                            const model = models.find(
                              (m) => m.id === msg.model,
                            );
                            return model
                              ? `${model.label} · ${model.hint}`
                              : msg.model;
                          })()
                        : null
                    }
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {!readOnly && isReady && (
            <ChatComposer
              question={question}
              onQuestionChange={setQuestion}
              onSubmit={handleAsk}
              isAsking={isAsking}
              models={models}
              activeModelId={activeModelId}
              onModelChange={setSelectedModelId}
            />
          )}
        </div>
      )}

      {readOnly && (
        <p className="text-muted-foreground text-center text-xs">
          This is a shared conversation preview.
        </p>
      )}
    </div>
  );
}

function StreamingMarker() {
  return (
    <Marker role="status" className="pl-1">
      <MarkerIcon>
        <Spinner className="size-3.5" />
      </MarkerIcon>
      <MarkerContent className="shimmer">Thinking…</MarkerContent>
    </Marker>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Pending", className: "bg-muted text-muted-foreground" },
    PROCESSING: {
      label: "Processing",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    },
    READY: {
      label: "Ready",
      className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    },
    FAILED: {
      label: "Failed",
      className: "bg-red-500/15 text-red-700 dark:text-red-400",
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

function MessageBubble({
  message,
  modelLabel,
}: {
  message: Message;
  modelLabel: string | null;
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isUser = message.role === "user";
  const sources = message.sources as Source[] | null;
  const isEmptyStreaming = message.streaming && !message.content;

  if (isEmptyStreaming) {
    return null;
  }

  return (
    <div
      className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : `bg-muted text-foreground rounded-bl-sm${message.streaming ? "ring-border/60 ring-1" : ""}`
        }`}
      >
        {isUser ? (
          message.content
        ) : (
          <MarkdownContent content={message.content} className="text-sm" />
        )}
      </div>

      {!isUser && !message.streaming && modelLabel && (
        <p className="text-muted-foreground pl-1 text-xs">{modelLabel}</p>
      )}

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
                  <MarkdownContent
                    content={source.content}
                    className="text-foreground/90 line-clamp-4 text-xs leading-relaxed"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
