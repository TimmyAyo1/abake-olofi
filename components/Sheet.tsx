import Link from "next/link";

/** A bottom sheet (phone) / dialog (tablet, laptop) opened by a ?query on the page. */
export function Sheet({ title, kicker, closeHref, children }: { title: string; kicker?: string; closeHref: string; children: React.ReactNode }) {
  return (
    <div className="sheet-wrap">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-h">
          <div>
            {kicker ? <div className="mut small">{kicker}</div> : null}
            <h2>{title}</h2>
          </div>
          <Link href={closeHref} className="x" aria-label="Close" scroll={false}>×</Link>
        </div>
        {children}
      </div>
    </div>
  );
}
