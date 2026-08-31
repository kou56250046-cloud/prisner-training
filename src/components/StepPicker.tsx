import { useEffect, useState } from 'react'
import { chapterColor, chapterTint } from '@/content/chapterColors'
import { useContent } from '@/content/ContentProvider'
import type { ChapterId, Step } from '@/content/types'
import { ensureProgress } from '@/db/queries'
import type { Progress } from '@/db/schema'

/**
 * 種目とステップを選ぶシート。
 *
 * カレンダーの日付から「その日の記録を足す」ときに使う。図鑑をたどり直さずに、
 * いま取り組んでいるステップがすぐ選べる並びにしてある。
 */
export function StepPicker({
  title,
  onPick,
  onClose,
}: {
  title: string
  onPick: (step: Step, chapterId: ChapterId, isCurrentStep: boolean) => void
  onClose: () => void
}) {
  const content = useContent()
  const [progress, setProgress] = useState<Progress[]>([])
  const [chapterId, setChapterId] = useState<ChapterId | null>(null)

  useEffect(() => {
    void ensureProgress().then(setProgress)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const currentOf = (id: string) => progress.find((p) => p.chapterId === id)?.currentStep ?? 1
  const steps = chapterId ? (content.stepsByChapter.get(chapterId) ?? []) : []

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button type="button" aria-label="閉じる" onClick={onClose} className="absolute inset-0 bg-black/70" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[85vh] flex flex-col rounded-t-2xl border-t border-white/15 bg-neutral-950"
      >
        <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold truncate">{title}</h2>
            <p className="text-[11px] text-white/45 mt-0.5">
              {chapterId ? 'ステップを選ぶ' : '種目を選ぶ'}
            </p>
          </div>
          <button
            type="button"
            onClick={chapterId ? () => setChapterId(null) : onClose}
            className="h-10 px-4 rounded-lg border border-white/15 text-sm shrink-0 active:bg-white/10"
          >
            {chapterId ? '種目に戻る' : '閉じる'}
          </button>
        </header>

        <div className="overflow-y-auto px-4 pb-8">
          {!chapterId ? (
            <ul className="space-y-2">
              {content.chapters.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setChapterId(c.id)}
                    className="w-full text-left rounded-xl border p-3 flex items-baseline justify-between gap-2"
                    style={{
                      borderColor: chapterTint(c.id, 0.3),
                      backgroundColor: chapterTint(c.id, 0.05),
                    }}
                  >
                    <span className="font-bold">{c.name}</span>
                    <span
                      className="text-[11px] shrink-0 tabular-nums font-bold"
                      style={{ color: chapterColor(c.id) }}
                    >
                      STEP {currentOf(c.id)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ol className="space-y-2">
              {steps.map((s) => {
                const isCurrent = s.stepNo === currentOf(chapterId)
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onPick(s, chapterId, isCurrent)}
                      className="w-full text-left flex items-center gap-3 rounded-lg border p-3"
                      style={{
                        borderColor: isCurrent
                          ? chapterTint(chapterId, 0.6)
                          : 'rgba(255,255,255,0.12)',
                        backgroundColor: isCurrent ? chapterTint(chapterId, 0.07) : undefined,
                      }}
                    >
                      <span
                        className={`w-8 h-8 shrink-0 rounded-full grid place-items-center text-xs font-bold ${
                          isCurrent ? 'text-black' : 'border border-white/20 text-white/50'
                        }`}
                        style={isCurrent ? { backgroundColor: chapterColor(chapterId) } : undefined}
                      >
                        {s.stepNo}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium truncate">{s.name}</span>
                        {isCurrent && (
                          <span className="block text-[11px] text-white/40">
                            いま取り組んでいるステップ
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
