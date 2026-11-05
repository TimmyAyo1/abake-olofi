"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Shows a slim orange bar the moment a link is tapped, until the new page arrives. */
function Bar() {
  const path = usePathname();
  const search = useSearchParams();
  const [on, setOn] = useState(false);

  useEffect(() => { setOn(false); }, [path, search]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href.endsWith(".pdf") || href.includes(".pdf?")) return;
      if (href === location.pathname + location.search) return;
      setOn(true);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return on ? <div className="navbar-progress" aria-hidden="true" /> : null;
}

export function NavProgress() {
  return <Suspense fallback={null}><Bar /></Suspense>;
}
