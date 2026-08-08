import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * Fournisseurs LLM côté serveur, avec fallback automatique.
 * Groq (gratuit, rapide) en primaire ; xAI en secours si Groq échoue
 * (rate-limit, panne). Les deux sont OpenAI-compatibles. Clés en env serveur,
 * jamais exposées au client.
 */
type Provider = "groq" | "xai";
type Purpose = "analysis" | "chat";

const CONFIG: Record<Provider, { baseURL: string; env: string; models: Record<Purpose, string> }> = {
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    env: "GROQ_API_KEY",
    // Analyse : modèle qualitatif. Chat : modèle à plus gros quota (plus d'appels).
    models: { analysis: "llama-3.3-70b-versatile", chat: "llama-3.1-8b-instant" },
  },
  xai: {
    baseURL: "https://api.x.ai/v1",
    env: "XAI_API_KEY",
    models: { analysis: "grok-3-mini", chat: "grok-3-mini" },
  },
};

/**
 * Modèles disponibles pour un usage, dans l'ordre d'essai (primaire puis
 * fallback). N'inclut que les fournisseurs dont la clé est présente.
 */
export function getModels(purpose: Purpose): { provider: Provider; model: LanguageModel }[] {
  const primary: Provider =
    (process.env.LLM_PROVIDER as Provider) in CONFIG
      ? (process.env.LLM_PROVIDER as Provider)
      : "groq";
  const order: Provider[] = primary === "xai" ? ["xai", "groq"] : ["groq", "xai"];

  const out: { provider: Provider; model: LanguageModel }[] = [];
  for (const p of order) {
    const cfg = CONFIG[p];
    const apiKey = process.env[cfg.env];
    if (!apiKey) continue;
    // .chat() force l'endpoint Chat Completions (Groq/xAI ne gèrent pas l'API Responses).
    out.push({
      provider: p,
      model: createOpenAI({ baseURL: cfg.baseURL, apiKey }).chat(cfg.models[purpose]),
    });
  }
  return out;
}

export const SYSTEM_PROMPT = `Tu es l'assistant pédagogique des simulateurs S'investir, une marque française d'éducation financière.
Ton rôle : expliquer un résultat de backtest crypto (investissement progressif / DCA) de façon claire, pédagogue et honnête.
Style : tutoiement bienveillant, phrases courtes, concret, zéro jargon inutile. Tu n'es pas un conseiller financier : pas de recommandation d'achat, tu expliques le passé et les principes (DCA, volatilité, risque de repli).
Réponds toujours en français.`;
