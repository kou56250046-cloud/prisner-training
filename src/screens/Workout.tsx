import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { AnimPlayer } from '@/anim/AnimPlayer'
import { canPromote } from '@/coach/rules'
import { buildSessionPlan, flattenPlan, type PlannedSet, type SessionPlan } from '@/coach/session'
import { animations } from '@/content/animations'
import { useContent } from '@/content/ContentProvider'
import type { ChapterId } from '@/content/types'
import {
  abandonSession,
  addCoachEvent,
  ensureProgress,
  finishSession,
  getSessionEntries,
  getSettings,
  getStepHistory,
  promote,
  recordSet,
  startSession,
  weekdayKey,
} from '@/db/queries'
import type { Session } from '@/db/schema'
import { buzz, useWakeLock } from '@/hooks/useWakeLock'

type Phase = 'loading' | 'running' | 'resting' | 'rpe' | 'done' | 'rest-day'

export function Workout() {
  const content = useContent()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // 「種目を自分で選んでやる」から来た場合は、ルーチンの予定より優先する
  const picked = params.get('chapters')

  const [plan, setPlan] = useState<SessionPlan | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [queue, setQueue] = useState<PlannedSet[]>([])
  const [index, setIndex] = useState(0)
  const [reps, setReps] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [restSeconds, setRestSeconds] = useState(90)
  const [remaining, setRemaining] = useState(0)
  const [wakeLockOn, setWakeLockOn] = useState(true)

  useWakeLock(wakeLockOn && (phase === 'running' || phase === 'resting'))

  useEffect(() => {
    void (async () => {
      const [settings, progress] = await Promise.all([getSettings(), ensureProgress()])
      const routine = content.routines.find((r) => r.id === settings.routineId)
      if (!routine) {
        setPhase('rest-day')
        return
      }
      setRestSeconds(settings.restSeconds)
      setWakeLockOn(settings.wakeLock)

      const chapters = picked
        ? (picked.split(',').filter(Boolean) as ChapterId[])
        : undefined
      const p = await buildSessionPlan(routine, weekdayKey(), progress, content, {
        ...(chapters ? { chapters } : {}),
      })
      setPlan(p)
      if (p.isRestDay || p.exercises.length === 0) {
        setPhase('rest-day')
        return
      }

      const s = await startSession(routine.id)
      setSession(s)
      const all = flattenPlan(p)

      // 中断していたセッションを再開する。記録済みのぶんは飛ばす
      const already = await getSessionEntries(s.id)
      const resumeAt = Math.min(already.length, all.length - 1)

      setQueue(all)
      setIndex(resumeAt)
      setReps(all[resumeAt]?.targetReps ?? 0)
      setPhase('running')
    })()
  }, [content, picked])

  const current = queue[index]
  const anim = current ? animations[current.stepId] : undefined

  // 休憩タイマー
  const tick = useRef(0)
  useEffect(() => {
    if (phase !== 'resting') return
    tick.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(tick.current)
          buzz([120, 80, 120])
          setPhase('running')
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => window.clearInterval(tick.current)
  }, [phase])

  const advance = useCallback(
    async (actualReps: number) => {
      if (!current || !session) return

      await recordSet({
        sessionId: session.id,
        stepId: current.stepId,
        chapterId: current.chapterId,
        setNo: current.setNo,
        kind: current.kind,
        targetReps: current.targetReps,
        actualReps,
      })

      const next = index + 1
      if (next >= queue.length) {
        setPhase('rpe')
        return
      }

      setIndex(next)
      setReps(queue[next]!.targetReps)

      // ワークセットの後だけ休憩を挟む。ウォームアップの後は続けて進む
      if (current.kind === 'work' && queue[next]!.kind === 'work') {
        setRemaining(restSeconds)
        setPhase('resting')
      }
    },
    [current, session, index, queue, restSeconds],
  )

  /** セッション終了時に、進級できる種目がないか確かめる */
  const finish = useCallback(
    async (rpe: NonNullable<Session['rpe']>) => {
      if (!session || !plan) return
      await finishSession(session.id, rpe)

      for (const ex of plan.exercises) {
        const step = content.stepById.get(ex.stepId)
        if (!step) continue
        const history = await getStepHistory(ex.stepId, 3)
        if (canPromote(history.map((h) => h.reps), step.standards)) {
          const to = await promote(ex.chapterId)
          await addCoachEvent({
            type: 'promote',
            chapterId: ex.chapterId,
            message: `${ex.chapterName}が上級者の標準を2回連続で達成。ステップ${to}に進みます。`,
          })
        }
      }
      setPhase('done')
    },
    [session, plan, content],
  )

  if (phase === 'loading') {
    return <Centered>読み込み中…</Centered>
  }

  if (phase === 'rest-day') {
    return (
      <Centered>
        <p className="text-lg font-bold mb-2">今日は休息日</p>
        <p className="text-sm text-white/55 leading-relaxed max-w-xs text-center">
          筋肉は休んでいる間に強くなる。書籍のルーチンが定めた休みは、
          手を抜いているのではなく、プログラムの一部です。
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-6 px-5 h-12 rounded-lg border border-white/20 text-sm"
        >
          ホームに戻る
        </button>
      </Centered>
    )
  }

  if (phase === 'rpe') {
    return (
      <Centered>
        <p className="text-lg font-bold mb-1">お疲れさま</p>
        <p className="text-sm text-white/55 mb-6">今日のきつさは？</p>
        <div className="w-full max-w-xs space-y-3">
          {(
            [
              ['easy', '楽だった', '余力がかなり残っている'],
              ['ok', 'ちょうどよかった', '出し切ったが動ける'],
              ['hard', 'きつかった', '最後のレップスが精一杯'],
            ] as const
          ).map(([v, label, hint]) => (
            <button
              key={v}
              type="button"
              onClick={() => void finish(v)}
              className="w-full h-16 rounded-xl border border-white/15 text-left px-4 active:bg-white/10"
            >
              <span className="font-bold">{label}</span>
              <span className="block text-[11px] text-white/45 mt-0.5">{hint}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-white/35 mt-4 max-w-xs text-center leading-relaxed">
          この記録はオーバーワークの検知に使います
        </p>
      </Centered>
    )
  }

  if (phase === 'done') {
    return (
      <Centered>
        <p className="text-2xl font-bold mb-2">消灯</p>
        <p className="text-sm text-white/55 mb-6">今日のセッションを記録しました。</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-6 h-12 rounded-lg bg-amber-500 text-black font-bold"
        >
          ホームへ
        </button>
      </Centered>
    )
  }

  if (!current) return <Centered>メニューが空です</Centered>

  const isWarmup = current.kind === 'warmup'
  const total = queue.length
  const sameKind = queue.filter((q) => q.kind === current.kind && q.stepId === current.stepId)
  const posInGroup = sameKind.findIndex((q) => q === current) + 1

  return (
    <div className="min-h-full flex flex-col">
      {/* 進捗バー */}
      <div className="h-1 bg-white/10">
        <div
          className="h-full bg-amber-500 transition-all"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>

      <header className="px-4 pt-3 pb-2 flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-[11px] tracking-widest font-bold ${
              isWarmup ? 'text-sky-400' : 'text-amber-500'
            }`}
          >
            {isWarmup ? 'ウォームアップ' : 'ワークセット'} {posInGroup} / {sameKind.length}
          </p>
          <h1 className="text-lg font-bold mt-0.5">{current.stepName}</h1>
          <p className="text-[11px] text-white/40">STEP {current.stepNo}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (session) void abandonSession(session.id)
            navigate('/')
          }}
          className="text-[11px] text-white/40 h-9 px-2 shrink-0"
        >
          中断
        </button>
      </header>

      {phase === 'resting' ? (
        <div className="flex-1 grid place-items-center px-6">
          <div className="text-center">
            <p className="text-sm text-white/50 mb-2">休憩</p>
            <p className="text-6xl font-bold tabular-nums">{remaining}</p>
            <p className="text-xs text-white/40 mt-1">秒</p>
            <button
              type="button"
              onClick={() => {
                setRemaining(0)
                setPhase('running')
              }}
              className="mt-8 px-5 h-12 rounded-lg border border-white/20 text-sm"
            >
              スキップして次へ
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="px-4">
            {anim ? (
              <AnimPlayer anim={anim} compact />
            ) : (
              <div className="rounded-xl border border-dashed border-white/15 py-8 text-center text-xs text-white/35">
                このステップのアニメーションは未作成
              </div>
            )}
          </div>

          {/* カウンター。親指が届く下側に大きく置く */}
          <div className="flex-1 flex flex-col justify-end px-4 pb-6">
            <p className="text-center text-xs text-white/45 mb-1">
              目標 {current.targetReps} レップス
            </p>

            <div className="flex items-center justify-center gap-4 mb-5">
              <CounterButton label="−" onClick={() => setReps((r) => Math.max(0, r - 1))} />
              <div className="w-28 text-center">
                <span className="text-6xl font-bold tabular-nums">{reps}</span>
              </div>
              <CounterButton label="＋" onClick={() => setReps((r) => r + 1)} />
            </div>

            <button
              type="button"
              onClick={() => void advance(reps)}
              className="w-full h-16 rounded-xl bg-amber-500 text-black text-lg font-bold active:bg-amber-400"
            >
              {index + 1 >= total ? '記録して終了' : 'このセットを記録'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function CounterButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        buzz(15)
        onClick()
      }}
      className="w-20 h-20 rounded-full border-2 border-white/20 text-3xl font-bold active:bg-white/10 grid place-items-center"
      aria-label={label === '−' ? '1減らす' : '1増やす'}
    >
      {label}
    </button>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full grid place-items-center px-6 py-10">{children}</div>
}
