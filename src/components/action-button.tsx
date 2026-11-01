"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import type { ActionResult } from "@/app/actions";

/** Runs a server action with loading + inline error/success feedback. */
export function ActionButton({
  action, children, variant = "primary", confirm, className, onDone, disabled,
}: {
  action: () => Promise<ActionResult<unknown>>;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  confirm?: string;
  className?: string;
  disabled?: boolean;
  onDone?: () => void;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        variant={variant}
        className={className}
        loading={pending}
        disabled={disabled}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setMsg(null);
          start(async () => {
            const r = await action();
            setMsg(r.ok ? (r.message ? { ok: true, text: r.message } : null) : { ok: false, text: r.error });
            if (r.ok) { router.refresh(); onDone?.(); }
          });
        }}
      >
        {children}
      </Button>
      {msg && <span role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-xs text-good" : "max-w-xs text-xs text-bad"}>{msg.text}</span>}
    </span>
  );
}
