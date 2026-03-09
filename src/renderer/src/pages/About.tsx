import { ExternalLink, Mail, Globe, Github, GraduationCap, BookOpen, Cpu, Sparkles } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useLang } from '@/lib/useLang'
import { useLangStore } from '@/stores/lang.store'
import type { AppSettings } from '@/types/schema'

export default function About() {
  const t = useLang()
  const a = t.about
  const { lang } = useLangStore()
  const isEn = lang === 'en'
  const openUrl = (url: string) => window.electronAPI.shell.openExternal(url)

  const { data: settings } = useQuery<AppSettings>({
    queryKey: ['settings'],
    queryFn: () => window.electronAPI.settings.get()
  })
  const appVersion = settings?.appVersion ?? '0.2.0'

  const techStack = [
    { name: 'Electron 34', desc: isEn ? 'Cross-platform desktop framework' : '跨平台桌面框架' },
    { name: 'React 19 + TypeScript', desc: isEn ? 'Frontend UI framework' : '前端 UI 框架' },
    { name: 'SQLite (better-sqlite3)', desc: isEn ? 'Local relational database' : '本地關聯式資料庫' },
    { name: 'Tailwind CSS + shadcn/ui', desc: isEn ? 'UI components & styling' : 'UI 元件與樣式系統' },
    { name: 'TanStack React Query', desc: isEn ? 'Async data state management' : '非同步資料狀態管理' },
    { name: 'Google Sheets API v4', desc: isEn ? 'Cloud two-way data sync' : '雲端資料雙向同步' },
    { name: 'Claude Code Skills', desc: isEn ? 'AI-driven inventory analysis & commands' : 'AI 驅動的庫存分析與操作指令' },
    { name: 'Recharts', desc: isEn ? 'Report data visualization' : '報表資料視覺化' }
  ]

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      {/* App Identity */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 text-primary mb-2">
          <Cpu className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">SkillCraft IMS</h1>
        <p className="text-sm text-muted-foreground">Inventory Management System · v{appVersion}</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {isEn
            ? 'A cross-platform inventory system integrating Electron desktop, SQLite local database, Google Sheets cloud sync, and Claude Code AI Skills.'
            : '整合 Electron 桌面應用、SQLite 本地資料庫、Google Sheets 雲端同步與 Claude Code AI Skills 的跨平台進銷存系統。'}
        </p>
      </div>

      {/* Name Concept */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          {a.nameConcept}
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-4">
            <span className="font-mono font-bold text-primary w-24 shrink-0">SkillCraft</span>
            <div>
              <span className="text-foreground">SKILL + Craft</span>
              <span className="text-muted-foreground ml-2">
                {isEn ? '— Named after the course\'s core concept "AI Skill"' : '— 以課程核心「AI Skill」為靈感的命名'}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="font-mono font-bold text-primary w-24 shrink-0">IMS</span>
            <div>
              <span className="text-foreground">Inventory Management System</span>
              <span className="text-muted-foreground ml-2">
                {isEn ? '— Standard abbreviation for inventory management' : '— 進銷存管理系統的通用縮寫'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Author */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{a.authorInfo}</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <GraduationCap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium">潘昱如　PAN, YU-RU</div>
              <div className="text-xs text-muted-foreground">國立台北護理健康大學 · 資訊管理系</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-primary shrink-0" />
            <button
              className="text-sm text-primary hover:underline"
              onClick={() => openUrl('mailto:ruru@swift.moe')}
            >
              ruru@swift.moe
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-primary shrink-0" />
            <button
              className="text-sm text-primary hover:underline"
              onClick={() => openUrl('https://swift.moe')}
            >
              https://swift.moe
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Github className="w-4 h-4 text-primary shrink-0" />
            <button
              className="text-sm text-primary hover:underline"
              onClick={() => openUrl('https://github.com/swiftruru/')}
            >
              github.com/swiftruru
            </button>
          </div>
        </div>
      </div>

      {/* Course Info */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{a.courseInfo}</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium">高等程式語言與軟體設計</div>
              <div className="text-xs text-muted-foreground">Advanced Programming Language and Software Design</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm pl-7">
            <span className="text-muted-foreground">{a.advisor}</span>
            <span>陳彥宏博士　Dr. CHEN, YEN-HUNG</span>
            <span className="text-muted-foreground">{a.school}</span>
            <span>國立台北護理健康大學</span>
            <span className="text-muted-foreground">{a.dept}</span>
            <span>資訊管理系</span>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{a.techStack}</h2>
        <div className="grid grid-cols-1 gap-2">
          {techStack.map((item) => (
            <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <span className="text-sm font-mono font-medium text-foreground">{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="flex gap-3 justify-center">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => openUrl('https://github.com/swiftruru/')}
        >
          <Github className="w-4 h-4" />
          GitHub
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => openUrl('https://swift.moe')}
        >
          <ExternalLink className="w-4 h-4" />
          {a.website}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        © 2025 潘昱如 · MIT License
      </p>
    </div>
  )
}
