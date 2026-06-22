"use client";

import { useState } from "react";
import type { SimParams } from "@/lib/params";

const SUGGESTIONS = [
  "Et si j'avais investi tous les mois ?",
  "Compare avec l'Ethereum",
  "Et sur les 5 dernières années ?",
];

type Msg = { role: "user" | "assistant"; content: string; usedTool?: boolean };

export function ScenarioChat({ scenario }: { scenario: SimParams }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const json = await res.json();
      setMessages([
        ...next,
        { role: "assistant", content: json.text ?? "Réponse indisponible.", usedTool: json.usedTool },
      ]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Problème de connexion. Réessaie dans un instant." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {messages.length > 0 && (
        <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[var(--color-brand)] text-white"
                    : "border border-[var(--hairline)] bg-white/5 text-[var(--color-ink)]"
                }`}
              >
                {m.role === "assistant" && m.usedTool && (
                  <div className="mb-1 text-[11px] text-[var(--color-sky)]">
                    ↻ recalculé sur données réelles
                  </div>
                )}
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-[var(--hairline)] bg-white/5 px-4 py-2.5 text-sm text-[var(--color-muted)]">
                L&apos;assistant réfléchit…
              </div>
            </div>
          )}
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="pill px-3 py-1.5 text-xs transition hover:bg-[rgba(16,152,247,0.14)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez une question sur ce scénario…"
          aria-label="Votre question sur ce scénario"
          className="field-line flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-[var(--color-faint)]"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-brand-600)] disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
