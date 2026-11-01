import Link from "next/link";
import { ArrowRight, Dna, Lightbulb } from "lucide-react";
import { TrendChart } from "@/components/charts";
import { Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { getLatestAnalysis, getPosts, getProfile } from "@/lib/data";
import { averageEngagementRate, bestPost, interactions } from "@/lib/metrics";
import { computeStats } from "@/lib/stats";
import { formatNumber, formatPercent } from "@/lib/utils";
import type { PerformancePatterns, WritingDna } from "@/lib/ai/schemas";
import { addSampleData } from "@/app/actions";
import { Library } from "lucide-react";

export default async function OverviewPage() {
  const [posts, profile, dna, perf] = await Promise.all([
    getPosts(), getProfile(), getLatestAnalysis<WritingDna>("writing_dna"), getLatestAnalysis<PerformancePatterns>("performance_patterns"),
  ]);

  if (posts.length === 0) {
    return (
      <>
        <PageHeader title={`Welcome${profile.creator_name ? `, ${profile.creator_name}` : ""}`} description="Your strategist learns from your own content. Start by giving it something to learn from." />
        <EmptyState icon={<Library className="size-8" />} title="No content analysed yet"
          description="Import past posts by pasting them, linking public X posts, or uploading a CSV. Or explore with clearly-labelled sample data first."
          action={<><Link href="/library" className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-text">Import content</Link><ActionButton variant="secondary" action={addSampleData}>Load sample data</ActionButton></>} />
      </>
    );
  }

  const stats = computeStats(posts);
  const avg = averageEngagementRate(posts);
  const best = bestPost(posts);
  // "Most engaging category": opening-style / length group with the best average interactions, needing n >= 3 each.
  const categories = [...stats.byLength, ...stats.byOpening, ...stats.byNumber]
    .filter((g) => g.posts >= 3 && g.avgInteractions !== null)
    .sort((a, b) => b.avgInteractions! - a.avgInteractions!);
  const topCat = categories[0];
  const hasSample = posts.some((p) => p.is_sample);

  const next: { text: string; href: string }[] = [];
  if (posts.length < 15) next.push({ text: `Import more posts (${posts.length} so far — 15+ gives much sharper analysis)`, href: "/library" });
  if (!dna && posts.length >= 5) next.push({ text: "Generate your Writing DNA", href: "/dna" });
  if (!perf && posts.length >= 8 && stats.postsWithMetrics >= 5) next.push({ text: "Run your performance analysis", href: "/analysis" });
  if (dna) next.push({ text: "Review your next draft against your voice and history", href: "/studio" });
  if (posts.length >= 3) next.push({ text: "Generate personalised ideas", href: "/ideas" });
  if (!profile.niche || !profile.goals) next.push({ text: "Add your niche and goals for better recommendations", href: "/settings" });

  return (
    <>
      <PageHeader title={`Welcome back${profile.creator_name ? `, ${profile.creator_name}` : ""}`} description="Here’s where your content stands." />
      {hasSample && <div className="mb-6"><Badge tone="warn">Sample data is loaded — figures below describe fictional posts. Remove it in Content Library.</Badge></div>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Posts analysed" value={posts.length} sub={`${stats.postsWithMetrics} with engagement data`} />
        <Stat label="Avg engagement rate" value={avg.value === null ? "Unavailable" : formatPercent(avg.value)}
          sub={avg.value === null ? "Needs impressions data" : `Across ${avg.basedOn} posts with impressions`} />
        <Stat label="Best post" value={best ? formatNumber(best.basis === "rate" ? Math.round(interactions(best.post)!) : interactions(best.post)) : "—"}
          sub={best ? (best.basis === "rate" ? "interactions · highest engagement rate" : "interactions · no impressions to rate by") : "No metrics yet"} />
        <Stat label="Most engaging category" value={<span className="text-lg">{topCat?.label ?? "Not enough data"}</span>}
          sub={topCat ? `${formatNumber(Math.round(topCat.avgInteractions!))} avg interactions · ${topCat.posts} posts` : "Needs 3+ posts per category"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-1 text-sm font-medium">Recent content performance</h2>
          <p className="mb-3 text-xs text-muted">Average interactions per post, by month</p>
          {stats.trend.length > 1 ? <TrendChart data={stats.trend} dataKey="avgInteractions" label="Avg interactions" />
            : <p className="py-12 text-center text-sm text-muted">Needs posts with dates and metrics from at least two months.</p>}
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-medium">Suggested next actions</h2>
          <ul className="space-y-1">
            {next.slice(0, 5).map((n) => (
              <li key={n.text}><Link href={n.href} className="group flex items-start justify-between gap-3 rounded-lg p-2 text-sm leading-snug hover:bg-surface2">
                <span>{n.text}</span><ArrowRight className="mt-0.5 size-4 shrink-0 text-muted group-hover:text-accent" /></Link></li>
            ))}
            {next.length === 0 && <li className="p-2 text-sm text-muted">You’re up to date.</li>}
          </ul>
        </Card>
      </div>

      {best && (
        <Card className="mt-6">
          <div className="mb-2 flex items-center gap-2"><h2 className="text-sm font-medium">Best-performing post</h2>{best.post.is_sample && <Badge tone="warn">Sample</Badge>}</div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{best.post.content}</p>
          <p className="mt-3 text-xs text-muted">{formatNumber(best.post.likes)} likes · {formatNumber(best.post.comments)} comments · {formatNumber(best.post.reposts)} reposts · {formatNumber(best.post.impressions)} impressions</p>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-medium"><Dna className="size-4 text-accent" />Writing DNA</h2>
            <Link href="/dna" className="text-xs text-accent hover:underline">Open</Link></div>
          {dna ? <p className="text-sm leading-relaxed text-muted">{dna.result.summary}</p>
            : <p className="text-sm text-muted">{posts.length >= 5 ? <>Not generated yet. <Link href="/dna" className="text-accent hover:underline">Generate your Writing DNA</Link>.</> : "Needs at least 5 posts."}</p>}
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-medium"><Lightbulb className="size-4 text-accent" />Recent AI recommendations</h2>
            <Link href="/analysis" className="text-xs text-accent hover:underline">Open</Link></div>
          {perf ? <ul className="space-y-2.5 text-sm leading-relaxed">{perf.result.recommendations.slice(0, 3).map((r, i) => <li key={i}>• {r.action}</li>)}</ul>
            : <p className="text-sm text-muted">Run Content Analysis to get recommendations grounded in your data.</p>}
        </Card>
      </div>
    </>
  );
}
