import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AnimPlayer } from '@/anim/AnimPlayer'
import { RecordSheet } from '@/components/RecordSheet'
import { StepDetail } from '@/components/StepDetail'
import { animations } from '@/content/animations'
import { chapterColor, chapterTint } from '@/content/chapterColors'
import { useContent } from '@/content/ContentProvider'
import type { ChapterId } from '@/content/types'
import { ensureProgress, getStepHistory } from '@/db/queries'
import type { Progress } from '@/db/schema'

/** 種目図鑑。ビッグ6 → 10ステップ → 詳細 */
export function Library() {
  const content = useContent()
  const { chapterId, stepNo } = useParams()
  const navigate = useNavigate()
  const [progress, setProgress] = useState<Progress[]>([])
  const [best, setBest] = useState<number[] | null>(null)
  const [recording, setRecording] = useState(false)

  useEffect(() => {
    void ensureProgress().then(setProgress)
  }, [])

  const chapter = chapterId ? content.chapterById.get(chapterId) : undefined
  const steps = chapterId ? (content.stepsByChapter.get(chapterId) ?? []) : []
  const step = stepNo ? steps.find((s) => s.stepNo === Number(stepNo)) : undefined
  const prog = progress.find((p) => p.chapterId === chapterId)

  const reloadBest = useCallback(() => {
    if (!step) {
      setBest(null)
      return
    }
    void getStepHistory(step.id, 1).then((h) => setBest(h[0]?.reps ?? null))
  }, [step])

  useEffect(reloadBest, [reloadBest])

  // 種目一覧
  if (!chapter) {
    return (
      <div className="pb-24">
        <header className="px-4 pt-4 pb-3">
          <h1 className="text-2xl font-bold">種目図鑑</h1>
          <p className="text-xs text-white/45 mt-1">ビッグ6 × 10ステップ</p>
        </header>
        <ul className="px-4 space-y-3">
          {content.chapters.map((c) => {
            const p = progress.find((x) => x.chapterId === c.id)
            const count = content.stepsByChapter.get(c.id)?.length ?? 0
            return (
              <li key={c.id}>
                <Link
                  to={`/library/${c.id}`}
                  className="block rounded-xl border p-4"
                  style={{
                    borderColor: chapterTint(c.id, 0.3),
                    backgroundColor: chapterTint(c.id, 0.05),
                  }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="font-bold">{c.name}</h2>
                    <span
                      className="text-[11px] shrink-0 tabular-nums font-bold"
                      style={{ color: chapterColor(c.id) }}
                    >
                      STEP {p?.currentStep ?? 1}
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: chapterTint(c.id, 0.85) }}>
                    {c.tagline}
                  </p>
                  <p className="text-[11px] text-white/35 mt-2">{count} / 10 ステップ収録</p>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  // ステップ一覧
  if (!step) {
    return (
      <div className="pb-24">
        <header className="px-4 pt-4 pb-3">
          <button type="button" onClick={() => navigate('/library')} className="text-xs text-white/45 mb-2">
            ← 種目一覧
          </button>
          <p className="text-[11px] tracking-[0.2em] text-amber-500/80">{chapter.nameEn}</p>
          <h1 className="text-2xl font-bold mt-0.5">{chapter.name}</h1>
          <p className="text-sm text-white/60 mt-1">{chapter.tagline}</p>
        </header>

        <section className="px-4 mb-5 space-y-4">
          <div>
            <h3 className="text-xs font-bold tracking-widest text-amber-500 mb-1.5">この種目の目的</h3>
            <p className="text-sm leading-relaxed text-white/85">{chapter.purpose}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-widest text-amber-500 mb-1.5">得られる効果</h3>
            <ul className="space-y-2">
              {chapter.benefits.map((b) => (
                <li key={b} className="text-sm leading-relaxed text-white/85 flex gap-2">
                  <span className="text-amber-500 shrink-0">▸</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <ol className="px-4 space-y-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const s = steps.find((x) => x.stepNo === n)
            const current = prog?.currentStep === n
            const cleared = (prog?.unlockedStep ?? 1) > n
            return (
              <li key={n}>
                {s ? (
                  <Link
                    to={`/library/${chapter.id}/${n}`}
                    className="flex items-center gap-3 rounded-lg border p-3"
                    style={{
                      borderColor: current
                        ? chapterTint(chapter.id, 0.6)
                        : 'rgba(255,255,255,0.12)',
                      backgroundColor: current ? chapterTint(chapter.id, 0.07) : undefined,
                    }}
                  >
                    <span
                      className={`w-8 h-8 shrink-0 rounded-full grid place-items-center text-xs font-bold ${
                        cleared
                          ? 'bg-white/20'
                          : current
                            ? 'text-black'
                            : 'border border-white/20 text-white/50'
                      }`}
                      style={current && !cleared ? { backgroundColor: chapterColor(chapter.id) } : undefined}
                    >
                      {n}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{s.name}</span>
                      <span className="block text-[11px] text-white/40">
                        上級者 {s.standards.advanced.reps}×{s.standards.advanced.sets}
                        {s.isMasterStep && ' ・ マスターステップ'}
                      </span>
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-dashed border-white/10 p-3 opacity-45">
                    <span className="w-8 h-8 shrink-0 rounded-full border border-white/20 grid place-items-center text-xs">
                      {n}
                    </span>
                    <span className="text-sm">未収録</span>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    )
  }

  // ステップ詳細
  const anim = animations[step.id]
  const isCurrentStep = prog?.currentStep === step.stepNo

  return (
    // 固定表示の「記録する」(約88px) とタブバー(56px) の両方を避ける高さ
    <div className="pb-[calc(9rem+env(safe-area-inset-bottom))]">
      <header className="px-4 pt-4 pb-3">
        <button
          type="button"
          onClick={() => navigate(`/library/${chapter.id}`)}
          className="text-xs text-white/45 mb-2"
        >
          ← {chapter.name}
        </button>
        <div className="flex items-baseline gap-2">
          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: chapterColor(chapter.id) }}
          >
            STEP {step.stepNo}
          </span>
          <h1 className="text-xl font-bold">{step.name}</h1>
        </div>
        {isCurrentStep && (
          <p className="text-[11px] mt-1" style={{ color: chapterTint(chapter.id, 0.85) }}>
            いま取り組んでいるステップ
          </p>
        )}
      </header>

      <div className="px-4">
        {anim ? (
          <AnimPlayer anim={anim} />
        ) : (
          <div className="rounded-xl border border-dashed border-white/15 py-10 text-center text-sm text-white/40">
            このステップのアニメーションは未作成
          </div>
        )}
        <p className="text-[11px] text-white/30 mt-2">
          原本 p.{step.sourcePages[0]}〜{step.sourcePages[1]}
        </p>
      </div>

      <main className="px-4 mt-6 space-y-6">
        <StepDetail step={step} best={best} />
      </main>

      {/* 親指が届く位置に固定。タブバー(h-14)の真上に置く */}
      <div className="fixed inset-x-0 z-20 px-4 pt-6 pb-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-concrete-950 via-concrete-950 to-transparent">
        <button
          type="button"
          onClick={() => setRecording(true)}
          className="w-full h-16 rounded-xl bg-amber-500 text-black text-lg font-bold active:bg-amber-400"
        >
          このステップを記録する
        </button>
      </div>

      {recording && (
        <RecordSheet
          step={step}
          chapterId={chapter.id as ChapterId}
          isCurrentStep={isCurrentStep}
          onClose={(saved) => {
            setRecording(false)
            if (saved) {
              reloadBest()
              void ensureProgress().then(setProgress)
            }
          }}
        />
      )}
    </div>
  )
}
