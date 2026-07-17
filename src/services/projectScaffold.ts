import type { Suggestion } from '../types';
import { buildSrcDoc } from '../sandbox/buildSrcDoc';

export interface ProjectFile { path: string; content: string; }

export function projectName(s: Suggestion): string {
  return (s.content || 'evolutive-app')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
    || 'evolutive-app';
}

function stripToComponent(code: string): string {
  return (code || '')
    .replace(/^import\b.*$/gm, '')
    .replace(/^export\s+default\s+function/gm, 'function')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+/gm, '')
    .trim();
}

// Turns a single-app Suggestion into a real, self-contained project folder.
// index.html runs standalone (React + Babel via CDN, same loader as the sandbox);
// src/App.tsx is the editable source; the rest scaffolds a pushable repo.
export function buildProjectFiles(suggestion: Suggestion, code: string): ProjectFile[] {
  const name = projectName(suggestion);
  const clean = stripToComponent(code);
  const roadmap = suggestion.roadmap;

  const readme =
    `# ${suggestion.content}\n\n` +
    `Generated with [Evolutive Cloud](https://evolutive-cloud.vercel.app).\n\n` +
    `**Type:** ${suggestion.app_type ?? 'desktop'}\n\n` +
    `## Run\n\nOpen \`index.html\` in a browser — it is fully self-contained ` +
    `(React + Tailwind + Babel via CDN, no install needed).\n\n` +
    `## Edit\n\nThe component lives in \`src/App.tsx\`.\n` +
    (roadmap
      ? `\n## Roadmap\n\n` +
        `- **Now:** ${(roadmap.now ?? []).join(' · ') || '—'}\n` +
        `- **Next:** ${(roadmap.next ?? []).join(' · ') || '—'}\n` +
        `- **Future:** ${(roadmap.future ?? []).join(' · ') || '—'}\n`
      : '');

  const pkg = JSON.stringify({
    name,
    version: '0.1.0',
    private: true,
    description: suggestion.content,
    scripts: { start: 'npx serve .' },
  }, null, 2);

  const metadata = JSON.stringify({
    id: suggestion.id,
    title: suggestion.content,
    app_type: suggestion.app_type ?? 'desktop',
    created_at: suggestion.created_at ?? null,
    source: 'evolutive-cloud',
    exported_at: new Date().toISOString(),
  }, null, 2);

  return [
    { path: 'index.html', content: buildSrcDoc(clean) },
    { path: 'src/App.tsx', content: code || clean },
    { path: 'README.md', content: readme },
    { path: 'package.json', content: pkg },
    { path: 'metadata.json', content: metadata },
  ];
}
