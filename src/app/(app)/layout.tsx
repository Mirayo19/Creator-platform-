import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("creator_name, onboarding_completed").eq("id", user.id).single();
  if (!profile?.onboarding_completed) redirect("/onboarding");
  return (
    <div className="min-h-screen">
      <Sidebar name={profile.creator_name || "Creator"} email={user.email ?? ""} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">{children}</div>
      </main>
    </div>
  );
}
