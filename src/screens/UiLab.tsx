import { Sparkline } from '@/components/Sparkline'
import { TrainingCalendar } from '@/components/TrainingCalendar'
import { todayKey } from '@/db/queries'

/**
 * 見た目だけを合成データで確認する開発用の画面（/#/ui）。
 *
 * 本番の画面は解錠が必要で、記録が無いと空になってしまう。
 * 表示部品はどれも props だけで完結しているので、ここで見た目を詰められる。
 * データベースにも書籍コンテンツにも一切触らない。
 */
export function UiLab() {
  const volume = new Map<string, { sets: number; reps: number }>()
  const now = new Date()
  // 直近60日のうち、それらしい間隔で実施したことにする
  for (let i = 0; i < 60; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const dow = d.getDay()
    if (dow === 1 || dow === 5 || (i % 11 === 0 && dow !== 0)) {
      volume.set(todayKey(d), { sets: 4 + (i % 4), reps: 40 + ((i * 17) % 120) })
    }
  }

  const steps = [
    { stepNo: 1, name: 'ウォール・プッシュアップ', reps: 1840, sets: 62, best: 50, current: false },
    { stepNo: 2, name: 'インクライン・プッシュアップ', reps: 920, sets: 34, best: 40, current: false },
    { stepNo: 3, name: 'ニーリング・プッシュアップ', reps: 415, sets: 21, best: 28, current: true },
    { stepNo: 4, name: 'ハーフ・プッシュアップ', reps: 0, sets: 0, best: 0, current: false },
    { stepNo: 5, name: 'フル・プッシュアップ', reps: 0, sets: 0, best: 0, current: false },
  ]
  const max = Math.max(...steps.map((s) => s.reps))

  return (
    <div className="pb-16 max-w-md mx-auto">
      <header className="px-4 pt-4 pb-3">
        <p className="text-[11px] tracking-[0.2em] text-amber-500/80">UI LAB</p>
        <h1 className="text-lg font-bold mt-1">表示部品の確認（合成データ）</h1>
      </header>

      <section className="px-4 mb-7">
        <h2 className="text-xs font-bold tracking-widest text-white/45 mb-2">実施カレンダー</h2>
        <TrainingCalendar volume={volume} />
      </section>

      <section className="px-4 mb-7">
        <h2 className="text-xs font-bold tracking-widest text-white/45 mb-2">
          ステップごとの累計
        </h2>
        <div className="rounded-xl border border-white/12 p-4">
          <button
            type="button"
            className="w-full h-10 rounded-lg border border-white/12 text-[12px] text-white/70 flex items-center justify-center gap-2 mb-3"
          >
            <span className="tabular-nums">累計 3,175 レップス</span>
            <span className="text-white/35">閉じる</span>
          </button>
          <ul className="space-y-1.5">
            {steps.map((s) => (
              <li key={s.stepNo}>
                <div className="flex items-baseline gap-2 text-[11px]">
                  <span
                    className={`w-5 shrink-0 tabular-nums ${
                      s.current ? 'text-amber-500 font-bold' : 'text-white/40'
                    }`}
                  >
                    {s.stepNo}
                  </span>
                  <span className={`truncate ${s.current ? 'text-white' : 'text-white/60'}`}>
                    {s.name}
                  </span>
                  <span className="ml-auto shrink-0 tabular-nums text-white/70">
                    {s.reps.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/8 mt-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.current ? 'bg-amber-500' : 'bg-white/30'}`}
                    style={{ width: `${(s.reps / max) * 100}%` }}
                  />
                </div>
                {s.sets > 0 && (
                  <p className="text-[10px] text-white/35 mt-0.5 tabular-nums">
                    {s.sets}セット ・ 自己最高 {s.best}レップス
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-4">
        <h2 className="text-xs font-bold tracking-widest text-white/45 mb-2">レップス推移</h2>
        <div className="rounded-xl border border-white/12 p-4">
          <Sparkline values={[10, 11, 11, 12, 13, 13, 15, 16, 18, 20]} label="ニーリング" />
        </div>
      </section>
    </div>
  )
}
