import type { Kwotasie } from "@/lib/markets/source";

const geldFmt = new Intl.NumberFormat("af-ZA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatteerPrys(k: Kwotasie): string {
  const n = geldFmt.format(k.prys);
  if (k.geldeenheid === "ZAR") return `R ${n}`;
  if (k.geldeenheid === "USD") return `$ ${n}`;
  if (k.geldeenheid === "GBP") return `£ ${n}`;
  if (k.geldeenheid === "JPY") return `¥ ${n}`;
  return n;
}

export function Pyl({ op }: { op: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block"
      style={{
        width: 0,
        height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        ...(op
          ? { borderBottom: "8px solid var(--brand-green)" }
          : { borderTop: "8px solid var(--brand-red)" }),
      }}
    />
  );
}
