import { describe, it, expect } from "vitest";
import {
  contributionDates,
  priceAt,
  runBacktest,
  type PricePoint,
} from "./backtest";

const DAY = 86_400_000;

/** Construit une série de prix journalière à partir d'un tableau de prix. */
function makePrices(startTs: number, daily: number[]): PricePoint[] {
  return daily.map((price, i) => ({ t: startTs + i * DAY, price }));
}

describe("contributionDates", () => {
  it("retourne une seule date en mode once", () => {
    expect(contributionDates(0, 100 * DAY, "once")).toEqual([0]);
  });

  it("compte les jours inclusivement", () => {
    expect(contributionDates(0, 3 * DAY, "daily")).toHaveLength(4);
  });

  it("compte les semaines", () => {
    expect(contributionDates(0, 21 * DAY, "weekly")).toHaveLength(4);
  });

  it("suit le calendrier en mensuel et conserve le quantième", () => {
    const start = Date.UTC(2020, 0, 1); // 1er janvier 2020
    const end = Date.UTC(2020, 1, 15); // 15 février 2020
    const dates = contributionDates(start, end, "monthly");
    expect(dates).toEqual([Date.UTC(2020, 0, 1), Date.UTC(2020, 1, 1)]);
  });

  it("clampe le 31 au dernier jour des mois plus courts", () => {
    const start = Date.UTC(2021, 0, 31); // 31 janvier
    const end = Date.UTC(2021, 2, 31); // 31 mars
    expect(contributionDates(start, end, "monthly")).toEqual([
      Date.UTC(2021, 0, 31),
      Date.UTC(2021, 1, 28), // février 2021 → 28
      Date.UTC(2021, 2, 31),
    ]);
  });

  it("gère le 29 février d'une année bissextile", () => {
    const start = Date.UTC(2020, 0, 31);
    const end = Date.UTC(2020, 2, 1);
    expect(contributionDates(start, end, "monthly")).toEqual([
      Date.UTC(2020, 0, 31),
      Date.UTC(2020, 1, 29), // 2020 bissextile
    ]);
  });

  it("renvoie vide si start > end", () => {
    expect(contributionDates(10, 0, "daily")).toEqual([]);
  });
});

describe("priceAt", () => {
  const prices = makePrices(0, [100, 110, 120, 130]); // t = 0,1,2,3 jours

  it("prend le dernier prix connu à la date ou avant", () => {
    expect(priceAt(prices, 1.5 * DAY)).toBe(110);
  });

  it("borne avant le premier point", () => {
    expect(priceAt(prices, -5 * DAY)).toBe(100);
  });

  it("borne après le dernier point", () => {
    expect(priceAt(prices, 99 * DAY)).toBe(130);
  });
});

describe("runBacktest", () => {
  it("doublement du prix en one-shot → +100 %", () => {
    const prices = makePrices(0, [100, 200]); // x2
    const r = runBacktest({
      prices,
      amount: 1000,
      frequency: "once",
      start: 0,
      end: 1 * DAY,
    });
    expect(r.totalInvested).toBe(1000);
    expect(r.finalValue).toBeCloseTo(2000, 6);
    expect(r.profit).toBeCloseTo(1000, 6);
    expect(r.profitPct).toBeCloseTo(1, 6);
    expect(r.units).toBeCloseTo(10, 6);
    expect(r.contributions).toBe(1);
  });

  it("prix constant → plus-value nulle, investi cumulé correct (DCA mensuel)", () => {
    const start = Date.UTC(2020, 0, 1);
    const end = Date.UTC(2020, 1, 15);
    // 46 jours de prix constants à 100 couvrant la période
    const prices = makePrices(start, new Array(46).fill(100));
    const r = runBacktest({ prices, amount: 100, frequency: "monthly", start, end });
    expect(r.contributions).toBe(2); // 1er jan + 1er fév
    expect(r.totalInvested).toBe(200);
    expect(r.finalValue).toBeCloseTo(200, 6);
    expect(r.profit).toBeCloseTo(0, 6);
  });

  it("calcule un max drawdown négatif sur un repli", () => {
    const prices = makePrices(0, [100, 200, 50]); // pic puis chute
    const r = runBacktest({
      prices,
      amount: 1000,
      frequency: "once",
      start: 0,
      end: 2 * DAY,
    });
    // valeur: 1000 -> 2000 (pic) -> 500 → dd = (500-2000)/2000
    expect(r.maxDrawdown).toBeCloseTo(-0.75, 6);
  });

  it("rejette un montant non positif", () => {
    const prices = makePrices(0, [100]);
    expect(() =>
      runBacktest({ prices, amount: 0, frequency: "once", start: 0, end: 0 })
    ).toThrow();
  });

  it("rejette une série vide", () => {
    expect(() =>
      runBacktest({ prices: [], amount: 100, frequency: "once", start: 0, end: 0 })
    ).toThrow();
  });

  it("rejette start > end", () => {
    const prices = makePrices(0, [100]);
    expect(() =>
      runBacktest({ prices, amount: 100, frequency: "once", start: 10, end: 0 })
    ).toThrow();
  });
});
