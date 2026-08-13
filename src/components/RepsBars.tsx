import { useEffect, useState } from 'react'
import { chapterColor, chapterTint } from '@/content/chapterColors'

export type StepBar = {
  stepNo: number
  name: string
  reps: number
  isCurrent: boolean
}

export type ChapterBar = {
  chapterId: string
  name: string
  reps: number
  steps: StepBar[]
}

/**
 * 種目ごとの総レップスを棒で並べる。タップするとステップ別に開く。
 *
 * 数字の羅列より、伸びていく棒のほうが「積み上がっている」ことが伝わる。
 * 開いたときに棒が左から育つのは、その日の記録が確かに足されたと感じさせるため。
 */
export function RepsBars({ chapters }: { chapters: ChapterBar[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const grown = useGrown()
  const max = Math.max(1, ...chapters.map((c) => c.reps))

  return (
    <ul className="space-y-2">
      {chapters.map((c, i) => {
        const expanded = open === c.chapterId
        const color = chapterColor(c.chapterId)

        return (
          <li
            key={c.chapterId}
            className="rounded-xl border p-3"
            style={{
              borderColor: chapterTint(c.chapterId, expanded ? 0.5 : 0.16),
              backgroundColor: expanded ? chapterTint(c.chapterId, 0.06) : undefined,
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : c.chapterId)}
              aria-expanded={expanded}
              className="w-full text-left"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium truncate">{c.name}</span>
                <span className="text-[12px] tabular-nums shrink-0" style={{ color }}>
                  {c.reps.toLocaleString()}
                </span>
              </div>

              <div className="h-2.5 rounded-full bg-white/6 mt-2 overflow-hidden relative">
                <div
                  className="h-full rounded-full relative overflow-hidden sheen"
                  style={{
                    width: grown ? `${(c.reps / max) * 100}%` : '0%',
                    background: `linear-gradient(90deg, ${chapterTint(c.chapterId, 0.55)}, ${color})`,
                    transition: 'width 900ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                    transitionDelay: `${i * 70}ms`,
                  }}
                />
              </div>
            </button>

            {expanded && <StepBars steps={c.steps} chapterId={c.chapterId} />}
          </li>
        )
      })}
    </ul>
  )
}

function StepBars({ steps, chapterId }: { steps: StepBar[]; chapterId: string }) {
  const grown = useGrown()
  const max = Math.max(1, ...steps.map((s) => s.reps))
  const color = chapterColor(chapterId)

  return (
    <ul className="mt-3 space-y-1.5 rise-in">
      {steps.map((s, i) => (
        <li key={s.stepNo} className="flex items-center gap-2">
          <span
            className="w-4 shrink-0 text-[10px] tabular-nums text-right"
            style={{ color: s.isCurrent ? color : 'rgba(255,255,255,0.35)' }}
          >
            {s.stepNo}
          </span>
          <span className="flex-1 min-w-0">
            <span className="flex items-baseline justify-between gap-2">
              <span
                className={`text-[11px] truncate ${s.isCurrent ? 'text-white' : 'text-white/55'}`}
              >
                {s.name}
              </span>
              <span className="text-[10px] tabular-nums text-white/45 shrink-0">
                {s.reps.toLocaleString()}
              </span>
            </span>
            <span className="block h-1.5 rounded-full bg-white/6 mt-1 overflow-hidden">
              <span
                className="block h-full rounded-full"
                style={{
                  width: grown ? `${(s.reps / max) * 100}%` : '0%',
                  backgroundColor: s.isCurrent ? color : chapterTint(chapterId, 0.4),
                  transition: 'width 700ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                  transitionDelay: `${i * 40}ms`,
                }}
              />
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/** 描画の1フレーム後に true になる。0% から目的の幅へ伸ばすために使う */
function useGrown(): boolean {
  const [grown, setGrown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return grown
}
