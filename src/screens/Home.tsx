import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  nextTrainingDay,
  planForDay,
  scheduledChapters,
  trainingDaysPerWeek,
  WEEKDAY_LABEL,
  WEEKDAY_ORDER,
  type PlannedChapter,
} from '@/coach/session'
import { RepsBars, type ChapterBar } from '@/components/RepsBars'
import { Stairs } from '@/components/Stairs'
import { chapterColor, chapterTint } from '@/content/chapterColors'
import { useContent } from '@/content/ContentProvider'
import { metricLabel, type Episode, type Routine } from '@/content/types'
import {
  ackEvent,
  currentStreak,
  ensureProgress,
  getDailyVolume,
  getDayRecords,
  getSettings,
  getStepTotals,
  sessionDaysInRange,
  todayKey,
  unacknowledgedEvents,
  updateSessionRpe,
  weekdayKey,
} from '@/db/queries'
import { db, type CoachEvent, type Progress, type Session } from '@/db/schema'
import { queueSheetSync } from '@/db/sheetSync'

type WeekCell = {
  date: string
  label: string
  done: boolean
  planned: boolean
  isToday: boolean
}

type Today = {
  sessionId: string | null
  sets: number
  reps: number
  rpe: Session['rpe']
  /** 今日すでに記録した種目 */
  chapters: Set<string>
}

