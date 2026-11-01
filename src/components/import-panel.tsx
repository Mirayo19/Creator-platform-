"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Link2, ClipboardPaste } from "lucide-react";
import { Button, Card, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { PLATFORMS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { importCsv, importManual, importUrl } from "@/app/actions";

type Tab = "paste" | "url" | "csv";
const TABS: { id: Tab; label: string; icon: typeof Link2 }[] = [
  { id: "paste", label: "Paste", icon: ClipboardPaste },
  { id: "url", label: "Post URL", icon: Link2 },
  { id: "csv", label: "CSV / analytics export", icon: FileUp },
];

export function ImportPanel({ defaultPlatform }: { defaultPlatform: string }) {
  const [tab, setTab] = useState<Tab>("paste");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [platform, setPlatform] = useState(defaultPlatform || "x");

  const done = (r: { ok: boolean; message?: string; error?: string }, form?: HTMLFormElement | null) => {
    setMsg(r.ok ? { ok: true, text: r.message ?? "Done" } : { ok: false, text: r.error ?? "Failed" });
    if (r.ok) { form?.reset(); router.refresh(); }
  };

  return (
    <Card className="p-0">
      <div className="flex gap-1 border-b border-border p-2" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setMsg(null); }}
            className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition", tab === id ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface2")}>
            <Icon className="size-4" /><span className="hidden sm:inline">{label}</span><span className="sm:hidden">{label.split(" ")[0]}</span>
          </button>
        ))}
      </div>
      <div className="space-y-4 p-5">
        {tab === "paste" && (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = Object.fromEntries(new FormData(form)) as Record<string, string>;
            start(async () => done(await importManual(fd), form));
          }}>
            <Field label="Post content"><Textarea name="content" required maxLength={25000} placeholder="Paste the full text of a past post…" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Platform"><Select name="platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select></Field>
              <Field label="Published (optional)"><Input type="date" name="published_at" max={new Date().toISOString().slice(0, 10)} /></Field>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Engagement numbers <span className="font-normal text-muted">— leave blank if unknown; blank is stored as “unavailable”, not zero</span></legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["likes", "comments", "reposts", "impressions"] as const).map((k) => (
                  <Input key={k} name={k} inputMode="numeric" pattern="[0-9]*" placeholder={k[0].toUpperCase() + k.slice(1)} aria-label={k} />
                ))}
              </div>
            </fieldset>
            <Button type="submit" loading={pending}>Add to library</Button>
          </form>
        )}
        {tab === "url" && (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const url = String(new FormData(form).get("url") ?? "");
            start(async () => done(await importUrl(url), form));
          }}>
            <Field label="Public X/Twitter post URL" hint="Uses X's official public embed endpoint. It returns the post text only — no engagement numbers, which stay marked unavailable until you add them. LinkedIn does not allow this; use Paste.">
              <Input name="url" type="url" required placeholder="https://x.com/username/status/1234567890" />
            </Field>
            <Button type="submit" loading={pending}>Import post</Button>
          </form>
        )}
        {tab === "csv" && (
          <div className="space-y-4">
            <Field label="Platform of this file"><Select value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select></Field>
            <Field label="CSV file" hint="Needs a post-text column (e.g. “Post text”, “content”). Optional columns: date, likes, replies/comments, reposts/retweets/shares, impressions/views, link. Works with X Analytics exports. Max ~5 MB.">
              <input ref={fileRef} type="file" accept=".csv,text/csv"
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface2 file:px-3 file:py-2 file:text-sm file:font-medium" />
            </Field>
            <Button loading={pending} onClick={() => {
              const f = fileRef.current?.files?.[0];
              if (!f) return setMsg({ ok: false, text: "Choose a CSV file first." });
              start(async () => {
                const text = await f.text();
                const r = await importCsv(text, platform);
                if (r.ok && r.data) {
                  done({ ok: true, message: `Imported ${r.data.added} posts. ${r.data.duplicates} duplicates and ${r.data.skipped} empty rows skipped.` });
                  if (fileRef.current) fileRef.current.value = "";
                } else done(r);
              });
            }}>Upload & import</Button>
          </div>
        )}
        {msg && <Notice tone={msg.ok ? "good" : "bad"}>{msg.text}</Notice>}
      </div>
    </Card>
  );
}
