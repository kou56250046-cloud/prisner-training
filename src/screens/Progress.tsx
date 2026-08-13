import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { scheduledChapters, WEEKDAY_ORDER } from '@/coach/session'
import { chapterColor, chapterTint } from '@/content/chapterColors'
import { DayEditor } from '@/components/DayEditor'
import { Sparkline } from '@/components/Sparkline'
import { Stairs } from '@/components/Stairs'
import { TrainingCalendar } from '@/components/TrainingCalendar'
import { useContent } from '@/content/ContentProvider'
import {
  currentStreak,
  dateFromKey,
  ensureProgress,
  getDailyVolume,
  getSettings,
  getStepHistory,
  getStepTotals,
  type StepTotal,
} from '@/db/queries'
import { db, type Progress as ProgressRow } from '@/db/schema'
import type { Routine } from '@/content/types'

type StepRow = {
  stepNo: number
  name: string
  totals: StepTotal | undefined
  isCurrent: boolean
}

type ChapterStat = {
  chapterId: string
  name: string
  currentStep: number
  unlockedStep: number
  stepName: string
  /** 現在のステップのレップス推移（古い順、各セッションの最大レップス） */
  trend: number[]
  /** 種目全体の累計レップス */
  chapterReps: number
  steps: StepRow[]
}

export function Progress() {
  const content = useContent()
  const [stats, setStats] = useState<ChapterStat[]>([])
  const [volume, setVolume] = useState<Map<string, { sets: number; reps: number }>>(new Map())
  const [streak, setStreak] = useState(0)
  const [totals, setTotals] = useState({ sessions: 0, sets: 0, reps: 0 })
  const [open, setOpen] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  /** カレンダーから開いている修正シートの対象日 */
  const [editingDay, setEditingDay] = useState<string | null>(null)
  const [routine, setRoutine] = useState<Routine | null>(null)

  /** その日にルーチンが指示している種目名。カレンダーに予定を重ねるのに使う */
  const plannedFor = useCallback(
    (date: string): string[] => {
      if (!routine) return []
      const weekday = WEEKDAY_ORDER[dateFromKey(date).getDay()]!
      return scheduledChapters(routine, weekday).flatMap((id) => {
        const c = content.chapterById.get(id)
        return c ? [c.name] : []
      })
    },
    [routine, content],
  )

  // 記録を修正したあとに読み直せるよう、集計をひとまとめにしておく
  const load = useCallback(async () => {
    const progress: ProgressRow[] = await ensureProgress()
    const stepTotals = await getStepTotals()

    const rows: ChapterStat[] = []
    for (const p of progress) {
      const chapter = content.chapterById.get(p.chapterId)
      if (!chapter) continue
      const steps = content.stepsByChapter.get(p.chapterId) ?? []
      const step = steps.find((s) => s.stepNo === p.currentStep)
      const history = step ? await getStepHistory(step.id, 10) : []

      const stepRows: StepRow[] = steps.map((s) => ({
        stepNo: s.stepNo,
        name: s.name,
        totals: stepTotals.get(s.id),
        isCurrent: s.stepNo === p.currentStep,
      }))

      rows.push({
        chapterId: p.chapterId,
        name: chapter.name,
        currentStep: p.currentStep,
        unlockedStep: p.unlockedStep,
        stepName: step?.name ?? '未収録',
        trend: [...history].reverse().map((h) => Math.max(0, ...h.reps)),
        chapterReps: stepRows.reduce((a, r) => a + (r.totals?.totalReps ?? 0), 0),
        steps: stepRows,
      })
    }
    setStats(rows)

    setVolume(await getDailyVolume())
    setStreak(await currentStreak())

    const settings = await getSettings()
    setRoutine(content.routines.find((r) => r.id === settings.routineId) ?? null)

    const sessions = await db.sessions.where('status').equals('done').toArray()
    const entries = await db.entries.toArray()
    setTotals({
      sessions: sessions.length,
      sets: entries.length,
      reps: entries.reduce((a, e) => a + e.actualReps, 0),
    })
    setReady(true)
  }, [content])

  useEffect(() => {
    void load()
  }, [load])

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
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <h2 className="text-xs font-bold tracking-widest text-white/45">実施カレンダー</h2>
          <p className="text-[10px] text-white/30">日付をタップで記録を修正</p>
        </div>
        <TrainingCalendar volume={volume} onSelectDay={setEditingDay} plannedFor={plannedFor} />
      </section>

      <section className="px-4">
        <h2 className="text-xs font-bold tracking-widest text-white/45 mb-2">ビッグ6の階段</h2>
        <ul className="space-y-3">
          {stats.map((s) => {
            const expanded = open === s.chapterId
            return (
              <li
                key={s.chapterId}
                className="rounded-xl border p-4"
                style={{ borderColor: chapterTint(s.chapterId, 0.25) }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <Link to={`/library/${s.chapterId}`} className="font-bold">
                    {s.name}
                  </Link>
                  <span
                    className="text-[11px] shrink-0 tabular-nums font-bold"
                    style={{ color: chapterColor(s.chapterId) }}
                  >
                    STEP {s.currentStep} / 10
                  </span>
                </div>
                <p className="text-[11px] text-white/50 mt-0.5">{s.stepName}</p>

                <div className="mt-3">
                  <Stairs
                    current={s.currentStep}
                    unlocked={s.unlockedStep}
                    color={chapterColor(s.chapterId)}
                  />
                </div>

                <div className="mt-3">
                  <Sparkline values={s.trend} label="このステップのレップス推移" />
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : s.chapterId)}
                  className="w-full mt-3 h-10 rounded-lg border border-white/12 text-[12px] text-white/70 flex items-center justify-center gap-2"
                >
                  <span className="tabular-nums">
                    累計 {s.chapterReps.toLocaleString()} レップス
                  </span>
                  <span className="text-white/35">{expanded ? '閉じる' : 'ステップ別を見る'}</span>
                </button>

                {expanded && <StepTotals steps={s.steps} color={chapterColor(s.chapterId)} />}
              </li>
            )
          })}
        </ul>
      </section>

      {editingDay && (
        <DayEditor
          date={editingDay}
          planned={plannedFor(editingDay)}
          onClose={(changed) => {
            setEditingDay(null)
            if (changed) void load()
          }}
        />
      )}
    </div>
  )
}

