import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  buildSessionPlan,
  nextTrainingDay,
  WEEKDAY_LABEL,
  type SessionPlan,
} from '@/coach/session'
import type { ChapterId } from '@/content/types'
import { useContent } from '@/content/ContentProvider'
import {
  ackEvent,
  countSessionsInRange,
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
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<ChapterId[]>([])
  const [nextDay, setNextDay] = useState<{ weekday: string; inDays: number } | null>(null)
  const [totalSessions, setTotalSessions] = useState(0)

  useEffect(() => {
    void (async () => {
      const [settings, prog, s, evts, open, done] = await Promise.all([
        getSettings(),
        ensureProgress(),
        currentStreak(),
        unacknowledgedEvents(),
        getOpenSession(),
        countSessionsInRange(0),
      ])
      setProgress(prog)
      setTotalSessions(done)
      setStreak(s)
      setEvents(evts)
      setResuming(!!open)

      const routine = content.routines.find((r) => r.id === settings.routineId)
      if (routine) {
        setPlan(await buildSessionPlan(routine, weekdayKey(), prog, content))
        const nd = nextTrainingDay(routine, weekdayKey())
        if (nd) setNextDay({ weekday: WEEKDAY_LABEL[nd.weekday], inDays: nd.inDays })
      }
      setReady(true)
    })()
  }, [content])

  if (!ready) return <div className="p-6 text-white/40 text-sm">読み込み中…</div>

  const hasMenu = !!plan && !plan.isRestDay && plan.exercises.length > 0

  return (
    // 固定表示の「トレーニング開始」(約96px) とタブバー(56px) の両方を避ける高さ
    <div className="pb-[calc(10rem+env(safe-area-inset-bottom))]">
      <header className="px-4 pt-4 pb-3">
        <p className="text-[11px] tracking-[0.2em] text-amber-500/80">
          {plan?.routineName ?? 'ルーチン未設定'}
        </p>
        <h1 className="text-2xl font-bold mt-1">今日のトレーニング</h1>
        {streak > 0 && (
          <p className="text-xs text-white/50 mt-1">連続 {streak} 日</p>
        )}
      </header>

      {/* まだ1回も記録していない人向け。記録が始まったら自動的に消える */}
      {totalSessions === 0 && (
        <section className="px-4 mb-4">
          <div className="rounded-xl border border-white/15 p-4">
            <p className="text-sm font-bold mb-2">使い方</p>
            <ol className="space-y-1.5 text-[12px] text-white/70 leading-relaxed">
              <li>
                <strong className="text-white/85">1.</strong>{' '}
                下の「トレーニング開始」を押す。休息日なら「種目を自分で選んでやる」から始められます。
              </li>
              <li>
                <strong className="text-white/85">2.</strong>{' '}
                ウォームアップ2本 → ワークセットの順に進みます。内容は自動で決まるので考える必要はありません。
              </li>
              <li>
                <strong className="text-white/85">3.</strong>{' '}
                各セットで大きな ＋ − ボタンで回数を入れ、「このセットを記録」を押す。
              </li>
              <li>
                <strong className="text-white/85">4.</strong>{' '}
                最後に「今日のきつさ」を選んで終了。上級者の標準を2回続けて達成すると自動で進級します。
              </li>
            </ol>
            <p className="text-[11px] text-white/40 mt-3 leading-relaxed">
              書籍は「どれだけ筋力があってもビッグ6すべてステップ1から始めろ」と明言しています。
              簡単すぎると感じても、まずはステップ1から。
            </p>
          </div>
        </section>
      )}

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
          <div className="rounded-xl border border-white/12 p-5">
            <p className="font-bold mb-1">今日は休息日</p>
            <p className="text-sm text-white/55 leading-relaxed">
              筋肉は休んでいる間に強くなる。書籍のルーチンが定めた休みも、プログラムの一部です。
              {nextDay && (
                <>
                  <br />
                  次の実施日は <strong className="text-white/80">{nextDay.weekday}曜日</strong>
                  （{nextDay.inDays}日後）。
                </>
              )}
            </p>
          </div>
        )}
      </section>

      {/* ルーチンの予定に関係なく、自分で種目を選んで記録できる逃げ道。
          休息日にアプリを開いても何もできない、という状態をつくらない */}
      <section className="px-4 mt-4">
        {picking ? (
          <div className="rounded-xl border border-white/15 p-4">
            <p className="text-sm font-bold mb-1">やる種目を選ぶ</p>
            <p className="text-[11px] text-white/45 mb-3 leading-relaxed">
              ウォームアップと目標レップスは、選んだ種目の現在ステップから自動で決まります。
            </p>
            <ul className="space-y-2 mb-4">
              {content.chapters.map((c) => {
                const on = picked.includes(c.id)
                const p = progress.find((x) => x.chapterId === c.id)
                const has = (content.stepsByChapter.get(c.id) ?? []).some(
                  (s) => s.stepNo === (p?.currentStep ?? 1),
                )
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={!has}
                      onClick={() =>
                        setPicked((prev) =>
                          prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                        )
                      }
                      className={`w-full flex items-center justify-between gap-2 h-12 px-3 rounded-lg border text-sm ${
                        on
                          ? 'border-amber-500/60 bg-amber-500/10 text-amber-400'
                          : 'border-white/12 text-white/70'
                      } disabled:opacity-30`}
                    >
                      <span>{c.name}</span>
                      <span className="text-[11px] tabular-nums">
                        {has ? `STEP ${p?.currentStep ?? 1}` : '未収録'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPicking(false)
                  setPicked([])
                }}
                className="h-12 px-4 rounded-lg border border-white/15 text-sm"
              >
                やめる
              </button>
              <button
                type="button"
                disabled={picked.length === 0}
                onClick={() => navigate(`/workout?chapters=${picked.join(',')}`)}
                className="flex-1 h-12 rounded-lg bg-amber-500 text-black font-bold disabled:opacity-30"
              >
                このメニューで開始
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPicking(true)}
            className={
              hasMenu
                ? 'w-full h-12 rounded-lg border border-white/15 text-sm text-white/70'
                : // 休息日はこれが唯一の導線になるので、主ボタンとして目立たせる
                  'w-full h-16 rounded-xl bg-amber-500 text-black text-lg font-bold active:bg-amber-400'
            }
          >
            {hasMenu ? '別の種目も追加してやる' : '種目を選んでトレーニングする'}
          </button>
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

      {/* 親指が届く位置に固定。タブバー(h-14)の真上に置く。
          bottom-0 にするとタブバーと重なって隠れてしまう */}
      {hasMenu && (
        <div className="fixed inset-x-0 z-20 px-4 pt-6 pb-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-concrete-950 via-concrete-950 to-transparent">
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
