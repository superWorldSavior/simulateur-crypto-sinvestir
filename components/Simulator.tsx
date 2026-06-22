"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { runBacktest, type BacktestResult, type PricePoint } from "@/lib/backtest";
import { getCoin } from "@/lib/coins";
import type { SimParams } from "@/lib/params";
import { SimulatorForm } from "./SimulatorForm";
import { ResultsPanel } from "./ResultsPanel";
import { ResultsSkeleton } from "./ResultsSkeleton";
import { AiAnalysis } from "./AiAnalysis";

const YEAR_MS = 365.25 * 86_400_000;

function defaultParams(): SimParams {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  return {
    coinId: "bitcoin",
    amount: 100,
    frequency: "monthly",
    start: end.getTime() - 3 * YEAR_MS,
    end: end.getTime(),
  };
}

/** Clé identifiant le jeu de prix nécessaire (crypto + période). */
function priceKeyOf(p: SimParams): string {
  return `${p.coinId}:${p.start}:${p.end}`;
}

export function Simulator() {
  const [params, setParams] = useState<SimParams>(defaultParams);
  // Les prix sont étiquetés par la clé crypto+période à laquelle ils appartiennent.
  const [priceData, setPriceData] = useState<{ key: string; prices: PricePoint[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchId = useRef(0);

  const priceKey = priceKeyOf(params);

  // Fetch des prix quand la crypto / période change (débounce pour les dates).
  useEffect(() => {
    const id = ++fetchId.current;
    const key = `${params.coinId}:${params.start}:${params.end}`;
    const handle = setTimeout(async () => {
      if (params.start >= params.end) {
        setError("La date de début doit précéder la date de fin.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/prices?coin=${params.coinId}&from=${params.start}&to=${params.end}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message ?? "Échec de récupération des prix.");
        if (id !== fetchId.current) return;
        setPriceData({ key, prices: json.prices as PricePoint[] });
        setError(null);
      } catch (e) {
        if (id !== fetchId.current) return;
        setError(e instanceof Error ? e.message : "Erreur inattendue.");
        setPriceData(null);
      } finally {
        if (id === fetchId.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [params.coinId, params.start, params.end]);

  // Prix valides UNIQUEMENT s'ils correspondent à la crypto/période courante.
  // Sinon (changement en cours), on n'affiche pas un résultat périmé → skeleton.
  const prices = priceData && priceData.key === priceKey ? priceData.prices : null;
  const amountInvalid = !Number.isFinite(params.amount) || params.amount <= 0;

  // Recalcul instantané (moteur pur) — montant/fréquence ne refetchent pas.
  const result = useMemo<BacktestResult | null>(() => {
    if (!prices || prices.length < 2 || amountInvalid || params.start >= params.end) return null;
    try {
      return runBacktest({
        prices,
        amount: params.amount,
        frequency: params.frequency,
        start: params.start,
        end: params.end,
      });
    } catch {
      return null;
    }
  }, [prices, params.amount, params.frequency, params.start, params.end, amountInvalid]);

  const coin = getCoin(params.coinId)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="lg:sticky lg:top-6 lg:self-start">
        <SimulatorForm params={params} onChange={setParams} loading={loading} />
      </div>

      <div className="space-y-6">
        {error ? (
          <div className="card border-[#e0567a]/40 bg-[#e0567a]/10 p-4 text-sm text-[#f3a9bd]">
            {error}
          </div>
        ) : amountInvalid ? (
          <ResultsSkeleton hint="Renseignez un montant pour lancer la simulation." />
        ) : result ? (
          <>
            <ResultsPanel result={result} coin={coin} />
            <AiAnalysis params={params} ready={!loading} />
          </>
        ) : (
          <ResultsSkeleton hint={`Chargement des données ${coin.name}…`} />
        )}
      </div>
    </div>
  );
}
