/**
 * GitHub API helpers — real repository creation & pushing via REST API.
 * Used when the user logs in with a personal access token (PAT).
 */

export interface GhUser {
  login: string
  name: string | null
  email: string | null
  avatar_url: string
  id: number
}

export interface PushFile {
  path: string
  content: string
}

const API = 'https://api.github.com'

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'BuildAI-App',
  }
}

/** Verify a PAT and return the authenticated user profile. */
export async function verifyToken(token: string): Promise<GhUser> {
  const res = await fetch(`${API}/user`, {
    headers: ghHeaders(token),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`توكن غير صالح أو منتهي (${res.status})`)
  }
  const user = (await res.json()) as GhUser
  return user
}

/** List repositories accessible by the token (top N recent). */
export async function listRepos(token: string): Promise<{ name: string; url: string; updated_at: string }[]> {
  const res = await fetch(`${API}/user/repos?sort=updated&per_page=8`, {
    headers: ghHeaders(token),
    cache: 'no-store',
  })
  if (!res.ok) return []
  const repos = (await res.json()) as any[]
  return repos.map((r) => ({ name: r.name, url: r.html_url, updated_at: r.updated_at }))
}

export interface PushResult {
  htmlUrl: string
  commitSha: string
  repoName: string
}

/** Create (or reuse) a repo and push all files as one commit to the default branch. */
export async function pushProjectToGitHub(
  token: string,
  username: string,
  repoName: string,
  description: string,
  files: PushFile[]
): Promise<PushResult> {
  const headers = ghHeaders(token)

  // 1) Create the repository WITH auto_init (Git Data API rejects empty repos with 409)
  let repo: any = null
  const createRes = await fetch(`${API}/user/repos`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: repoName,
      description: description || 'Built with BuildAI',
      private: false,
      auto_init: true,
    }),
  })
  if (createRes.ok) {
    repo = await createRes.json()
  } else {
    const err = await createRes.json().catch(() => ({}))
    const already = createRes.status === 422 || (err?.message || '').includes('already exists')
    if (!already) {
      throw new Error(`فشل إنشاء المستودع: ${err?.message || createRes.status}`)
    }
    const getRes = await fetch(`${API}/repos/${username}/${repoName}`, { headers })
    if (!getRes.ok) throw new Error(`تعذر الوصول للمستودع ${username}/${repoName}`)
    repo = await getRes.json()
    // Repo exists but has no commits → seed it via the Contents API (works on empty repos)
    if (!repo.size) {
      await fetch(`${API}/repos/${repo.full_name}/contents/README.md`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: 'chore: init',
          content: Buffer.from('# Initializing…').toString('base64'),
        }),
      })
      const refresh = await fetch(`${API}/repos/${repo.full_name}`, { headers })
      if (refresh.ok) repo = await refresh.json()
    }
  }

  const repoFull = repo.full_name || `${username}/${repoName}`
  const htmlUrl: string = repo.html_url || `https://github.com/${repoFull}`
  const branch = repo.default_branch || 'main'

  // 2) Get the base commit + its tree (repo is guaranteed non-empty now)
  const refRes = await fetch(`${API}/repos/${repoFull}/git/ref/heads/${branch}`, { headers })
  if (!refRes.ok) throw new Error(`تعذر جلب الفرع ${branch} (${refRes.status})`)
  const baseCommitSha = (await refRes.json()).object.sha

  const baseCommitRes = await fetch(`${API}/repos/${repoFull}/git/commits/${baseCommitSha}`, { headers })
  if (!baseCommitRes.ok) throw new Error(`تعذر جلب الكومِت الأساسي (${baseCommitRes.status})`)
  const baseTreeSha = (await baseCommitRes.json()).tree.sha

  // 3) Create blobs for every file
  const tree: { path: string; mode: string; type: string; sha: string }[] = []
  for (const f of files) {
    const blobRes = await fetch(`${API}/repos/${repoFull}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: f.content, encoding: 'utf-8' }),
    })
    if (!blobRes.ok) throw new Error(`فشل رفع الملف ${f.path} (${blobRes.status})`)
    const blob = await blobRes.json()
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha })
  }

  // 4) Build the tree on top of the base tree
  const treeRes = await fetch(`${API}/repos/${repoFull}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ base_tree: baseTreeSha, tree }),
  })
  if (!treeRes.ok) throw new Error(`فشل بناء الشجرة (${treeRes.status})`)
  const newTree = await treeRes.json()

  // 5) Create the commit (child of the base commit)
  const commitRes = await fetch(`${API}/repos/${repoFull}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: '🚀 Initial commit — generated by BuildAI',
      tree: newTree.sha,
      parents: [baseCommitSha],
    }),
  })
  if (!commitRes.ok) throw new Error(`فشل إنشاء الكومِت (${commitRes.status})`)
  const commit = await commitRes.json()

  // 6) Fast-forward the default branch
  const patchRes = await fetch(`${API}/repos/${repoFull}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ sha: commit.sha }),
  })
  if (!patchRes.ok) throw new Error(`فشل تحديث الفرع ${branch} (${patchRes.status})`)

  return { htmlUrl, commitSha: commit.sha, repoName: repoFull }
}
