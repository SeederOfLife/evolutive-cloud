export async function callOllama(
  prompt: string,
  model = 'gemma2:2b',
  endpoint = 'http://localhost:11434',
  timeoutMs = 120_000
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { num_ctx: 8192 },
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error(`Ollama timed out after ${timeoutMs / 1000}s. CPU inference is slow — try a smaller model.`);
    throw new Error(`Ollama connection failed. Is 'ollama serve' running? (${err.message})`);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Ollama error ${response.status}${body ? ': ' + body.slice(0, 200) : ''}. Is 'ollama serve' running?`);
  }
  const data = await response.json();
  if (!data.response) throw new Error("Ollama returned empty response.");
  return data.response;
}