/** ステップごとの積み上げ。数字が伸びていくこと自体を見せる */
function StepTotals({ steps, color }: { steps: StepRow[]; color: string }) {
  const max = Math.max(1, ...steps.map((s) => s.totals?.totalReps ?? 0))

  return (
    <ul className="mt-3 space-y-1.5">
      {steps.map((s) => {
        const reps = s.totals?.totalReps ?? 0
        return (
          <li key={s.stepNo}>
            <div className="flex items-baseline gap-2 text-[11px]">
              <span
                className={`w-5 shrink-0 tabular-nums ${s.isCurrent ? 'font-bold' : 'text-white/40'}`}
                style={s.isCurrent ? { color } : undefined}
              >
                {s.stepNo}
              </span>
              <span className={`truncate ${s.isCurrent ? 'text-white' : 'text-white/60'}`}>
                {s.name}
              </span>
              <span className="ml-auto shrink-0 tabular-nums text-white/70">
                {reps.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/8 mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full ${s.isCurrent ? '' : 'bg-white/30'}`}
                style={{
                  width: `${(reps / max) * 100}%`,
                  ...(s.isCurrent ? { backgroundColor: color } : {}),
                }}
              />
            </div>
            {s.totals && (
              <p className="text-[10px] text-white/35 mt-0.5 tabular-nums">
                {s.totals.sets}セット ・ 自己最高 {s.totals.bestSet}レップス
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-lg border border-white/12 p-3">
      <p className="text-[11px] text-white/45">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-0.5">
        {value.toLocaleString()}
        <span className="text-[11px] font-normal text-white/45 ml-0.5">{unit}</span>
      </p>
    </div>
  )
}

