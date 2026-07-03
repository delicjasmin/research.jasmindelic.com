"use client";

import { useEffect, useRef, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/markdown-content";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";

type Props = {
  summary: string;
  hasMessages: boolean;
};

export function DocumentSummary({ summary, hasMessages }: Props) {
  const [open, setOpen] = useState(true);
  const hasAutoCollapsed = useRef(false);

  useEffect(() => {
    if (hasMessages && !hasAutoCollapsed.current) {
      hasAutoCollapsed.current = true;
      setOpen(false);
    }
  }, [hasMessages]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="border-border text-foreground bg-accent hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border-2 p-4 text-lg font-bold transition-[border-radius] duration-0 data-[state=closed]:delay-300 data-[state=open]:rounded-b-none">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Summary
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="CollapsibleContent">
        <div className="border-border max-h-96 overflow-y-auto rounded-xl rounded-t-none border border-t-0 p-4">
          <MarkdownContent content={summary} className="text-sm" />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
