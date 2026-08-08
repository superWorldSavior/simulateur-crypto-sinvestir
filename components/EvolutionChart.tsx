"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { BacktestPoint } from "@/lib/backtest";
import { eur, shortDate } from "@/lib/format";

/**
 * Graphe d'évolution fait main en SVG (zéro dépendance → léger et embarquable).
 * Deux séries : valeur du portefeuille (or) vs montant investi (bleu, pointillé).
 * Axes Y (en €) et X (dates) pour rendre lisibles les changements d'échelle.
 */
const W = 820;
const H = 300;
const PAD = { top: 16, right: 18, bottom: 30, left: 58 };

/** Format court pour l'axe Y : "1,5 k€", "205 €". */
function axisEur(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toLocaleString("fr-FR", {
      maximumFractionDigits: n >= 10000 ? 0 : 1,
    })} k€`;
  }
  return `${Math.round(n)} €`;
}

export function EvolutionChart({ series }: { series: BacktestPoint[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const fillId = useId(); // id unique → pas de collision entre plusieurs embeds

  const geo = useMemo(() => {
    if (series.length < 2) return null;
    const xs = series.map((p) => p.t);
    const ys = series.flatMap((p) => [p.value, p.invested]);
    const minX = xs[0];
    const maxX = xs[xs.length - 1];
    const maxY = Math.max(...ys, 1);

    const x = (t: number) =>
      PAD.left + ((t - minX) / (maxX - minX)) * (W - PAD.left - PAD.right);
    const y = (v: number) =>
      PAD.top + (1 - v / maxY) * (H - PAD.top - PAD.bottom);

    const path = (key: "value" | "invested") =>
      series.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");

    const area =
      `${path("value")} L${x(maxX).toFixed(1)},${(H - PAD.bottom).toFixed(1)} ` +
      `L${x(minX).toFixed(1)},${(H - PAD.bottom).toFixed(1)} Z`;

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);
    const mid = series[Math.floor((series.length - 1) / 2)];
    const xTicks = [
      { t: series[0].t, anchor: "start" as const },
      { t: mid.t, anchor: "middle" as const },
      { t: series[series.length - 1].t, anchor: "end" as const },
    ];

    return {
      x,
      y,
      minX,
      maxX,
      valueLine: path("value"),
      investedLine: path("invested"),
      area,
      yTicks,
      xTicks,
    };
  }, [series]);

  if (!geo) return null;

  const active = hover != null ? series[hover] : null;

  function onMove(e: React.PointerEvent) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(ratio * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, idx)));
  }

  return (
    <div ref={wrapRef} className="relative w-full" onPointerLeave={() => setHover(null)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: "auto" }}
        onPointerMove={onMove}
        role="img"
        aria-label="Évolution de la valeur du portefeuille comparée au montant investi"
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9a24b" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#c9a24b" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grille + axe Y (en euros) */}
        {geo.yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={geo.y(v)}
              y2={geo.y(v)}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={geo.y(v) + 3}
              textAnchor="end"
              className="fill-[var(--color-faint)]"
              fontSize="10"
            >
              {axisEur(v)}
            </text>
          </g>
        ))}

        <path className="chart-area" d={geo.area} fill={`url(#${fillId})`} />
        <path
          d={geo.investedLine}
          fill="none"
          stroke="#1098f7"
          strokeWidth="1.5"
          strokeDasharray="5 5"
          opacity="0.85"
        />
        <path
          className="chart-line"
          pathLength={1}
          d={geo.valueLine}
          fill="none"
          stroke="#e0c074"
          strokeWidth="2.5"
        />

        {/* Axe X (dates) */}
        {geo.xTicks.map((tick, i) => (
          <text
            key={i}
            x={geo.x(tick.t)}
            y={H - PAD.bottom + 18}
            textAnchor={tick.anchor}
            className="fill-[var(--color-faint)]"
            fontSize="10"
          >
            {shortDate(tick.t)}
          </text>
        ))}

        {active && (
          <g>
            <line
              x1={geo.x(active.t)}
              x2={geo.x(active.t)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1"
            />
            <circle cx={geo.x(active.t)} cy={geo.y(active.value)} r="4" fill="#e0c074" />
            <circle cx={geo.x(active.t)} cy={geo.y(active.invested)} r="3" fill="#1098f7" />
          </g>
        )}
      </svg>

      {/* Légende */}
      <div className="mt-2 flex items-center gap-5 text-xs text-[var(--color-muted)]">
        <span className="flex items-center gap-2">
          <span className="inline-block h-[2px] w-4 bg-[#e0c074]" /> Valeur du portefeuille
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-[2px] w-4 bg-[#1098f7] [border-top:1px_dashed]" /> Montant investi
        </span>
      </div>

      {/* Tooltip survol */}
      {active && (
        <div className="pointer-events-none absolute right-2 top-2 rounded-lg border border-[var(--hairline)] bg-[var(--color-navy-700)]/90 px-3 py-2 text-xs backdrop-blur">
          <div className="text-[var(--color-muted)]">{shortDate(active.t)}</div>
          <div className="mt-1 text-[#e0c074]">Valeur {eur(active.value)}</div>
          <div className="text-[#1098f7]">Investi {eur(active.invested)}</div>
        </div>
      )}
    </div>
  );
}
