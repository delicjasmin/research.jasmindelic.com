"use client";

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, pdfPageHref } from "@/lib/utils";

export type CitationSource = {
  content: string;
  pageNumber: number;
};

type CitationContextValue = {
  sources: CitationSource[];
  documentUrl: string;
  documentTitle: string | null;
  fineHover: boolean;
  renderExcerpt: (content: string) => ReactNode;
};

const CitationContext = createContext<CitationContextValue | null>(null);

function useCitations(): CitationContextValue {
  const value = useContext(CitationContext);
  if (!value) {
    throw new Error("Citation components must render inside CitationProvider");
  }
  return value;
}

export function CitationProvider({
  sources,
  documentUrl,
  documentTitle,
  renderExcerpt,
  children,
}: {
  sources: CitationSource[];
  documentUrl: string;
  documentTitle: string | null;
  renderExcerpt: (content: string) => ReactNode;
  children: ReactNode;
}) {
  const [fineHover, setFineHover] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFineHover(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <CitationContext.Provider
      value={{
        sources,
        documentUrl,
        documentTitle,
        fineHover,
        renderExcerpt,
      }}
    >
      {children}
    </CitationContext.Provider>
  );
}

function openPdf(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
}

function CitationCard({ indexes }: { indexes: number[] }) {
  const { sources, documentUrl, documentTitle, renderExcerpt } = useCitations();
  const title = documentTitle?.trim() || "Document";

  return (
    <div className="flex max-h-80 flex-col gap-3 overflow-y-auto p-3">
      <p className="truncate text-sm font-medium">{title}</p>
      {indexes.map((index, position) => {
        const source = sources[index - 1];
        if (!source) return null;
        const href = pdfPageHref(documentUrl, source.pageNumber);
        return (
          <div
            key={`${index}-${position}`}
            className="flex flex-col gap-1.5"
          >
            <p className="text-muted-foreground text-xs font-medium">
              Page {source.pageNumber}
            </p>
            {renderExcerpt(source.content)}
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
            >
              Open page {source.pageNumber}
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                strokeWidth={2}
                className="size-3"
              />
            </a>
          </div>
        );
      })}
    </div>
  );
}

function CitationPopup({
  children,
  card,
}: {
  children: ReactNode;
  card: ReactNode;
}) {
  const { fineHover } = useCitations();
  if (fineHover) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>{children}</HoverCardTrigger>
        <HoverCardContent
          side="bottom"
          collisionPadding={16}
          className="w-80 p-0"
        >
          {card}
        </HoverCardContent>
      </HoverCard>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="bottom"
        collisionPadding={16}
        className="w-80 p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {card}
      </PopoverContent>
    </Popover>
  );
}

function isCitationChip(child: ReactNode): boolean {
  return (
    isValidElement(child) &&
    (child.props as { "data-cite-chip"?: unknown })["data-cite-chip"] != null
  );
}

const claimClassName =
  "cursor-pointer rounded-sm bg-primary/10 focus-visible:ring-ring/30 focus-visible:ring-2 focus-visible:outline-none";

const claimTextClassName =
  "underline decoration-primary/50 decoration-dotted underline-offset-4";

export function CitationClaim({
  indexes,
  children,
}: {
  indexes: number[];
  children: ReactNode;
}) {
  const { sources, documentUrl, fineHover } = useCitations();
  const first = indexes[0];

  function openIndex(index: number | undefined) {
    if (!index) return;
    const source = sources[index - 1];
    if (!source) return;
    openPdf(pdfPageHref(documentUrl, source.pageNumber));
  }

  function onClick(event: MouseEvent<HTMLSpanElement>) {
    if (!fineHover) return;
    const target = event.target;
    if (target instanceof Element && target.closest("[data-cite-chip]")) {
      return;
    }
    openIndex(first);
  }

  function onKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key !== "Enter" || event.target !== event.currentTarget) return;
    event.preventDefault();
    openIndex(first);
  }

  function onBlur(event: FocusEvent<HTMLSpanElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) {
      event.preventDefault();
    }
  }

  const items = Children.toArray(children);
  const chips = items.filter(isCitationChip);
  const body = items.filter((child) => !isCitationChip(child));

  return (
    <CitationPopup card={<CitationCard indexes={indexes} />}>
      <span
        data-cite-claim={indexes.join(",")}
        tabIndex={0}
        className={claimClassName}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      >
        <span className={claimTextClassName}>{body}</span>
        {chips}
      </span>
    </CitationPopup>
  );
}

export function CitationChip({ index }: { index: number }) {
  const { sources, documentUrl, fineHover } = useCitations();
  const source = sources[index - 1];
  if (!source) return null;
  const label = `Source ${index}, page ${source.pageNumber}`;

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    const keyboard = event.detail === 0;
    if (!fineHover && !keyboard) return;
    event.stopPropagation();
    openPdf(pdfPageHref(documentUrl, source.pageNumber));
  }

  return (
    <button
      type="button"
      data-cite-chip={index}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "bg-primary/15 text-primary ms-0.5 inline-flex cursor-pointer rounded px-1 align-super text-[10px] leading-none font-medium no-underline",
        "focus-visible:ring-ring/30 focus-visible:ring-2 focus-visible:outline-none",
      )}
    >
      {index}
    </button>
  );
}
