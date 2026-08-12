import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { buildSessionPlan, type SessionPlan } from '@/coach/session'
import { useContent } from '@/content/ContentProvider'
import {
  ackEvent,
  currentStreak,
  ensureProgress,
  getOpenSession,
  getSettings,
  unacknowledgedEvents,
  weekdayKey,
} from '@/db/queries'
import type { CoachEvent, Progress } from '@/db/schema'

export function Home() {
  const content = useContent()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<SessionPlan | null>(null)
  const [progress, setProgress] = useState<Progress[]>([])
  const [streak, setStreak] = useState(0)
  const [events, setEvents] = useState<CoachEvent[]>([])
  const [resuming, setResuming] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void (async () => {
      const [settings, prog, s, evts, open] = await Promise.all([
        getSettings(),
        ensureProgress(),
        currentStreak(),
        unacknowledgedEvents(),
        getOpenSession(),
      ])
      setProgress(prog)
      setStreak(s)
      setEvents(evts)
      setResuming(!!open)

      const routine = content.routines.find((r) => r.id === settings.routineId)
      if (routine) setPlan(await buildSessionPlan(routine, weekdayKey(), prog, content))
      setReady(true)
    })()
  }, [content])

  if (!ready) return <div className="p-6 text-white/40 text-sm">読み込み中…</div>

  const hasMenu = !!plan && !plan.isRestDay && plan.exercises.length > 0

  return (
    <div className="pb-28">
      <header className="px-4 pt-4 pb-3">
        <p className="text-[11px] tracking-[0.2em] text-amber-500/80">
          {plan?.routineName ?? 'ルーチン未設定'}
        </p>
        <h1 className="text-2xl font-bold mt-1">今日のトレーニング</h1>
        {streak > 0 && (
          <p className="text-xs text-white/50 mt-1">連続 {streak} 日</p>
        )}
      </header>

      {events.length > 0 && (
        <section className="px-4 mb-4 space-y-2">
          {events.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                void ackEvent(e.id)
                setEvents((prev) => prev.filter((x) => x.id !== e.id))
              }}
              className="w-full text-left rounded-xl border border-amber-500/40 bg-amber-500/10 p-3"
            >
              <p className="text-[11px] font-bold text-amber-400 tracking-widest">
                {e.type === 'promote' ? '進級' : 'コーチから'}
              </p>
              <p className="text-sm mt-1 leading-relaxed">{e.message}</p>
              <p className="text-[11px] text-white/40 mt-1.5">タップして確認</p>
            </button>
          ))}
        </section>
      )}

      <section className="px-4">
        {hasMenu ? (
          <ul className="space-y-3">
            {plan!.exercises.map((ex) => (
              <li key={ex.chapterId} className="rounded-xl border border-white/12 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-bold">{ex.chapterName}</h2>
                  <span className="text-[11px] text-white/45 shrink-0">STEP {ex.stepNo}</span>
                </div>
                <p className="text-sm text-white/70 mt-0.5">{ex.stepName}</p>

                <div className="mt-3 flex items-center gap-4 text-sm">
                  <div>
                    <p className="text-[11px] text-white/45">今日の目標</p>
                    <p className="font-bold tabular-nums">
                      {ex.target.reps} × {ex.target.sets}セット
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-white/45">ウォームアップ</p>
                    <p className="text-white/75 text-[13px]">
                      {ex.warmup.map((w) => `STEP${w.stepNo} ${w.targetReps}回`).join(' → ')}
                    </p>
                  </div>
                </div>

                {ex.note && <p className="text-[11px] text-white/45 mt-2">＋ {ex.note}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-white/12 p-6 text-center">
            <p className="font-bold mb-1">今日は休息日</p>
            <p className="text-sm text-white/55 leading-relaxed">
              筋肉は休んでいる間に強くなる。書籍のルーチンが定めた休みも、プログラムの一部です。
            </p>
          </div>
        )}
      </section>

      <section className="px-4 mt-6">
        <h3 className="text-xs font-bold tracking-widest text-white/45 mb-2">現在地</h3>
        <ul className="grid grid-cols-2 gap-2">
          {progress.map((p) => {
            const chapter = content.chapterById.get(p.chapterId)
            if (!chapter) return null
            const steps = content.stepsByChapter.get(p.chapterId) ?? []
            const step = steps.find((s) => s.stepNo === p.currentStep)
            return (
              <li key={p.chapterId}>
                <Link
                  to={`/library/${p.chapterId}/${p.currentStep}`}
                  className="block rounded-lg border border-white/12 p-3"
                >
                  <p className="text-[11px] text-white/45">{chapter.name}</p>
                  <p className="font-bold tabular-nums">STEP {p.currentStep}</p>
                  <p className="text-[11px] text-white/40 truncate">{step?.name ?? '未収録'}</p>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      {/* 親指が届く位置に固定 */}
      {hasMenu && (
        <div className="fixed inset-x-0 bottom-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-concrete-950 via-concrete-950 to-transparent">
          <button
            type="button"
            onClick={() => navigate('/workout')}
            className="w-full h-16 rounded-xl bg-amber-500 text-black text-lg font-bold active:bg-amber-400"
          >
            {resuming ? 'トレーニングを再開' : 'トレーニング開始'}
          </button>
        </div>
      )}
    </div>
  )
}
