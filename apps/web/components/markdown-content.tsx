"use client";

import { useCallback, useMemo, type ReactNode } from "react";
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
  return {
    h1: ({ children }) => (
      <h1
        className={cn(
          "mt-4 mb-2 text-lg font-semibold first:mt-0",
          inverted && "text-primary-foreground",
        )}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        className={cn(
          "mt-4 mb-2 text-base font-semibold first:mt-0",
          inverted && "text-primary-foreground",
        )}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        className={cn(
          "mt-3 mb-1.5 text-sm font-semibold first:mt-0",
          inverted && "text-primary-foreground",
        )}
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4
        className={cn(
          "mt-3 mb-1 text-sm font-medium first:mt-0",
          inverted && "text-primary-foreground",
        )}
      >
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p
        className={cn(
          "mb-2 last:mb-0",
          inverted && "text-primary-foreground",
        )}
      >
        {children}
      </p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => (
      <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "underline underline-offset-2",
          inverted
            ? "text-primary-foreground"
            : "text-foreground hover:text-foreground/80",
        )}
      >
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className={cn(
          "border-border text-muted-foreground my-2 border-l-2 pl-3 italic",
          inverted && "border-primary-foreground/40 text-primary-foreground/80",
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
              "font-mono text-xs",
              inverted ? "text-primary-foreground" : "text-foreground",
            )}
          >
            {children}
          </code>
        );
      }

      return (
        <code
          className={cn(
            "rounded px-1 py-0.5 font-mono text-[0.8125rem]",
            inverted
              ? "bg-primary-foreground/15 text-primary-foreground"
              : "bg-background/60 text-foreground",
          )}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre
        className={cn(
          "my-2 overflow-x-auto rounded-lg p-3 font-mono text-xs last:mb-0",
          inverted
            ? "bg-primary-foreground/10 text-primary-foreground"
            : "bg-background/60 text-foreground",
        )}
      >
        {children}
      </pre>
    ),
    hr: () => (
      <hr
        className={cn(
          "my-3 border-t",
          inverted ? "border-primary-foreground/20" : "border-border",
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
  const renderExcerpt = useCallback(
    (excerpt: string) => (
      <MarkdownContent
        content={excerpt}
        className="text-foreground/90 line-clamp-4 text-xs leading-relaxed"
      />
    ),
    [],
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
    <div className={cn("leading-relaxed", className)}>
      {citations && rehypePlugins ? (
        <CitationProvider
          sources={citations.sources}
          documentUrl={citations.documentUrl}
          documentTitle={citations.documentTitle}
          renderExcerpt={renderExcerpt}
        >
          {markdown}
        </CitationProvider>
      ) : (
        markdown
      )}
    </div>
  );
}
