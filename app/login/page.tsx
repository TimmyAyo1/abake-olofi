import { signIn } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "Sign in" };

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="logo">
          <><img src="/logo.svg" alt="Àbáké Olófì" className="logo-img logo-light" /><img src="/logo-dark.svg" alt="" aria-hidden="true" className="logo-img logo-dark" /></>
        </div>
        <h1 className="page-title">Sign in</h1>
        <form action={signIn} className="stack">
          <label className="field">
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {searchParams.error ? <p className="error">{searchParams.error}</p> : null}
          <SubmitButton className="btn block">Sign in</SubmitButton>
        </form>
        <p className="mut small">Accounts are added by the owner in Supabase. Ask Timilehin if you need one.</p>
      </div>
    </main>
  );
}
