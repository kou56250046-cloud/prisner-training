/**
 * レップス推移の折れ線。外部のグラフライブラリを入れず、必要な分だけ自前で描く。
 * 点数が少なくても破綻しないように、1点だけのときは横線にする。
 */
export function Sparkline({
  values,
  height = 56,
  label,
}: {
  /** 古い順に並べた値 */
  values: number[]
  height?: number
  label?: string
}) {
  if (values.length === 0) {
    return <p className="text-[11px] text-white/35 py-4">まだ記録がありません</p>
  }

  const w = 100
  const h = height
  const pad = 6
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = Math.max(1, max - min)

  const x = (i: number) =>
    values.length === 1 ? w / 2 : pad + (i / (values.length - 1)) * (w - pad * 2)
  const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2)

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const last = values[values.length - 1]!

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        {label && <span className="text-[11px] text-white/45">{label}</span>}
        <span className="text-[11px] text-white/60 tabular-nums">
          最高 {max} / 直近 {last}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`レップス推移 最高${max} 直近${last}`}
      >
        <polyline
          points={points}
          fill="none"
          stroke="#e8a33d"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r="1.6" fill="#e8a33d" />
        ))}
      </svg>
    </div>
  )
}
