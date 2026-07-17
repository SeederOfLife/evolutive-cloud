import { useEffect, useState } from 'react';
import { exchangeGithubCode, setGithubToken, consumeAuthState } from '../services/githubAuth';

// Mounted once at App level: catches GitHub's OAuth redirect (?code=&state=),
// exchanges the code for a token, and cleans the URL. Returns a transient status.
export function useGithubCallback(): string | null {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) return;

    const expected = consumeAuthState();
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, '', url.toString());

    if (state !== expected) {
      setStatus('GitHub connect failed (state mismatch).');
      setTimeout(() => setStatus(null), 4000);
      return;
    }

    setStatus('Connecting GitHub…');
    exchangeGithubCode(code)
      .then(t => { setGithubToken(t); setStatus('GitHub connected ✓'); })
      .catch(e => setStatus(`GitHub connect failed: ${e.message}`))
      .finally(() => setTimeout(() => setStatus(null), 4000));
  }, []);

  return status;
}
