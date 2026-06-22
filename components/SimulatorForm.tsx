"use client";

import { useState } from "react";
import { SUPPORTED_COINS } from "@/lib/coins";
import { FREQUENCIES, type SimParams } from "@/lib/params";
import { dateToMs, msToDateInput } from "@/lib/format";

interface Props {
  params: SimParams;
  onChange: (next: SimParams) => void;
  /** Récupération des prix en cours (changement de crypto / dates). */
  loading: boolean;
}

const DAY_MS = 86_400_000;
const YEAR_MS = 365.25 * DAY_MS;
// Origine pour le préréglage « Max » : la source de prix bornera à l'historique réel.
const MAX_START_MS = Date.UTC(2017, 0, 1);

const RANGE_PRESETS: { label: string; years: number }[] = [
  { label: "1 an", years: 1 },
  { label: "3 ans", years: 3 },
  { label: "5 ans", years: 5 },
  { label: "Max", years: 0 }, // 0 = depuis l'origine
];

export function SimulatorForm({ params, onChange, loading }: Props) {
  const set = (patch: Partial<SimParams>) => onChange({ ...params, ...patch });
  // Borne « aujourd'hui » figée au montage (Date.now() impur en render).
  const [today] = useState(() => msToDateInput(Date.now()));
  const [showCustom, setShowCustom] = useState(false);
  const todayMs = dateToMs(today);

  const applyPreset = (years: number) =>
    set({ start: years === 0 ? MAX_START_MS : todayMs - years * YEAR_MS, end: todayMs });

  // Préréglage actif : la fin est aujourd'hui et la durée correspond.
  const activePreset = RANGE_PRESETS.find((p) => {
    if (Math.abs(params.end - todayMs) > DAY_MS) return false;
    if (p.years === 0) return Math.abs(params.start - MAX_START_MS) < DAY_MS;
    return Math.abs(params.end - params.start - p.years * YEAR_MS) < 10 * DAY_MS;
  });

  return (
    <div className="card space-y-6 p-6">
      <div className="flex items-center gap-3">
        <span className="h-5 w-1 rounded bg-[var(--color-sky)]" />
        <h2 className="font-display text-xl">Votre scénario</h2>
        <span
          className={`ml-auto flex items-center gap-1.5 text-xs transition-opacity ${
            loading ? "text-[var(--color-sky)] opacity-100" : "text-[var(--color-faint)] opacity-70"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              loading ? "animate-pulse bg-[var(--color-sky)]" : "bg-[var(--color-gold)]"
            }`}
          />
          {loading ? "Mise à jour…" : "En direct"}
        </span>
      </div>

      {/* Crypto */}
      <label className="block">
        <span className="text-xs text-[var(--color-muted)]">Cryptomonnaie</span>
        <select
          className="field-line mt-1 w-full bg-transparent py-2 text-lg outline-none"
          value={params.coinId}
          onChange={(e) => set({ coinId: e.target.value })}
        >
          {SUPPORTED_COINS.map((c) => (
            <option key={c.id} value={c.id} className="bg-[var(--color-navy-700)]">
              {c.name} · {c.symbol}
            </option>
          ))}
        </select>
      </label>

      {/* Montant */}
      <label className="field-line flex items-baseline justify-between">
        <span className="flex-1">
          <span className="text-xs text-[var(--color-muted)]">
            {params.frequency === "once" ? "Montant investi" : "Montant par versement"}
          </span>
          <input
            type="text"
            inputMode="numeric"
            className="mt-1 w-full bg-transparent py-1 text-lg outline-none"
            value={Number.isFinite(params.amount) ? String(params.amount) : ""}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d]/g, ""); // chiffres uniquement
              set({ amount: raw === "" ? NaN : Number(raw) });
            }}
          />
        </span>
        <span className="pb-1 text-sm text-[var(--color-muted)]">EUR</span>
      </label>

      {/* Fréquence — segmented control */}
      <div>
        <span className="text-xs text-[var(--color-muted)]">Fréquence d&apos;investissement</span>
        <div
          role="group"
          aria-label="Fréquence d'investissement"
          className="mt-2 grid grid-cols-4 gap-1 rounded-full border border-[var(--hairline)] p-1"
        >
          {FREQUENCIES.map((f) => {
            const active = params.frequency === f.value;
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={active}
                onClick={() => set({ frequency: f.value })}
                className={`rounded-full py-1.5 text-sm transition ${
                  active
                    ? "bg-[var(--color-brand)] text-white"
                    : "text-[var(--color-muted)] hover:text-white"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Période — raccourcis (principal) + dates manuelles repliables */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-muted)]">Période</span>
          <button
            type="button"
            aria-expanded={showCustom}
            onClick={() => setShowCustom((v) => !v)}
            className="text-xs text-[var(--color-sky)] transition hover:opacity-80"
          >
            {showCustom ? "Fermer" : "Personnaliser"}
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {RANGE_PRESETS.map((p) => {
            const active = !showCustom && activePreset?.label === p.label;
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setShowCustom(false);
                  applyPreset(p.years);
                }}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  active
                    ? "bg-[var(--color-brand)] text-white"
                    : "pill hover:bg-[rgba(16,152,247,0.14)]"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {showCustom && (
          <div className="mt-3 grid grid-cols-2 gap-4">
            <label className="field-line block">
              <span className="text-[11px] text-[var(--color-faint)]">Début</span>
              <input
                type="date"
                className="mt-0.5 w-full bg-transparent py-1 text-sm outline-none"
                value={msToDateInput(params.start)}
                max={msToDateInput(params.end)}
                onChange={(e) => set({ start: dateToMs(e.target.value) })}
              />
            </label>
            <label className="field-line block">
              <span className="text-[11px] text-[var(--color-faint)]">Fin</span>
              <input
                type="date"
                className="mt-0.5 w-full bg-transparent py-1 text-sm outline-none"
                value={msToDateInput(params.end)}
                min={msToDateInput(params.start)}
                max={today}
                onChange={(e) => set({ end: dateToMs(e.target.value) })}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
