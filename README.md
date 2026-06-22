# Simulateur Crypto — S'investir

Transposition du [simulateur crypto S'investir](https://sinvestir.fr/simulateur-crypto-monnaie/)
au format et à l'identité visuelle de la suite [simulateurs.sinvestir.fr](https://simulateurs.sinvestir.fr/),
avec une **couche IA pédagogique** comme valeur ajoutée.

On rejoue une stratégie d'investissement progressif (DCA) en crypto sur l'historique
réel du marché, puis une IA explique le résultat et répond aux questions de suivi en
**recalculant** les variantes sur les vraies données.

- **Démo en ligne** : https://simulateur-crypto-sinvestir-mu.vercel.app
- **Stack** : Next.js 16 (App Router) · TypeScript · Tailwind v4 · AI SDK v6 · Vercel

---

## Lancer le projet

```bash
npm install
cp .env.example .env.local   # renseigner GROQ_API_KEY (gratuit : console.groq.com)
npm run dev                  # http://localhost:3000
```

Autres scripts : `npm test` (Vitest), `npm run lint`, `npm run build`.

### Variables d'environnement

| Variable         | Rôle                                                        |
| ---------------- | ----------------------------------------------------------- |
| `GROQ_API_KEY`   | Clé Groq (gratuite) — couche IA. **Côté serveur uniquement.** |
| `XAI_API_KEY`    | Backup xAI/Grok (optionnel).                                |
| `LLM_PROVIDER`   | `groq` (défaut) ou `xai`.                                   |

Aucune clé n'est nécessaire pour les **prix** (source publique sans clé, cf. ci-dessous).

---

## Partis pris techniques

**Next.js + Vercel — alignement sur votre stack.** Le brief mentionne votre infra
(Next.js, Supabase, Vercel, n8n, Claude Code). J'ai pris Next.js + Vercel pour que le
rendu s'y intègre directement : page statique pour le SEO + routes serveur pour les
appels externes (prix, LLM).

**Données de prix : Binance, pas CoinGecko.** Le simulateur d'origine s'appuie sur des
données de marché historiques. CoinGecko (l'API « évidente ») renvoie désormais `401`
sans clé sur l'endpoint historique → trop fragile pour une démo. J'utilise le miroir
public `data-api.binance.vision` : **gratuit, sans clé, et non géo-bloqué** (point
important : Vercel s'exécute en région US, où `api.binance.com` renvoie `451`). Les 15
cryptos supportées ont toutes une paire `…EUR`. Un cache mémoire amortit les appels.

**La couche IA est le différenciateur.** Le poste est « Dev IA » et la marque fait de la
pédagogie financière. Les simulateurs S'investir affichent déjà une phrase de synthèse
_statique_ ; je la remplace par :

1. une **analyse pédagogique générée** (leçon DCA, volatilité, repli) ;
2. un **chat contextuel** où l'utilisateur demande _« et si mensuel ? »_, _« compare ETH »_…
   et le modèle **rejoue réellement le backtest** via un outil (`runBacktest`) — il répond
   avec des chiffres calculés, pas inventés (badge « ↻ recalculé sur données réelles »).

LLM appelé **côté serveur** (Groq, gratuit/rapide ; clé jamais exposée). Endpoints
OpenAI-compatibles → bascule vers xAI triviale. Fallback templaté si le LLM échoue, pour
que la démo ne casse jamais.

**Formulaire, pas chat-first.** Tentation : tout passer en conversationnel. Écarté : les
simulateurs S'investir sont des formulaires 2 colonnes ; un chat pur détonnerait avec la
charte et serait moins fiable/SEO-friendly. Hybride retenu — formulaire fidèle + IA sur le
résultat. C'est le meilleur des deux.

**Honnêteté des métriques.** Le « rendement annualisé » n'a de sens qu'en investissement
unique ; en DCA il est trompeur (capital déployé progressivement). Je l'affiche donc
uniquement pour le mode « une fois », et un **multiple sur investi** en DCA — important
pour une marque d'éducation financière.

**UI faite main en Tailwind (pas de lib de composants).** Design très spécifique à
reproduire au pixel + exigence d'embarquabilité (« peu de dépendances ») → composants et
**graphe SVG** maison. shadcn/ui aurait imposé sa signature visuelle et plus de deps.

---

## Architecture

```
lib/
  backtest.ts      Moteur DCA pur, testé (contributionDates, priceAt, runBacktest)
  prices.ts        Récup. prix Binance + pagination + cache (serveur)
  scenario.ts      Résumé scénario pour le LLM + fallback templaté
  llm.ts           Provider Groq/xAI (OpenAI-compatible)
  coins / params / format
app/api/
  prices           GET prix historiques (validation frontière)
  analyze          POST analyse pédagogique (LLM + fallback)
  chat             POST chat streaming + tool runBacktest (AI SDK v6)
components/
  Simulator        Orchestrateur (état, fetch, moteur)
  SimulatorForm · ResultsPanel · EvolutionChart · AiAnalysis · ScenarioChat
```

Le **moteur de backtest** est un module pur sans I/O → testable (16 tests Vitest,
incluant les cas limites de dates) et réutilisable client/serveur.

### Embarquabilité

Le brief demande un composant « conçu pour » l'intégration (pas l'intégration réelle).
Le `<Simulator />` est autonome (peu de deps, données via routes internes). Pour un
embedding **propre** dans un site hôte, deux pistes documentées et non encore appliquées
ici : **iframe** (isolation totale, la plus simple) ou **scoping CSS / Shadow DOM** (les
styles globaux `body` + classes `.card/.pill` fuiteraient sinon dans l'hôte). Les ids SVG
sont déjà uniques (`useId`) pour supporter plusieurs instances.

---

## Hors-scope assumé (test ~½ journée)

- Catalogue complet (7000+ cryptos) → top 15.
- Pas d'auth / comptes / sauvegarde serveur.
- Pas d'intégration réelle (Supabase, embedding en prod).
- Drawdown calculé sur la valeur du portefeuille (apports inclus) — « valeur nominale ».
