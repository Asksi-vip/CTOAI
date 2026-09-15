import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

async function getOwnedProject(id: string) {
  const user = await getSessionUser()
  if (!user) return { error: NextResponse.json({ error: 'سجّل دخول أولاً' }, { status: 401 }) }
  const project = await db.project.findFirst({
    where: { id, userId: user.id },
    include: {
      files: { orderBy: { path: 'asc' } },
      messages: { orderBy: { createdAt: 'asc' } },
      builds: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!project) return { error: NextResponse.json({ error: 'المشروع غير موجود' }, { status: 404 }) }
  return { project }
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const { project, error } = await getOwnedProject(id)
  if (error) return error

  return NextResponse.json({
    project: {
      ...project,
      files: project.files,
      messages: project.messages,
      builds: project.builds,
    },
  })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'سجّل دخول أولاً' }, { status: 401 })
  await db.project.deleteMany({ where: { id, userId: user.id } })
  return NextResponse.json({ ok: true })
}
