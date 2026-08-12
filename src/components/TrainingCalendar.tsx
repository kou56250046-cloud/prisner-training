import { useState } from 'react'
import { todayKey } from '@/db/queries'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

type DayVolume = { sets: number; reps: number }

/**
 * 月ごとの実施カレンダー。
 *
 * 草グラフは俯瞰には向くが「いつやったか」が読み取れないので、
 * 日付が読める月表示にしている。実施した日は濃さでボリュームを示す。
 */
export function TrainingCalendar({ volume }: { volume: Map<string, DayVolume> }) {
  const now = new Date()
  const [offset, setOffset] = useState(0)

  const shown = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const year = shown.getFullYear()
  const month = shown.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = shown.getDay()
  const today = todayKey(now)

  const key = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const trainedDays = monthDays.filter((d) => volume.has(key(d)))
  const monthReps = trainedDays.reduce((a, d) => a + (volume.get(key(d))?.reps ?? 0), 0)

  // その月の中での相対的なボリュームで濃さを決める
  const maxReps = Math.max(1, ...trainedDays.map((d) => volume.get(key(d))!.reps))

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...monthDays,
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="rounded-xl border border-white/12 p-3">
      <header className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setOffset((o) => o - 1)}
          className="w-9 h-9 rounded-lg text-white/50 active:bg-white/10"
          aria-label="前の月"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-sm font-bold tabular-nums">
            {year}年 {month + 1}月
          </p>
          <p className="text-[11px] text-white/45 tabular-nums mt-0.5">
            {trainedDays.length}日実施 ・ {monthReps.toLocaleString()}レップス
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset >= 0}
          className="w-9 h-9 rounded-lg text-white/50 active:bg-white/10 disabled:opacity-20"
          aria-label="次の月"
        >
          ›
        </button>
      </header>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`text-center text-[10px] py-1 ${
              i === 0 ? 'text-red-400/60' : i === 6 ? 'text-sky-400/60' : 'text-white/35'
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="aspect-square" />
          const k = key(day)
          const v = volume.get(k)
          const isToday = k === today
          // 0.35〜1.0 の範囲で濃さを振る。少ない日でも「やった」とわかるようにする
          const intensity = v ? 0.35 + 0.65 * Math.min(1, v.reps / maxReps) : 0

          return (
            <div
              key={k}
              className={`aspect-square rounded-lg grid place-items-center relative ${
                isToday ? 'ring-1 ring-amber-500/70' : ''
              }`}
              style={v ? { backgroundColor: `rgba(232, 163, 61, ${intensity})` } : undefined}
              title={v ? `${k} ・ ${v.reps}レップス / ${v.sets}セット` : k}
            >
              <span
                className={`text-[11px] tabular-nums ${
                  v ? (intensity > 0.6 ? 'text-black font-bold' : 'text-white') : 'text-white/30'
                }`}
              >
                {day}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-white/35">
        <span>少</span>
        {[0.35, 0.55, 0.75, 1].map((a) => (
          <span
            key={a}
            className="w-3 h-3 rounded-[3px]"
            style={{ backgroundColor: `rgba(232, 163, 61, ${a})` }}
          />
        ))}
        <span>多</span>
      </div>
    </div>
  )
}
