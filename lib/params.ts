import type { Frequency } from "./backtest";
import { isSupportedCoin } from "./coins";

const VALID_FREQ: Frequency[] = ["once", "daily", "weekly", "monthly"];

/** Valide un objet inconnu (body de requête) en SimParams, ou lève. */
export function parseParams(input: unknown): SimParams {
  const p = input as Partial<SimParams> | null;
  if (!p || typeof p !== "object") throw new Error("params manquants");
  if (!isSupportedCoin(p.coinId as string)) throw new Error("crypto non supportée");
  if (!Number.isFinite(p.amount) || (p.amount as number) <= 0) throw new Error("montant invalide");
  if (!VALID_FREQ.includes(p.frequency as Frequency)) throw new Error("fréquence invalide");
  if (!Number.isFinite(p.start) || !Number.isFinite(p.end) || (p.start as number) >= (p.end as number)) {
    throw new Error("période invalide");
  }
  return {
    coinId: p.coinId as string,
    amount: p.amount as number,
    frequency: p.frequency as Frequency,
    start: p.start as number,
    end: p.end as number,
  };
}

/** Paramètres de simulation partagés entre le formulaire et le moteur. */
export interface SimParams {
  coinId: string;
  amount: number;
  frequency: Frequency;
  /** Bornes en ms (UTC). */
  start: number;
  end: number;
}

export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "once", label: "Une fois" },
  { value: "monthly", label: "Mensuel" },
  { value: "weekly", label: "Hebdo" },
  { value: "daily", label: "Quotidien" },
];
