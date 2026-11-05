import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderForm } from "@/components/OrderForm";
import { getOrder } from "@/lib/data";
import { updateOrder } from "../../actions";

export const metadata = { title: "Edit order" };

export default async function EditOrderPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const o = await getOrder(params.id);
  if (!o) notFound();
  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <Link href={`/orders/${o.id}`} className="mut small">‹ {o.client_name}</Link>
      <h1 className="page-title">Edit order</h1>
      <OrderForm action={updateOrder} order={o} />
    </div>
  );
}
