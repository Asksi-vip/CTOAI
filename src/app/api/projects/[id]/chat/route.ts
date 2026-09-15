import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { aiChat } from '@/lib/sdk'
import { APP_TYPES } from '@/lib/generator'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'سجّل دخول أولاً' }, { status: 401 })

  const { id } = await ctx.params
  const project = await db.project.findFirst({ where: { id, userId: user.id } })
  if (!project) return NextResponse.json({ error: 'المشروع غير موجود' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const content = (body?.message || '').trim()
  if (!content) return NextResponse.json({ error: 'اكتب رسالتك' }, { status: 400 })

  await db.message.create({ data: { projectId: project.id, role: 'user', content } })

  const history = await db.message.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'asc' },
    take: 12,
  })

  const typeMeta = APP_TYPES[project.appType]
  const fileList = await db.projectFile.findMany({
    where: { projectId: project.id },
    select: { path: true },
    orderBy: { path: 'asc' },
  })

  let reply = ''
  try {
    reply = await aiChat(
      `أنت "BuildAI" — مساعد ذكي لبناء تطبيقات أندرويد داخل منصة.
المشروع الحالي: "${project.appName}" (نوع: ${typeMeta?.label || project.appType})
الوصف: ${project.description || 'بدون وصف'}
حالة المشروع: ${project.status}
ملفات المشروع:\n${fileList.map((f) => '- ' + f.path).join('\n')}

قواعد الرد:
- رد بالعربية (لهجة بسيطة وودية)
- ردود قصيرة ومركزة (3-6 أسطر كحد أقصى)
- ساعد المستخدم على تحسين تطبيقه واقترح مميزات عملية
- إذا طلب تعديل: وضّح شنو راح يتغير بالملفات
- تذكيره بلخطوات: تعديل ← رفع ع GitHub ← Build ← تحميل APK
- لا تستخدم أكواد طويلة بالردود، وصف فقط`,
      history.map((m) => `${m.role === 'user' ? 'المستخدم' : 'المساعد'}: ${m.content}`).join('\n\n') + `\n\nالمستخدم: ${content}`,
      700
    )
  } catch {
    reply = 'سامحني، صار خلل بسيط بالاتصال بالذكاء الاصطناعي 😅 جرب مرة ثانية.'
  }

  const saved = await db.message.create({
    data: { projectId: project.id, role: 'assistant', content: reply },
  })

  return NextResponse.json({ ok: true, reply: saved })
}
