"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Check, Copy, Sparkles, X } from "lucide-react";
import { Badge, Button, Card, Input, Notice } from "@/components/ui";
import type { IdeaRow } from "@/lib/types";
import { generateIdeasAction, setIdeaStatus } from "@/app/actions";

export function IdeaGenerator() {
  const router = useRouter();
  const [focus, setFocus] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <Card className="mb-8 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input value={focus} onChange={(e) => setFocus(e.target.value)} maxLength={300} aria-label="Optional focus"
          placeholder="Optional focus — e.g. ‘something for founders’ or ‘a contrarian take’" />
        <Button loading={pending} className="shrink-0" onClick={() => { setError(null); start(async () => {
          const r = await generateIdeasAction(focus);
          if (!r.ok) setError(r.error); else router.refresh();
        }); }}><Sparkles className="size-4" />{pending ? "Thinking…" : "Generate ideas"}</Button>
      </div>
      {error && <Notice tone="bad">{error}</Notice>}
    </Card>
  );
}

export function IdeaCard({ idea }: { idea: IdeaRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const set = (s: IdeaRow["status"]) => start(async () => { await setIdeaStatus(idea.id, s); router.refresh(); });
  return (
    <Card className="animate-in">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {idea.format && <Badge tone="accent">{idea.format}</Badge>}
        {idea.status === "saved" && <Badge tone="good">Saved</Badge>}
        {idea.status === "used" && <Badge>Used</Badge>}
      </div>
      <h3 className="font-medium leading-snug">{idea.topic}</h3>
      {idea.hook && <blockquote className="mt-3 border-l-2 border-accent pl-3 text-sm leading-relaxed whitespace-pre-wrap">{idea.hook}</blockquote>}
      {idea.angle && <p className="mt-3 text-sm leading-relaxed"><span className="font-medium">Angle: </span><span className="text-muted">{idea.angle}</span></p>}
      {idea.rationale && <p className="mt-2 text-sm leading-relaxed"><span className="font-medium">Why it fits you: </span><span className="text-muted">{idea.rationale}</span></p>}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {idea.status !== "saved" && <Button variant="secondary" loading={pending} onClick={() => set("saved")}><Bookmark className="size-4" />Save</Button>}
        {idea.status !== "used" && <Button variant="secondary" loading={pending} onClick={() => set("used")}><Check className="size-4" />Mark used</Button>}
        <Button variant="ghost" onClick={async () => { await navigator.clipboard.writeText(idea.hook ?? idea.topic); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy className="size-4" />{copied ? "Copied" : "Copy hook"}</Button>
        <Button variant="ghost" loading={pending} onClick={() => set("dismissed")}><X className="size-4" />Dismiss</Button>
      </div>
    </Card>
  );
}
