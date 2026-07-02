export const OPENROUTER_FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'poolside/laguna-xs-2.1:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
] as const;

export async function callOpenRouter(
  prompt: string,
  model: string,
  apiKey: string,
  onChunk?: (text: string) => void,
): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://evolutive-cloud.vercel.app',
      'X-Title': 'Evolutive Cloud',
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter ${response.status}: ${err.error?.message ?? response.statusText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
      try {
        const chunk = JSON.parse(line.slice(6));
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) { result += content; onChunk?.(content); }
      } catch { /* malformed chunk, skip */ }
    }
  }

  if (!result) throw new Error('OpenRouter returned empty response.');
  return result;
}
