export interface AppUser {
  id: string
  username: string
  name: string | null
  avatarUrl: string | null
  isDemo: boolean
  hasToken: boolean
}

export interface ProjectFileDto {
  id: string
  path: string
  content: string
  language: string
}

export interface MessageDto {
  id: string
  role: string
  content: string
  createdAt: string
}

export interface BuildDto {
  id: string
  status: string
  logs: string
  apkName: string | null
  apkSize: string | null
  duration: number | null
  createdAt: string
  completedAt: string | null
}

export interface ProjectDto {
  id: string
  name: string
  appName: string
  description: string
  appType: string
  primaryColor: string
  status: string
  githubUrl: string | null
  repoName: string | null
  packageName: string | null
  createdAt: string
  files?: ProjectFileDto[]
  messages?: MessageDto[]
  builds?: BuildDto[]
  _count?: { files: number; messages: number; builds: number }
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  generating: 'جاري التوليد…',
  ready: 'جاهز',
  pushed: 'مرفوع ع GitHub',
  building: 'جاري البناء…',
  built: 'APK جاهز ✅',
  failed: 'فشل',
}
