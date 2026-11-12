import Link from "next/link";
import { OrderForm } from "@/components/OrderForm";
import { getOrder } from "@/lib/data";
import { createOrder } from "../actions";

export const metadata = { title: "New order" };

export default async function NewOrderPage(props: { searchParams: Promise<{ repeat?: string }> }) {
  const searchParams = await props.searchParams;
  const repeat = searchParams.repeat ? await getOrder(searchParams.repeat) : null;
  const repeatOf = repeat
    ? { client_name: repeat.client_name, client_phone: repeat.client_phone, source: repeat.source, title: repeat.title, specs: repeat.specs, colourway: repeat.colourway, lines: repeat.lines }
    : null;

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <Link href="/orders" className="mut small back-link">‹ Orders</Link>
      <h1 className="page-title">{repeat ? "Repeat order" : "New order"}</h1>
      <OrderForm action={createOrder} repeatOf={repeatOf} />
    </div>
  );
}
