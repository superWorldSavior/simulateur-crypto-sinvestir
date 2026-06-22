"use client";

import type { BacktestResult } from "@/lib/backtest";
import type { Coin } from "@/lib/coins";
import { eur, pct } from "@/lib/format";
import { EvolutionChart } from "./EvolutionChart";

/** Barre de répartition investi / plus-value, façon simu Intérêts Composés. */
function SplitBar({ invested, finalValue }: { invested: number; finalValue: number }) {
  const profit = finalValue - invested;
  if (profit >= 0) {
    const investedFrac = finalValue > 0 ? invested / finalValue : 1;
    return (
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
        <div className="bg-[#1098f7]" style={{ width: `${investedFrac * 100}%` }} />
        <div className="bg-[#c9a24b]" style={{ width: `${(1 - investedFrac) * 100}%` }} />
      </div>
    );
  }
  // Perte : part de capital restante vs perdue.
  const keptFrac = invested > 0 ? Math.max(finalValue, 0) / invested : 0;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
      <div className="bg-[#1098f7]" style={{ width: `${keptFrac * 100}%` }} />
      <div className="bg-[#e0567a]/70" style={{ width: `${(1 - keptFrac) * 100}%` }} />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
      <div className="mt-1 font-display text-2xl" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}

export function ResultsPanel({ result, coin }: { result: BacktestResult; coin: Coin }) {
  const positive = result.profit >= 0;
  const accent = positive ? "#e0c074" : "#e0567a";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="h-5 w-1 rounded bg-[var(--color-sky)]" />
        <h2 className="font-display text-xl">Vos résultats</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
        {/* Carte principale : valeur finale + répartition */}
        <div className="card p-5">
          <div className="text-sm text-[var(--color-muted)]">Valeur finale en {coin.symbol}</div>
          <div className="mt-1 font-display text-4xl tracking-tight">{eur(result.finalValue, true)}</div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-[var(--color-muted)]">
              Investi <span className="text-[#1098f7]">{eur(result.totalInvested)}</span>
            </span>
            <span className="text-[var(--color-muted)]">
              {positive ? "Plus-value" : "Moins-value"}{" "}
              <span style={{ color: accent }}>{eur(result.profit)}</span>
            </span>
          </div>
          <div className="mt-2">
            <SplitBar invested={result.totalInvested} finalValue={result.finalValue} />
          </div>
        </div>

        {/* Performance */}
        <div className="card flex flex-col justify-center p-5">
          <div className="text-xs text-[var(--color-muted)]">Performance</div>
          <div className="mt-1 font-display text-4xl" style={{ color: accent }}>
            {pct(result.profitPct)}
          </div>
          <div className="mt-1 text-xs text-[var(--color-faint)]">
            sur {result.contributions} versement{result.contributions > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div className="card p-5">
        {/* key dérivée du résultat → l'animation de tracé rejoue à chaque recalcul. */}
        <EvolutionChart
          key={`${result.series.length}:${result.finalValue.toFixed(2)}:${result.totalInvested}`}
          series={result.series}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Plus haut repli" value={pct(result.maxDrawdown, 0)} accent="#e0567a" />
        {Number.isFinite(result.annualizedReturn) ? (
          <Stat label="Rendement annualisé" value={pct(result.annualizedReturn, 1)} />
        ) : (
          <Stat
            label="Multiple sur investi"
            value={`×${(result.totalInvested > 0 ? result.finalValue / result.totalInvested : 0).toFixed(2)}`}
          />
        )}
        <Stat label="Durée" value={`${result.years.toFixed(1)} an${result.years >= 2 ? "s" : ""}`} />
      </div>
    </div>
  );
}
