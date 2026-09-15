'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { LoginView } from '@/components/builder/login-view'
import { DashboardView } from '@/components/builder/dashboard-view'
import { WorkspaceView } from '@/components/builder/workspace-view'
import { AppUser, ProjectDto } from '@/components/builder/types'
import { apiFetch, saveSessionToken, clearSessionToken } from '@/lib/client-api'

type View = 'login' | 'dashboard' | 'workspace'

export default function Home() {
  const [view, setView] = useState<View>('login')
  const [booting, setBooting] = useState(true)
  const [user, setUser] = useState<AppUser | null>(null)
  const [projects, setProjects] = useState<ProjectDto[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [activeProject, setActiveProject] = useState<ProjectDto | null>(null)
  const { toast } = useToast()

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true)
    try {
      const res = await apiFetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      }
    } catch {
      /* silent */
    }
    setProjectsLoading(false)
  }, [])

  // boot: check session
  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiFetch('/api/auth/me')
        const data = await res.json()
        if (data.user) {
          setUser(data.user)
          setView('dashboard')
          loadProjects()
        }
      } catch {
        /* silent */
      }
      setBooting(false)
    })()
  }, [loadProjects])

  const handleLogin = async (mode: 'demo' | 'token', token?: string): Promise<string | null> => {
    try {
      const res = await apiFetch(mode === 'demo' ? '/api/auth/demo' : '/api/auth/token', {
        method: 'POST',
        body: mode === 'demo' ? '{}' : JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) return data.error || 'فشل تسجيل الدخول'
      if (data.token) saveSessionToken(data.token)

      const me = await apiFetch('/api/auth/me')
      const meData = await me.json()
      setUser(meData.user)
      setView('dashboard')
      loadProjects()
      toast({
        title: mode === 'demo' ? 'أهلاً بالوضع التجريبي! 🎭' : `أهلاً ${meData.user.name || meData.user.username}! 🎉`,
        description:
          mode === 'demo'
            ? 'كل المميزات تشتغل — الرفع محاكاة لحين تدخل بالتوكن'
            : 'حسابك متصل — المشاريع تُرفع فعلياً ع GitHub',
      })
      return null
    } catch {
      return 'خطأ بالاتصال، جرب مرة ثانية'
    }
  }

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    clearSessionToken()
    setUser(null)
    setProjects([])
    setActiveProject(null)
    setView('login')
  }

  const handleCreate = async (data: { name: string; description: string; appType: string }): Promise<string | null> => {
    try {
      const res = await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      const body = await res.json()
      if (!res.ok) return body.error || 'فشل إنشاء المشروع'

      // open the new project directly
      const detail = await apiFetch(`/api/projects/${body.projectId}`)
      if (detail.ok) {
        const detailData = await detail.json()
        setActiveProject(detailData.project)
        setView('workspace')
      }
      loadProjects()
      toast({ title: 'ولّد المشروع 🎉', description: 'الكود جاهز — تقدر تحچي مع الـ AI وتعدله' })
      return null
    } catch {
      return 'خطأ بالاتصال'
    }
  }

  const handleDelete = async (p: ProjectDto) => {
    if (!confirm(`تمسح مشروع "${p.appName}"؟ ما يرتد`)) return
    await apiFetch(`/api/projects/${p.id}`, { method: 'DELETE' }).catch(() => {})
    setProjects((list) => list.filter((x) => x.id !== p.id))
    toast({ title: 'انمسح المشروع 🗑️' })
  }

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-extrabold text-xl">BuildAI 🤖</div>
      </div>
    )
  }

  if (view === 'login' || !user) {
    return <LoginView onLogin={handleLogin} />
  }

  if (view === 'workspace' && activeProject) {
    return (
      <WorkspaceView
        project={activeProject}
        onBack={() => {
          setView('dashboard')
          loadProjects()
        }}
        onChanged={loadProjects}
      />
    )
  }

  return (
    <DashboardView
      user={user}
      projects={projects}
      loading={projectsLoading}
      onCreate={handleCreate}
      onOpen={(p) => {
        setActiveProject(p)
        setView('workspace')
      }}
      onDelete={handleDelete}
      onLogout={handleLogout}
    />
  )
}
