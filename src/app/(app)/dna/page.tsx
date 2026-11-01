import { AnalysisBar, ConfidenceBadge, Evidence, NeedsContent } from "@/components/analysis-bits";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import { getLatestAnalysis, getPosts } from "@/lib/data";
import type { WritingDna } from "@/lib/ai/schemas";

const LABELS: Record<string, string> = {
  tone: "Tone of voice", sentence_structure: "Sentence structure", vocabulary: "Vocabulary", rhythm: "Writing rhythm",
  hooks: "Typical hooks", storytelling: "Storytelling", humour: "Humour", communication_style: "Communication style",
  paragraph_structure: "Paragraph structure", opinions: "How you express opinions", endings: "How you conclude",
};

export default async function DnaPage() {
  const [posts, dna] = await Promise.all([getPosts(), getLatestAnalysis<WritingDna>("writing_dna")]);
  return (
    <>
      <PageHeader title="My Writing DNA"
        description="Your voice, extracted from your own posts. Every draft review and idea uses it so suggestions sound like you — not like generic AI. It re-learns when you refresh after importing more." />
      {posts.length < 5 && !dna ? <NeedsContent need={5} have={posts.length} /> : (
        <>
          <AnalysisBar row={dna} kind="writing_dna" label="Writing DNA" postCount={posts.length} disabledReason={posts.length < 5 ? "Needs at least 5 posts." : undefined} />
          {dna && (
            <div className="animate-in space-y-6">
              <Card>
                <div className="mb-2 flex items-center gap-2"><h2 className="font-medium">Summary</h2><ConfidenceBadge level={dna.result.confidence} /></div>
                <p className="leading-relaxed">{dna.result.summary}</p>
                {dna.result.caveats && <div className="mt-3"><Notice>{dna.result.caveats}</Notice></div>}
              </Card>
              <div className="grid gap-4 md:grid-cols-2">
                {dna.result.dimensions.map((d) => (
                  <Card key={d.key}>
                    <h3 className="mb-1.5 text-sm font-medium text-muted">{LABELS[d.key] ?? d.key}</h3>
                    <p className="text-sm leading-relaxed">{d.finding}</p>
                    <Evidence ids={d.evidence} posts={posts} />
                  </Card>
                ))}
              </div>
              {dna.result.signature_phrases.length > 0 && (
                <Card><h3 className="mb-3 text-sm font-medium text-muted">Signature phrases found in your posts</h3>
                  <div className="flex flex-wrap gap-2">{dna.result.signature_phrases.map((p) => <Badge key={p} tone="accent" className="text-sm">“{p}”</Badge>)}</div></Card>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <Card><h3 className="mb-2 text-sm font-medium text-good">Do — keeps it sounding like you</h3>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{dna.result.voice_rules.do.map((r, i) => <li key={i}>{r}</li>)}</ul></Card>
                <Card><h3 className="mb-2 text-sm font-medium text-bad">Don’t — would sound off-brand</h3>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{dna.result.voice_rules.dont.map((r, i) => <li key={i}>{r}</li>)}</ul></Card>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
