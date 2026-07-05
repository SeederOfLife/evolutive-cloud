// Vercel serverless relay — lets users without their own key generate via the
// platform's Gemini key. Requires the GEMINI_RELAY_KEY env var in the Vercel
// dashboard (Settings → Environment Variables). Never put the key in code.

const ALLOWED_MODELS = ['gemini-3-flash-preview', 'gemini-2.0-flash'];
const MAX_PROMPT_CHARS = 60_000;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

// Per-instance rate limit: resets on cold start, but blunts abuse and runaway loops.
const hits = new Map<string, number[]>();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'POST only.' });
  }

  const key = process.env.GEMINI_RELAY_KEY;
  if (!key) {
    return res.status(404).json({ message: 'Cloud relay not configured.' });
  }

  const ip = String(req.headers['x-forwarded-for'] ?? 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    return res.status(429).json({ message: 'Relay rate limit reached — try again in a minute.' });
  }
  recent.push(now);
  hits.set(ip, recent);

  const { prompt, model } = req.body ?? {};
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > MAX_PROMPT_CHARS) {
    return res.status(400).json({ message: 'Invalid prompt.' });
  }
  const resolvedModel = ALLOWED_MODELS.includes(model) ? model : ALLOWED_MODELS[0];

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );

  const data: any = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const status = upstream.status === 429 ? 429 : 502;
    return res.status(status).json({ message: data?.error?.message || `Upstream error ${upstream.status}.` });
  }

  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p: any) => p.text ?? '')
    .join('');
  if (!text) {
    return res.status(502).json({ message: 'Model returned an empty response.' });
  }
  return res.status(200).json({ text });
}
