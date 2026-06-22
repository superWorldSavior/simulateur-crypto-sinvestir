/**
 * Récupération des prix historiques via l'API publique Binance (klines).
 *
 * Choix de source : le miroir `data-api.binance.vision` est gratuit, SANS clé,
 * et — contrairement à `api.binance.com` — n'est pas géo-bloqué (important car
 * Vercel exécute en région US par défaut). CoinGecko a été écarté : son API
 * publique renvoie désormais 401 sans clé (fragile pour une démo).
 *
 * Appelé UNIQUEMENT côté serveur (route API) : CORS, cache et future clé
 * éventuelle centralisés au même endroit. Un cache mémoire amortit les appels.
 */

import type { PricePoint } from "./backtest";
import { getCoin } from "./coins";

const BASE = "https://data-api.binance.vision/api/v3/klines";
const DAY_MS = 86_400_000;
const MAX_LIMIT = 1000; // plafond Binance par requête
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 h — l'historique bouge peu

interface CacheEntry {
  data: PricePoint[];
  expires: number;
}
const cache = new Map<string, CacheEntry>();

function cacheKey(symbol: string, from: number, to: number): string {
  return `${symbol}:${Math.floor(from / DAY_MS)}:${Math.floor(to / DAY_MS)}`;
}

/** Paire Binance EUR pour une crypto supportée (ex: bitcoin → BTCEUR). */
function binanceSymbol(coinId: string): string {
  const coin = getCoin(coinId);
  if (!coin) throw new PriceError("invalid_coin", "Crypto non supportée.");
  return `${coin.symbol}EUR`;
}

/**
 * Prix journaliers (clôture) d'une crypto en EUR sur [from, to] (ms).
 * Pagine au besoin (Binance plafonne à 1000 bougies par requête).
 */
export async function fetchPrices(
  coinId: string,
  from: number,
  to: number
): Promise<PricePoint[]> {
  const symbol = binanceSymbol(coinId);
  const key = cacheKey(symbol, from, to);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;

  const out: PricePoint[] = [];
  let cursor = from;
  // Garde-fou : 1000 jours/itération → 20 itérations couvrent ~54 ans.
  for (let i = 0; i < 20 && cursor < to; i++) {
    const url =
      `${BASE}?symbol=${symbol}&interval=1d` +
      `&startTime=${cursor}&endTime=${to}&limit=${MAX_LIMIT}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      if (res.status === 429) {
        throw new PriceError("rate_limited", "Limite de requêtes atteinte, réessayez dans un instant.");
      }
      throw new PriceError("upstream_error", `Source de prix indisponible (${res.status}).`);
    }
    const rows = (await res.json()) as unknown[];
    if (!Array.isArray(rows) || rows.length === 0) break;

    for (const r of rows as unknown as [number, string, string, string, string][]) {
      // [ openTime, open, high, low, close, ... ] : on date au début de bougie
      // (openTime) et on prend le prix d'ouverture → timestamp et prix cohérents.
      const t = r[0];
      const price = parseFloat(r[1]);
      if (Number.isFinite(price)) out.push({ t, price });
    }

    const lastOpen = (rows[rows.length - 1] as [number])[0];
    if (rows.length < MAX_LIMIT) break;
    cursor = lastOpen + DAY_MS; // évite le doublon de la dernière bougie
  }

  if (out.length === 0) {
    throw new PriceError("no_data", "Aucune donnée de prix sur cette période.");
  }

  cache.set(key, { data: out, expires: Date.now() + CACHE_TTL_MS });
  return out;
}

export type PriceErrorCode =
  | "rate_limited"
  | "upstream_error"
  | "no_data"
  | "invalid_coin";

/** Erreur typée → le client peut afficher un message/fallback adapté. */
export class PriceError extends Error {
  constructor(public code: PriceErrorCode, message: string) {
    super(message);
    this.name = "PriceError";
  }
}
