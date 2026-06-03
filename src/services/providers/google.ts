import { GoogleGenAI } from "@google/genai";

export async function callGeminiCloud(
  prompt: string,
  userGoogleKey?: string
): Promise<string> {
  if (userGoogleKey) {
    const ai = new GoogleGenAI({ apiKey: userGoogleKey });
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    const text = result.text;
    if (!text) throw new Error("Google AI returned an empty response.");
    return text;
  }

  try {
    const response = await fetch("/api/neural-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model: "gemini-3-flash-preview" })
    });

    let data: any = {};
    try { data = await response.json(); } catch { /* non-JSON body */ }

    if (!response.ok) {
      if (response.status === 404 || response.status === 405) {
        throw new Error("Cloud relay not deployed. Add a Google API key in Settings to use Gemini directly.");
      }
      if (response.status === 429) {
        throw new Error("NEURAL_QUOTA_EXHAUSTED: Platform cloud limit reached. Add your own Google API key in Settings.");
      }
      throw new Error(data.message || `Cloud relay error (HTTP ${response.status}).`);
    }

    if (!data.text) throw new Error("Cloud relay returned an empty response.");
    return data.text;
  } catch (err: any) {
    console.error("Cloud Fallback Failure:", err);
    const msg = err.message || String(err);
    throw new Error(msg.length > 500 ? msg.substring(0, 500) + "..." : msg);
  }
}

export async function callGeminiNano(prompt: string): Promise<string> {
  const w = window as any;
  if (w.ai?.languageModel) {
    const session = await w.ai.languageModel.create();
    return await session.prompt(prompt);
  }
  if (w.ai?.assistant) {
    const session = await w.ai.assistant.create();
    return await session.prompt(prompt);
  }
  throw new Error("Gemini Nano not available in this browser.");
}
