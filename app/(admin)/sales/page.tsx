export const metadata = { title: "Sales" };

export default function SalesIndex() {
  return (
    <div className="detail-empty">
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <span className="display" style={{ fontSize: 28, color: "var(--ink)" }}>Pick a sale</span>
        <span>Its receipt shows here, ready to send.</span>
      </div>
    </div>
  );
}
