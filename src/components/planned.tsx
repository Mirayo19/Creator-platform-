import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";

/** Honest placeholder for features that are designed but not built yet. Nothing here is faked. */
export function PlannedFeature({ title, description, needs, available }: { title: string; description: string; needs: string[]; available: { href: string; label: string }[] }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card className="space-y-5">
        <div><span className="rounded-md bg-surface2 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-muted">Planned — not built yet</span></div>
        <div><h2 className="mb-2 text-sm font-medium">What it will do</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">{needs.map((n) => <li key={n}>{n}</li>)}</ul></div>
        <div><h2 className="mb-2 text-sm font-medium">Use today instead</h2>
          <div className="flex flex-wrap gap-2">{available.map((a) => <Link key={a.href} href={a.href} className="rounded-lg border border-border px-3.5 py-2 text-sm hover:bg-surface2">{a.label}</Link>)}</div></div>
      </Card>
    </>
  );
}
