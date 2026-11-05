/** Shown instantly while a page's data loads, so taps feel immediate. */
export function Loading({ rows = 5 }: { rows?: number }) {
  return (
    <div className="page" aria-busy="true" aria-label="Loading">
      <div className="skel" style={{ width: 180, height: 40 }} />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div className="skel" style={{ width: 44, height: 44, borderRadius: "50%" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="skel" style={{ width: "45%", height: 14 }} />
            <div className="skel" style={{ width: "30%", height: 12 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
