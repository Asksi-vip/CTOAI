'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Github, Plus, Loader2, FolderGit2, Trash2, FileCode2, MessageSquare, Hammer, LogOut, Bot } from 'lucide-react'
import { ProjectDto, STATUS_LABELS, AppUser } from './types'

const APP_TYPE_OPTIONS = [
  { id: 'tasks', label: 'مهام يومية', emoji: '✅' },
  { id: 'notes', label: 'مذكرات', emoji: '📝' },
  { id: 'store', label: 'متجر بسيط', emoji: '🛒' },
  { id: 'calculator', label: 'حاسبة', emoji: '🧮' },
  { id: 'fitness', label: 'لياقة', emoji: '💪' },
  { id: 'chat', label: 'دردشة', emoji: '💬' },
]

interface DashboardViewProps {
  user: AppUser
  projects: ProjectDto[]
  loading: boolean
  onCreate: (data: { name: string; description: string; appType: string }) => Promise<string | null>
  onOpen: (p: ProjectDto) => void
  onDelete: (p: ProjectDto) => void
  onLogout: () => void
}

export function DashboardView({ user, projects, loading, onCreate, onOpen, onDelete, onLogout }: DashboardViewProps) {
  const [creating, setCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [appType, setAppType] = useState('tasks')

  const handleCreate = async () => {
    setCreating(true)
    const err = await onCreate({ name, description, appType })
    setCreating(false)
    if (!err) {
      setName('')
      setDescription('')
      setDialogOpen(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-extrabold text-lg">
            <span className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Bot className="w-5 h-5" />
            </span>
            BuildAI
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-primary">
                {(user.name || user.username).slice(0, 2)}
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="font-bold">{user.name || user.username}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1" dir="ltr">
                  @{user.username}
                  {user.hasToken ? (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 text-primary border-primary/40">
                      <Github className="w-2.5 h-2.5" /> GitHub
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-400 border-amber-400/40">
                      تجريبي
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout} aria-label="تسجيل خروج">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold">مشاريعي</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {user.hasToken
                ? 'مشاريعك تُرفع فعلياً عحساب GitHub'
                : 'وضع تجريبي — سجّل بالتوكن حتى ترفع مشاريعك عحسابك'}
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-12 px-6 font-bold">
                <Plus className="w-5 h-5" /> مشروع جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>تطبيق جديد 🚀</DialogTitle>
                <DialogDescription>
                  چولي الفكرة والـ AI يبني المشروع كامل — كود، رفع، وبناء APK
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold">اسم التطبيق</label>
                  <Input
                    placeholder="مثال: مهامي اليومية"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={40}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">نوع التطبيق</label>
                  <div className="grid grid-cols-3 gap-2">
                    {APP_TYPE_OPTIONS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setAppType(t.id)}
                        className={`rounded-lg border p-3 text-center text-xs font-bold transition-all ${
                          appType === t.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card hover:border-primary/40'
                        }`}
                      >
                        <div className="text-xl mb-1">{t.emoji}</div>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">وصف الفكرة (اختياري)</label>
                  <Textarea
                    placeholder="اشرح لـ AI شنو تريد بالتطبيق… مثال: تطبيق مهام مع إشعارات وألوان"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    maxLength={300}
                  />
                </div>

                <Button onClick={handleCreate} disabled={creating || name.trim().length < 2} className="w-full h-11 font-bold">
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> الـ AI يبني مشروعك…
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4" /> ولّد المشروع 🤖
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 w-2/3 rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-full rounded bg-muted mb-2" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24 rounded-2xl border-2 border-dashed border-border">
            <FolderGit2 className="w-14 h-14 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-bold text-lg mb-2">ما عندك مشاريع بعد</h3>
            <p className="text-muted-foreground text-sm mb-6">ابدأ أول مشروع — الـ AI يبنيه لك بدقائق</p>
            <Button onClick={() => setDialogOpen(true)} variant="secondary">
              <Plus className="w-4 h-4" /> أنشئ أول مشروع
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Card
                key={p.id}
                className="group cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5"
                onClick={() => onOpen(p)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{p.appName}</CardTitle>
                    <Badge
                      variant="outline"
                      className={
                        p.status === 'built'
                          ? 'text-primary border-primary/40 shrink-0'
                          : p.status === 'failed'
                            ? 'text-destructive border-destructive/40 shrink-0'
                            : 'text-muted-foreground shrink-0'
                      }
                    >
                      {STATUS_LABELS[p.status] || p.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-10">
                    {p.description || 'بدون وصف'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileCode2 className="w-3.5 h-3.5" /> {p._count?.files ?? 0} ملف
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> {p._count?.messages ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Hammer className="w-3.5 h-3.5" /> {p._count?.builds ?? 0}
                    </span>
                    {p.githubUrl && (
                      <a
                        href={p.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-primary hover:underline"
                        dir="ltr"
                      >
                        <Github className="w-3.5 h-3.5" /> repo
                      </a>
                    )}
                    <Trash2
                      className="w-4 h-4 mr-auto opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(p)
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-auto py-4 text-center text-xs text-muted-foreground">
        BuildAI 🤖 — كل المشاريع تتولد بكود أندرويد حقيقي + GitHub Actions جاهز للبناء
      </footer>
    </div>
  )
}
