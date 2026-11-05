"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) {
    const msg = /confirm/i.test(error.message)
      ? "This account isn't confirmed yet. In Supabase, open Authentication → Users and confirm it."
      : /invalid login/i.test(error.message)
        ? "That email and password don't match. Try again."
        : `Couldn't sign in: ${error.message}`;
    redirect("/login?error=" + encodeURIComponent(msg));
  }
  redirect("/orders");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
