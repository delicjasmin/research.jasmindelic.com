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
import { highlightSpans } from "@/lib/citation-highlight";
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
  children,
}: {
  sources: CitationSource[];
  documentUrl: string;
  documentTitle: string | null;
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
      }}
    >
      {children}
    </CitationContext.Provider>
  );
}

function openPdf(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "but",
  "by",
  "for",
  "from",
  "had",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "were",
  "which",
  "with",
  "through",
  "across",
  "between",
  "within",
  "after",
  "before",
  "about",
  "while",
  "where",
  "these",
  "those",
  "both",
  "only",
]);

function plainText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainText).join("");
  if (isValidElement(node)) {
    return plainText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordsOf(text: string): string[] {
  return text.match(/\p{L}[\p{L}\p{N}'-]*/gu) ?? [];
}

function keywordsOf(text: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const word of wordsOf(text)) {
    const term = word.toLowerCase();
    if (term.length < 4 || STOP_WORDS.has(term) || seen.has(term)) continue;
    seen.add(term);
    terms.push(term);
  }
  return terms;
}

function phraseStart(source: string, claimWords: string[]): number {
  const max = Math.min(8, claimWords.length);
  for (let size = max; size >= 3; size -= 1) {
    for (let index = 0; index <= claimWords.length - size; index += 1) {
      const pattern = claimWords
        .slice(index, index + size)
        .map((word) => escapeRegExp(word))
        .join("\\W+");
      const match = new RegExp(pattern, "i").exec(source);
      if (match) return match.index;
    }
  }
  return -1;
}

function keywordStart(source: string, terms: string[]): number {
  const hits: { index: number; term: string }[] = [];
  for (const term of terms) {
    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi");
    for (const match of source.matchAll(pattern)) {
      if (match.index != null) hits.push({ index: match.index, term });
    }
  }
  if (hits.length === 0) return 0;

  let bestIndex = hits[0].index;
  let bestScore = 0;
  for (const hit of hits) {
    const seen = new Set(
      hits
        .filter(
          (other) => other.index >= hit.index && other.index < hit.index + 360,
        )
        .map((other) => other.term),
    );
    if (seen.size > bestScore) {
      bestScore = seen.size;
      bestIndex = hit.index;
    }
  }
  return bestIndex;
}

function alignStart(source: string, index: number): number {
  if (index <= 0) return 0;
  const before = source.slice(0, index);
  let boundary = -1;
  for (const mark of ["\n", ". ", "? ", "! "]) {
    boundary = Math.max(boundary, before.lastIndexOf(mark));
  }
  if (boundary === -1) return index;
  const after = source[boundary] === "\n" ? boundary + 1 : boundary + 2;
  if (index - after > 120) return index;
  return after;
}

function focusExcerpt(source: string, claim: string): string {
  const terms = keywordsOf(claim);
  const claimWords = wordsOf(claim);
  let start = claimWords.length >= 3 ? phraseStart(source, claimWords) : -1;
  if (start < 0) start = terms.length > 0 ? keywordStart(source, terms) : 0;
  start = alignStart(source, start);

  const sliced = source.slice(start).replace(/\s+/g, " ").trim();
  const limit = 560;
  const text =
    sliced.length > limit
      ? `${sliced.slice(0, limit).replace(/\s+\S*$/, "")}…`
      : sliced;
  return text;
}

function CitationExcerpt({ text, claim }: { text: string; claim: string }) {
  const className =
    "text-foreground/90 line-clamp-6 text-[0.9375rem] leading-[1.6]";
  const spans = highlightSpans(text, claim);
  if (spans.length === 0 || !text) {
    return <p className={className}>{text}</p>;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;
  spans.forEach((span, index) => {
    if (span.start > cursor) {
      nodes.push(
        <span key={`t-${index}`}>{text.slice(cursor, span.start)}</span>,
      );
    }
    nodes.push(
      <mark
        key={`m-${index}`}
        className="bg-primary/20 text-foreground box-decoration-clone rounded-sm px-0.5 font-semibold"
      >
        {text.slice(span.start, span.end)}
      </mark>,
    );
    cursor = span.end;
  });
  if (cursor < text.length) {
    nodes.push(<span key="tail">{text.slice(cursor)}</span>);
  }

  return <p className={className}>{nodes}</p>;
}

function CitationCard({
  indexes,
  claim,
}: {
  indexes: number[];
  claim: string;
}) {
  const { sources, documentUrl, documentTitle } = useCitations();
  const title = documentTitle?.trim() || "Document";

  return (
    <div className="flex max-h-80 flex-col gap-3 overflow-y-auto p-3">
      <p className="truncate text-sm font-medium">{title}</p>
      {indexes.map((index, position) => {
        const source = sources[index - 1];
        if (!source) return null;
        const href = pdfPageHref(documentUrl, source.pageNumber);
        const excerpt = focusExcerpt(source.content, claim);
        return (
          <div key={`${index}-${position}`} className="flex flex-col gap-1.5">
            <p className="text-muted-foreground text-[0.8125rem] font-medium">
              Page {source.pageNumber}
            </p>
            <CitationExcerpt text={excerpt} claim={claim} />
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
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
          className="w-88 max-w-[min(22rem,calc(100vw-2rem))] p-0"
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
        className="w-88 max-w-[min(22rem,calc(100vw-2rem))] p-0"
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
    <CitationPopup card={<CitationCard indexes={indexes} claim={plainText(body)} />}>
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
        "bg-primary/15 text-primary ms-0.5 inline-flex cursor-pointer rounded px-1 align-super text-[11px] leading-none font-medium no-underline",
        "focus-visible:ring-ring/30 focus-visible:ring-2 focus-visible:outline-none",
      )}
    >
      {index}
    </button>
  );
}
