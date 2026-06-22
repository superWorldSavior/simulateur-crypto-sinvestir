import { streamText, tool, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { getModel, SYSTEM_PROMPT } from "@/lib/llm";
import { parseParams, type SimParams } from "@/lib/params";
import { describeScenario, simulateScenario } from "@/lib/scenario";
import { SUPPORTED_COINS } from "@/lib/coins";
import { dateToMs } from "@/lib/format";

export const maxDuration = 30;

const coinIds = SUPPORTED_COINS.map((c) => c.id);

/**
 * POST /api/chat  { messages, scenario }
 * Chat contextuel sur un scénario. Le modèle dispose d'un outil `runBacktest`
 * pour rejouer une variante ("et si mensuel ?", "compare avec l'ETH") sur les
 * vraies données → il répond avec des chiffres calculés, pas inventés.
 */
export async function POST(req: Request) {
  const body = await req.json();
  // Cap l'historique envoyé au modèle (coût/abus sur une démo publique).
  const messages = (body.messages as UIMessage[]).slice(-12);

  let baseline: SimParams | null = null;
  let baselineContext = "";
  try {
    baseline = parseParams(body.scenario);
    const r = await simulateScenario(baseline);
    baselineContext =
      `\n\nScénario actuellement affiché à l'écran :\n${describeScenario(baseline, r)}\n` +
      `Pour toute variante, appelle l'outil runBacktest. Reprends les valeurs du scénario actuel pour les paramètres non précisés par l'utilisateur.`;
  } catch {
    // Pas de baseline exploitable : le chat reste utilisable sans contexte.
  }

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT + baselineContext,
    messages: modelMessages,
    maxOutputTokens: 600,
    stopWhen: stepCountIs(4),
    tools: {
      runBacktest: tool({
        description:
          "Rejoue un backtest DCA sur données historiques réelles et renvoie les métriques. À utiliser pour toute simulation ou comparaison chiffrée.",
        inputSchema: z.object({
          coinId: z.enum(coinIds as [string, ...string[]]).describe("id CoinGecko, ex: bitcoin, ethereum"),
          amount: z.number().positive().max(1_000_000).describe("montant par versement en euros"),
          frequency: z.enum(["once", "daily", "weekly", "monthly"]),
          startDate: z.string().describe("date de début au format YYYY-MM-DD"),
          endDate: z.string().describe("date de fin au format YYYY-MM-DD"),
        }),
        execute: async ({ coinId, amount, frequency, startDate, endDate }) => {
          try {
            const p = parseParams({
              coinId,
              amount,
              frequency,
              start: dateToMs(startDate),
              end: Math.min(dateToMs(endDate), Date.now()), // pas de date future
            });
            const r = await simulateScenario(p);
            return {
              totalInvested: Math.round(r.totalInvested),
              finalValue: Math.round(r.finalValue),
              profit: Math.round(r.profit),
              profitPct: Number((r.profitPct * 100).toFixed(1)),
              maxDrawdownPct: Number((r.maxDrawdown * 100).toFixed(0)),
              contributions: r.contributions,
              years: Number(r.years.toFixed(1)),
            };
          } catch (e) {
            return { error: (e as Error).message };
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
