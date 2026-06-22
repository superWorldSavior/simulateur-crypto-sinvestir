"use client";

import { useEffect, useRef, useState } from "react";
import type { SimParams } from "@/lib/params";
import { ScenarioChat } from "./ScenarioChat";

/**
 * Couche IA = le différenciateur. Remplace la phrase de synthèse statique des
 * simulateurs S'investir par une vraie analyse pédagogique générée, suivie d'un
 * chat contextuel qui recalcule les variantes sur données réelles.
 *
 * L'analyse est débouncée : en simulateur live, on évite de spammer le LLM à
 * chaque frappe. L'ancienne analyse reste affichée (estompée) pendant le refresh.
 */
export function AiAnalysis({ params, ready }: { params: SimParams; ready: boolean }) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  const key = `${params.coinId}-${params.amount}-${params.frequency}-${params.start}-${params.end}`;

  useEffect(() => {
    if (!ready) return;
    const id = ++reqId.current;
    // Débounce : on attend que les paramètres se stabilisent.
    const handle = setTimeout(() => {
      setLoading(true);
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params }),
      })
        .then((r) => r.json())
        .then((j) => {
          if (id !== reqId.current) return;
          setAnalysis(j.analysis ?? j?.error?.message ?? "Analyse indisponible.");
        })
        .catch(() => id === reqId.current && setAnalysis("Analyse indisponible pour le moment."))
        .finally(() => id === reqId.current && setLoading(false));
    }, 800);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return (
    <div className="card space-y-4 p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[rgba(16,152,247,0.16)] text-sm">
          ✦
        </span>
        <h2 className="font-display text-xl">Analyse S&apos;investir</h2>
        <span className="pill ml-auto px-2.5 py-0.5 text-[11px]">IA</span>
      </div>

      {analysis === null ? (
        <div className="space-y-2" aria-hidden>
          <div className="h-3.5 w-full animate-pulse rounded bg-white/8" />
          <div className="h-3.5 w-[92%] animate-pulse rounded bg-white/8" />
          <div className="h-3.5 w-[78%] animate-pulse rounded bg-white/8" />
        </div>
      ) : (
        <p
          className={`text-[15px] leading-relaxed text-[rgba(255,255,255,0.86)] transition-opacity ${
            loading ? "opacity-40" : "opacity-100"
          }`}
        >
          {analysis}
        </p>
      )}

      <div className="border-t border-[var(--hairline)] pt-4">
        {/* key dérivée du scénario → le chat repart vierge à chaque changement. */}
        <ScenarioChat key={key} scenario={params} />
      </div>
    </div>
  );
}
