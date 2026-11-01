import { ProfileForm } from "@/components/profile-form";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getProfile } from "@/lib/data";
import { integrationStatus } from "@/lib/integrations";
import { isClaudeConfigured } from "@/lib/supabase/env";

export default async function SettingsPage() {
  const profile = await getProfile();
  const integrations = integrationStatus();
  return (
    <>
      <PageHeader title="Settings" description="Your creator profile, platform connections and system status." />
      <section><h2 className="mb-3 text-sm font-medium">Creator profile</h2><ProfileForm profile={profile} /></section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium">Platform connections</h2>
        <div className="space-y-3">
          {integrations.map((i) => (
            <Card key={i.id}>
              <div className="mb-2 flex items-center gap-2"><h3 className="font-medium">{i.name}</h3>
                <Badge tone="warn">Not connected — sync not built yet</Badge>
                <Badge tone={i.credentialsPresent ? "good" : "neutral"}>{i.credentialsPresent ? "Credentials present" : "Credentials missing"}</Badge></div>
              <p className="text-sm leading-relaxed text-muted">{i.requirements}</p>
              <p className="mt-2 text-xs text-muted">Needs: {i.requiredEnv.map((e) => <code key={e} className="mr-1.5 rounded bg-surface2 px-1.5 py-0.5">{e}</code>)}</p>
            </Card>
          ))}
          <p className="text-xs text-muted">The adapter interface is in place (src/lib/integrations). Until a platform’s OAuth + sync is implemented, import with paste, URL or CSV from the Content Library.</p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium">System status</h2>
        <Card className="space-y-2 text-sm">
          <div className="flex items-center justify-between"><span>Database & auth (Supabase)</span><Badge tone="good">Connected</Badge></div>
          <div className="flex items-center justify-between"><span>Claude API (server-side key)</span>{isClaudeConfigured ? <Badge tone="good">Configured</Badge> : <Badge tone="bad">ANTHROPIC_API_KEY missing — AI features disabled</Badge>}</div>
        </Card>
      </section>
    </>
  );
}
