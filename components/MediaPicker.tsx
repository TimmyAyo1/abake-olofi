"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Media } from "@/lib/types";

type Item = Media & { preview: string; uploading: boolean; error?: string };

/**
 * Picks photos or videos, uploads them straight to Supabase storage,
 * and puts the stored paths in a hidden "media" field for the form.
 */
export function MediaPicker({ folder, label = "Photo or video", max = 8 }: { folder: string; label?: string; max?: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const input = useRef<HTMLInputElement>(null);

  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    const supabase = createClient();
    const picked = Array.from(files).slice(0, max - items.length);
    const fresh: Item[] = picked.map((f) => ({
      path: `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${(f.name.split(".").pop() || "bin").toLowerCase()}`,
      type: f.type.startsWith("video") ? "video" : "image",
      preview: URL.createObjectURL(f),
      uploading: true,
    }));
    setItems((cur) => [...cur, ...fresh]);
    await Promise.all(
      picked.map(async (file, i) => {
        const it = fresh[i];
        const { error } = await supabase.storage.from("media").upload(it.path, file, { contentType: file.type, upsert: false });
        setItems((cur) => cur.map((c) => (c.path === it.path ? { ...c, uploading: false, error: error ? "Upload failed" : undefined } : c)));
      })
    );
    if (input.current) input.current.value = "";
  }

  const ready = items.filter((i) => !i.uploading && !i.error).map(({ path, type }) => ({ path, type }));
  const busy = items.some((i) => i.uploading);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="media" value={JSON.stringify(ready)} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {items.map((it) => (
          <div key={it.path} style={{ position: "relative", width: 84, height: 84, borderRadius: 4, overflow: "hidden", background: "var(--soft)" }}>
            {it.type === "video" ? (
              <video src={it.preview} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <img src={it.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
            {it.uploading || it.error ? (
              <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.45)", color: "#fff", fontSize: 11 }}>
                {it.error ?? "Uploading…"}
              </span>
            ) : null}
            <button
              type="button"
              aria-label="Remove"
              onClick={() => setItems((cur) => cur.filter((c) => c.path !== it.path))}
              style={{ position: "absolute", top: 2, right: 2, width: 24, height: 24, borderRadius: 12, border: 0, background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer" }}
            >×</button>
          </div>
        ))}
        {items.length < max ? (
          <button
            type="button"
            onClick={() => input.current?.click()}
            style={{ width: 84, height: 84, borderRadius: 4, border: "1px dashed var(--field-line)", background: "transparent", fontSize: 12, cursor: "pointer", color: "var(--ink)" }}
          >＋ {label}</button>
        ) : null}
      </div>
      <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => onPick(e.target.files)} />
      {busy ? <span className="mut small">Uploading… wait for it to finish before saving.</span> : null}
    </div>
  );
}
