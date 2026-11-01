"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button, Card, Field, Input, Notice, Textarea } from "@/components/ui";
import { FORMATS, PLATFORMS, type Platform, type Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { saveProfile, skipOnboarding } from "@/app/actions";

const STEPS = ["You", "Platform", "Niche & goals", "Formats"] as const;

export function OnboardingWizard({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [v, setV] = useState({
    creator_name: profile.creator_name ?? "",
    primary_platform: (profile.primary_platform ?? "") as Platform | "",
    niche: profile.niche ?? "",
    goals: profile.goals ?? "",
    preferred_formats: profile.preferred_formats,
  });

  const payload = () => ({ ...v, primary_platform: v.primary_platform || undefined });
  const finish = () => {
    setError(null);
    start(async () => {
      const r = await saveProfile(payload(), true);
      if (!r.ok) return setError(r.error);
      router.push("/library?welcome=1");
    });
  };
  const skip = () => start(async () => { await skipOnboarding(); router.push("/overview"); });

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-12">
      <div className="mb-6 flex items-center gap-2" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col gap-1.5">
            <div className={cn("h-1 rounded-full transition", i <= step ? "bg-accent" : "bg-border")} />
            <span className={cn("text-xs", i === step ? "font-medium" : "text-muted")}>{s}</span>
          </div>
        ))}
      </div>
      <Card className="animate-in space-y-5 p-6" key={step}>
        {step === 0 && (
          <>
            <div><h1 className="text-xl font-semibold tracking-tight">What should we call you?</h1>
              <p className="mt-1 text-sm text-muted">Your creator name — the name your audience knows.</p></div>
            <Field label="Creator name"><Input autoFocus value={v.creator_name} maxLength={80} onChange={(e) => setV({ ...v, creator_name: e.target.value })} placeholder="e.g. Alex Rivera" /></Field>
          </>
        )}
        {step === 1 && (
          <>
            <div><h1 className="text-xl font-semibold tracking-tight">Where do you publish mostly?</h1>
              <p className="mt-1 text-sm text-muted">X/Twitter is fully supported first; other platforms work through paste and CSV import. Optional.</p></div>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((p) => (
                <button key={p.id} type="button" onClick={() => setV({ ...v, primary_platform: p.id })} aria-pressed={v.primary_platform === p.id}
                  className={cn("flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-sm transition",
                    v.primary_platform === p.id ? "border-accent bg-accent-soft" : "border-border hover:bg-surface2")}>
                  {p.label}{v.primary_platform === p.id && <Check className="size-4 text-accent" />}
                </button>
              ))}
            </div>
            <Notice>Connecting your account is available in Settings once the platform integration is configured. For now you can import your posts directly.</Notice>
          </>
        )}
        {step === 2 && (
          <>
            <div><h1 className="text-xl font-semibold tracking-tight">Your niche and goals</h1>
              <p className="mt-1 text-sm text-muted">This guides ideas and recommendations. Optional, and editable later.</p></div>
            <Field label="Niche"><Input value={v.niche} maxLength={200} onChange={(e) => setV({ ...v, niche: e.target.value })} placeholder="e.g. AI products for startup founders" /></Field>
            <Field label="Content goals"><Textarea value={v.goals} maxLength={1000} onChange={(e) => setV({ ...v, goals: e.target.value })} placeholder="e.g. Grow to 10k followers, attract design partners, build authority in AI infrastructure" /></Field>
          </>
        )}
        {step === 3 && (
          <>
            <div><h1 className="text-xl font-semibold tracking-tight">Formats you like to write</h1>
              <p className="mt-1 text-sm text-muted">Pick any that apply. Optional.</p></div>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((f) => {
                const on = v.preferred_formats.includes(f);
                return (
                  <button key={f} type="button" aria-pressed={on}
                    onClick={() => setV({ ...v, preferred_formats: on ? v.preferred_formats.filter((x) => x !== f) : [...v.preferred_formats, f] })}
                    className={cn("rounded-full border px-3.5 py-1.5 text-sm transition", on ? "border-accent bg-accent-soft" : "border-border hover:bg-surface2")}>
                    {f}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {error && <Notice tone="bad">{error}</Notice>}
        <div className="flex items-center justify-between pt-1">
          {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)}><ArrowLeft className="size-4" />Back</Button> : <span />}
          <div className="flex gap-2">
            {step < STEPS.length - 1 ? (
              <Button onClick={() => {
                if (step === 0 && !v.creator_name.trim()) return setError("Add a creator name to continue, or skip setup for now.");
                setError(null); setStep(step + 1);
              }}>Continue<ArrowRight className="size-4" /></Button>
            ) : (
              <Button loading={pending} onClick={finish}>Finish setup</Button>
            )}
          </div>
        </div>
      </Card>
      <button onClick={skip} disabled={pending} className="mx-auto mt-5 text-sm text-muted hover:text-text">Skip setup for now</button>
    </main>
  );
}
