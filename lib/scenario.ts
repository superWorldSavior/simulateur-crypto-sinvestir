import { runBacktest, type BacktestResult, type Frequency } from "./backtest";
import { fetchPrices } from "./prices";
import { getCoin } from "./coins";
import { eur, pct, shortDate } from "./format";
import type { SimParams } from "./params";

const FREQ_LABEL: Record<Frequency, string> = {
  once: "en une fois",
  daily: "tous les jours",
  weekly: "toutes les semaines",
  monthly: "tous les mois",
};

/**
 * Résumé compact d'un scénario (params + métriques) destiné au LLM.
 * Centralisé pour que l'analyse et le chat partent du même contexte factuel.
 */
export function describeScenario(p: SimParams, r: BacktestResult): string {
  const coin = getCoin(p.coinId);
  const verb = p.frequency === "once" ? "investi" : "investi " + FREQ_LABEL[p.frequency];
  return [
    `Crypto : ${coin?.name ?? p.coinId} (${coin?.symbol ?? ""})`,
    `Stratégie : ${eur(p.amount)} ${verb}`,
    `Période : ${shortDate(p.start)} → ${shortDate(p.end)} (${r.years.toFixed(1)} ans)`,
    `Versements : ${r.contributions}`,
    `Total investi : ${eur(r.totalInvested)}`,
    `Valeur finale : ${eur(r.finalValue, true)}`,
    `Plus/moins-value : ${eur(r.profit)} (${pct(r.profitPct)})`,
    `Pire repli (drawdown) : ${pct(r.maxDrawdown, 0)}`,
    Number.isFinite(r.annualizedReturn)
      ? `Rendement annualisé : ${pct(r.annualizedReturn, 1)}`
      : `Multiple sur investi : ×${(r.totalInvested > 0 ? r.finalValue / r.totalInvested : 0).toFixed(2)}`,
  ].join("\n");
}

/**
 * Analyse pédagogique de secours, construite par règles à partir des métriques.
 * Sert de fallback si l'appel LLM échoue → la démo reste fonctionnelle.
 */
export function templatedAnalysis(p: SimParams, r: BacktestResult): string {
  const coin = getCoin(p.coinId);
  const name = coin?.name ?? p.coinId;
  const gain = r.profit >= 0;
  const dca = p.frequency !== "once";

  const verdict = gain
    ? `votre ${eur(r.totalInvested)} investi vaudrait ${eur(r.finalValue)}, soit ${pct(r.profitPct)} de plus-value`
    : `votre ${eur(r.totalInvested)} investi ne vaudrait plus que ${eur(r.finalValue)}, soit ${pct(r.profitPct)}`;

  const drawdown =
    r.maxDrawdown <= -0.3
      ? ` En chemin, la valeur a chuté jusqu'à ${pct(r.maxDrawdown, 0)} sous son plus haut : la volatilité crypto se vit autant qu'elle se calcule.`
      : "";

  const dcaNote = dca
    ? ` En investissant régulièrement (DCA), vous auriez lissé votre prix d'achat et atténué l'impact du timing.`
    : ` En investissant en une seule fois, votre résultat dépend fortement de la date d'entrée.`;

  return `Sur ${name}, ${verdict} sur ${r.years.toFixed(1)} ans.${drawdown}${dcaNote} Ceci illustre le passé, pas une prédiction.`;
}

/** Rejoue un scénario côté serveur (prix + moteur) — utilisé par le tool du chat. */
export async function simulateScenario(p: SimParams): Promise<BacktestResult> {
  const prices = await fetchPrices(p.coinId, p.start, p.end);
  return runBacktest({
    prices,
    amount: p.amount,
    frequency: p.frequency,
    start: p.start,
    end: p.end,
  });
}
