"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Card, Field, Input, Notice } from "@/components/ui";
import type { ActionResult } from "@/app/actions";

export function AuthForm({ mode, action }: { mode: "login" | "signup"; action: (s: unknown, f: FormData) => Promise<ActionResult> }) {
  const [state, formAction, pending] = useActionState(action, null as ActionResult | null);
  const login = mode === "login";
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid size-10 place-items-center rounded-xl bg-accent text-lg font-bold text-accent-text">S</div>
        <h1 className="text-xl font-semibold tracking-tight">{login ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1.5 text-sm text-muted">
          {login ? "Sign in to your content strategist." : "A strategist that learns from your own content."}
        </p>
      </div>
      <Card>
        <form action={formAction} className="space-y-4">
          <Field label="Email"><Input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></Field>
          <Field label="Password" hint={login ? undefined : "At least 8 characters"}>
            <Input name="password" type="password" required minLength={8} autoComplete={login ? "current-password" : "new-password"} />
          </Field>
          {state && !state.ok && <Notice tone="bad">{state.error}</Notice>}
          {state?.ok && state.message && <Notice tone="good">{state.message}</Notice>}
          <Button type="submit" loading={pending} className="w-full">{login ? "Sign in" : "Create account"}</Button>
        </form>
      </Card>
      <p className="mt-5 text-center text-sm text-muted">
        {login ? "New here? " : "Already have an account? "}
        <Link href={login ? "/signup" : "/login"} className="font-medium text-accent hover:underline">
          {login ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </main>
  );
}