export function Home() {
  const content = useContent()
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [plan, setPlan] = useState<PlannedChapter[]>([])
  const [progress, setProgress] = useState<Progress[]>([])
  const [events, setEvents] = useState<CoachEvent[]>([])
  const [streak, setStreak] = useState(0)
  const [week, setWeek] = useState<WeekCell[]>([])
  const [weekDone, setWeekDone] = useState(0)
  const [today, setToday] = useState<Today | null>(null)
  const [totals, setTotals] = useState({ days: 0, sets: 0, reps: 0 })
  const [bars, setBars] = useState<ChapterBar[]>([])
  const [nextDay, setNextDay] = useState<{ weekday: string; inDays: number } | null>(null)
  const [ready, setReady] = useState(false)

  // 記録を修正したあとにも読み直せるよう、集計をひとまとめにしておく
  const load = useCallback(async () => {
    const [settings, prog, evts, s, volume, stepTotals] = await Promise.all([
      getSettings(),
      ensureProgress(),
      unacknowledgedEvents(),
      currentStreak(),
      getDailyVolume(),
      getStepTotals(),
    ])
    setProgress(prog)
    setEvents(evts)
    setStreak(s)

    const r = content.routines.find((x) => x.id === settings.routineId) ?? null
    setRoutine(r)
    setPlan(r ? await planForDay(r, weekdayKey(), prog, content) : [])
    if (r) {
      const nd = nextTrainingDay(r, weekdayKey())
      setNextDay(nd ? { weekday: WEEKDAY_LABEL[nd.weekday], inDays: nd.inDays } : null)
    }

    setWeek(buildWeek(volume, r))
    setWeekDone(await sessionDaysInRange(startOfWeek().getTime()))

    // 種目・ステップごとの積み上げ。多い順に並べて、伸びている種目を上に出す
    setBars(
      content.chapters
        .map<ChapterBar>((c) => {
          const current = prog.find((p) => p.chapterId === c.id)?.currentStep ?? 1
          const steps = (content.stepsByChapter.get(c.id) ?? []).map((st) => ({
            stepNo: st.stepNo,
            name: st.name,
            reps: stepTotals.get(st.id)?.totalReps ?? 0,
            isCurrent: st.stepNo === current,
          }))
          return {
            chapterId: c.id,
            name: c.name,
            reps: steps.reduce((a, b) => a + b.reps, 0),
            steps,
          }
        })
        .sort((a, b) => b.reps - a.reps),
    )

    // 今日の記録
    const records = await getDayRecords(todayKey())
    const entries = records.flatMap((x) => x.entries)
    setToday({
      sessionId: records[0]?.session.id ?? null,
      sets: entries.length,
      reps: entries.reduce((a, e) => a + e.actualReps, 0),
      rpe: records[0]?.session.rpe,
      chapters: new Set(entries.map((e) => e.chapterId)),
    })

    const all = await db.entries.toArray()
    setTotals({
      days: volume.size,
      sets: all.length,
      reps: all.reduce((a, e) => a + e.actualReps, 0),
    })
    setReady(true)
  }, [content])

  useEffect(() => {
    void load()
  }, [load])

  // 前回オフラインで送れなかったぶんを、開いたときにまとめて送り直す
  useEffect(() => {
    void getSettings().then((s) => {
      if (s.sheetSyncError) queueSheetSync(3000)
    })
  }, [])

  if (!ready) return <div className="p-6 text-white/40 text-sm">読み込み中…</div>

  const plannedPerWeek = routine ? trainingDaysPerWeek(routine) : 0
  const episode = episodeOfTheDay(content.episodes)

  return (
    <div className="pb-24">
      <header className="relative overflow-hidden px-4 pt-5 pb-5">
        {/* オレンジから紫へゆっくり流れる下地。黒の上でだけ成立する彩度にしてある */}
        <div
          aria-hidden
          className="absolute inset-0 drift opacity-45 pointer-events-none"
          style={{
            background:
              'radial-gradient(120% 90% at 0% 0%, rgba(245,158,11,0.30), transparent 60%),' +
              'radial-gradient(120% 90% at 100% 20%, rgba(168,85,247,0.28), transparent 62%),' +
              'radial-gradient(100% 80% at 50% 120%, rgba(236,72,153,0.22), transparent 60%)',
          }}
        />

        <div className="relative">
          <p className="text-[11px] tracking-[0.2em] text-amber-400/90 rise-in">
            {routine?.name ?? 'ルーチン未設定'}
          </p>

          <div className="flex items-end justify-between gap-3 mt-2 rise-in" style={delay(1)}>
            <div>
              <p className="text-[11px] text-white/50">連続</p>
              <p className="text-6xl font-bold tabular-nums leading-none">
                <span className={streak > 0 ? 'text-amber-400 glow-pulse' : 'text-white/30'}>
                  {streak}
                </span>
                <span className="text-base font-normal text-white/45 ml-1">日</span>
              </p>
            </div>
            <p className="text-[11px] text-white/50 tabular-nums pb-1">
              今週 <span className="text-pink-400 font-bold">{weekDone}</span> / {plannedPerWeek} 日
            </p>
          </div>

          <div className="rise-in" style={delay(2)}>
            <WeekStrip cells={week} />
          </div>
        </div>
      </header>

      {events.length > 0 && (
        <section className="px-4 mb-5 space-y-2">
          {events.map((e, i) => (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                void ackEvent(e.id)
                setEvents((prev) => prev.filter((x) => x.id !== e.id))
              }}
              className={`w-full text-left rounded-xl border p-3 rise-in ${EVENT_STYLE[e.type]}`}
              style={delay(i)}
            >
              <p className="text-[11px] font-bold tracking-widest">{EVENT_LABEL[e.type]}</p>
              <p className="text-sm mt-1 leading-relaxed text-bone">{e.message}</p>
              <p className="text-[11px] text-white/35 mt-1.5">タップして確認</p>
            </button>
          ))}
        </section>
      )}

      <section className="px-4 mb-6 rise-in" style={delay(3)}>
        <h2 className="text-xs font-bold tracking-widest text-white/45 mb-2">今日やること</h2>
        {plan.length > 0 ? (
          <ul className="space-y-2">
            {plan.map((ex) => {
              const done = today?.chapters.has(ex.chapterId) ?? false
              const color = chapterColor(ex.chapterId)
              return (
                <li key={ex.chapterId}>
                  <Link
                    to={`/library/${ex.chapterId}/${ex.stepNo}`}
                    className="block rounded-xl border p-4 transition-colors"
                    style={{
                      borderColor: done ? 'rgba(255,255,255,0.10)' : chapterTint(ex.chapterId, 0.45),
                      backgroundColor: done ? 'rgba(255,255,255,0.03)' : chapterTint(ex.chapterId, 0.07),
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className={`font-bold ${done ? 'text-white/45' : ''}`}>
                        {done && <span style={{ color }} className="mr-1.5">✓</span>}
                        {ex.chapterName}
                      </h3>
                      <span
                        className="text-[11px] shrink-0 tabular-nums font-bold"
                        style={{ color }}
                      >
                        STEP {ex.stepNo}
                      </span>
                    </div>
                    <p className="text-[12px] text-white/60 mt-0.5 truncate">{ex.stepName}</p>
                    <p className="text-[12px] text-white/75 mt-2 tabular-nums">
                      目標 {ex.target.reps}
                      {metricLabel(ex.metric)} × {ex.target.sets}セット
                    </p>
                    {ex.note && <p className="text-[11px] text-white/40 mt-1">＋ {ex.note}</p>}
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-5">
            <p className="font-bold mb-1">今日は休息日</p>
            <p className="text-sm text-white/55 leading-relaxed">
              筋肉は休んでいる間に強くなる。ルーチンが定めた休みも、プログラムの一部です。
              {nextDay && (
                <>
                  <br />
                  次の実施日は <strong className="text-purple-300">{nextDay.weekday}曜日</strong>
                  （{nextDay.inDays}日後）。
                </>
              )}
            </p>
            <Link
              to="/library"
              className="mt-4 h-12 rounded-lg border border-white/20 text-sm grid place-items-center"
            >
              それでも体を動かす（図鑑から記録）
            </Link>
          </div>
        )}

        <p className="text-[11px] text-white/30 mt-2 leading-relaxed">
          記録は図鑑のステップ詳細から。やり方を見ながらレップス数とセット数を書けます。
        </p>
      </section>

      {today && today.sets > 0 && (
        <section className="px-4 mb-6 rise-in" style={delay(4)}>
          <h2 className="text-xs font-bold tracking-widest text-white/45 mb-2">今日の記録</h2>
          <div className="rounded-xl border border-pink-500/30 bg-pink-500/5 p-4">
            <p className="tabular-nums">
              <span className="text-3xl font-bold text-pink-300">
                {today.reps.toLocaleString()}
              </span>
              <span className="text-[12px] text-white/45 ml-1">レップス</span>
              <span className="text-[12px] text-white/45 ml-3">{today.sets}セット</span>
            </p>

            <p className="text-[10px] text-white/40 mt-4 mb-1.5">今日のきつさ</p>
            <div className="flex gap-1.5">
              {RPE.map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    if (!today.sessionId) return
                    void updateSessionRpe(today.sessionId, today.rpe === v ? undefined : v).then(
                      load,
                    )
                  }}
                  className={`flex-1 h-11 rounded-lg text-[12px] border transition-colors ${
                    today.rpe === v
                      ? 'border-pink-400 bg-pink-500/20 text-pink-200'
                      : 'border-white/12 text-white/55'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/30 mt-2">オーバーワークの検知に使います</p>
          </div>
        </section>
      )}

      <section className="px-4 mb-6 rise-in" style={delay(5)}>
        <h2 className="text-xs font-bold tracking-widest text-white/45 mb-2">ビッグ6の現在地</h2>
        <ul className="grid grid-cols-2 gap-2">
          {progress.map((p) => {
            const chapter = content.chapterById.get(p.chapterId)
            if (!chapter) return null
            const color = chapterColor(p.chapterId)
            return (
              <li key={p.chapterId}>
                <Link
                  to={`/library/${p.chapterId}/${p.currentStep}`}
                  className="block rounded-lg border p-3"
                  style={{ borderColor: chapterTint(p.chapterId, 0.22) }}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="text-[11px] text-white/60 truncate">{chapter.name}</p>
                    <p className="text-[11px] font-bold tabular-nums shrink-0" style={{ color }}>
                      {p.currentStep}
                      <span className="text-white/30">/10</span>
                    </p>
                  </div>
                  <Stairs
                    current={p.currentStep}
                    unlocked={p.unlockedStep}
                    className="h-6 mt-2"
                    color={color}
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="px-4 mb-6 rise-in" style={delay(6)}>
        <h2 className="text-xs font-bold tracking-widest text-white/45 mb-2">積み上げ</h2>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="総レップス" value={totals.reps} color="#f59e0b" />
          <Stat label="総セット" value={totals.sets} color="#ec4899" />
          <Stat label="実施日数" value={totals.days} color="#a855f7" />
        </div>

        <div className="flex items-baseline justify-between gap-2 mt-4 mb-2">
          <h3 className="text-[11px] font-bold tracking-widest text-white/45">種目ごと</h3>
          <p className="text-[10px] text-white/30">タップでステップ別</p>
        </div>
        <RepsBars chapters={bars} />
      </section>

      {episode && (
        <section className="px-4 rise-in" style={delay(7)}>
          <h2 className="text-xs font-bold tracking-widest text-white/45 mb-2">監獄からの言葉</h2>
          <Link
            to="/coach"
            className="block rounded-xl border border-purple-500/25 bg-purple-500/5 p-4"
          >
            <p className="text-sm font-bold text-purple-200">{episode.title}</p>
            <p className="text-[12px] text-white/65 mt-1.5 leading-relaxed line-clamp-4">
              {episode.body.split('\n\n')[0]}
            </p>
            <p className="text-[11px] text-white/35 mt-2">{episode.source}</p>
          </Link>
        </section>
      )}
    </div>
  )
}

/** セクションを少しずつ遅らせてせり上げる */
const delay = (i: number) => ({ animationDelay: `${i * 70}ms` })

const EVENT_LABEL: Record<CoachEvent['type'], string> = {
  promote: '進級',
  demote: '見直し',
  plateau: '停滞',
  overwork: 'オーバーワーク',
  routineChange: 'ルーチン',
  personalBest: '自己ベスト更新',
}

const EVENT_STYLE: Record<CoachEvent['type'], string> = {
  promote: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
  demote: 'border-red-500/40 bg-red-500/10 text-red-300',
  plateau: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
  overwork: 'border-red-500/40 bg-red-500/10 text-red-300',
  routineChange: 'border-white/20 bg-white/5 text-white/70',
  personalBest: 'border-pink-500/50 bg-pink-500/10 text-pink-300',
}

const RPE = [
  ['easy', '楽だった'],
  ['ok', 'ちょうどよかった'],
  ['hard', 'きつかった'],
] as const

/** 今週の日曜0時 */
function startOfWeek(now = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  d.setDate(d.getDate() - d.getDay())
  return d
}

/** 日〜土の7マス。実施した日と、ルーチンが予定している日を持つ */
function buildWeek(volume: Map<string, unknown>, routine: Routine | null): WeekCell[] {
  const start = startOfWeek()
  const today = todayKey()

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const date = todayKey(d)
    return {
      date,
      label: WEEKDAY_LABEL[WEEKDAY_ORDER[i]!],
      done: volume.has(date),
      planned: routine ? scheduledChapters(routine, WEEKDAY_ORDER[i]!).length > 0 : false,
      isToday: date === today,
    }
  })
}

/** 日替わりで1本選ぶ。日付が同じなら何度開いても同じものが出る */
function episodeOfTheDay(episodes: Episode[]): Episode | undefined {
  if (episodes.length === 0) return undefined
  const seed = [...todayKey()].reduce((a, c) => a + c.charCodeAt(0), 0)
  return episodes[seed % episodes.length]
}

function WeekStrip({ cells }: { cells: WeekCell[] }) {
  return (
    <ul className="flex gap-1.5 mt-4">
      {cells.map((c) => (
        <li key={c.date} className="flex-1 text-center">
          <p className="text-[10px] text-white/35 mb-1">{c.label}</p>
          <div
            className={`h-9 rounded-lg grid place-items-center text-[11px] tabular-nums relative overflow-hidden ${
              c.done
                ? 'text-black font-bold sheen'
                : c.planned
                  ? 'border border-dashed border-white/25 text-white/45'
                  : 'bg-white/5 text-white/25'
            } ${c.isToday ? 'ring-1 ring-pink-400' : ''}`}
            style={
              c.done ? { background: 'linear-gradient(135deg, #f59e0b, #ec4899)' } : undefined
            }
          >
            {c.done ? '✓' : c.planned ? '予定' : '—'}
          </div>
        </li>
      ))}
    </ul>
  )
}

/** 開いたときに数字が伸びる。積み上がっていること自体を見せる */
function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const shown = useCountUp(value)
  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: `${color}33`, backgroundColor: `${color}0d` }}
    >
      <p className="text-[11px] text-white/45">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-0.5" style={{ color }}>
        {shown.toLocaleString()}
      </p>
    </div>
  )
}

function useCountUp(value: number, durationMs = 900): number {
  const [shown, setShown] = useState(0)
  const raf = useRef(0)

  useEffect(() => {
    if (value <= 0) {
      setShown(0)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      // 終わりに向かって減速させる
      setShown(Math.round(value * (1 - (1 - t) ** 3)))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value, durationMs])

  return shown
}
