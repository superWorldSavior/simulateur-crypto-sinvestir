import Image from "next/image";
import { Simulator } from "@/components/Simulator";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
      {/* En-tête façon suite S'investir */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Image src="/sinvestir-logo.svg" alt="S'investir" width={28} height={28} priority />
          <span className="font-display text-sm font-semibold tracking-[0.2em]">SIMULATEURS</span>
        </div>
        <span className="pill px-3 py-1 text-xs">Simulateur crypto</span>
      </header>

      {/* Hero — le scénario est le cœur, on l'annonce directement */}
      <section className="py-10 text-center sm:py-14">
        <p className="text-sm text-[var(--color-muted)]">Investissement progressif · données réelles</p>
        <h1 className="mx-auto mt-3 max-w-3xl font-display text-4xl leading-tight tracking-tight sm:text-5xl">
          Et si vous aviez investi en crypto, <span className="text-[var(--color-gold-soft)]">à votre rythme</span> ?
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-[rgba(255,255,255,0.72)]">
          Rejouez une stratégie d&apos;achat régulier (DCA) sur l&apos;historique réel du marché,
          et laissez l&apos;analyse S&apos;investir vous en expliquer la leçon.
        </p>
      </section>

      <Simulator />

      <footer className="mt-16 border-t border-[var(--hairline)] py-6 text-center text-xs text-[var(--color-faint)]">
        Démo — test technique. Données de marché via Binance · backtest indicatif, pas un conseil en investissement.
      </footer>
    </main>
  );
}
