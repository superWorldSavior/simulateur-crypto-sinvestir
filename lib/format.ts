/** Formatage localisé FR — utilisé partout pour la cohérence d'affichage. */

const eur0 = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const eur2 = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

/** Montant en euros. Sans décimales par défaut, 2 si `cents`. */
export function eur(n: number, cents = false): string {
  if (!Number.isFinite(n)) return "—";
  return (cents ? eur2 : eur0).format(n);
}

/** Pourcentage signé, ex: "+34,2 %" / "-12,0 %". */
export function pct(fraction: number, digits = 1): string {
  if (!Number.isFinite(fraction)) return "—";
  const v = fraction * 100;
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`;
}

/** Date courte FR, ex: "5 déc. 2025". */
export function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Conversion <input type="date"> (YYYY-MM-DD) ↔ ms UTC. */
export function dateToMs(value: string): number {
  return new Date(`${value}T00:00:00Z`).getTime();
}
export function msToDateInput(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
