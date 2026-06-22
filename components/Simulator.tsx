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

export function Simulator() {
  const [params, setParams] = useState<SimParams>(defaultParams);
  const [prices, setPrices] = useState<PricePoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchId = useRef(0);

  // Les prix ne dépendent que de la crypto et de la période → on ne refetch
  // QUE quand l'un d'eux change (débounce pour les saisies de dates). Changer
  // le montant ou la fréquence ne déclenche aucun appel réseau.
  useEffect(() => {
    const id = ++fetchId.current;
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
        setPrices(json.prices as PricePoint[]);
        setError(null);
      } catch (e) {
        if (id !== fetchId.current) return;
        setError(e instanceof Error ? e.message : "Erreur inattendue.");
        setPrices(null);
      } finally {
        if (id === fetchId.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [params.coinId, params.start, params.end]);

  // Recalcul instantané (moteur pur) dès que prix / montant / fréquence changent.
  const result = useMemo<BacktestResult | null>(() => {
    if (!prices || prices.length < 2) return null;
    if (!Number.isFinite(params.amount) || params.amount <= 0) return null;
    if (params.start >= params.end) return null;
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
  }, [prices, params.amount, params.frequency, params.start, params.end]);

  const coin = getCoin(params.coinId)!;
  const amountInvalid = !Number.isFinite(params.amount) || params.amount <= 0;

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
          <ResultsSkeleton hint="Chargement des données de marché…" />
        )}
      </div>
    </div>
  );
}
