import { Library } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { ImportPanel } from "@/components/import-panel";
import { PostCard } from "@/components/post-card";
import { EmptyState, Notice, PageHeader } from "@/components/ui";
import { getPosts, getProfile } from "@/lib/data";
import { addSampleData, removeSampleData } from "@/app/actions";

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const [posts, profile, sp] = await Promise.all([getPosts(), getProfile(), searchParams]);
  const hasSample = posts.some((p) => p.is_sample);
  return (
    <>
      <PageHeader
        title="Content Library"
        description="Everything the strategist learns from lives here, private to your account. Missing numbers are shown as unavailable — never guessed."
        actions={hasSample && <ActionButton variant="secondary" action={removeSampleData} confirm="Remove all sample posts?">Remove sample data</ActionButton>}
      />
      {sp.welcome && posts.length === 0 && <div className="mb-6"><Notice tone="accent">You’re set up. Import some past posts below — the more you add, the more specific the analysis gets (aim for 15+).</Notice></div>}
      <ImportPanel defaultPlatform={profile.primary_platform ?? "x"} />
      <div className="mt-10 mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-medium">{posts.length} {posts.length === 1 ? "post" : "posts"}</h2>
      </div>
      {posts.length === 0 ? (
        <EmptyState icon={<Library className="size-8" />} title="Your library is empty"
          description="Import posts above, or load clearly-labelled sample data to explore the product before adding your own."
          action={<ActionButton variant="secondary" action={addSampleData}>Load sample data</ActionButton>} />
      ) : (
        <div className="space-y-4">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
      )}
    </>
  );
}
