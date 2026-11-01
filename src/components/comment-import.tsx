"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Notice, Textarea } from "@/components/ui";
import { importComments } from "@/app/actions";

export function CommentImport() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  return (
    <Card className="space-y-3">
      <Field label="Add audience comments" hint="Paste real replies/comments from your posts, one per line. Automatic comment collection needs platform API access, which isn’t connected yet.">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={"How do you decide…?\nDisagree because…"} />
      </Field>
      <Button loading={pending} onClick={() => start(async () => {
        const r = await importComments(text);
        setMsg(r.ok ? { ok: true, t: r.message ?? "Added" } : { ok: false, t: r.error });
        if (r.ok) { setText(""); router.refresh(); }
      })}>Add comments</Button>
      {msg && <Notice tone={msg.ok ? "good" : "bad"}>{msg.t}</Notice>}
    </Card>
  );
}
