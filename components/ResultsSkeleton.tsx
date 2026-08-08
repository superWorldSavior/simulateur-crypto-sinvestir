import Image from "next/image";

/**
 * Placeholder de chargement / d'attente, calqué sur la structure des résultats
 * et habillé à la charte S'investir (logo, accents). Affiché tant qu'aucun
 * résultat n'est disponible (récupération des prix ou montant non renseigné).
 */
export function ResultsSkeleton({ hint }: { hint?: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="h-5 w-1 rounded bg-[var(--color-sky)]" />
        <h2 className="font-display text-xl text-[var(--color-muted)]">Vos résultats</h2>
      </div>

      {/* Valeur finale + performance */}
      <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
        <div className="card p-5">
          <div className="skeleton h-3 w-28" />
          <div className="skeleton mt-3 h-9 w-48" />
          <div className="skeleton mt-5 h-2.5 w-full !rounded-full" />
        </div>
        <div className="card flex flex-col justify-center p-5">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton mt-3 h-9 w-24" />
        </div>
      </div>

      {/* Zone graphe : logo S'investir en filigrane + indice */}
      <div className="card relative flex h-64 items-center justify-center overflow-hidden p-5">
        <div className="skeleton absolute inset-5 !rounded-xl opacity-60" />
        <div className="relative flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2.5 opacity-80">
            <Image src="/sinvestir-logo.svg" alt="S'investir" width={34} height={34} />
            <span className="font-display text-sm font-semibold tracking-[0.2em] text-[var(--color-muted)]">
              SIMULATEURS
            </span>
          </div>
          <p className="max-w-xs text-sm text-[var(--color-faint)]">
            {hint ?? "Préparation de votre simulation…"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card p-4">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton mt-2 h-6 w-16" />
          </div>
        ))}
      </div>

      {/* Carte analyse IA */}
      <div className="card space-y-4 p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[rgba(16,152,247,0.16)] text-sm">
            ✦
          </span>
          <h2 className="font-display text-xl text-[var(--color-muted)]">Analyse S&apos;investir</h2>
          <span className="pill ml-auto px-2.5 py-0.5 text-[11px]">IA</span>
        </div>
        <div className="space-y-2">
          <div className="skeleton h-3.5 w-full" />
          <div className="skeleton h-3.5 w-[92%]" />
          <div className="skeleton h-3.5 w-[78%]" />
        </div>
      </div>
    </div>
  );
}
