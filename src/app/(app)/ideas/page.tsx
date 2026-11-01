import { Lightbulb } from "lucide-react";
import { IdeaCard, IdeaGenerator } from "@/components/ideas-board";
import { NeedsContent } from "@/components/analysis-bits";
import { EmptyState, PageHeader } from "@/components/ui";
import { getSession } from "@/lib/data";
import type { IdeaRow } from "@/lib/types";

export default async function IdeasPage() {
  const { supabase, user } = await getSession();
  const [{ count }, { data }] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("ideas").select("*").eq("user_id", user.id).neq("status", "dismissed").order("created_at", { ascending: false }).limit(60),
  ]);
  const ideas = (data ?? []) as IdeaRow[];
  const saved = ideas.filter((i) => i.status === "saved");
  const rest = ideas.filter((i) => i.status !== "saved");
  return (
    <>
      <PageHeader title="Idea Lab" description="Ideas built from your niche, best-performing topics, content gaps, Writing DNA and goals — and never repeating topics you’ve already covered or been given." />
      {(count ?? 0) < 3 ? <NeedsContent need={3} have={count ?? 0} /> : (
        <>
          <IdeaGenerator />
          {ideas.length === 0 ? (
            <EmptyState icon={<Lightbulb className="size-8" />} title="No ideas yet" description="Generate your first batch. Run Content Analysis and Writing DNA first for sharper results." />
          ) : (
            <div className="space-y-8">
              {saved.length > 0 && <section><h2 className="mb-3 text-sm font-medium">Saved</h2><div className="grid gap-4 md:grid-cols-2">{saved.map((i) => <IdeaCard key={i.id} idea={i} />)}</div></section>}
              {rest.length > 0 && <section><h2 className="mb-3 text-sm font-medium">Latest</h2><div className="grid gap-4 md:grid-cols-2">{rest.map((i) => <IdeaCard key={i.id} idea={i} />)}</div></section>}
            </div>
          )}
        </>
      )}
    </>
  );
}
