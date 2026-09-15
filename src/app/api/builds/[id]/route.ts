import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** Poll build status + logs (client polls this every second while building). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'سجّل دخول أولاً' }, { status: 401 })

  const { id } = await ctx.params
  const build = await db.build.findFirst({
    where: { id, project: { userId: user.id } },
  })
  if (!build) return NextResponse.json({ error: 'البناء غير موجود' }, { status: 404 })

  return NextResponse.json({ build })
}
