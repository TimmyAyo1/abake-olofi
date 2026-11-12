import Link from "next/link";
import { SaleForm } from "@/components/SaleForm";
import { getBanks } from "@/lib/data";
import { today } from "@/lib/format";
import { createSale } from "../actions";

export const metadata = { title: "New sale" };

export default async function NewSalePage(props: { searchParams: Promise<{ err?: string }> }) {
  const { err } = await props.searchParams;
  const banks = await getBanks();
  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <Link href="/sales" className="mut small back-link">‹ Sales</Link>
      <h1 className="page-title">New sale</h1>
      {err ? <p className="hot" role="alert" style={{ margin: 0 }}>{err}</p> : null}
      <SaleForm action={createSale} banks={banks} today={today()} />
    </div>
  );
}
