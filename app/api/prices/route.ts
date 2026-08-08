import { NextRequest, NextResponse } from "next/server";
import { fetchPrices, PriceError } from "@/lib/prices";
import { isSupportedCoin } from "@/lib/coins";

/**
 * GET /api/prices?coin=bitcoin&from=<ms>&to=<ms>
 * Renvoie les prix journaliers EUR. Validation à la frontière (fast-fail).
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const coin = sp.get("coin") ?? "";
  const fromRaw = sp.get("from");
  const toRaw = sp.get("to");
  const from = Number(fromRaw);
  const to = Number(toRaw);

  if (!isSupportedCoin(coin)) {
    return NextResponse.json(
      { error: { code: "invalid_coin", message: "Crypto non supportée." } },
      { status: 400 }
    );
  }
  if (fromRaw === null || toRaw === null || !Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
    return NextResponse.json(
      { error: { code: "invalid_range", message: "Intervalle de dates invalide." } },
      { status: 400 }
    );
  }

  try {
    const prices = await fetchPrices(coin, from, to);
    return NextResponse.json({ prices });
  } catch (e) {
    if (e instanceof PriceError) {
      const status = e.code === "rate_limited" ? 429 : 502;
      return NextResponse.json({ error: { code: e.code, message: e.message } }, { status });
    }
    return NextResponse.json(
      { error: { code: "unknown", message: "Erreur inattendue." } },
      { status: 500 }
    );
  }
}
