/**
 * Moteur de backtest DCA (Dollar-Cost Averaging) sur données historiques.
 *
 * Logique reprise du simulateur crypto S'investir : on choisit une crypto, un
 * montant, une fréquence d'investissement et une période ; on rejoue ce qui se
 * serait passé sur les prix réels.
 *
 * Module 100 % pur (aucune dépendance, aucun I/O) → testable et réutilisable
 * côté serveur comme côté client.
 */

export type Frequency = "once" | "daily" | "weekly" | "monthly";

/** Un point de prix journalier. `t` = timestamp Unix en ms (UTC). */
export interface PricePoint {
  t: number;
  price: number;
}

export interface BacktestInput {
  /** Série de prix triée par `t` croissant, en devise de cotation (EUR). */
  prices: PricePoint[];
  /** Montant par versement (ou montant unique si `frequency === "once"`). */
  amount: number;
  frequency: Frequency;
  /** Bornes de la période, en ms (UTC). */
  start: number;
  end: number;
}

export interface BacktestPoint {
  t: number;
  /** Montant cumulé investi jusqu'à `t`. */
  invested: number;
  /** Valeur du portefeuille à `t`. */
  value: number;
}

export interface BacktestResult {
  totalInvested: number;
  finalValue: number;
  /** Plus/moins-value absolue (finalValue - totalInvested). */
  profit: number;
  /** Plus/moins-value relative, en fraction (0.34 = +34 %). */
  profitPct: number;
  /** Quantité totale de crypto accumulée. */
  units: number;
  /** Nombre de versements effectués. */
  contributions: number;
  /** Courbe valeur vs investi dans le temps (pour le graphe). */
  series: BacktestPoint[];
  /** Pire repli pic-à-creux de la valeur, en fraction négative (ex: -0.62). */
  maxDrawdown: number;
  /** Rendement annualisé — uniquement pour un investissement unique ; NaN en DCA. */
  annualizedReturn: number;
  /** Durée de la période en années. */
  years: number;
  startPrice: number;
  endPrice: number;
}

const DAY_MS = 86_400_000;

/**
 * Génère les timestamps de versement entre `start` et `end` (inclus) selon la
 * fréquence. Le pas mensuel suit le calendrier (même quantième chaque mois).
 */
export function contributionDates(
  start: number,
  end: number,
  frequency: Frequency
): number[] {
  if (start > end) return [];
  if (frequency === "once") return [start];

  const dates: number[] = [];

  if (frequency === "monthly") {
    const d = new Date(start);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    for (let i = 0; ; i++) {
      // Clamp au dernier jour du mois cible : un versement le 31 ne doit pas
      // déborder sur le mois suivant (31 jan → 28/29 fév, pas 3 mars).
      const lastDay = new Date(Date.UTC(y, m + i + 1, 0)).getUTCDate();
      const ts = Date.UTC(y, m + i, Math.min(day, lastDay));
      if (ts > end) break;
      dates.push(ts);
    }
    return dates;
  }

  const step = frequency === "daily" ? DAY_MS : 7 * DAY_MS;
  for (let ts = start; ts <= end; ts += step) dates.push(ts);
  return dates;
}

/**
 * Prix le plus proche à une date donnée, en privilégiant le dernier prix connu
 * à `t` ou avant (les données étant journalières). Recherche dichotomique.
 */
export function priceAt(prices: PricePoint[], t: number): number {
  if (prices.length === 0) return NaN;
  if (t <= prices[0].t) return prices[0].price;
  if (t >= prices[prices.length - 1].t) return prices[prices.length - 1].price;

  let lo = 0;
  let hi = prices.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (prices[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  return prices[lo].price;
}

/**
 * Rejoue la stratégie DCA sur la série de prix et renvoie les métriques + la
 * courbe d'évolution. Lève si la série est vide ou la période invalide.
 */
export function runBacktest(input: BacktestInput): BacktestResult {
  const { prices, amount, frequency, start, end } = input;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("amount must be a positive number");
  }
  if (prices.length === 0) {
    throw new Error("prices must not be empty");
  }
  if (start > end) {
    throw new Error("start must be before end");
  }

  // Versements valides (prix exploitable).
  const buys = contributionDates(start, end, frequency)
    .map((t) => ({ t, price: priceAt(prices, t) }))
    .filter((b) => Number.isFinite(b.price) && b.price > 0);

  if (buys.length === 0) {
    throw new Error("no valid contribution could be priced");
  }

  // Courbe : à chaque point de prix de la période, valeur = unités cumulées × prix.
  const window = prices.filter((p) => p.t >= start && p.t <= end);
  const points = window.length > 0 ? window : [prices[prices.length - 1]];

  const series: BacktestPoint[] = [];
  let buyIdx = 0;
  let cumUnits = 0;
  let cumInvested = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const p of points) {
    // Intègre tous les versements échus jusqu'à ce point.
    while (buyIdx < buys.length && buys[buyIdx].t <= p.t) {
      const b = buys[buyIdx];
      cumUnits += amount / b.price;
      cumInvested += amount;
      buyIdx += 1;
    }
    const value = cumUnits * p.price;
    series.push({ t: p.t, invested: cumInvested, value });

    if (value > peak) peak = value;
    if (peak > 0) {
      const dd = (value - peak) / peak;
      if (dd < maxDrawdown) maxDrawdown = dd;
    }
  }

  // Intègre les versements restants (au-delà du dernier point de prix).
  while (buyIdx < buys.length) {
    const b = buys[buyIdx];
    cumUnits += amount / b.price;
    cumInvested += amount;
    buyIdx += 1;
  }

  const endPrice = points[points.length - 1].price;
  const totalInvested = cumInvested;
  const finalValue = cumUnits * endPrice;
  const profit = finalValue - totalInvested;
  const profitPct = totalInvested > 0 ? profit / totalInvested : 0;
  const years = Math.max((end - start) / (365.25 * DAY_MS), 0);
  // Annualiser n'a de sens qu'en investissement unique (lump sum). En DCA le
  // capital est déployé progressivement → on renvoie NaN plutôt qu'un chiffre
  // trompeur (l'UI affiche alors le multiple sur investi, honnête en DCA).
  const annualizedReturn =
    buys.length === 1 && years > 0 && totalInvested > 0
      ? Math.pow(finalValue / totalInvested, 1 / years) - 1
      : NaN;

  return {
    totalInvested,
    finalValue,
    profit,
    profitPct,
    units: cumUnits,
    contributions: buys.length,
    series,
    maxDrawdown,
    annualizedReturn,
    years,
    startPrice: priceAt(prices, start),
    endPrice,
  };
}
