import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { getModels, SYSTEM_PROMPT } from "@/lib/llm";
import { parseParams, type SimParams } from "@/lib/params";
import { describeScenario, simulateScenario } from "@/lib/scenario";
import { SUPPORTED_COINS } from "@/lib/coins";
import { dateToMs } from "@/lib/format";

export const maxDuration = 30;

const coinIds = SUPPORTED_COINS.map((c) => c.id);

type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * POST /api/chat  { messages, scenario }
 * Chat contextuel sur un scénario. Le modèle dispose d'un outil `runBacktest`
 * pour rejouer une variante ("et si mensuel ?", "compare l'ETH") sur les vraies
 * données → il répond avec des chiffres calculés, pas inventés.
 *
 * Non-streaming, avec fallback de fournisseur (Groq → xAI). En cas d'échec total
 * on renvoie un message clair plutôt qu'une erreur brute côté UI.
 */
export async function POST(req: Request) {
  const body = await req.json();
  // Cap l'historique (coût / abus sur une démo publique).
  const messages = ((body.messages ?? []) as ChatMessage[]).slice(-12);

  let baselineContext = "";
  try {
    const baseline: SimParams = parseParams(body.scenario);
    const r = await simulateScenario(baseline);
    baselineContext =
      `\n\nScénario actuellement affiché à l'écran :\n${describeScenario(baseline, r)}\n` +
      `Pour toute variante, appelle l'outil runBacktest. Reprends les valeurs du scénario actuel pour les paramètres non précisés par l'utilisateur.`;
  } catch {
    // Pas de baseline exploitable : le chat reste utilisable sans contexte.
  }

  const tools = {
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
  };

  // Essaie chaque fournisseur (Groq puis xAI).
  for (const { model } of getModels("chat")) {
    try {
      const r = await generateText({
        model,
        system: SYSTEM_PROMPT + baselineContext,
        messages,
        tools,
        stopWhen: stepCountIs(4),
        maxOutputTokens: 600,
      });
      const usedTool = (r.steps ?? []).some((s) => (s.toolCalls?.length ?? 0) > 0);
      if (r.text.trim()) return Response.json({ text: r.text.trim(), usedTool });
    } catch {
      // fournisseur suivant
    }
  }

  return Response.json({
    text: "L'assistant est momentanément indisponible. Réessaie dans un instant.",
    usedTool: false,
    unavailable: true,
  });
}
