import { AnalysisBar } from "@/components/analysis-bits";
import { CommentImport } from "@/components/comment-import";
import { Badge, Card, EmptyState, Notice, PageHeader } from "@/components/ui";
import { getLatestAnalysis, getSession } from "@/lib/data";
import type { AudienceIntel } from "@/lib/ai/schemas";
import { Users } from "lucide-react";

export default async function AudiencePage() {
  const { supabase, user } = await getSession();
  const [{ count }, intel] = await Promise.all([
    supabase.from("audience_comments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    getLatestAnalysis<AudienceIntel>("audience"),
  ]);
  const n = count ?? 0;
  const sections: [string, { text: string; sub?: string }[]][] = intel ? [
    ["Frequently asked questions", intel.result.questions.map((q) => ({ text: q.question }))],
    ["Audience concerns", intel.result.concerns.map((q) => ({ text: q.concern }))],
    ["Where opinions diverge", intel.result.disagreements.map((q) => ({ text: q.topic }))],
  ] : [];
  return (
    <>
      <PageHeader title="Audience Intelligence" description="Turn what your audience actually says into content. This uses only comments you’ve provided — nothing is inferred about people who haven’t spoken." />
      <CommentImport />
      <div className="mt-8">
        {n === 0 ? (
          <EmptyState icon={<Users className="size-8" />} title="No audience comments yet" description="Add real comments above. At least 5 are needed before analysis runs." />
        ) : (
          <>
            <AnalysisBar row={intel} kind="audience" label="audience insights" postCount={n} disabledReason={n < 5 ? `Needs at least 5 comments (you have ${n}).` : undefined} />
            {intel && (
              <div className="animate-in space-y-6">
                {intel.result.data_limits && <Notice>{intel.result.data_limits}</Notice>}
                <div className="grid gap-4 md:grid-cols-3">
                  {sections.map(([title, items]) => (
                    <Card key={title}><h3 className="mb-3 text-sm font-medium">{title}</h3>
                      {items.length ? <ul className="space-y-2 text-sm leading-relaxed">{items.map((it, i) => <li key={i}>• {it.text}</li>)}</ul> : <p className="text-sm text-muted">None found in these comments.</p>}</Card>
                  ))}
                </div>
                <section><h2 className="mb-3 text-sm font-medium">Content opportunities</h2>
                  <div className="space-y-3">{intel.result.opportunities.map((o, i) => (
                    <Card key={i}><div className="flex gap-3"><Badge tone="accent" className="h-fit">Opportunity</Badge><div><p className="font-medium">{o.idea}</p><p className="mt-1 text-sm text-muted">{o.why}</p></div></div></Card>))}</div></section>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
