"use client";

import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { fetchUsage, type UsageSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatQuota(
  label: string,
  quota: UsageSummary["documents"],
): string | null {
  if (quota.limit === null) return null;
  return `${label}: ${quota.used}/${quota.limit} today`;
}

type Props = {
  className?: string;
  showQuestions?: boolean;
};

export function UsageLimits({ className, showQuestions = true }: Props) {
  const { data: session } = authClient.useSession();
  const { data: usage } = useQuery<UsageSummary>({
    queryKey: ["usage"],
    queryFn: () => fetchUsage(),
    enabled: !!session,
    refetchInterval: 60_000,
  });

  if (!usage) return null;

  if (usage.plan !== "free") {
    return (
      <p className={cn("text-muted-foreground text-[0.8125rem]", className)}>
        {usage.plan} plan · unlimited usage
      </p>
    );
  }

  const parts = [
    formatQuota("Documents", usage.documents),
    showQuestions ? formatQuota("Questions", usage.questions) : null,
  ].filter(Boolean);

  const atDocumentLimit = usage.documents.remaining === 0;
  const atQuestionLimit = showQuestions && usage.questions.remaining === 0;

  return (
    <p
      className={cn(
        "text-[0.8125rem]",
        atDocumentLimit || atQuestionLimit
          ? "text-destructive"
          : "text-muted-foreground",
        className,
      )}
    >
      {parts.join(" · ")}
      {(atDocumentLimit || atQuestionLimit) && " · Resets at midnight UTC"}
    </p>
  );
}
