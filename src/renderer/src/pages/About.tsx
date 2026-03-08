import { ExternalLink, Mail, Globe, Github, GraduationCap, BookOpen, Cpu, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const techStack = [
  { name: 'Electron 34', desc: '跨平台桌面框架' },
  { name: 'React 19 + TypeScript', desc: '前端 UI 框架' },
  { name: 'SQLite (better-sqlite3)', desc: '本地關聯式資料庫' },
  { name: 'Tailwind CSS + shadcn/ui', desc: 'UI 元件與樣式系統' },
  { name: 'TanStack React Query', desc: '非同步資料狀態管理' },
  { name: 'Google Sheets API v4', desc: '雲端資料雙向同步' },
  { name: 'Claude Code Skills', desc: 'AI 驅動的庫存分析與操作指令' },
  { name: 'Recharts', desc: '報表資料視覺化' }
]

export default function About() {
  const openUrl = (url: string) => window.electronAPI.shell.openExternal(url)

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      {/* App Identity */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 text-primary mb-2">
          <Cpu className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">SkillCraft IMS</h1>
        <p className="text-sm text-muted-foreground">Inventory Management System · v0.1.0</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          整合 Electron 桌面應用、SQLite 本地資料庫、Google Sheets 雲端同步與 Claude Code AI Skills 的跨平台進銷存系統。
        </p>
      </div>

      {/* Name Concept */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          命名概念
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-4">
            <span className="font-mono font-bold text-primary w-24 shrink-0">SkillCraft</span>
            <div>
              <span className="text-foreground">SKILL + Craft（手藝）</span>
              <span className="text-muted-foreground ml-2">— 強調「用 AI 技能打造系統」的匠人感</span>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="font-mono font-bold text-primary w-24 shrink-0">IMS</span>
            <div>
              <span className="text-foreground">Inventory Management System</span>
              <span className="text-muted-foreground ml-2">— 業界標準縮寫，專業但不失創意</span>
            </div>
          </div>
        </div>
      </div>

      {/* Author */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">作者資訊</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <GraduationCap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium">潘昱如</div>
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
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">課程資訊</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium">高等程式語言與軟體設計</div>
              <div className="text-xs text-muted-foreground">Advanced Programming Language and Software Design</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm pl-7">
            <span className="text-muted-foreground">指導老師</span>
            <span>陳彥宏 YEN-HUNG CHEN</span>
            <span className="text-muted-foreground">學校</span>
            <span>國立台北護理健康大學</span>
            <span className="text-muted-foreground">系所</span>
            <span>資訊管理系</span>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">技術堆疊</h2>
        <div className="grid grid-cols-1 gap-2">
          {techStack.map((t) => (
            <div key={t.name} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <span className="text-sm font-mono font-medium text-foreground">{t.name}</span>
              <span className="text-xs text-muted-foreground">{t.desc}</span>
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
          個人網站
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        © 2025 潘昱如 · MIT License
      </p>
    </div>
  )
}
