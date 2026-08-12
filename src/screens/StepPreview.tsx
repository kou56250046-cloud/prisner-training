import { useState } from 'react'
import { AnimPlayer } from '@/anim/AnimPlayer'
import type { Animation } from '@/anim/types'
import { animations } from '@/content/animations'
import { useContent } from '@/content/ContentProvider'
import { formatStandard, type Step } from '@/content/types'

/**
 * Phase 1 の確認用プレビュー。
 * アニメの質と、種目詳細に載せる情報量を判断してもらうための画面。
 */
export function StepPreview() {
  const content = useContent()
  const [chapterId, setChapterId] = useState(content.chapters[0]?.id ?? 'pushup')
  const [stepNo, setStepNo] = useState(1)

  const chapter = content.chapterById.get(chapterId)
  const steps = content.stepsByChapter.get(chapterId) ?? []
  const step = steps.find((s) => s.stepNo === stepNo) ?? steps[0]

  if (!chapter || !step) {
    return <div className="p-6 text-white/50">コンテンツが空です。</div>
  }

  const anim: Animation | undefined = animations[step.id]

  return (
    <div className="min-h-full bg-concrete-950">
      <header className="px-4 pt-4 pb-3 border-b border-white/10">
        <p className="text-[11px] tracking-[0.2em] text-amber-500/80">
          {chapter.nameEn} ・ {chapter.tagline}
        </p>
        <h1 className="text-lg font-bold mt-1">{chapter.name}</h1>
      </header>

      {content.chapters.length > 1 && (
        <nav className="flex gap-2 px-4 pt-3 overflow-x-auto">
          {content.chapters.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setChapterId(c.id)
                setStepNo(1)
              }}
              className={`shrink-0 px-3 h-9 rounded-lg text-xs border ${
                c.id === chapterId ? 'bg-white/15 border-white/30' : 'border-white/12 text-white/55'
              }`}
            >
              {c.name}
            </button>
          ))}
        </nav>
      )}

      <nav className="flex gap-2 px-4 py-3 overflow-x-auto">
        {steps.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStepNo(s.stepNo)}
            className={`shrink-0 px-3 h-10 rounded-lg text-sm border transition ${
              s.stepNo === step.stepNo
                ? 'bg-amber-500 text-black border-amber-500 font-bold'
                : 'border-white/15 text-white/65'
            }`}
          >
            STEP {s.stepNo}
          </button>
        ))}
      </nav>

      <main className="px-4 pb-16 space-y-6">
        <section>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-amber-500 text-xs font-bold tracking-widest">
              STEP {step.stepNo}
            </span>
            <h2 className="text-xl font-bold">{step.name}</h2>
          </div>

          {anim ? (
            <AnimPlayer anim={anim} />
          ) : (
            <div className="rounded-xl border border-dashed border-white/15 py-10 text-center text-sm text-white/40">
              このステップのアニメーションは未作成
            </div>
          )}

          <p className="text-[11px] text-white/35 mt-2">
            原本 p.{step.sourcePages[0]}〜{step.sourcePages[1]}
          </p>
        </section>

        <StepDetail step={step} />
      </main>
    </div>
  )
}

export function StepDetail({ step }: { step: Step }) {
  return (
    <>
      <Block title="このステップの目的" accent>
        <p className="text-sm leading-relaxed text-white/85">{step.purpose}</p>
      </Block>

      <Block title="得られる効果" accent>
        <ul className="space-y-2">
          {step.benefits.map((b) => (
            <li key={b} className="text-sm leading-relaxed text-white/85 flex gap-2">
              <span className="text-amber-500 shrink-0">▸</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="やり方">
        <ol className="space-y-3">
          {step.howTo.map((h, i) => (
            <li key={i} className="text-sm leading-relaxed text-white/85 flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 grid place-items-center text-[11px] font-bold">
                {i + 1}
              </span>
              <span>{h}</span>
            </li>
          ))}
        </ol>
      </Block>

      <Block title="トレーニング・ゴール">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['初心者', step.standards.beginner],
              ['中級者', step.standards.intermediate],
              ['上級者', step.standards.advanced],
            ] as const
          ).map(([label, s]) => (
            <div
              key={label}
              className={`rounded-lg p-3 border ${
                label === '上級者' ? 'border-amber-500/50 bg-amber-500/5' : 'border-white/12'
              }`}
            >
              <p className="text-[11px] text-white/50">{label}の標準</p>
              <p className="text-lg font-bold mt-1 tabular-nums">{s.reps}</p>
              <p className="text-[11px] text-white/50">レップス × {s.sets}セット</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-white/45 mt-3 leading-relaxed">
          上級者の標準（{formatStandard(step.standards.advanced)}）に達すると、次のステップに進める。
        </p>
      </Block>

      <Block title="注意点">
        <ul className="space-y-2">
          {step.cautions.map((c) => (
            <li key={c} className="text-sm leading-relaxed text-white/85 flex gap-2">
              <span className="text-red-400/80 shrink-0">!</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="技術を完璧にするために">
        <p className="text-sm leading-relaxed text-white/75">{step.technique}</p>
      </Block>

      <Block title="説明">
        <p className="text-sm leading-relaxed text-white/75">{step.description}</p>
      </Block>
    </>
  )
}

function Block({
  title,
  children,
  accent,
}: {
  title: string
  children: React.ReactNode
  accent?: boolean
}) {
  return (
    <section>
      <h3
        className={`text-xs font-bold tracking-widest mb-2 ${
          accent ? 'text-amber-500' : 'text-white/45'
        }`}
      >
        {title}
      </h3>
      {children}
    </section>
  )
}
