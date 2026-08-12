import { useState } from 'react'
import { AnimPlayer } from '@/anim/AnimPlayer'
import { animations } from '@/content/animations'

/**
 * アニメーション作成用の確認画面（/#/anim）。
 *
 * 関節角度データは書籍本文ではないので暗号化コンテンツに含めていない。
 * そのため、この画面は合い言葉なしで開ける。
 * 残りの種目を起こしていくときの作業台として使う。
 */
export function AnimLab() {
  const ids = Object.keys(animations).sort()
  const [id, setId] = useState(ids[0] ?? '')
  const anim = animations[id]

  return (
    <div className="min-h-full bg-concrete-950 px-4 py-4">
      <p className="text-[11px] tracking-[0.2em] text-amber-500/80">ANIMATION LAB</p>
      <h1 className="text-lg font-bold mt-1 mb-3">
        アニメ確認用
        <span className="text-white/40 text-sm font-normal ml-2">{ids.length}件</span>
      </h1>

      <nav className="flex gap-2 flex-wrap mb-4">
        {ids.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setId(k)}
            className={`px-3 h-9 rounded-lg text-xs border ${
              k === id
                ? 'bg-amber-500 text-black border-amber-500 font-bold'
                : 'border-white/15 text-white/60'
            }`}
          >
            {k}
          </button>
        ))}
      </nav>

      {anim ? (
        <>
          <AnimPlayer anim={anim} />
          <dl className="mt-4 text-[11px] text-white/45 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt>カメラ</dt>
            <dd className="tabular-nums">
              x [{anim.camera.minX}, {anim.camera.maxX}] / y [{anim.camera.minY}, {anim.camera.maxY}]
            </dd>
            <dt>キーフレーム</dt>
            <dd className="tabular-nums">{anim.keyframes.length}</dd>
            <dt>器具</dt>
            <dd>{anim.props.map((p) => p.kind).join(', ') || 'なし'}</dd>
          </dl>
        </>
      ) : (
        <p className="text-white/40 text-sm">アニメーションがありません</p>
      )}
    </div>
  )
}
