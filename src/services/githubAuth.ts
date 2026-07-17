const TOKEN_KEY = 'gh_token';
const STATE_KEY = 'gh_state';

export function githubToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setGithubToken(t: string | null): void {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export function githubConfigured(): boolean {
  return !!import.meta.env.VITE_GITHUB_CLIENT_ID;
}

// Redirects to GitHub's consent screen. GitHub sends the user back to the app
// origin with ?code=...&state=... — handled by useGithubCallback.
export function startGithubAuth(): void {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  if (!clientId) return;
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessionStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: window.location.origin,
    scope: 'repo',
    state,
  });
  window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export function consumeAuthState(): string | null {
  const s = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  return s;
}

export async function exchangeGithubCode(code: string): Promise<string> {
  const r = await fetch('/api/github-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.access_token) throw new Error(data.message || 'GitHub token exchange failed.');
  return data.access_token;
}

export async function getGithubUser(token: string): Promise<string> {
  const r = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!r.ok) throw new Error('GitHub token invalid.');
  return (await r.json()).login;
}
