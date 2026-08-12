import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Sparkline } from '@/components/Sparkline'
import { useContent } from '@/content/ContentProvider'
import { currentStreak, ensureProgress, getStepHistory, todayKey } from '@/db/queries'
import { db, type Progress as ProgressRow } from '@/db/schema'

type ChapterStat = {
  chapterId: string
  name: string
  currentStep: number
  unlockedStep: number
  stepName: string
  /** 現在のステップのレップス推移（古い順、各セッションの最大レップス） */
  trend: number[]
}

export function Progress() {
  const content = useContent()
  const [stats, setStats] = useState<ChapterStat[]>([])
  const [days, setDays] = useState<Set<string>>(new Set())
  const [streak, setStreak] = useState(0)
  const [totals, setTotals] = useState({ sessions: 0, sets: 0, reps: 0 })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void (async () => {
      const progress: ProgressRow[] = await ensureProgress()

      const rows: ChapterStat[] = []
      for (const p of progress) {
        const chapter = content.chapterById.get(p.chapterId)
        if (!chapter) continue
        const steps = content.stepsByChapter.get(p.chapterId) ?? []
        const step = steps.find((s) => s.stepNo === p.currentStep)
        const history = step ? await getStepHistory(step.id, 10) : []
        rows.push({
          chapterId: p.chapterId,
          name: chapter.name,
          currentStep: p.currentStep,
          unlockedStep: p.unlockedStep,
          stepName: step?.name ?? '未収録',
          // 古い順に並べ替えて、各セッションの最大レップスを取る
          trend: [...history].reverse().map((h) => Math.max(0, ...h.reps)),
        })
      }
      setStats(rows)

      const sessions = await db.sessions.where('status').equals('done').toArray()
      setDays(new Set(sessions.map((s) => s.date)))
      setStreak(await currentStreak())

      const entries = await db.entries.toArray()
      setTotals({
        sessions: sessions.length,
        sets: entries.length,
        reps: entries.reduce((a, e) => a + e.actualReps, 0),
      })
      setReady(true)
    })()
  }, [content])

  if (!ready) return <div className="p-6 text-white/40 text-sm">読み込み中…</div>

  return (
    <div className="pb-24">
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold">進捗</h1>
      </header>

      <section className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="連続日数" value={streak} unit="日" />
          <Stat label="セッション" value={totals.sessions} unit="回" />
          <Stat label="総レップス" value={totals.reps} unit="" />
        </div>
      </section>

      <section className="px-4 mb-7">
        <h2 className="text-xs font-bold tracking-widest text-white/45 mb-2">実施カレンダー</h2>
        <Calendar days={days} />
      </section>

      <section className="px-4">
        <h2 className="text-xs font-bold tracking-widest text-white/45 mb-2">ビッグ6の階段</h2>
        <ul className="space-y-3">
          {stats.map((s) => (
            <li key={s.chapterId} className="rounded-xl border border-white/12 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <Link to={`/library/${s.chapterId}`} className="font-bold">
                  {s.name}
                </Link>
                <span className="text-[11px] text-white/45 shrink-0 tabular-nums">
                  STEP {s.currentStep} / 10
                </span>
              </div>
              <p className="text-[11px] text-white/50 mt-0.5">{s.stepName}</p>

              <Stairs current={s.currentStep} unlocked={s.unlockedStep} />

              <div className="mt-3">
                <Sparkline values={s.trend} label="このステップのレップス推移" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-lg border border-white/12 p-3">
      <p className="text-[11px] text-white/45">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-0.5">
        {value}
        <span className="text-[11px] font-normal text-white/45 ml-0.5">{unit}</span>
      </p>
    </div>
  )
}

/** 10段の階段。いまどこにいるかを一目で分かるようにする */
function Stairs({ current, unlocked }: { current: number; unlocked: number }) {
  return (
    <div className="flex items-end gap-1 mt-3 h-10" aria-label={`ステップ${current} / 10`}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const cleared = n < unlocked
        const here = n === current
        return (
          <div
            key={n}
            className={`flex-1 rounded-sm ${
              here ? 'bg-amber-500' : cleared ? 'bg-white/35' : 'bg-white/10'
            }`}
            style={{ height: `${20 + n * 8}%` }}
          />
        )
      })}
    </div>
  )
}

/** 直近12週間の実施状況 */
function Calendar({ days }: { days: Set<string> }) {
  const weeks = 12
  const today = new Date()
  // 週の始まりを日曜に合わせる
  const start = new Date(today)
  start.setDate(start.getDate() - (weeks * 7 - 1) - today.getDay())

  const cells: { key: string; done: boolean; future: boolean }[] = []
  for (let i = 0; i < weeks * 7 + 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = todayKey(d)
    cells.push({ key, done: days.has(key), future: d > today })
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid grid-flow-col gap-[3px]"
        style={{ gridTemplateRows: 'repeat(7, 1fr)' }}
      >
        {cells.map((c) => (
          <div
            key={c.key}
            title={c.key}
            className={`w-3 h-3 rounded-[2px] ${
              c.future ? 'bg-transparent' : c.done ? 'bg-amber-500' : 'bg-white/8'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
