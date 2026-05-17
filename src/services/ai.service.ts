import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import * as webllm from "@mlc-ai/web-llm";
import { AIConfig } from "../types";

export type AIProvider = 'google' | 'openai' | 'anthropic' | 'custom' | 'web-llm' | 'gemini-nano' | 'mlc-mobile';

export interface AICallOptions {
  provider: AIProvider;
  model: string;
  keys: Record<string, string>;
  config: AIConfig;
  customEndpoint?: string;
  forceCloud?: boolean;
  onProgress?: (msg: string) => void;
  onRateLimited?: (countdown: number) => void;
  onRateLimitCleared?: () => void;
  webLlmEngineRef?: React.MutableRefObject<webllm.MLCEngine | null>;
}

export async function callGeminiCloud(
  prompt: string,
  userGoogleKey?: string
): Promise<string> {
  try {
    const response = await fetch("/api/neural-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model: "gemini-3-flash-preview" })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("NEURAL_QUOTA_EXHAUSTED: The cloud intelligence link has reached its limit. This is a platform-wide limit. Please wait a few minutes or use your own API Key in Settings.");
      }

      if (data.error === "SYSTEM_KEY_MISSING" || data.error === "NEURAL_NODE_ERROR" || [400, 401, 403].includes(response.status)) {
        if (userGoogleKey) {
          console.log("Cloud link restricted, switching to user neural key...");
          const ai = new GoogleGenAI({ apiKey: userGoogleKey });
          const result = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
          });
          return result.text ?? "";
        }
        if (data.error === "SYSTEM_KEY_MISSING") {
          throw new Error("System Cloud Key missing. Enable the Neural Hub and provide a Google API Key.");
        }
        throw new Error(data.message || "Neural link denied. Check your API Hub credentials.");
      }
      throw new Error(data.message || "Unknown neural link protocol error.");
    }

    return data.text;
  } catch (err: any) {
    console.error("Cloud Fallback Failure:", err);
    const cleanMsg = err.message.length > 500 ? err.message.substring(0, 500) + "..." : err.message;
    throw new Error(cleanMsg);
  }
}

