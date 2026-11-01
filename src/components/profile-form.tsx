"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { FORMATS, PLATFORMS, type Platform, type Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { saveProfile } from "@/app/actions";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [v, setV] = useState({
    creator_name: profile.creator_name ?? "", primary_platform: (profile.primary_platform ?? "") as Platform | "",
    niche: profile.niche ?? "", goals: profile.goals ?? "", preferred_formats: profile.preferred_formats,
  });
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  return (
    <Card className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Creator name"><Input value={v.creator_name} maxLength={80} onChange={(e) => setV({ ...v, creator_name: e.target.value })} /></Field>
        <Field label="Primary platform"><Select value={v.primary_platform} onChange={(e) => setV({ ...v, primary_platform: e.target.value as Platform })}>
          <option value="">Not set</option>{PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select></Field>
      </div>
      <Field label="Niche"><Input value={v.niche} maxLength={200} onChange={(e) => setV({ ...v, niche: e.target.value })} /></Field>
      <Field label="Content goals" hint="Used to shape ideas and recommendations."><Textarea value={v.goals} maxLength={1000} onChange={(e) => setV({ ...v, goals: e.target.value })} /></Field>
      <div><div className="mb-1.5 text-sm font-medium">Preferred formats</div>
        <div className="flex flex-wrap gap-2">{FORMATS.map((f) => { const on = v.preferred_formats.includes(f); return (
          <button key={f} type="button" aria-pressed={on} onClick={() => setV({ ...v, preferred_formats: on ? v.preferred_formats.filter((x) => x !== f) : [...v.preferred_formats, f] })}
            className={cn("rounded-full border px-3 py-1 text-sm", on ? "border-accent bg-accent-soft" : "border-border hover:bg-surface2")}>{f}</button>); })}</div></div>
      <Button loading={pending} onClick={() => start(async () => {
        const r = await saveProfile({ ...v, primary_platform: v.primary_platform || undefined });
        setMsg(r.ok ? { ok: true, t: "Saved. New analyses will use these details." } : { ok: false, t: r.error });
        if (r.ok) router.refresh();
      })}>Save changes</Button>
      {msg && <Notice tone={msg.ok ? "good" : "bad"}>{msg.t}</Notice>}
    </Card>
  );
}
