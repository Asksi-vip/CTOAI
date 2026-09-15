import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { planApp } from '@/lib/planner'
import { generateAndroidProject, APP_TYPES } from '@/lib/generator'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'سجّل دخول أولاً' }, { status: 401 })

  const projects = await db.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { files: true, messages: true, builds: true } },
    },
  })
  return NextResponse.json({ projects })
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'سجّل دخول أولاً' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const name = (body?.name || '').trim()
  const description = (body?.description || '').trim()
  const appType = APP_TYPES[body?.appType] ? body.appType : 'tasks'

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'اكتب اسم التطبيق (حرفين على الأقل)' }, { status: 400 })
  }

  const repoBase = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'my-app'
  const repoName = `${repoBase}-${Math.random().toString(36).slice(2, 6)}`

  const project = await db.project.create({
    data: {
      userId: user.id,
      name: repoName,
      appName: name,
      description,
      appType,
      status: 'generating',
    },
  })

  try {
    // 1) AI plans the app (features, colors, welcome text) — no user API key needed
    const spec = await planApp(name, appType, description)

    // 2) Generator produces a complete, buildable Android project
    const files = generateAndroidProject(spec)

    await db.project.update({
      where: { id: project.id },
      data: {
        status: 'ready',
        appName: spec.appName,
        description: spec.description || description,
        primaryColor: spec.primaryColor,
        packageName: `com.buildai.${spec.appName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      },
    })

    await db.projectFile.createMany({
      data: files.map((f) => ({
        projectId: project.id,
        path: f.path,
        content: f.content,
        language: f.language,
      })),
    })

    await db.message.createMany({
      data: [
        {
          projectId: project.id,
          role: 'assistant',
          content: `أهلاً! 🤖 أنا مساعدك لبناء التطبيقات.\n\nخلّيت أفهم طلبك وولّدت لك مشروع **${spec.appName}** كامل:\n📁 ${files.length} ملف (أندرويد + Gradle + GitHub Actions)\n✨ المميزات: ${spec.features.join(' • ')}\n🎨 اللون الأساسي: ${spec.primaryColor}\n\nإذا تريد تعديل، چولي وش تريد أغير وبعد ما تخلص نرفعه عـ GitHub ونسوي build للـ APK 🚀`,
        },
      ],
    })

    return NextResponse.json({ ok: true, projectId: project.id })
  } catch (err) {
    await db.project.update({ where: { id: project.id }, data: { status: 'failed' } }).catch(() => {})
    return NextResponse.json({ error: 'فشل توليد المشروع، جرب مرة ثانية' }, { status: 500 })
  }
}
