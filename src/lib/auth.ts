import { db } from '@/lib/db'
import { cookies, headers } from 'next/headers'
import { randomBytes } from 'crypto'

export const SESSION_COOKIE = 'buildai_session'
const SESSION_DAYS = 7

/**
 * Creates a session and returns its token.
 * Cookie: SameSite=None+Secure when served over HTTPS (preview iframes block Lax cookies),
 * Lax otherwise (plain localhost).
 * The token is ALSO returned to the client as a fallback (Authorization header) for
 * webview/iframe environments where cookies are unavailable.
 */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({ data: { token, userId, expiresAt } })

  try {
    const h = await headers()
    const proto = h.get('x-forwarded-proto') || 'http'
    const isHttps = proto.split(',')[0].trim() === 'https'
    const jar = await cookies()
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      path: '/',
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    })
  } catch {
    /* cookie set is best-effort; header fallback covers the rest */
  }

  return token
}

export async function getSessionUser() {
  try {
    let token: string | undefined

    // 1) Authorization: Bearer <token> (iframe/webview-safe)
    const h = await headers()
    const auth = h.get('authorization')
    if (auth?.startsWith('Bearer ')) {
      token = auth.slice(7).trim()
    }

    // 2) Session cookie
    if (!token) {
      const jar = await cookies()
      token = jar.get(SESSION_COOKIE)?.value
    }

    if (!token) return null

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    })
    if (!session) return null
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {})
      return null
    }
    return session.user
  } catch {
    return null
  }
}

export async function destroySession() {
  try {
    const h = await headers()
    const auth = h.get('authorization')
    const jar = await cookies()
    const token = auth?.startsWith('Bearer ')
      ? auth.slice(7).trim()
      : jar.get(SESSION_COOKIE)?.value
    if (token) {
      await db.session.deleteMany({ where: { token } }).catch(() => {})
    }
    jar.delete(SESSION_COOKIE)
  } catch {
    /* noop */
  }
}
