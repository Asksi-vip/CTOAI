'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Github, Sparkles, Rocket, KeyRound, Loader2, Bot, FolderGit2, Hammer, Download, ArrowLeft } from 'lucide-react'

interface LoginViewProps {
  onLogin: (mode: 'demo' | 'token', token?: string) => Promise<string | null>
  onBack?: () => void
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [loading, setLoading] = useState<'demo' | 'token' | null>(null)
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleDemo = async () => {
    setLoading('demo')
    setError(null)
    const err = await onLogin('demo')
    if (err) setError(err)
    setLoading(null)
  }

  const handleToken = async () => {
    if (token.trim().length < 20) {
      setError('دز التوكن كامل — يبدو ناقص')
      return
    }
    setLoading('token')
    setError(null)
    const err = await onLogin('token', token.trim())
    if (err) setError(err)
    setLoading(null)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-3xl">
          {/* Hero */}
          <div className="text-center mb-10">
            <Badge variant="outline" className="glow mb-5 border-primary/40 text-primary bg-primary/5 px-4 py-1.5 text-sm">
              <Sparkles className="w-4 h-4 ml-1" /> مدعوم بالذكاء الاصطناعي — بدون أي API Key
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
              اصنع تطبيقك
              <span className="text-primary"> بالذكاء الاصطناعي</span>
              <br />
              وارفعه عـ GitHub 🚀
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
              حچي مع الـ AI، يولّدلك مشروع أندرويد كامل، يرفعه عحسابك، ويسوي Build — والـ APK ينزل جاهز للتحميل.
            </p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-10">
            {[
              { icon: Bot, label: 'ولّد الكود', desc: 'الـ AI يكتب المشروع كامل' },
              { icon: FolderGit2, label: 'ارفع ع GitHub', desc: 'ريبو حقيقي بحسابك' },
              { icon: Hammer, label: 'Build تلقائي', desc: 'GitHub Actions يسوي البناء' },
              { icon: Download, label: 'نزّل APK', desc: 'جاهز للتنصيب عهاتفك' },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 text-center">
                <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="font-bold text-sm">{s.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.desc}</div>
              </div>
            ))}
          </div>

          {/* Login cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="border-primary/25">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Github className="w-5 h-5" /> دخول بالتوكن
                  <Badge className="mr-auto">موصى به</Badge>
                </CardTitle>
                <CardDescription>
                  سجّل دخول بـ GitHub Personal Access Token — يخلق ريبو حقيقي بحسابك ويرفع المشروع فعلياً.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxx أو github_pat_..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="font-mono text-sm"
                  dir="ltr"
                />
                <Button onClick={handleToken} disabled={loading !== null} className="w-full h-11">
                  {loading === 'token' ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  دخول بالتوكن
                </Button>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  يحتاج صلاحيات: Administration + Contents + Actions (Read &amp; write). امسح التوكن بعد ما نخلص 🔒
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-amber-400" /> دخول تجريبي
                </CardTitle>
                <CardDescription>
                  جرب كل المميزات فوراً بدون حساب — التوليد والبناء تشتغل (وضع المحاكاة للرفع).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleDemo} disabled={loading !== null} variant="secondary" className="w-full h-11">
                  {loading === 'demo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  دخول سريع (تجريبي)
                </Button>
                <Separator className="my-4" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  💡 بالوضع التجريبي: الـ AI والتوليد والـ Build تشتغل حقيقي، بس الرفع ع GitHub يكون محاكاة لحين تدخل بالتوكن.
                </p>
              </CardContent>
            </Card>
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm px-4 py-3 text-center">
              {error}
            </div>
          )}
        </div>
      </div>

      <footer className="mt-auto py-4 text-center text-xs text-muted-foreground">
        BuildAI 🤖 — صُنع بالذكاء الاصطناعي | التطبيقات تُبنى بـ GitHub Actions على مستودعك
      </footer>
    </div>
  )
}
