import { Sidebar, TabBar, TopBar } from "@/components/Nav";
import { NavProgress } from "@/components/NavProgress";
import { EnterToDone } from "@/components/EnterToDone";
import { ReturnTracker } from "@/components/SplitView";
import { getMe } from "@/lib/data";
import { signOut } from "../login/actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();

  if (me && !me.role) {
    return (
      <main className="page" style={{ margin: "0 auto" }}>
        <h1 className="page-title">Almost there</h1>
        <p>Your account ({me.email}) is signed in but hasn&apos;t been added as staff yet.</p>
        <p className="mut">Ask the owner to add you to the staff table in Supabase, then refresh this page.</p>
        <form action={signOut}><button className="btn ghost">Sign out</button></form>
      </main>
    );
  }

  return (
    <div className="shell">
      <NavProgress />
      <EnterToDone />
      <ReturnTracker />
      <Sidebar name={me?.name ?? ""} />
      <TopBar />
      <div className="main">{children}</div>
      <TabBar />
    </div>
  );
}
