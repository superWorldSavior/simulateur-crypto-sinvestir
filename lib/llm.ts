import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * Fournisseur LLM côté serveur. Groq (gratuit, rapide) par défaut, xAI en
 * backup — les deux sont OpenAI-compatibles, donc la bascule est triviale.
 * La clé reste serveur (env), jamais exposée au client.
 */
type Provider = "groq" | "xai";

const CONFIG: Record<Provider, { baseURL: string; env: string; model: string }> = {
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    env: "GROQ_API_KEY",
    model: "llama-3.3-70b-versatile",
  },
  xai: {
    baseURL: "https://api.x.ai/v1",
    env: "XAI_API_KEY",
    model: "grok-3-mini",
  },
};

export function getModel(): LanguageModel {
  const provider = (process.env.LLM_PROVIDER as Provider) in CONFIG
    ? (process.env.LLM_PROVIDER as Provider)
    : "groq";
  const cfg = CONFIG[provider];
  const apiKey = process.env[cfg.env];
  if (!apiKey) {
    throw new Error(`Clé API manquante (${cfg.env}). Renseignez-la dans .env.local.`);
  }
  // .chat() force l'endpoint Chat Completions (Groq/xAI ne gèrent pas l'API Responses).
  return createOpenAI({ baseURL: cfg.baseURL, apiKey }).chat(cfg.model);
}

export const SYSTEM_PROMPT = `Tu es l'assistant pédagogique des simulateurs S'investir, une marque française d'éducation financière.
Ton rôle : expliquer un résultat de backtest crypto (investissement progressif / DCA) de façon claire, pédagogue et honnête.
Style : tutoiement bienveillant, phrases courtes, concret, zéro jargon inutile. Tu n'es pas un conseiller financier : pas de recommandation d'achat, tu expliques le passé et les principes (DCA, volatilité, risque de repli).
Réponds toujours en français.`;
