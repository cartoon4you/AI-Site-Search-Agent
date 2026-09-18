import { GoogleGenAI, Type } from "@google/genai";
import { SiteResult } from "./types";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const PROVIDER_TRUST: Record<string, number> = {
  "native-algolia": 1.0,
  "native-typesense": 0.95,
  "native-wp": 0.9,
  "google": 0.9,
  "yandex": 0.85,
  "local-index": 0.8,
  "crawl": 0.8,
  "sitemap": 0.75,
  "native-cse": 0.85,
  "native-other": 0.8,
};

export async function rerankResults(query: string, candidateResults: SiteResult[]): Promise<SiteResult[]> {
  if (!candidateResults || candidateResults.length === 0) return [];

  const topCandidates = candidateResults.slice(0, 50);

  // If no query or no API key, fall back to weighted provider scoring
  if (!query.trim() || !process.env.GEMINI_API_KEY) {
    return topCandidates.map((c) => {
      const trust = PROVIDER_TRUST[c.provider] || 0.7;
      return {
        ...c,
        score: Math.round((c.score * 0.7 + trust * 0.3) * 100) / 100,
      };
    }).sort((a, b) => b.score - a.score);
  }

  try {
    const candidatesPayload = topCandidates.map((c) => ({
      url: c.url,
      title: c.title,
      snippet: c.snippet.replace(/<[^>]+>/g, "").slice(0, 300),
    }));

    const systemInstruction =
      "You are a search ranker. Given a user query and N candidate results from a single site, return the list ordered by relevance. Consider:\n" +
      "- topical match\n" +
      "- freshness\n" +
      "- page depth (prefer canonical, well-linked pages)\n" +
      "- title-match boost\n" +
      "- exact-phrase boost\n" +
      "- penalize tag/archive/author listing pages when a specific page matches\n" +
      "Return JSON: [{ \"url\": \"...\", \"score\": 0..1, \"reason\": \"...\" }]";

    const promptText = `User Query: "${query}"\nCandidates:\n${JSON.stringify(candidatesPayload, null, 2)}`;

    const jsonText = await callGeminiWithFallback(promptText, systemInstruction);
    if (!jsonText) throw new Error("Empty response from AI reranker");

    const llmScoredItems: { url: string; score: number; reason?: string }[] = JSON.parse(jsonText);
    const llmScoreMap = new Map<string, { score: number; reason?: string }>();

    for (const item of llmScoredItems) {
      if (item.url) {
        llmScoreMap.get(item.url) || llmScoreMap.set(item.url, { score: item.score, reason: item.reason });
      }
    }

    // Blend Scores: LLM (0.6) + FTS/Base score (0.25) + Provider Trust (0.15)
    const blendedResults = topCandidates.map((cand) => {
      const llmData = llmScoreMap.get(cand.url);
      const llmScore = llmData ? Math.max(0, Math.min(1, llmData.score)) : cand.score;
      const baseFtsScore = Math.max(0, Math.min(1, cand.score));
      const providerTrust = PROVIDER_TRUST[cand.provider] || 0.7;

      const blendedScore = llmScore * 0.6 + baseFtsScore * 0.25 + providerTrust * 0.15;

      return {
        ...cand,
        score: Math.round(blendedScore * 100) / 100,
        reasons: llmData?.reason ? [llmData.reason] : cand.reasons,
      };
    });

    return blendedResults.sort((a, b) => b.score - a.score);
  } catch {
    return topCandidates.map((c) => {
      const trust = PROVIDER_TRUST[c.provider] || 0.7;
      return {
        ...c,
        score: Math.round((c.score * 0.7 + trust * 0.3) * 100) / 100,
      };
    }).sort((a, b) => b.score - a.score);
  }
}

async function callGeminiWithFallback(promptText: string, systemInstruction: string): Promise<string> {
  const modelsToTry = ["gemini-3.8-flash", "gemini-1.5-flash"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                url: { type: Type.STRING },
                score: { type: Type.NUMBER },
                reason: { type: Type.STRING },
              },
              required: ["url", "score"],
            },
          },
        },
      });
      if (response.text?.trim()) {
        return response.text.trim();
      }
    } catch (err: any) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw lastError || new Error("All reranker models failed");
}
