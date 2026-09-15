import ZAI from 'z-ai-web-dev-sdk'

/**
 * Server-side AI helper (z-ai-web-dev-sdk).
 * End users never need an API key — the AI is built into the platform.
 */
export async function aiChat(system: string, user: string, maxTokens = 1200): Promise<string> {
  const zai = await ZAI.create()
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    thinking: { type: 'disabled' },
    max_tokens: maxTokens,
  })
  return completion.choices[0]?.message?.content ?? ''
}
