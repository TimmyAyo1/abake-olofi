"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** List beside detail on tablet and laptop; one at a time on phone. */
export function SplitView({ list, children, base = "/orders", label = "Orders" }: { list: React.ReactNode; children: React.ReactNode; base?: string; label?: string }) {
  const path = usePathname();
  const detail = path.startsWith(base + "/");
  return (
    <div className="split" data-detail={detail ? "true" : "false"}>
      <section className="split-list" aria-label={label}>{list}</section>
      <section className="split-detail">{children}</section>
    </div>
  );
}

/** Row link that highlights itself when its order is open. */
export function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = path === href;
  return (
    <Link href={href} className="orow-main" aria-current={active ? "page" : undefined} data-active={active || undefined}>
      {children}
    </Link>
  );
}
