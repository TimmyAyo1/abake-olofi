"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * The list fills the page. Opening an item shows it in a large window over the list
 * on tablet and laptop (Esc, × or a click outside closes it), and as its own page on a phone.
 * Opened from another page (Money, Clients, Weavers…), closing goes back to that page.
 */

const RETURN = "abake:return";
const NAMES: Record<string, string> = { "/money": "Money", "/clients": "Clients", "/weavers": "Weavers", "/numbers": "Numbers", "/orders": "Orders", "/sales": "Sales" };
type Back = { base: string; path: string; name: string };

/** Remembers which page an order or sale was opened from. Mounted once in the admin layout. */
export function ReturnTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      const href = a?.getAttribute("href") ?? "";
      const m = href.match(/^\/(orders|sales)\/[^/?#]+/);
      if (!m || a?.target === "_blank") return;
      const base = `/${m[1]}`;
      const here = location.pathname;
      if (here === base || here.startsWith(base + "/")) return; // already inside that section
      const name = NAMES["/" + here.split("/")[1]] ?? "Back";
      try { sessionStorage.setItem(RETURN, JSON.stringify({ base, path: here + location.search, name })); } catch {}
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}

export function SplitView({ list, children, base = "/orders", label = "Orders" }: { list: React.ReactNode; children: React.ReactNode; base?: string; label?: string }) {
  const path = usePathname();
  const router = useRouter();
  const detail = path.startsWith(base + "/");
  const [back, setBack] = useState<Back | null>(null);

  useEffect(() => {
    let b: Back | null = null;
    try { b = JSON.parse(sessionStorage.getItem(RETURN) || "null"); } catch {}
    if (detail && b?.base === base) setBack(b);
    else {
      setBack(null);
      if (!detail) try { sessionStorage.removeItem(RETURN); } catch {}
    }
  }, [detail, base]);

  function close() {
    try { sessionStorage.removeItem(RETURN); } catch {}
    router.push(back?.path ?? base, { scroll: false });
  }

  useEffect(() => {
    if (!detail) return;
    if (window.innerWidth < 768) window.scrollTo(0, 0);
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector(".dp-pop")) return;
      const sheetClose = document.querySelector<HTMLAnchorElement>(".sheet-wrap .x");
      if (sheetClose) { sheetClose.click(); return; } // close the inner sheet first
      close();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, path, back]);

  return (
    <div className="split" data-detail={detail ? "true" : "false"} data-return={back ? "true" : undefined}>
      <section className="split-list" aria-label={label}>{list}</section>
      {detail ? (
        <div className="split-overlay">
          <button type="button" className="split-backdrop" aria-label={`Back to ${back?.name ?? label}`} tabIndex={-1} onClick={close} />
          <section className="split-detail" role="dialog" aria-modal="true" aria-label={label}>
            <button type="button" className="split-close x" aria-label={`Close, back to ${back?.name ?? label}`} onClick={close}>×</button>
            {back ? <button type="button" className="split-back mut small" onClick={close}>‹ {back.name}</button> : null}
            {children}
          </section>
        </div>
      ) : null}
    </div>
  );
}

/** Row link that highlights itself when its item is open. */
export function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = path === href;
  return (
    <Link href={href} scroll={false} className="orow-main" aria-current={active ? "page" : undefined} data-active={active || undefined}>
      {children}
    </Link>
  );
}

