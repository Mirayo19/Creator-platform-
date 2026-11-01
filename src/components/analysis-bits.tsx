import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { Badge, Card, EmptyState, Notice } from "@/components/ui";
import { runAnalysis } from "@/app/actions";
import { formatDate, timeAgo } from "@/lib/utils";
import type { AnalysisKind, AnalysisRow, Post } from "@/lib/types";
import { Sparkles } from "lucide-react";

export const BasisBadge = ({ basis }: { basis: string }) =>
  basis === "data_supported" ? <Badge tone="good">Data-supported</Badge> : <Badge tone="warn">Interpretation</Badge>;

export const ConfidenceBadge = ({ level }: { level: string }) => <Badge tone={level === "high" ? "good" : level === "medium" ? "accent" : "neutral"}>{level} confidence</Badge>;

/** Shows the real posts cited as evidence — only ids that resolved to the creator's actual posts get here. */
export function Evidence({ ids, posts }: { ids: string[]; posts: Post[] }) {
  const cited = ids.map((id) => posts.find((p) => p.id === id)).filter((p): p is Post => !!p);
  if (cited.length === 0) return null;
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer select-none text-muted hover:text-text">Evidence · {cited.length} {cited.length === 1 ? "post" : "posts"}</summary>
      <ul className="mt-2 space-y-2">
        {cited.map((p) => (
          <li key={p.id} className="rounded-lg bg-surface2 p-3 leading-relaxed">
            <div className="mb-1 text-muted">{formatDate(p.published_at)}{p.is_sample ? " · Sample" : ""}</div>
            <div className="whitespace-pre-wrap">{p.content.length > 240 ? p.content.slice(0, 240) + "…" : p.content}</div>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function AnalysisBar({ row, kind, label, postCount, disabledReason }: {
  row: AnalysisRow | null; kind: AnalysisKind; label: string; postCount: number; disabledReason?: string;
}) {
  const stale = row && postCount > row.posts_analysed;
  return (
    <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="text-sm">
        {row ? (
          <>
            <span className="font-medium">Version {row.version}</span>
            <span className="text-muted"> · based on {row.posts_analysed} items · updated {timeAgo(row.created_at)}</span>
            {stale && <span className="ml-2"><Badge tone="warn">{postCount - row.posts_analysed} new since last run</Badge></span>}
          </>
        ) : <span className="text-muted">Not generated yet. Results are saved so they stay consistent until you refresh.</span>}
      </div>
      <ActionButton action={() => runAnalysis(kind)} disabled={!!disabledReason}>
        <Sparkles className="size-4" />{row ? `Refresh ${label}` : `Generate ${label}`}
      </ActionButton>
      {disabledReason && <div className="w-full"><Notice>{disabledReason}</Notice></div>}
    </Card>
  );
}

export function NeedsContent({ need, have }: { need: number; have: number }) {
  return (
    <EmptyState icon={<Sparkles className="size-8" />} title="Add more content to unlock this"
      description={`This analysis needs at least ${need} posts to avoid drawing conclusions from too little data. You have ${have}.`}
      action={<Link href="/library" className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-text">Go to Content Library</Link>} />
  );
}
