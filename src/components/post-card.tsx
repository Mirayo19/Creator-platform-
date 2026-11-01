"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Badge, Button, Input } from "@/components/ui";
import { engagementRate, interactions } from "@/lib/metrics";
import { formatDate, formatNumber, formatPercent } from "@/lib/utils";
import { platformLabel, type Post } from "@/lib/types";
import { deletePost, updatePostMetrics } from "@/app/actions";

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="min-w-16">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      {value === null ? <div className="text-sm text-muted" title="Not available">Unavailable</div> : <div className="text-sm font-medium tabular-nums">{formatNumber(value)}</div>}
    </div>
  );
}

export function PostCard({ post }: { post: Post }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const rate = engagementRate(post);
  const [expanded, setExpanded] = useState(false);
  const long = post.content.length > 280;

  return (
    <article className="animate-in rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge tone="accent">{platformLabel(post.platform)}</Badge>
        <span>{formatDate(post.published_at)}</span>
        {post.is_sample && <Badge tone="warn">Sample data</Badge>}
        {post.url && <a href={post.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent hover:underline">View original ↗</a>}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{long && !expanded ? post.content.slice(0, 280) + "…" : post.content}</p>
      {long && <button onClick={() => setExpanded(!expanded)} className="mt-1 text-xs text-accent hover:underline">{expanded ? "Show less" : "Show more"}</button>}

      {editing ? (
        <form className="mt-4 space-y-3" onSubmit={(e) => {
          e.preventDefault();
          const fd = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
          start(async () => {
            const r = await updatePostMetrics(post.id, fd);
            if (!r.ok) return setErr(r.error);
            setEditing(false); setErr(null); router.refresh();
          });
        }}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["likes", "comments", "reposts", "impressions"] as const).map((k) => (
              <Input key={k} name={k} defaultValue={post[k] ?? ""} inputMode="numeric" placeholder={k} aria-label={k} />
            ))}
          </div>
          {err && <p role="alert" className="text-xs text-bad">{err}</p>}
          <div className="flex gap-2"><Button type="submit" loading={pending}>Save</Button><Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button></div>
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Metric label="Likes" value={post.likes} />
            <Metric label="Comments" value={post.comments} />
            <Metric label="Reposts" value={post.reposts} />
            <Metric label="Impressions" value={post.impressions} />
            <div className="min-w-16">
              <div className="text-[11px] uppercase tracking-wide text-muted">Eng. rate</div>
              {rate === null
                ? <div className="text-sm text-muted" title={post.impressions === null ? "Needs impressions" : "Unavailable"}>{interactions(post) === null ? "Unavailable" : "Needs impressions"}</div>
                : <div className="text-sm font-medium tabular-nums">{formatPercent(rate)}</div>}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" onClick={() => setEditing(true)} aria-label="Edit metrics"><Pencil className="size-4" />Metrics</Button>
            <Button variant="ghost" loading={pending} aria-label="Delete post" onClick={() => {
              if (!window.confirm("Delete this post from your library? Analyses already generated are kept.")) return;
              start(async () => { await deletePost(post.id); router.refresh(); });
            }}><Trash2 className="size-4" /></Button>
          </div>
        </div>
      )}
    </article>
  );
}