export async function callAI(prompt: string, options: AICallOptions): Promise<string> {
  const {
    provider,
    model,
    keys,
    config,
    customEndpoint,
    forceCloud,
    onProgress,
    onRateLimited,
    onRateLimitCleared,
    webLlmEngineRef,
  } = options;

  const userGoogleKey = keys['google'];

  if (forceCloud) {
    return callGeminiCloud(prompt, userGoogleKey);
  }

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount <= maxRetries) {
    try {
      const activeKey = keys[provider] || "";
      const googleKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || keys['google'];

      if (provider === 'gemini-nano') {
        try {
          const w = window as any;
          if (!w.ai || !w.ai.assistant) throw new Error("Gemini Nano not detected.");
          const aiSession = await w.ai.assistant.create();
          return await aiSession.prompt(prompt);
        } catch (err) {
          console.warn("Gemini Nano failed, falling back to Cloud:", err);
          return callGeminiCloud(prompt, userGoogleKey);
        }
      }

      if (provider === 'web-llm') {
        try {
          if (!webLlmEngineRef?.current) {
            const w = window as any;
            if (!w.navigator.gpu) throw new Error("WebGPU is not supported or enabled in this browser. Local AI requires WebGPU.");
            onProgress?.("Wakeing AI Engine...");
            const engine = new webllm.MLCEngine();
            engine.setInitProgressCallback((report) => onProgress?.(report.text));
            await engine.reload(model || "Llama-3-8B-Instruct-v0.1-q4f32_1-MLC");
            if (webLlmEngineRef) webLlmEngineRef.current = engine;
          }
          const response = await webLlmEngineRef!.current!.chat.completions.create({
            messages: [{ role: "user", content: prompt }]
          });
          return response.choices[0].message.content || "";
        } catch (err: any) {
          console.warn("Web-LLM failure:", err);
          onProgress?.("");
          if (err.message?.includes("WebGPU")) throw err;
          return callGeminiCloud(prompt, userGoogleKey);
        }
      }

      if (provider === 'mlc-mobile') {
        if (!customEndpoint) throw new Error("MLC Mobile requires a custom endpoint URL. Set it in Settings.");
        const client = new OpenAI({
          apiKey: "no-key",
          baseURL: customEndpoint,
          dangerouslyAllowBrowser: true,
        });
        const response = await client.chat.completions.create({
          model: model || "main",
          messages: [{ role: "user", content: prompt }],
        });
        return response.choices[0].message.content || "";
      }

      if (!googleKey && provider === 'google') throw new Error("No Google API Key Found.");
      if (!activeKey && (provider === 'openai' || provider === 'anthropic' || provider === 'custom')) {
        if (provider !== 'custom') throw new Error(`No ${provider.toUpperCase()} Key Found.`);
      }

      if (provider === 'google') {
        const ai = new GoogleGenAI({ apiKey: googleKey || "" });
        let modelId = model;
        if (!modelId.startsWith('gemini-') && !modelId.startsWith('gemma-')) modelId = "gemini-3-flash-preview";

        const attemptCall = async (targetModel: string) => {
          const response = await ai.models.generateContent({
            model: targetModel,
            contents: prompt,
            config: {
              temperature: config.temperature,
              topP: config.topP,
              topK: config.topK,
              maxOutputTokens: config.maxTokens,
            }
          });
          return response.text;
        };

        try {
          const text = await attemptCall(modelId);
          if (!text) throw new Error("The AI Engine returned an empty response.");
          onRateLimitCleared?.();
          return text;
        } catch (err: any) {
          if (err?.message?.includes('429') || err?.status === 429 || err?.message?.includes('quota') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
            console.warn(`Model ${modelId} failed quota, attempting fallback to gemini-3-flash-preview...`);
            if (modelId !== 'gemini-3-flash-preview') {
              try {
                const fallbackText = await attemptCall('gemini-3-flash-preview');
                if (fallbackText) {
                  throw Object.assign(new Error("Warning: Neural Sync downgraded to Flash version due to Pro quota exhaustion."), { fallbackText });
                }
              } catch (fallbackErr: any) {
                if (fallbackErr.fallbackText) return fallbackErr.fallbackText;
                console.error("Flash fallback also failed:", fallbackErr);
              }
            }

            if (retryCount < maxRetries) {
              retryCount++;
              const waitTime = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
              let countdown = Math.ceil(waitTime / 1000);
              onRateLimited?.(countdown);

              const interval = setInterval(() => {
                onRateLimited?.(Math.max(0, --countdown));
              }, 1000);
              await sleep(waitTime);
              clearInterval(interval);
              continue;
            }
          }
          throw err;
        }
      }

      if (provider === 'openai' || provider === 'custom') {
        const isDeepInfra = activeKey.startsWith('nvapi-') || activeKey.startsWith('NVAPI-');
        const isMistralDirect = activeKey.startsWith('mistral-') || activeKey.toLowerCase().includes('mistral');

        const client = new OpenAI({
          apiKey: activeKey,
          baseURL: isDeepInfra ? "https://api.deepinfra.com/v1" :
            (isMistralDirect && !customEndpoint ? "https://api.mistral.ai/v1" :
            (provider === 'custom' ? customEndpoint : undefined)),
          dangerouslyAllowBrowser: true,
        });

        const response = await client.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: config.temperature,
          top_p: config.topP,
          max_tokens: config.maxTokens,
        });
        return response.choices[0].message.content || "";
      }

      if (provider === 'anthropic') {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": activeKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            messages: [{ role: "user", content: prompt }]
          })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.content[0].text;
      }

      throw new Error("AI Provider Disconnected.");
    } catch (err: any) {
      const msg = err.message || String(err);
      if (msg.includes('connection error') || msg.includes('Failed to fetch')) {
        throw new Error(`[${provider}] Connection failed. If using mobile local AI, ensure the bridge app is active. Otherwise check your internet.`);
      }
      throw err;
    }
  }
  throw new Error("Failed to reach AI after multiple attempts.");
}
