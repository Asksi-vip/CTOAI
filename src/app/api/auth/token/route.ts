import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { verifyToken } from '@/lib/github'

export const dynamic = 'force-dynamic'

/**
 * Login with a GitHub Personal Access Token (PAT).
 * The token is verified against api.github.com/user and stored so we can
 * create real repositories and push real code on the user's behalf.
 *
 * Scopes needed (fine-grained): Administration (RW) + Contents (RW) + Actions (RW)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const token = (body?.token || '').trim()
    if (!token || token.length < 20) {
      return NextResponse.json({ error: 'دز التوكن كامل بدون نقص' }, { status: 400 })
    }

    const gh = await verifyToken(token).catch((e: Error) => {
      throw new Error(e.message || 'تعذر التحقق من التوكن')
    })

    // Upsert the user by GitHub id (or login)
    let user = await db.user.findUnique({ where: { githubId: String(gh.id) } })
    if (user) {
      user = await db.user.update({
        where: { id: user.id },
        data: {
          accessToken: token,
          name: gh.name || gh.login,
          avatarUrl: gh.avatar_url,
        },
      })
    } else {
      const username = gh.login
      const existing = await db.user.findUnique({ where: { username } })
      user = await db.user.create({
        data: {
          githubId: String(gh.id),
          username: existing ? `${username}-gh` : username,
          name: gh.name || gh.login,
          email: gh.email,
          avatarUrl: gh.avatar_url,
          accessToken: token,
          isDemo: false,
        },
      })
    }

    const sessionToken = await createSession(user.id)
    return NextResponse.json({
      ok: true,
      token: sessionToken,
      user: { username: user.username, name: user.name, avatarUrl: user.avatarUrl },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشل تسجيل الدخول'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
