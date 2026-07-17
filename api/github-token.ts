// Vercel serverless — exchanges a GitHub OAuth `code` for an access token.
// The client secret NEVER touches the browser. Configure in Vercel env vars:
//   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET  (from your GitHub OAuth App)
// and expose VITE_GITHUB_CLIENT_ID to the client (same client id).

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'POST only.' });
  }
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(404).json({ message: 'GitHub OAuth not configured on the server.' });
  }
  const code = req.body?.code;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ message: 'Missing OAuth code.' });
  }

  const upstream = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  const data: any = await upstream.json().catch(() => ({}));
  if (!data.access_token) {
    return res.status(502).json({ message: data.error_description || 'Token exchange failed.' });
  }
  return res.status(200).json({ access_token: data.access_token });
}
