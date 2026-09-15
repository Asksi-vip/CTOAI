'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowRight, Bot, Send, Loader2, FileCode2, Github, Hammer, Download,
  CheckCircle2, ExternalLink, Package, FolderGit2, Sparkles, File as FileIcon,
} from 'lucide-react'
import { BuildDto, MessageDto, ProjectDto, ProjectFileDto } from './types'
import { apiFetch, apiDownload } from '@/lib/client-api'

interface WorkspaceViewProps {
  project: ProjectDto
  onBack: () => void
  onChanged: () => void
}

export function WorkspaceView({ project, onBack, onChanged }: WorkspaceViewProps) {
  const [messages, setMessages] = useState<MessageDto[]>(project.messages || [])
  const [files, setFiles] = useState<ProjectFileDto[]>(project.files || [])
  const [builds, setBuilds] = useState<BuildDto[]>(project.builds || [])
  const [githubUrl, setGithubUrl] = useState(project.githubUrl)
  const [status, setStatus] = useState(project.status)

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<ProjectFileDto | null>(
    (project.files || []).find((f) => f.path.includes('MainActivity')) || (project.files || [])[0] || null
  )
  const [pushing, setPushing] = useState(false)
  const [pushLog, setPushLog] = useState<string | null>(null)
  const [building, setBuilding] = useState(false)
  const [activeBuild, setActiveBuild] = useState<BuildDto | null>(builds.find((b) => b.status !== 'success') || builds[0] || null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/projects/${project.id}`)
      if (!res.ok) return
      const data = await res.json()
      const p: ProjectDto = data.project
      setMessages(p.messages || [])
      setFiles(p.files || [])
      setBuilds(p.builds || [])
      setGithubUrl(p.githubUrl)
      setStatus(p.status)
      if (!selectedFile && p.files?.length) {
        setSelectedFile(p.files.find((f) => f.path.includes('MainActivity')) || p.files[0])
      }
      const running = p.builds?.find((b) => b.status === 'running' || b.status === 'queued')
      if (running) setActiveBuild(running)
    } catch {
      /* silent */
    }
  }, [project.id, selectedFile])

  // poll while a build is running
  useEffect(() => {
    const running = activeBuild && (activeBuild.status === 'running' || activeBuild.status === 'queued')
    if (running && pollRef.current === null) {
      pollRef.current = setInterval(async () => {
        if (!activeBuild) return
        try {
          const res = await apiFetch(`/api/builds/${activeBuild.id}`)
          if (res.ok) {
            const data = await res.json()
            setActiveBuild(data.build)
            if (data.build.status === 'success' || data.build.status === 'failed') {
              if (pollRef.current) {
                clearInterval(pollRef.current)
                pollRef.current = null
              }
              setBuilding(false)
              refresh()
            }
          }
        } catch {
          /* silent */
        }
      }, 900)
    }
    return () => {
      if (pollRef.current && (!running)) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [activeBuild, refresh])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, sending])

  // fetch full details on mount when opened from the dashboard (list lacks files/messages/builds)
  useEffect(() => {
    if (!project.files?.length) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    setMessages((m) => [...m, { id: 'tmp', role: 'user', content: text, createdAt: new Date().toISOString() }])
    try {
      const res = await apiFetch(`/api/projects/${project.id}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      if (data.reply) {
        setMessages((m) => [...m.filter((x) => x.id !== 'tmp'), { id: 'tmp-u', role: 'user', content: text, createdAt: new Date().toISOString() }, data.reply])
      }
      setMessages((m) => m.filter((x) => x.id !== 'tmp'))
    } catch {
      setMessages((m) => m.filter((x) => x.id !== 'tmp'))
    }
    setSending(false)
  }

  const push = async () => {
    setPushing(true)
    setPushLog(null)
    try {
      const res = await apiFetch(`/api/projects/${project.id}/push`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setPushLog(data.logs)
        setGithubUrl(data.githubUrl)
        refresh()
      } else {
        setPushLog(`❌ ${data.error || 'فشل الرفع'}`)
      }
    } catch {
      setPushLog('❌ خطأ بالاتصال')
    }
    setPushing(false)
  }

  const startBuild = async () => {
    setBuilding(true)
    try {
      const res = await apiFetch(`/api/projects/${project.id}/build`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setActiveBuild({
          id: data.buildId, status: 'queued', logs: '', apkName: null, apkSize: null,
          duration: null, createdAt: new Date().toISOString(), completedAt: null,
        })
      } else {
        setBuilding(false)
      }
    } catch {
      setBuilding(false)
    }
  }

  const lastBuild = builds.find((b) => b.status === 'success')
  const statusBadge =
    status === 'built' ? 'text-primary border-primary/40' :
    status === 'failed' ? 'text-destructive border-destructive/40' :
    'text-muted-foreground'

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={onBack} aria-label="رجوع">
              <ArrowRight className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <div className="font-extrabold truncate">{project.appName}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusBadge}`}>
                  {status === 'generating' ? 'جاري التوليد…' : status === 'pushed' ? 'مرفوع ع GitHub' : status === 'built' ? 'APK جاهز ✅' : status}
                </Badge>
                <span dir="ltr" className="truncate">{project.name}</span>
              </div>
            </div>
          </div>
          {githubUrl && (
            <a href={githubUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-1">
                <Github className="w-4 h-4" /> المستودع
                <ExternalLink className="w-3 h-3" />
              </Button>
            </a>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-6">
            <TabsTrigger value="chat" className="gap-1"><Bot className="w-4 h-4" /> المحادثة</TabsTrigger>
            <TabsTrigger value="files" className="gap-1"><FileCode2 className="w-4 h-4" /> الملفات ({files.length})</TabsTrigger>
            <TabsTrigger value="build" className="gap-1"><Hammer className="w-4 h-4" /> البناء</TabsTrigger>
          </TabsList>

          {/* ───────────────────────────── CHAT ───────────────────────────── */}
          <TabsContent value="chat">
            <Card className="flex flex-col h-[65vh]">
              <CardHeader className="py-3 border-b border-border">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  حچي مع الـ AI لتعديل وتطوير تطبيقك — بدون أي API Key
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto py-4">
                <div className="space-y-3">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                          m.role === 'user'
                            ? 'bg-secondary text-secondary-foreground rounded-br-sm'
                            : 'bg-primary/10 border border-primary/20 text-foreground rounded-bl-sm'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex justify-end">
                      <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-bl-sm px-4 py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </CardContent>
              <div className="border-t border-border p-3 flex gap-2">
                <Input
                  placeholder="چولي الـ AI وش تريد تعدل… مثال: أضف مميزة بحث"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  disabled={sending}
                />
                <Button onClick={send} disabled={sending || !input.trim()} aria-label="إرسال">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* ───────────────────────────── FILES ───────────────────────────── */}
          <TabsContent value="files">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
              <Card className="h-[60vh]">
                <CardHeader className="py-3 border-b border-border">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-primary" /> {files.length} ملف
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <ScrollArea className="h-[calc(60vh-64px)]">
                    <div className="space-y-0.5 pr-1">
                      {files.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setSelectedFile(f)}
                          className={`w-full text-right rounded-lg px-3 py-2 text-xs font-mono transition-colors flex items-center gap-2 ${
                            selectedFile?.id === f.id ? 'bg-primary/15 text-primary' : 'hover:bg-muted text-muted-foreground'
                          }`}
                          dir="ltr"
                        >
                          <FileIcon className="w-3 h-3 shrink-0" />
                          <span className="truncate">{f.path}</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="h-[60vh] flex flex-col overflow-hidden">
                <CardHeader className="py-3 border-b border-border shrink-0">
                  <CardTitle className="text-xs font-mono text-muted-foreground truncate" dir="ltr">
                    {selectedFile?.path || 'اختر ملف'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-0">
                  {selectedFile ? (
                    <pre className="build-log p-4 text-foreground/90 min-h-full">
                      <code>{selectedFile.content}</code>
                    </pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      اختر ملف من القائمة
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ───────────────────────────── BUILD ───────────────────────────── */}
          <TabsContent value="build">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Push card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Github className="w-5 h-5" /> 1. الرفع عـ GitHub
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {githubUrl
                      ? 'المشروع مرفوع ✓ — تقدر ترفع تحديث جديد بأي وقت.'
                      : 'ارفع المشروع عحسابك — ينشئ ريبو حقيقي ويرفع كل الملفات بكومِت واحد.'}
                  </p>
                  <Button onClick={push} disabled={pushing} className="w-full">
                    {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderGit2 className="w-4 h-4" />}
                    {githubUrl ? 'إعادة الرفع (تحديث)' : 'ارفع ع GitHub'}
                  </Button>
                  {pushLog && (
                    <pre className="build-log rounded-lg bg-black/40 border border-border p-3 max-h-48 overflow-y-auto text-primary/90">
                      {pushLog}
                    </pre>
                  )}
                </CardContent>
              </Card>

              {/* Build card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hammer className="w-5 h-5" /> 2. البناء والـ APK
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    زر Build يشغّل GitHub Actions — يسوّي build ويطلع الـ APK.
                    بالمعاينة هوني البناء محاكاة واقعية؛ بعد الرفع الحقيقي ينُنتج APK أصلي بالـ Artifacts.
                  </p>
                  <Button onClick={startBuild} disabled={building} className="w-full font-bold">
                    {building ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> جاري البناء…
                      </>
                    ) : (
                      <>
                        <Hammer className="w-4 h-4" /> Build APK 🚀
                      </>
                    )}
                  </Button>

                  {activeBuild && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        {activeBuild.status === 'success' ? (
                          <Badge className="bg-primary/15 text-primary border border-primary/30">
                            <CheckCircle2 className="w-3 h-3 ml-1" /> نجح البناء
                          </Badge>
                        ) : activeBuild.status === 'failed' ? (
                          <Badge variant="destructive">فشل البناء</Badge>
                        ) : (
                          <Badge variant="outline" className="text-primary border-primary/40">
                            <Loader2 className="w-3 h-3 animate-spin ml-1" /> {activeBuild.status === 'queued' ? 'بالانتظار' : 'يبني…'}
                          </Badge>
                        )}
                        {activeBuild.duration != null && <span className="text-muted-foreground">{activeBuild.duration}s</span>}
                        {activeBuild.apkSize && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Package className="w-3 h-3" /> {activeBuild.apkSize}
                          </span>
                        )}
                      </div>

                      <pre className="build-log rounded-lg bg-black/40 border border-border p-3 h-56 overflow-y-auto text-foreground/85">
                        {activeBuild.logs || '…'}
                      </pre>

                      {activeBuild.status === 'success' && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            className="w-full font-bold"
                            onClick={() => apiDownload(`/api/builds/${activeBuild.id}/download?variant=apk`)}
                          >
                            <Download className="w-4 h-4" /> تحميل APK
                          </Button>
                          <Button
                            variant="secondary"
                            className="w-full"
                            onClick={() => apiDownload(`/api/builds/${activeBuild.id}/download?variant=zip`)}
                          >
                            <Download className="w-4 h-4" /> الكود المصدري ZIP
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {lastBuild && activeBuild?.id !== lastBuild.id && lastBuild.status === 'success' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        variant="outline"
                        className="w-full text-sm"
                        onClick={() => apiDownload(`/api/builds/${lastBuild.id}/download?variant=apk`)}
                      >
                        <Download className="w-4 h-4" /> آخر APK
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-sm"
                        onClick={() => apiDownload(`/api/builds/${lastBuild.id}/download?variant=zip`)}
                      >
                        <Download className="w-4 h-4" /> آخر ZIP
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-auto py-4 text-center text-xs text-muted-foreground">
        BuildAI 🤖 — {files.length} ملف مولّد بالذكاء الاصطناعي
      </footer>
    </div>
  )
}
