/* Onmiddellike terugvoer op elke navigasie — die bediener-render volg. */
export default function Laai() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.18em] text-ink/50">
        <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-red" />
        LAAI…
      </p>
    </div>
  );
}
