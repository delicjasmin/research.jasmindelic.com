"use client";

import { useMemo, type ReactNode } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CitationChip,
  CitationClaim,
  CitationProvider,
  type CitationSource,
} from "@/components/citation-claim";
import { rehypeCiteClaims } from "@/lib/rehype-cite-claims";
import { cn } from "@/lib/utils";

export type MarkdownCitations = {
  sources: CitationSource[];
  documentUrl: string;
  documentTitle: string | null;
};

type Props = {
  content: string;
  className?: string;
  inverted?: boolean;
  citations?: MarkdownCitations;
};

function CitationSpan({
  children,
  node,
  ...props
}: {
  children?: ReactNode;
  node?: unknown;
  "data-cite-claim"?: string | number;
  "data-cite-chip"?: string | number;
}) {
  void node;
  const claim = props["data-cite-claim"];
  const chip = props["data-cite-chip"];
  if (chip != null && chip !== "") {
    return <CitationChip index={Number(chip)} />;
  }
  if (claim != null && claim !== "") {
    const indexes = String(claim)
      .split(",")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value));
    return <CitationClaim indexes={indexes}>{children}</CitationClaim>;
  }
  return <span {...props}>{children}</span>;
}

function createComponents(inverted: boolean): Components {
  const ink = inverted && "text-user-foreground";

  return {
    h1: ({ children }) => (
      <h1
        className={cn(
          "mt-[1.2em] mb-[0.45em] text-[1.625rem] leading-snug font-semibold first:mt-0",
          ink,
        )}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        className={cn(
          "mt-[1.15em] mb-[0.4em] text-[1.375rem] leading-snug font-semibold first:mt-0",
          ink,
        )}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        className={cn(
          "mt-[1.05em] mb-[0.35em] text-[1.125rem] leading-snug font-semibold first:mt-0",
          ink,
        )}
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4
        className={cn(
          "mt-[1em] mb-[0.3em] text-[1.125rem] leading-snug font-medium first:mt-0",
          ink,
        )}
      >
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className={cn("mb-[0.8em] last:mb-0", ink)}>{children}</p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => (
      <ul className="mb-[0.8em] list-disc space-y-2 pl-6 last:mb-0">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-[0.8em] list-decimal space-y-2 pl-6 last:mb-0">
        {children}
      </ol>
    ),
    li: ({ children }) => <li>{children}</li>,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "underline underline-offset-4",
          inverted ? "text-user-foreground" : "text-foreground",
        )}
      >
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className={cn(
          "my-[0.8em] border-l-2 pl-4 italic last:mb-0",
          inverted
            ? "border-user-foreground/40 text-user-foreground/90"
            : "border-foreground/25 text-foreground/90",
        )}
      >
        {children}
      </blockquote>
    ),
    code: ({ className, children }) => {
      const isBlock = className?.includes("language-");

      if (isBlock) {
        return (
          <code
            className={cn(
              "font-mono text-[0.9em]",
              inverted ? "text-user-foreground" : "text-foreground",
            )}
          >
            {children}
          </code>
        );
      }

      return (
        <code
          className={cn(
            "rounded px-1.5 py-0.5 font-mono text-[0.9em]",
            inverted
              ? "bg-user-foreground/15 text-user-foreground"
              : "bg-foreground/6 text-foreground",
          )}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre
        className={cn(
          "my-[0.8em] overflow-x-auto rounded-lg p-4 font-mono text-[0.9em] last:mb-0",
          inverted
            ? "bg-user-foreground/10 text-user-foreground"
            : "bg-foreground/5 text-foreground",
        )}
      >
        {children}
      </pre>
    ),
    hr: () => (
      <hr
        className={cn(
          "my-[1.2em] border-t",
          inverted ? "border-user-foreground/20" : "border-border",
        )}
      />
    ),
  };
}

export function MarkdownContent({
  content,
  className,
  inverted = false,
  citations,
}: Props) {
  const sourceCount = citations?.sources.length ?? 0;
  const rehypePlugins = useMemo(
    () => (sourceCount > 0 ? [rehypeCiteClaims(sourceCount)] : undefined),
    [sourceCount],
  );
  const components = createComponents(inverted);
  if (rehypePlugins) {
    components.span = CitationSpan;
  }

  const markdown = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={rehypePlugins}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );

  return (
    <div className={cn("reading", className)}>
      {citations && rehypePlugins ? (
        <CitationProvider
          sources={citations.sources}
          documentUrl={citations.documentUrl}
          documentTitle={citations.documentTitle}
        >
          {markdown}
        </CitationProvider>
      ) : (
        markdown
      )}
    </div>
  );
}
