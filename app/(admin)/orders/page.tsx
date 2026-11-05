export const metadata = { title: "Orders" };

export default function OrdersIndex() {
  return (
    <div className="detail-empty">
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <span className="display" style={{ fontSize: 28, color: "var(--ink)" }}>Pick an order</span>
        <span>Its status, updates and money show here.</span>
      </div>
    </div>
  );
}
