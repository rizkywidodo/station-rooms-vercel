import { supabase } from "./supabase";

export async function isAdminLoggedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}