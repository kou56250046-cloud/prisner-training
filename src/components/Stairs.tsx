/** 10段の階段。いまどこにいるかを一目で分かるようにする */
export function Stairs({
  current,
  unlocked,
  className = 'h-10',
  color,
}: {
  current: number
  unlocked: number
  /** 高さを呼び出し側で決める。ダッシュボードでは低く、進捗画面では高く */
  className?: string
  /** いま立っている段の色。種目ごとに変えるときに渡す */
  color?: string
}) {
  return (
    <div className={`flex items-end gap-1 ${className}`} aria-label={`ステップ${current} / 10`}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const cleared = n < unlocked
        const here = n === current
        return (
          <div
            key={n}
            className={`flex-1 rounded-sm ${
              here ? (color ? '' : 'bg-amber-500') : cleared ? 'bg-white/35' : 'bg-white/10'
            }`}
            style={{
              height: `${20 + n * 8}%`,
              ...(here && color ? { backgroundColor: color } : {}),
            }}
          />
        )
      })}
    </div>
  )
}
