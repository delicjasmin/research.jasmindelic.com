"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelPicker } from "@/components/model-picker";
import { UsageLimits } from "@/components/usage-limits";
import type { ChatModelOption } from "@/lib/api";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp02Icon } from "@hugeicons/core-free-icons";
import { Separator } from "./ui/separator";

type Props = {
  question: string;
  onQuestionChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isAsking: boolean;
  models: ChatModelOption[];
  activeModelId: string | null;
  onModelChange: (modelId: string) => void;
};

export function ChatComposer({
  question,
  onQuestionChange,
  onSubmit,
  isAsking,
  models,
  activeModelId,
  onModelChange,
}: Props) {
  const canSubmit = !isAsking && question.trim().length > 0 && !!activeModelId;

  return (
    <div className="bg-background/80 sticky bottom-0 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
      <form onSubmit={onSubmit}>
        <div className="border-border bg-background flex flex-col rounded-3xl border shadow-sm sm:flex-row sm:items-center sm:gap-2 sm:p-2">
          <div className="hidden shrink-0 sm:flex sm:items-center">
            <ModelPicker
              models={models}
              value={activeModelId}
              onChange={onModelChange}
              disabled={isAsking}
            />
          </div>

          <Textarea
            placeholder="Ask a question about this document…"
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            disabled={isAsking}
            className="max-h-40 min-h-11 resize-none border-0 bg-transparent px-4 pt-4 pb-2 text-base shadow-none focus-visible:ring-0 sm:min-h-10 sm:flex-1 sm:px-3 sm:py-2.5"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
          />

          <Separator className="opacity-60 sm:hidden" />

          <div className="flex w-full items-center justify-between gap-2 p-2 sm:contents sm:p-0">
            <div className="sm:hidden">
              <ModelPicker
                models={models}
                value={activeModelId}
                onChange={onModelChange}
                disabled={isAsking}
              />
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              size="sm"
              aria-label={isAsking ? "Asking" : "Ask"}
              className="ml-auto h-9 shrink-0 rounded-full px-4 sm:ml-0 sm:size-9 sm:p-0"
            >
              <HugeiconsIcon
                icon={ArrowUp02Icon}
                strokeWidth={2}
                className="hidden size-4 sm:block"
              />
              <span className="sm:hidden">{isAsking ? "…" : "Ask"}</span>
            </Button>
          </div>
        </div>
      </form>
      <UsageLimits className="text-center" />
    </div>
  );
}
