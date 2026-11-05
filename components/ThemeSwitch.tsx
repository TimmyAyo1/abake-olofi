"use client";

import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";

/** Light by default. Dark, or following the device, only when chosen. Saved on this device. */
export function ThemeSwitch() {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    try {
      const t = localStorage.getItem("theme");
      if (t === "dark" || t === "system") setMode(t);
    } catch {}
  }, []);

  function choose(m: Mode) {
    setMode(m);
    try {
      if (m === "light") localStorage.removeItem("theme");
      else localStorage.setItem("theme", m);
    } catch {}
    if (m === "light") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", m);
  }

  return (
    <div className="chips" role="radiogroup" aria-label="Appearance">
      {(["light", "dark", "system"] as Mode[]).map((m) => (
        <label className="chip" key={m}>
          <input type="radio" name="theme" checked={mode === m} onChange={() => choose(m)} />
          <span>{m === "light" ? "Light" : m === "dark" ? "Dark" : "Match my device"}</span>
        </label>
      ))}
    </div>
  );
}
