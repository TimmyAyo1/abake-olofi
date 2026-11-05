"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for the browser (used for uploading photos and videos). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
