export async function callOllama(
  prompt: string,
  model = 'gemma2:2b',
  endpoint = 'http://localhost:11434'
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
    });
  } catch (err: any) {
    throw new Error(`Ollama connection failed. Is 'ollama serve' running? (${err.message})`);
  }
  if (!response.ok) throw new Error(`Ollama error ${response.status}. Is 'ollama serve' running?`);
  const data = await response.json();
  if (!data.response) throw new Error("Ollama returned empty response.");
  return data.response;
}
