import { generateText } from "ai";
import { getModels, SYSTEM_PROMPT } from "@/lib/llm";
import { parseParams } from "@/lib/params";
import { describeScenario, simulateScenario, templatedAnalysis } from "@/lib/scenario";

export const maxDuration = 30;

/**
 * POST /api/analyze  { params }
 * Analyse pédagogique du scénario. Le serveur rejoue le backtest (source de
 * vérité), puis demande au LLM une explication courte (Groq, fallback xAI).
 * Si tous les fournisseurs échouent, fallback templaté → la démo reste vivante.
 */
export async function POST(req: Request) {
  let params;
  try {
    const body = await req.json();
    params = parseParams(body?.params);
  } catch (e) {
    return Response.json(
      { error: { code: "invalid_params", message: (e as Error).message } },
      { status: 400 }
    );
  }

  let result;
  try {
    result = await simulateScenario(params);
  } catch (e) {
    return Response.json(
      { error: { code: "simulation_failed", message: (e as Error).message } },
      { status: 502 }
    );
  }

  const prompt =
    `Voici un scénario de backtest :\n\n${describeScenario(params, result)}\n\n` +
    `Explique le résultat en 3 à 4 phrases : ce qui s'est passé, la leçon clé ` +
    `(volatilité, repli, intérêt du DCA selon le cas). Pas de listes, un paragraphe fluide.`;

  // Essaie chaque fournisseur (Groq puis xAI) ; dégrade en templaté en dernier recours.
  for (const { model } of getModels("analysis")) {
    try {
      const { text } = await generateText({
        model,
        system: SYSTEM_PROMPT,
        prompt,
        maxOutputTokens: 320,
        temperature: 0.6,
      });
      if (text.trim()) return Response.json({ analysis: text.trim(), source: "llm" });
    } catch {
      // fournisseur suivant
    }
  }
  return Response.json({ analysis: templatedAnalysis(params, result), source: "fallback" });
}
