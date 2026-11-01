import { AnalysisBar, BasisBadge, ConfidenceBadge, Evidence, NeedsContent } from "@/components/analysis-bits";
import { GroupBars, TrendChart } from "@/components/charts";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import { getLatestAnalysis, getPosts } from "@/lib/data";
import type { ContentGaps, PerformancePatterns } from "@/lib/ai/schemas";
import type { Stats } from "@/lib/stats";
import { hasMetrics } from "@/lib/metrics";

type Perf = PerformancePatterns & { stats: Stats };

export default async function AnalysisPage() {
  const [posts, perf, gaps] = await Promise.all([
    getPosts(),
    getLatestAnalysis<Perf>("performance_patterns"),
    getLatestAnalysis<ContentGaps>("content_gaps"),
  ]);
  const withMetrics = posts.filter(hasMetrics).length;
  const insufficient = posts.length < 8 || withMetrics < 5;
  const groups = perf ? ([
    ["Post length", perf.result.stats.byLength],
    ["Opening style", perf.result.stats.byOpening],
    ["Numbers in first line", perf.result.stats.byNumber],
  ] as const) : [];
  const typeTone = { strength: "good", weakness: "bad", pattern: "accent" } as const;

  return (
    <>
      <PageHeader title="Content Analysis"
        description="What works, what doesn’t, and why — with your own posts as evidence. Findings are labelled as data-supported or interpretation, and patterns are observations, not proof of cause." />

      {insufficient && !perf ? <NeedsContent need={8} have={posts.length} /> : (
        <>
          <AnalysisBar row={perf} kind="performance_patterns" label="analysis" postCount={posts.length}
            disabledReason={insufficient ? `Needs at least 8 posts with 5+ having engagement numbers (you have ${posts.length} posts, ${withMetrics} with metrics).` : undefined} />
          {perf && (
            <div className="animate-in space-y-8">
              <Card><p className="text-base leading-relaxed">{perf.result.headline}</p>
                {perf.result.data_limits && <div className="mt-3"><Notice>{perf.result.data_limits}</Notice></div>}</Card>

              {perf.result.stats.trend.length > 1 && (
                <section>
                  <h2 className="mb-3 text-sm font-medium">Engagement over time <span className="font-normal text-muted">· average interactions per post, by month (posts with metrics only)</span></h2>
                  <Card><TrendChart data={perf.result.stats.trend} dataKey="avgInteractions" label="Avg interactions" /></Card>
                </section>
              )}

              <section>
                <h2 className="mb-3 text-sm font-medium">Computed comparisons <span className="font-normal text-muted">· calculated from your data, not AI-estimated</span></h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {groups.map(([title, g]) => g.length > 1 && (
                    <Card key={title}><div className="mb-2 text-xs font-medium text-muted">{title}</div>
                      <GroupBars label={title} data={g.map((x) => ({ label: x.label, value: x.avgInteractions === null ? null : Math.round(x.avgInteractions), posts: x.posts }))} /></Card>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-sm font-medium">Findings</h2>
                <div className="space-y-3">
                  {perf.result.findings.map((f, i) => (
                    <Card key={i}>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge tone={typeTone[f.type]}>{f.type}</Badge><Badge>{f.category}</Badge><BasisBadge basis={f.basis} /><ConfidenceBadge level={f.confidence} />
                      </div>
                      <h3 className="font-medium">{f.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted"><span className="font-medium text-text">Why: </span>{f.why}</p>
                      <Evidence ids={f.evidence} posts={posts} />
                    </Card>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-sm font-medium">Recommendations</h2>
                <div className="space-y-3">
                  {perf.result.recommendations.map((r, i) => (
                    <Card key={i}><div className="flex gap-3"><Badge tone="accent" className="h-fit">Recommendation</Badge>
                      <div><p className="font-medium">{r.action}</p><p className="mt-1 text-sm leading-relaxed text-muted">{r.reasoning}</p></div></div></Card>
                  ))}
                </div>
              </section>
            </div>
          )}
        </>
      )}

      <h2 className="mt-14 mb-1 text-lg font-semibold tracking-tight">Content gaps</h2>
      <p className="mb-4 text-sm text-muted">Relevant topics you’ve neglected, based on the posts you’ve imported.</p>
      {posts.length < 8 && !gaps ? <NeedsContent need={8} have={posts.length} /> : (
        <>
          <AnalysisBar row={gaps} kind="content_gaps" label="gaps" postCount={posts.length} disabledReason={posts.length < 8 ? "Needs at least 8 posts." : undefined} />
          {gaps && (
            <div className="grid animate-in gap-4 md:grid-cols-2">
              <div className="space-y-3 md:col-span-2">
                {gaps.result.gaps.map((g, i) => (
                  <Card key={i}>
                    <div className="mb-1.5 flex items-center gap-2"><h3 className="font-medium">{g.topic}</h3><BasisBadge basis={g.basis} /></div>
                    <p className="text-sm leading-relaxed text-muted">{g.why_it_is_a_gap}</p>
                    <p className="mt-2 text-sm leading-relaxed"><span className="font-medium">Opportunity: </span>{g.opportunity}</p>
                  </Card>
                ))}
              </div>
              <Card>
                <h3 className="mb-3 text-sm font-medium">Topics you cover</h3>
                <ul className="space-y-2 text-sm">{gaps.result.covered_topics.map((t, i) => (
                  <li key={i} className="flex justify-between gap-3"><span>{t.topic}{t.performance_note && <span className="block text-xs text-muted">{t.performance_note}</span>}</span><Badge>{t.post_count}</Badge></li>))}</ul>
              </Card>
              {gaps.result.overused.length > 0 && (
                <Card><h3 className="mb-3 text-sm font-medium">Possibly overused</h3>
                  <ul className="space-y-2 text-sm">{gaps.result.overused.map((o, i) => <li key={i}><span className="font-medium">{o.topic}</span><span className="block text-xs text-muted">{o.note}</span></li>)}</ul></Card>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
