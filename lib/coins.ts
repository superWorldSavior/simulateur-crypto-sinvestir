/**
 * Catalogue restreint de cryptos supportées (ids CoinGecko).
 *
 * Périmètre volontairement limité au top du marché : suffisant pour une démo
 * crédible, et ça borne la charge sur l'API gratuite CoinGecko (rate-limits).
 * L'original propose 7000+ actifs ; on assume ce hors-scope dans le README.
 */

export interface Coin {
  /** Identifiant CoinGecko (utilisé pour les appels API). */
  id: string;
  /** Ticker affiché. */
  symbol: string;
  /** Nom lisible. */
  name: string;
}

export const SUPPORTED_COINS: Coin[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
  { id: "litecoin", symbol: "LTC", name: "Litecoin" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
  { id: "matic-network", symbol: "MATIC", name: "Polygon" },
  { id: "tron", symbol: "TRX", name: "TRON" },
  { id: "cosmos", symbol: "ATOM", name: "Cosmos" },
  { id: "stellar", symbol: "XLM", name: "Stellar" },
];

const BY_ID = new Map(SUPPORTED_COINS.map((c) => [c.id, c]));

export function getCoin(id: string): Coin | undefined {
  return BY_ID.get(id);
}

export function isSupportedCoin(id: string): boolean {
  return BY_ID.has(id);
}
