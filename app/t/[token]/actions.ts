"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const FEELINGS = ["loved", "okay", "unhappy"];

/** Saves the client's feedback once, only for a delivered order. */
export async function sendFeedback(fd: FormData) {
  const token = String(fd.get("token") ?? "");
  if (!/^[a-f0-9]{16,64}$/.test(token)) redirect("/");
  const db = createAdminClient();
  const pick = (k: string) => (FEELINGS.includes(String(fd.get(k))) ? String(fd.get(k)) : null);
  const clip = (k: string) => String(fd.get(k) ?? "").trim().slice(0, 2000) || null;

  await db
    .from("orders")
    .update({
      feedback_product: pick("product"),
      feedback_service: pick("service"),
      feedback_better: clip("better"),
      feedback_public: clip("public"),
      feedback_share: fd.get("share") === "on",
      feedback_at: new Date().toISOString(),
    })
    .eq("track_token", token)
    .eq("stage", "delivered")
    .is("feedback_at", null);

  redirect(`/t/${token}?thanks=1`);
}
