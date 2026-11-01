import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { AnalysisKind, AnalysisRow, Post, Profile } from "./types";

/** Loads the signed-in user's data (always RLS-scoped through their session). */
export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function getProfile(): Promise<Profile> {
  const { supabase, user } = await getSession();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data as Profile;
}

export async function getPosts(limit = 500): Promise<Post[]> {
  const { supabase, user } = await getSession();
  const { data } = await supabase.from("posts").select("*").eq("user_id", user.id)
    .order("published_at", { ascending: false, nullsFirst: false }).limit(limit);
  return (data ?? []) as Post[];
}

export async function getLatestAnalysis<T>(kind: AnalysisKind): Promise<AnalysisRow<T> | null> {
  const { supabase, user } = await getSession();
  const { data } = await supabase.from("analyses").select("*").eq("user_id", user.id).eq("kind", kind)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as AnalysisRow<T> | null) ?? null;
}
