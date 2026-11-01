# Creator Strategist

An AI-powered **personal content strategist** for creators. It learns from each creator's own posts and performance — not a generic writing tool.

Stack: Next.js (App Router) · React · TypeScript · Tailwind v4 · Supabase (Postgres, Auth, RLS) · Claude API · Recharts.

## Status

| Area | State |
|---|---|
| Auth (Supabase email/password), onboarding (skippable) | built |
| Content Library: paste, public X URL (official oEmbed), CSV / X analytics export | built |
| Metrics: `NULL` = unavailable, never zero or invented | enforced in DB + code |
| Content Analysis (strengths / weaknesses / patterns, evidence, data-supported vs interpretation) | built |
| Content Gap detector | built |
| Writing DNA (persisted, re-learns on refresh) | built |
| Draft Studio (per-suggestion accept/reject, voice-preserving) | built |
| Idea Lab (no repeats, uses DNA / gaps / patterns / goals) | built |
| Audience Intelligence (from comments you paste) | built |
| Overview dashboard, Settings, light/dark theme, responsive | built |
| X / LinkedIn API sync | **scaffold only — not functional** (needs approved developer apps) |
| Experiments, Content Calendar, Growth Reports, Repurposing | **not built** (nav shows "Soon" pages with no fake data) |

## Architecture

```
src/
  app/
    (auth)/login, signup        Supabase email/password
    onboarding/                 4-step wizard, every step optional
    (app)/                      authenticated shell + the 11 nav sections
    actions.ts                  ALL mutations: server actions, Zod-validated, user-scoped
    setup/                      shown until Supabase env is configured
  proxy.ts                      session refresh + auth gate (Next 16 "proxy", formerly middleware)
  lib/
    ai/claude.ts                server-only Claude client; JSON out, Zod-validated, 1 retry
    ai/analyses.ts              one process per analysis: DNA, performance, gaps, audience, draft review, ideas
    ai/context.ts               posts serialised as P1…Pn; model citations mapped back to real ids
    ai/schemas.ts               output contracts
    stats.ts / metrics.ts       deterministic numbers (computed in code, explained by the AI)
    import.ts                   CSV / URL parsing, SSRF-guarded X oEmbed
    integrations/               PlatformIntegration interface + X / LinkedIn adapters
supabase/migrations/0001_init.sql   schema + RLS
```

**Data flow:** user action → server action (auth + Zod) → loads only that user's posts through their RLS-scoped session → Claude → output validated → persisted in `analyses` → pages render saved results. Analyses never regenerate on page load, so results stay stable until the creator refreshes them.

**Honesty by design**
- Statistics (averages, trends, group comparisons) are computed in code; the model explains them, it doesn't calculate them.
- Engagement rate exists only when impressions exist.
- Findings are tagged *data-supported* vs *interpretation*; recommendations are separate. Minimum-data thresholds block analysis on thin data.
- Citations are verified: the model sees `P1…Pn`; unknown refs are dropped.
- Draft suggestions are auto-applicable only if their excerpt exists verbatim in the draft, and nothing changes unless the creator accepts it.

**Security**
- RLS on every table (`user_id = auth.uid()`), tested against a real Postgres: cross-user read, update, delete and spoofed inserts are blocked.
- `platform_credentials` (OAuth tokens) has RLS enabled with no policies, so it is unreachable from the browser.
- `ANTHROPIC_API_KEY` is server-only (`server-only` import, never `NEXT_PUBLIC_`).
- Only X/Twitter hostnames are ever fetched for URL import.

## Setup

1. Create a Supabase project and run `supabase/migrations/0001_init.sql` in the SQL editor.
2. `cp .env.example .env.local` and set the Supabase URL + anon key and `ANTHROPIC_API_KEY`.
3. `npm install && npm run dev`
4. Sign up → onboarding → Content Library. Use **Load sample data** to explore; it is labelled *Sample* everywhere and removable.

## Adding a platform

Implement `PlatformIntegration` (`src/lib/integrations/types.ts`) and register it in `integrations/index.ts`. Tokens go in `platform_credentials` via the service role only. Sync must use the platform's official API.

## Roadmap (suggested order)

1. X OAuth 2.0 + sync (needs an X developer app/tier) to fill metrics automatically
2. Content Calendar + Experiments (new tables `calendar_items`, `experiments`)
3. Repurposing (reuses the DNA + draft pipeline)
4. Growth Reports (month-over-month from `analyses` versions + `posts`)
5. Background jobs for large libraries; per-user rate limiting and usage metering for billing
