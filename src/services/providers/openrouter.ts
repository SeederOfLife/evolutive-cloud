export const OPENROUTER_FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'poolside/laguna-xs-2.1:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
] as const;

export async function callOpenRouter(prompt: string, model: string, apiKey: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://evolutive-cloud.vercel.app',
      'X-Title': 'Evolutive Cloud',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || response.statusText;
    throw new Error(`OpenRouter ${response.status}: ${msg}`);
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenRouter returned empty response.');
  return text;
}
