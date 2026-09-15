import { aiChat } from '@/lib/sdk'
import { APP_TYPES, AppSpec } from '@/lib/generator'

/**
 * Uses the built-in AI to turn the user's free-form idea into a structured app spec.
 * Falls back to smart defaults when the AI is unavailable — never blocks project creation.
 */
export async function planApp(appName: string, appType: string, description: string): Promise<AppSpec> {
  const typeMeta = APP_TYPES[appType] || APP_TYPES.tasks
  const fallback: AppSpec = {
    appName,
    appType,
    description,
    primaryColor: '#22C55E',
    features: typeMeta.defaults,
    welcomeText: description ? description.slice(0, 60) : `تطبيق ${typeMeta.label} جاهز للاستخدام`,
    itemCount: 6,
  }

  try {
    const raw = await aiChat(
      `أنت مهندس تطبيقات أندرويد خبير. مهمتك تحويل وصف المستخدم إلى مواصفات تطبيق.
أجب بـ JSON فقط بدون أي شرح أو علامات markdown، بالهيكل التالي:
{"features": ["ميزة 1", "ميزة 2", "ميزة 3", "ميزة 4"], "welcomeText": "جملة ترحيب قصيرة", "primaryColor": "#RRGGBB", "summary": "وصف من سطر واحد"}
القواعد:
- features: من 4 إلى 6 ميزات عملية مختصرة (كل ميزة أقل من 30 حرف)
- welcomeText: جملة قصيرة جداً تظهر أعلى التطبيق
- primaryColor: لون أساسي مناسب لنوع التطبيق بصيغة HEX
- summary: وصف التطبيق بالعربية`,
      `اسم التطبيق: ${appName}
النوع: ${typeMeta.label}
وصف المستخدم: ${description || 'تطبيق بسيط ومفيد'}`,
      600
    )

    const jsonText = raw.replace(/```json?|```/g, '').trim()
    const start = jsonText.indexOf('{')
    const end = jsonText.lastIndexOf('}')
    if (start === -1 || end === -1) return fallback
    const parsed = JSON.parse(jsonText.slice(start, end + 1))

    const features: string[] = Array.isArray(parsed.features) && parsed.features.length >= 3
      ? parsed.features.slice(0, 6).map((f: unknown) => String(f))
      : fallback.features

    return {
      ...fallback,
      features,
      welcomeText: typeof parsed.welcomeText === 'string' && parsed.welcomeText.length > 2
        ? parsed.welcomeText
        : fallback.welcomeText,
      primaryColor: typeof parsed.primaryColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.primaryColor)
        ? parsed.primaryColor
        : fallback.primaryColor,
      description: typeof parsed.summary === 'string' && parsed.summary.length > 2
        ? parsed.summary
        : fallback.description,
    }
  } catch {
    return fallback
  }
}
