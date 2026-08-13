import { formatStandard, metricLabel, type Step } from '@/content/types'

/** 種目図鑑とワークアウトの両方から使う、ステップ解説の本体 */
export function StepDetail({ step, best }: { step: Step; best?: number[] | null }) {
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
              <p className="text-[11px] text-white/50">
                {metricLabel(step.metric)}
                {s.sets > 1 && ` × ${s.sets}セット`}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-white/45 mt-3 leading-relaxed">
          上級者の標準（{formatStandard(step.standards.advanced, step.metric)}）を2回連続で達成すると、
          次のステップに進める。
        </p>
        {best && best.length > 0 && (
          <p className="text-[11px] text-amber-400/90 mt-1.5 tabular-nums">
            直近の記録: {best.join(' / ')} {metricLabel(step.metric)}
          </p>
        )}
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

      {step.equipment.length > 0 && (
        <Block title="必要なもの">
          <p className="text-sm text-white/75">{step.equipment.join(' / ')}</p>
        </Block>
      )}
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
