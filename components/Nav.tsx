"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/orders", label: "Orders", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/weavers", label: "Weavers", icon: "M4 6h16M4 10h16M4 14h16M4 18h16M8 4v16M16 4v16" },
  { href: "/money", label: "Money", icon: "M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5" },
  { href: "/numbers", label: "Numbers", icon: "M5 20V11M12 20V5M19 20v-6" },
  { href: "/templates", label: "Templates", icon: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h4", desktopOnly: true },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1", desktopOnly: true },
];

function useActive() {
  const path = usePathname();
  return (href: string) => (path === href || path.startsWith(href + "/") ? "page" : undefined);
}

export function Sidebar({ name }: { name: string }) {
  const active = useActive();
  return (
    <aside className="sidebar">
      <Link href="/orders" className="brand logo" aria-label="Àbáké Olófì home">
        <><img src="/logo.svg" alt="Àbáké Olófì" className="logo-img logo-light" /><img src="/logo-dark.svg" alt="" aria-hidden="true" className="logo-img logo-dark" /></>
      </Link>
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} className="navlink" aria-current={active(i.href)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d={i.icon} /></svg>
          {i.label}
        </Link>
      ))}
      <div className="mut small" style={{ marginTop: "auto", padding: "0 12px" }}>{name ? `Signed in as ${name}` : ""}</div>
    </aside>
  );
}

export function TopBar() {
  return (
    <header className="topbar">
      <Link href="/orders" className="logo" aria-label="Àbáké Olófì home">
        <><img src="/logo.svg" alt="Àbáké Olófì" className="logo-img logo-light" /><img src="/logo-dark.svg" alt="" aria-hidden="true" className="logo-img logo-dark" /></>
      </Link>
      <Link href="/settings" className="btn quiet sm" aria-label="Settings">Settings</Link>
    </header>
  );
}

export function TabBar() {
  const active = useActive();
  return (
    <nav className="tabbar" aria-label="Sections">
      {ITEMS.filter((i) => !i.desktopOnly).map((i) => (
        <Link key={i.href} href={i.href} className="tab" aria-current={active(i.href)}>{i.label}</Link>
      ))}
    </nav>
  );
}
