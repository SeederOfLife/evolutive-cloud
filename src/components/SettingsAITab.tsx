import { useState } from "react";
import { X, Cpu, Loader2, Activity } from "lucide-react";

const MODELS: Record<string, { value: string; label: string }[]> = {
  google: [
    { value: "gemini-2.0-flash",   label: "Gemini 2.0 Flash (fast, free)" },
    { value: "gemini-2.5-pro",     label: "Gemini 2.5 Pro (best)" },
    { value: "gemini-1.5-flash",   label: "Gemini 1.5 Flash" },
  ],
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-3-5-sonnet-20240620", label: "Claude 3.5 Sonnet" },
  ],
  custom: [],
  "web-llm": [
    { value: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen 2.5 0.5B (tiny, fast)" },
    { value: "gemma-2-2b-it-q4f16_1-MLC", label: "Gemma 2 2B (balanced)" },
    { value: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B (small)" },
    { value: "Llama-3-8B-Instruct-q4f32_1-MLC", label: "Llama 3 8B (GPU recommended)" },
  ],
  "gemini-nano": [{ value: "gemini-nano", label: "Gemini Nano" }],
  openrouter: [
    { value: "openrouter/auto",                        label: "Auto (best model per request)" },
    { value: "google/gemini-2.0-flash-exp:free",       label: "Gemini 2.0 Flash (free)" },
    { value: "poolside/laguna-xs-2.1:free",            label: "Poolside Laguna XS 2.1 (free, code)" },
    { value: "meta-llama/llama-3.2-3b-instruct:free",  label: "Llama 3.2 3B (free)" },
    { value: "mistralai/mistral-7b-instruct:free",     label: "Mistral 7B (free)" },
    { value: "deepseek/deepseek-chat-v3-0324:free",     label: "DeepSeek V3 (free)" },
    { value: "openai/gpt-4o-mini",                     label: "GPT-4o Mini (cheap)" },
    { value: "anthropic/claude-3-haiku",               label: "Claude 3 Haiku (cheapest)" },
    { value: "anthropic/claude-3.5-haiku",             label: "Claude 3.5 Haiku (cheap)" },
    { value: "anthropic/claude-3.5-sonnet",            label: "Claude 3.5 Sonnet (best)" },
    { value: "anthropic/claude-sonnet-4-5",            label: "Claude Sonnet 4.5 (latest)" },
  ],
  groq: [
    { value: "llama3-8b-8192",       label: "Llama 3 8B (fast, free)" },
    { value: "llama3-70b-8192",      label: "Llama 3 70B (smart, free)" },
    { value: "mixtral-8x7b-32768",   label: "Mixtral 8x7B (free)" },
  ],
  cerebras: [
    { value: "llama-3.3-70b",        label: "Llama 3.3 70B (fast, free)" },
    { value: "llama-3.1-8b",         label: "Llama 3.1 8B (fastest)" },
  ],
  ollama: [
    { value: "phi3:mini",       label: "Phi-3 Mini (small, fast)" },
    { value: "gemma2:2b",       label: "Gemma 2 2B (small, fast)" },
    { value: "gemma2:9b",       label: "Gemma 2 9B (balanced)" },
    { value: "gemma3:27b",      label: "Gemma 3 27B (capable)" },
    { value: "llama3.2",        label: "Llama 3.2" },
    { value: "qwen2.5",         label: "Qwen 2.5" },
    { value: "mistral",         label: "Mistral" },
    { value: "deepseek-coder",  label: "DeepSeek Coder" },
  ],
};

interface ProviderGuidance { badge: 'FREE' | 'PAID' | 'NO KEY NEEDED'; hint: string; link?: string; }
const PROVIDER_GUIDANCE: Record<string, ProviderGuidance> = {
  google:        { badge: 'FREE',          hint: 'Free tier available — get your key at Google AI Studio',                                     link: 'https://aistudio.google.com/apikey' },
  openai:        { badge: 'PAID',          hint: 'Paid — get your key at OpenAI Platform',                                                     link: 'https://platform.openai.com/api-keys' },
  anthropic:     { badge: 'PAID',          hint: 'Paid — get your key at Anthropic Console',                                                    link: 'https://console.anthropic.com/' },
  'web-llm':     { badge: 'NO KEY NEEDED', hint: 'Free & private — runs locally in your browser. Requires a good GPU. No API key needed.' },
  'gemini-nano': { badge: 'NO KEY NEEDED', hint: 'Free — built into Chrome. Enable at chrome://flags/#prompt-api-for-gemini-nano' },
  custom:        { badge: 'FREE',          hint: 'Custom OpenAI-compatible endpoint. Provide a base URL below and an optional API key.' },
  openrouter:    { badge: 'FREE',          hint: 'Many models through one key — free tier included. No separate signups.',                      link: 'https://openrouter.ai/keys' },
  groq:          { badge: 'FREE',          hint: 'Extremely fast inference — free tier with generous limits. Get your key at console.groq.com.', link: 'https://console.groq.com/keys' },
  cerebras:      { badge: 'FREE',          hint: 'Ultra-fast inference on Cerebras hardware — free tier, ~1s per generation. Get your key at cloud.cerebras.ai.', link: 'https://cloud.cerebras.ai/' },
  ollama:        { badge: 'FREE',          hint: 'Free & unlimited local AI. Install at ollama.com, then run: ollama serve && ollama pull gemma2:2b' },
};

export interface AITabProps {
  aiProvider: string;
  setAiProvider: (p: any) => void;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  providerKeysMap: Record<string, string[]>;
  addProviderKey: (provider: string, key: string) => void;
  removeProviderKey: (provider: string, index: number) => void;
  customEndpoint: string;
  setCustomEndpoint: (e: string) => void;
  ollamaEndpoint: string;
  setOllamaEndpoint: (e: string) => void;
  forceCloud: boolean;
  setForceCloud: (v: boolean) => void;
  aiConfig: any;
  setAiConfig: (fn: any) => void;
  isTestingAI: boolean;
  testResponse: string | null;
  handleTestNeuralLink: () => void;
  setTestResponse: (r: string | null) => void;
  webGPUSupported?: boolean | null;
}

export function SettingsAITab({
  aiProvider, setAiProvider, selectedModel, setSelectedModel,
  providerKeysMap, addProviderKey, removeProviderKey,
  customEndpoint, setCustomEndpoint, ollamaEndpoint, setOllamaEndpoint,
  forceCloud, setForceCloud, aiConfig, setAiConfig,
  isTestingAI, testResponse, handleTestNeuralLink, setTestResponse,
  webGPUSupported,
}: AITabProps) {
  const [newKeyInput, setNewKeyInput] = useState("");
  const [ollamaTestResult, setOllamaTestResult] = useState<string | null>(null);
  const [ollamaTestLoading, setOllamaTestLoading] = useState(false);

  const providers = ["google", "openai", "anthropic", "openrouter", "groq", "cerebras", "custom", "web-llm", "ollama"] as const;
  const providerModels = MODELS[aiProvider] || [];
  const currentKeys = providerKeysMap[aiProvider] || [];
  const g = PROVIDER_GUIDANCE[aiProvider];
  const needsKey = !["web-llm", "gemini-nano", "ollama"].includes(aiProvider);
  const badgeCls = g?.badge === 'NO KEY NEEDED' ? 'bg-violet-900/40 text-violet-400 border-violet-800/50'
    : g?.badge === 'PAID' ? 'bg-amber-900/40 text-amber-400 border-amber-800/50'
    : 'bg-green-900/40 text-green-400 border-green-800/50';

  return (
    <div className="p-4 space-y-5">
      {/* Provider */}
      <section>
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">AI Provider</label>
        <div className="grid grid-cols-3 gap-2">
          {providers.map(p => (
            <button key={p} onClick={() => setAiProvider(p)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${aiProvider === p ? "bg-indigo-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"}`}>
              {p === "web-llm" ? "WebLLM" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* Key & guidance */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">{needsKey ? 'API Key' : 'Provider'}</label>
          {g && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeCls}`}>{g.badge}</span>}
          {aiProvider === 'openrouter' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-cyan-900/40 text-cyan-400 border-cyan-800/50">MANY MODELS</span>}
          {aiProvider === 'web-llm' && <span className="text-[10px] text-gray-500 font-medium">Requires GPU</span>}
        </div>
        {aiProvider === 'web-llm' && webGPUSupported === false && (
          <div className="flex items-start gap-2 mb-3 p-3 bg-amber-900/30 border border-amber-700/40 rounded-lg text-xs text-amber-300 leading-relaxed">
            <Cpu className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            Your device doesn't support local AI (no compatible GPU). Try Google Gemini (free) or OpenAI instead.
          </div>
        )}
        {needsKey && (
          <div className="space-y-2">
            {currentKeys.map((k, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2">
                <span className="flex-1 text-sm text-gray-300 font-mono truncate">{"•".repeat(Math.max(0, k.length - 6))}{k.slice(-6)}</span>
                {currentKeys.length > 1 && <span className="text-[10px] text-indigo-400 font-bold mr-1">{i === 0 ? "active" : `#${i + 1}`}</span>}
                <button onClick={() => removeProviderKey(aiProvider, i)} className="shrink-0 text-gray-600 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <input type="password" placeholder={`Add ${aiProvider} API key...`} value={newKeyInput}
                onChange={e => setNewKeyInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && newKeyInput.trim()) { addProviderKey(aiProvider, newKeyInput.trim()); setNewKeyInput(""); } }}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" />
              <button onClick={() => { if (newKeyInput.trim()) { addProviderKey(aiProvider, newKeyInput.trim()); setNewKeyInput(""); } }}
                className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium text-white transition-all">Add</button>
            </div>
            {currentKeys.length > 1 && <p className="text-[10px] text-gray-500">{currentKeys.length} keys — rotates automatically on rate limit</p>}
          </div>
        )}
        {g && (
          <div className={`flex items-start justify-between gap-3 ${needsKey ? 'mt-2' : ''}`}>
            <p className="text-xs text-gray-500 leading-relaxed">{g.hint}</p>
            {g.link && <a href={g.link} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap">Get API Key →</a>}
          </div>
        )}
      </section>

      {/* Custom endpoint */}
      {aiProvider === "custom" && (
        <section>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Custom Endpoint</label>
          <input type="text" value={customEndpoint} onChange={e => setCustomEndpoint(e.target.value)} placeholder="http://localhost:11434/v1"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" />
        </section>
      )}

      {/* Ollama endpoint */}
      {aiProvider === "ollama" && (
        <section className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Ollama Endpoint</label>
            <input type="text" value={ollamaEndpoint} onChange={e => setOllamaEndpoint(e.target.value)} placeholder="http://localhost:11434"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" />
          </div>
          <button disabled={ollamaTestLoading} onClick={async () => {
            setOllamaTestLoading(true); setOllamaTestResult(null);
            try {
              const res = await fetch(`${ollamaEndpoint}/api/tags`);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const data = await res.json();
              const models = (data.models || []).map((m: any) => m.name).join(', ');
              setOllamaTestResult(`Connected ✓ — Models: ${models || 'none pulled yet'}`);
            } catch (e: any) { setOllamaTestResult(`Error: ${e.message}`); }
            finally { setOllamaTestLoading(false); }
          }} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-lg text-sm font-medium text-white transition-all w-full">
            {ollamaTestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            Test Ollama
          </button>
          {ollamaTestResult && (
            <div className={`flex items-center justify-between p-3 rounded-lg text-xs ${ollamaTestResult.startsWith('Error') ? 'bg-red-900/30 border border-red-800 text-red-300' : 'bg-green-900/30 border border-green-800 text-green-300'}`}>
              <span className="leading-relaxed">{ollamaTestResult}</span>
              <button onClick={() => setOllamaTestResult(null)} className="ml-2 opacity-50 hover:opacity-100 shrink-0"><X className="w-3 h-3" /></button>
            </div>
          )}
          <div className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg text-xs text-amber-300/80 leading-relaxed">
            <span className="font-semibold text-amber-300">CORS on Windows:</span> Set <code className="bg-black/30 px-1 rounded">OLLAMA_ORIGINS=*</code> then restart Ollama Desktop.
          </div>
        </section>
      )}

      {/* Model */}
      <section>
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Model</label>
        {providerModels.length > 0 ? (
          <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
            {providerModels.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        ) : (
          <input type="text" value={selectedModel} onChange={e => setSelectedModel(e.target.value)} placeholder="Model name"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" />
        )}
      </section>

      {/* Force cloud toggle */}
      <section className="flex items-center justify-between py-1">
        <div>
          <p className="text-sm font-medium text-white">Force Cloud Mode</p>
          <p className="text-xs text-gray-500">Use platform cloud key as fallback</p>
        </div>
        <button onClick={() => setForceCloud(!forceCloud)}
          className={`relative w-10 h-6 rounded-full transition-colors ${forceCloud ? "bg-indigo-500" : "bg-gray-700"}`}>
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${forceCloud ? "left-5" : "left-1"}`} />
        </button>
      </section>

      {/* Test connection */}
      <section className="space-y-2">
        <button onClick={handleTestNeuralLink} disabled={isTestingAI}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-lg text-sm font-medium text-white transition-all">
          {isTestingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          Test Connection
        </button>
        {testResponse && (
          <div className={`flex items-center justify-between p-3 rounded-lg text-sm ${testResponse.includes("ERROR") ? "bg-red-900/30 border border-red-800 text-red-300" : "bg-green-900/30 border border-green-800 text-green-300"}`}>
            <span className="truncate">{testResponse}</span>
            <button onClick={() => setTestResponse(null)} className="ml-2 opacity-50 hover:opacity-100 shrink-0"><X className="w-3 h-3" /></button>
          </div>
        )}
      </section>

      {/* Temperature */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Temperature</label>
          <span className="text-xs text-indigo-400 font-mono">{aiConfig.temperature.toFixed(2)}</span>
        </div>
        <input type="range" min="0" max="2" step="0.05" value={aiConfig.temperature}
          onChange={e => setAiConfig((prev: any) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
          className="w-full accent-indigo-500 h-1 cursor-pointer" />
      </section>

      {/* Max tokens */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Max Tokens</label>
          <span className="text-xs text-indigo-400 font-mono">{aiConfig.maxTokens}</span>
        </div>
        <input type="range" min="128" max="32000" step="128" value={aiConfig.maxTokens}
          onChange={e => setAiConfig((prev: any) => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
          className="w-full accent-indigo-500 h-1 cursor-pointer" />
      </section>

    </div>
  );
}
