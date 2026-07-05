export const GROQ_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
] as const;

export async function callGroq(
  prompt: string,
  apiKey: string,
  model: string = 'llama-3.1-8b-instant',
): Promise<string> {
  if (!apiKey) throw new Error('No Groq API key found. Add one in Settings.');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8192,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    let msg = `HTTP ${response.status}`;
    try { msg = JSON.parse(body)?.error?.message || body.slice(0, 200) || msg; } catch { /* */ }
    throw new Error(`Groq error: ${msg}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
