import Link from "next/link";
import { DraftForm, ReviewView, type StoredReview } from "@/components/draft-studio";
import { Card, PageHeader } from "@/components/ui";
import { NeedsContent } from "@/components/analysis-bits";
import { getProfile, getSession } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getSession();
  const [profile, { count }, { data: recent }, current] = await Promise.all([
    getProfile(),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("draft_reviews").select("id, draft, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    sp.review && /^[0-9a-f-]{36}$/i.test(sp.review)
      ? supabase.from("draft_reviews").select("*").eq("user_id", user.id).eq("id", sp.review).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const review = current.data as StoredReview | null;
  return (
    <>
      <PageHeader title="Draft Studio" description="Get a review before you publish — judged against your own history, your Writing DNA and your goals. You stay in control: accept or reject every suggestion." />
      {(count ?? 0) < 5 ? <NeedsContent need={5} have={count ?? 0} /> : (
        <>
          <DraftForm key={review?.id ?? "new"} defaultPlatform={review?.platform ?? profile.primary_platform ?? "x"} initialDraft={review?.draft} />
          {review && <ReviewView key={review.id} review={review} />}
          {recent && recent.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-3 text-sm font-medium">Recent reviews</h2>
              <Card className="divide-y divide-border p-0">
                {recent.map((r) => (
                  <Link key={r.id} href={`/studio?review=${r.id}`} className="flex items-center justify-between gap-4 px-5 py-3 text-sm hover:bg-surface2">
                    <span className="truncate">{r.draft}</span><span className="shrink-0 text-xs text-muted">{formatDate(r.created_at)}</span>
                  </Link>
                ))}
              </Card>
            </section>
          )}
        </>
      )}
    </>
  );
}
