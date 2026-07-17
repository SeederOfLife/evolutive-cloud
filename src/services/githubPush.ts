import type { ProjectFile } from './projectScaffold';

const API = 'https://api.github.com';

async function gh(token: string, path: string, init?: RequestInit): Promise<any> {
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || `GitHub ${r.status}`);
  return data;
}

export interface PushResult { url: string; repo: string; }

// Creates the repo if it doesn't exist, then commits all project files in a
// single commit on the default branch via the Git Data API.
export async function pushProjectToGithub(
  token: string,
  repoName: string,
  files: ProjectFile[],
  message: string,
): Promise<PushResult> {
  const me = await gh(token, '/user');
  const owner = me.login;

  let repo: any;
  try {
    repo = await gh(token, `/repos/${owner}/${repoName}`);
  } catch {
    repo = await gh(token, '/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name: repoName, private: false, auto_init: true,
        description: 'Built with Evolutive Cloud',
      }),
    });
  }
  const branch = repo.default_branch || 'main';
  const base = `/repos/${owner}/${repoName}`;

  const ref = await gh(token, `${base}/git/ref/heads/${branch}`);
  const baseSha = ref.object.sha;
  const baseCommit = await gh(token, `${base}/git/commits/${baseSha}`);

  const tree: any[] = [];
  for (const f of files) {
    const blob = await gh(token, `${base}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: f.content, encoding: 'utf-8' }),
    });
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const newTree = await gh(token, `${base}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree }),
  });
  const commit = await gh(token, `${base}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: newTree.sha, parents: [baseSha] }),
  });
  await gh(token, `${base}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha }),
  });

  return { url: `https://github.com/${owner}/${repoName}`, repo: `${owner}/${repoName}` };
}
