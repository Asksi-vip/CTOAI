import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, destroySession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const DEMO_NAMES = ['مطوّر تجريبي', 'مهندس التطبيقات', 'صانع الأفكار']

/** One-click demo login — no GitHub needed for the sandbox preview. */
export async function POST() {
  try {
    const username = 'demo-' + Math.random().toString(36).slice(2, 8)
    const user = await db.user.create({
      data: {
        username,
        name: DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)],
        isDemo: true,
        avatarUrl: null,
      },
    })
    const token = await createSession(user.id)
    return NextResponse.json({ ok: true, token })
  } catch {
    return NextResponse.json({ error: 'تعذر إنشاء جلسة تجريبية' }, { status: 500 })
  }
}

/** Logout (also clears a stored GitHub token for safety). */
export async function DELETE() {
  await destroySession()
  return NextResponse.json({ ok: true })
}
