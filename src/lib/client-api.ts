'use client'

const SESSION_KEY = 'buildai_session_token'

export function saveSessionToken(token: string) {
  try {
    localStorage.setItem(SESSION_KEY, token)
  } catch {
    /* private mode etc. */
  }
}

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function clearSessionToken() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* noop */
  }
}

/**
 * fetch wrapper that attaches the session token as an Authorization header.
 * Cookies work in normal tabs; the header fallback covers iframe/webview
 * environments where SameSite cookies are blocked.
 */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getSessionToken()
  const headers = new Headers(init.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(url, { ...init, headers, credentials: 'include' })
}

/** Authenticated file download (works inside iframes where <a href> cookies fail). */
export async function apiDownload(url: string) {
  try {
    const res = await apiFetch(url)
    if (!res.ok) throw new Error('فشل التحميل')
    const blob = await res.blob()
    const dispo = res.headers.get('Content-Disposition') || ''
    const match = dispo.match(/filename="([^"]+)"/)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = match ? match[1] : 'download'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(a.href)
  } catch {
    // last resort: plain navigation (cookie session will handle it in normal tabs)
    window.open(url, '_blank')
  }
}
