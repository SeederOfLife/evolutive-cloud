// Server-side auto-water cron — evolves due apps even when nobody has the app
// open. Trigger it two ways:
//   1. Vercel Cron (see vercel.json) — sends Authorization: Bearer $CRON_SECRET
//   2. Any external cron (cron-job.org, every few min) → GET /api/auto-water?secret=$CRON_SECRET
//
// Required Vercel env vars:
//   CRON_SECRET               — shared secret guarding this endpoint
//   FIREBASE_SERVICE_ACCOUNT  — service-account JSON (raw or base64) with Firestore write
//   GEMINI_RELAY_KEY          — Google AI key used to generate the evolutions
//   FIREBASE_DB_ID (optional) — named Firestore database id (defaults to the app's)

import { getApps, getApp, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const DB_ID = process.env.FIREBASE_DB_ID || 'ai-studio-60d60191-3997-4b4a-8983-71b09b4b9c11';
const TIME_BUDGET_MS = 45_000;
const MAX_PER_RUN = 5;

const FOCUS: Record<string, { label: string; description: string }> = {
  ux: { label: 'UX Polish', description: 'Smoother interactions, better feedback, delightful details' },
  features: { label: 'New Features', description: 'Expand capabilities with useful new functionality' },
  visual: { label: 'Visual Design', description: 'Colors, typography, layout, animations' },
  performance: { label: 'Performance', description: 'Faster, lighter, more responsive' },
  gameplay: { label: 'Gameplay', description: 'More fun, better balance, new mechanics' },
  sound: { label: 'Sound & Feel', description: 'Audio feedback, haptics, satisfying interactions' },
  accessibility: { label: 'Accessibility', description: 'Keyboard nav, contrast, screen reader support' },
};

function initAdmin() {
  if (getApps().length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT not set');
  const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  initializeApp({ credential: cert(JSON.parse(json)) });
}

async function callGemini(prompt: string, key: string): Promise<string> {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) },
  );
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.error?.message || `Gemini ${r.status}`);
  const text = (d?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('');
  if (!text) throw new Error('empty response');
  return text;
}

function dueAt(s: any, now: number): boolean {
  const intervalMs = (s.autoWaterInterval || 30) * 60_000;
  const lastTs = s.evolutions?.[0]?.timestamp;
  const refAt = lastTs ? new Date(lastTs).getTime()
    : (s.created_at ? new Date(s.created_at).getTime() : 0);
  return now >= refAt + intervalMs;
}

async function waterOne(db: any, id: string, s: any, key: string): Promise<string> {
  const focus = FOCUS[s.autoWaterFocus as string] ?? FOCUS.ux;
  const gen = (s.evolutions?.length ?? 0) + 1;
  const note = s.autoWaterNote || '';
  const prompt = `You are evolving a living app. This is generation ${gen}.

CURRENT APP CODE:
\`\`\`jsx
${s.built_code}
\`\`\`

EVOLUTION FOCUS: ${focus.label} — ${focus.description}
DEPTH: Balanced — Meaningful changes with some experimentation
${note ? `CREATOR NOTE: ${note}` : ''}

Your task: Evolve this app with a balanced focus on ${focus.label.toLowerCase()}.

RULES:
- Return ONLY the complete updated React component code (no markdown fences, no explanation)
- The component must still be a single default export with no imports
- All sandbox globals remain available (React hooks, Tailwind, Lucide icons, Framer Motion, Phaser, Recharts)
- No localStorage, no external fetch
- Preserve all existing functionality
- Make the evolution feel intentional and coherent — not random

After the code, on a NEW LINE starting with "SUMMARY:", write one sentence describing what changed (max 80 chars).`;

  const raw = await callGemini(prompt, key);
  const summaryMatch = raw.match(/\nSUMMARY:\s*(.+)/);
  const summary = summaryMatch ? summaryMatch[1].trim() : `${focus.label} evolution (gen ${gen})`;
  const code = raw.replace(/\nSUMMARY:.+/, '').replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();

  const evolution = {
    timestamp: new Date().toISOString(), focus: focus.label, depth: 'Balanced',
    summary, code, prevCode: s.built_code ?? '', energyUsed: 20,
  };
  const evolutions = [evolution, ...(s.evolutions ?? [])].slice(0, 20);
  await db.collection('suggestions').doc(id).update({
    built_code: code, evolutions, autoWaterCount: (s.autoWaterCount ?? 0) + 1,
  });
  return summary;
}

export default async function handler(req: any, res: any) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers?.authorization || '';
  const given = auth.replace(/^Bearer\s+/i, '') || req.query?.secret;
  if (!secret || given !== secret) return res.status(401).json({ message: 'Unauthorized' });

  const key = process.env.GEMINI_RELAY_KEY;
  if (!key) return res.status(500).json({ message: 'GEMINI_RELAY_KEY not set' });

  try {
    initAdmin();
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
  const db = getFirestore(getApp(), DB_ID);

  const now = Date.now();
  const started = now;
  const snap = await db.collection('suggestions').where('autoWaterEnabled', '==', true).get();

  const watered: string[] = [];
  const errors: string[] = [];
  for (const doc of snap.docs) {
    if (Date.now() - started > TIME_BUDGET_MS || watered.length >= MAX_PER_RUN) break;
    const s = doc.data();
    if (!s.built_code || doc.id.startsWith('seed_')) continue;
    const cap = s.autoWaterTimes ?? 0;
    if (cap !== 0 && (s.autoWaterCount ?? 0) >= cap) continue;
    if (!dueAt(s, now)) continue;
    try {
      const summary = await waterOne(db, doc.id, s, key);
      watered.push(`${doc.id}: ${summary}`);
    } catch (e: any) {
      errors.push(`${doc.id}: ${e.message}`);
    }
  }

  return res.status(200).json({ ok: true, scanned: snap.size, watered, errors });
}
