import { Card } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { redirect } from "next/navigation";

export default function SetupPage() {
  if (isSupabaseConfigured) redirect("/overview");
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Finish setup</h1>
      <p className="mt-2 text-sm text-muted">The app needs a Supabase project before it can run. Nothing here is mocked — until these are set, there is no database or login.</p>
      <Card className="mt-8 space-y-4 text-sm leading-relaxed">
        <ol className="list-decimal space-y-3 pl-5">
          <li>Create a project at supabase.com.</li>
          <li>Run <code className="rounded bg-surface2 px-1.5 py-0.5">supabase/migrations/0001_init.sql</code> in the SQL editor (it creates the tables and Row Level Security policies).</li>
          <li>Copy <code className="rounded bg-surface2 px-1.5 py-0.5">.env.example</code> to <code className="rounded bg-surface2 px-1.5 py-0.5">.env.local</code> and set <code className="rounded bg-surface2 px-1.5 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="rounded bg-surface2 px-1.5 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.</li>
          <li>Set <code className="rounded bg-surface2 px-1.5 py-0.5">ANTHROPIC_API_KEY</code> (server only) to enable AI analysis.</li>
          <li>Restart the dev server.</li>
        </ol>
      </Card>
    </main>
  );
}
