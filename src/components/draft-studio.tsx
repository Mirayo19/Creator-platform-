"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Sparkles, X } from "lucide-react";
import { Badge, Button, Card, Field, Notice, Select, Textarea } from "@/components/ui";
import { PLATFORMS } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { DraftReview } from "@/lib/ai/schemas";
import { reviewDraftAction, saveAcceptedSuggestions } from "@/app/actions";

export type StoredReview = {
  id: string; draft: string; platform: string; accepted_suggestions: string[];
  result: DraftReview & { applicable: Record<string, boolean> };
};

export function DraftForm({ defaultPlatform, initialDraft }: { defaultPlatform: string; initialDraft?: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft ?? "");
  const [platform, setPlatform] = useState(defaultPlatform);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const max = platform === "x" ? 280 : 3000;
  return (
    <Card className="space-y-4">
      <Field label="Your draft">
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-44" maxLength={10000}
          placeholder="Paste a draft post, thread or article you haven’t published yet…" />
      </Field>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          <Field label="Target platform"><Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-44">{PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select></Field>
          <span className={cn("pb-2 text-xs tabular-nums", platform === "x" && draft.length > max ? "text-warn" : "text-muted")}>
            {draft.length} chars{platform === "x" && draft.length > max ? " · over single-post length (fine for a thread)" : ""}
          </span>
        </div>
        <Button loading={pending} onClick={() => {
          setError(null);
          start(async () => {
            const r = await reviewDraftAction({ draft, platform });
            if (!r.ok) return setError(r.error);
            router.push(`/studio?review=${r.data!.id}`);
          });
        }}><Sparkles className="size-4" />{pending ? "Reviewing against your history…" : "Review draft"}</Button>
      </div>
      {error && <Notice tone="bad">{error}</Notice>}
    </Card>
  );
}

const IMPACT = { high: "bad", medium: "warn", low: "neutral" } as const;

export function ReviewView({ review }: { review: StoredReview }) {
  const r = review.result;
  const [accepted, setAccepted] = useState<string[]>(review.accepted_suggestions);
  const [copied, setCopied] = useState(false);
  const [, start] = useTransition();

  const toggle = (id: string) => {
    const next = accepted.includes(id) ? accepted.filter((x) => x !== id) : [...accepted, id];
    setAccepted(next);
    start(async () => { await saveAcceptedSuggestions(review.id, next); });
  };

  // Only the changes the creator accepted are applied; everything else stays exactly as written.
  let revised = review.draft;
  for (const s of r.suggestions) {
    if (accepted.includes(s.id) && r.applicable[s.id] && revised.includes(s.original_excerpt)) {
      revised = revised.replace(s.original_excerpt, s.suggested_replacement);
    }
  }
  const changed = revised !== review.draft;

  return (
    <div className="animate-in mt-8 space-y-6">
      <Card>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="font-medium">Overall assessment</h2>
          <Badge tone={r.voice_match.rating === "strong" ? "good" : r.voice_match.rating === "partial" ? "warn" : "bad"}>Voice match: {r.voice_match.rating}</Badge>
          <Badge tone={r.hook.verdict === "strong" ? "good" : r.hook.verdict === "ok" ? "accent" : "bad"}>Hook: {r.hook.verdict}</Badge>
        </div>
        <p className="leading-relaxed">{r.assessment}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted"><span className="font-medium text-text">Voice: </span>{r.voice_match.notes}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted"><span className="font-medium text-text">Hook: </span>{r.hook.notes}</p>
        {r.structure_notes && <p className="mt-2 text-sm leading-relaxed text-muted"><span className="font-medium text-text">Structure: </span>{r.structure_notes}</p>}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card><h3 className="mb-2 text-sm font-medium text-good">Strengths</h3><ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{r.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></Card>
        <Card><h3 className="mb-2 text-sm font-medium text-bad">Weaknesses</h3><ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{r.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul></Card>
      </div>
      {r.needs_clarification.length > 0 && (
        <Card><h3 className="mb-2 text-sm font-medium text-warn">Needs clarification</h3><ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{r.needs_clarification.map((s, i) => <li key={i}>{s}</li>)}</ul></Card>
      )}

      <section>
        <h2 className="mb-1 text-sm font-medium">Suggestions <span className="font-normal text-muted">· you decide what changes — nothing is applied unless you accept it</span></h2>
        <div className="mt-3 space-y-3">
          {r.suggestions.map((s) => {
            const on = accepted.includes(s.id);
            const applicable = r.applicable[s.id];
            return (
              <Card key={s.id} className={cn(on && "border-accent")}>
                <div className="mb-2 flex flex-wrap items-center gap-2"><Badge tone="accent">{s.type}</Badge><Badge tone={IMPACT[s.impact]}>{s.impact} impact</Badge>{!applicable && <Badge>advice only</Badge>}</div>
                {applicable && (
                  <div className="mb-3 space-y-2 text-sm">
                    <div className="rounded-lg bg-bad-soft p-3 leading-relaxed line-through decoration-bad/40">{s.original_excerpt}</div>
                    <div className="rounded-lg bg-good-soft p-3 leading-relaxed">{s.suggested_replacement}</div>
                  </div>
                )}
                <p className="text-sm leading-relaxed text-muted"><span className="font-medium text-text">Why: </span>{s.reasoning}</p>
                <div className="mt-3">
                  <Button variant={on ? "primary" : "secondary"} onClick={() => toggle(s.id)} aria-pressed={on}>
                    {on ? <><Check className="size-4" />{applicable ? "Accepted" : "Noted"}</> : <><X className="size-4 opacity-0 hidden" />{applicable ? "Accept change" : "Mark as noted"}</>}
                  </Button>
                </div>
              </Card>
            );
          })}
          {r.suggestions.length === 0 && <Notice>No specific changes suggested — the draft looks solid against your history.</Notice>}
        </div>
      </section>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-medium">{changed ? "Your draft with accepted changes" : "Your draft"}</h2>
          <Button variant="secondary" onClick={async () => { await navigator.clipboard.writeText(revised); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            <Copy className="size-4" />{copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{revised}</p>
        {!changed && <p className="mt-3 text-xs text-muted">Accept suggestions above and the improved version builds here, preserving everything you didn’t change.</p>}
      </Card>
    </div>
  );
}
