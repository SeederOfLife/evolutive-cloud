import { useState } from 'react';
import { GitBranch, Loader2, Check } from 'lucide-react';
import type { Suggestion } from '../types';
import { githubToken, startGithubAuth, githubConfigured } from '../services/githubAuth';
import { buildProjectFiles, projectName } from '../services/projectScaffold';
import { pushProjectToGithub } from '../services/githubPush';

// Self-contained: reads the token from storage, redirects to connect if absent,
// otherwise scaffolds the project and pushes it. The OAuth redirect is handled
// app-side by useGithubCallback.
export function GithubPushButton({ suggestion, code }: { suggestion: Suggestion; code: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const connected = !!githubToken();

  const onClick = async () => {
    if (!githubConfigured()) {
      setMsg('GitHub not set up (VITE_GITHUB_CLIENT_ID)');
      setTimeout(() => setMsg(null), 4000);
      return;
    }
    const token = githubToken();
    if (!token) { startGithubAuth(); return; }
    setBusy(true); setMsg(null);
    try {
      const files = buildProjectFiles(suggestion, code);
      const res = await pushProjectToGithub(token, projectName(suggestion), files, 'Update from Evolutive Cloud');
      setMsg('Pushed ✓');
      window.open(res.url, '_blank');
    } catch (e: any) {
      setMsg(`Push failed: ${e.message}`);
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 5000);
    }
  };

  return (
    <div className="px-1 pb-2">
      <button onClick={onClick} disabled={busy}
        className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-indigo-500/40 disabled:opacity-40 transition-all">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : connected ? <Check className="w-3.5 h-3.5" /> : <GitBranch className="w-3.5 h-3.5" />}
        {connected ? 'Push to GitHub' : 'Connect GitHub'}
      </button>
      {msg && <p className="text-[9px] text-center text-indigo-300/80 font-mono mt-1">{msg}</p>}
    </div>
  );
}
