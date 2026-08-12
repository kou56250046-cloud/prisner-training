import { useEffect, useMemo, useRef, useState } from 'react'
import { buildTimeline } from './interpolate'
import { resolvePose } from './rig'
import { StickFigure } from './StickFigure'
import type { Animation, Skeleton, TrailJoint, Vec2 } from './types'

const SPEEDS = [0.5, 1, 1.5] as const

type Mode = 'play' | 'compare'

export function AnimPlayer({ anim, compact }: { anim: Animation; compact?: boolean }) {
  const timeline = useMemo(() => buildTimeline(anim), [anim])
  const [mode, setMode] = useState<Mode>('play')
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<number>(1)
  const [ms, setMs] = useState(0)
  const [showTrail, setShowTrail] = useState(true)

  const raf = useRef(0)
  const last = useRef(0)
  const scrubbing = useRef(false)

  useEffect(() => {
    if (!playing || mode === 'compare') return
    last.current = performance.now()
    const tick = (now: number) => {
      const dt = now - last.current
      last.current = now
      if (!scrubbing.current) setMs((p) => (p + dt * speed) % timeline.totalMs)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, speed, timeline, mode])

  const frame = timeline.sample(ms)
  const skeleton = resolvePose(frame.pose)

  // 動作域の軌跡は、タイムライン全体をあらかじめサンプリングして作る
  const trails = useMemo(() => {
    if (!showTrail) return []
    const joints: TrailJoint[] =
      anim.guides?.flatMap((g) => (g.kind === 'trail' ? [g.joint] : [])) ?? []
    if (!joints.length) return []
    const N = 48
    const acc = new Map<TrailJoint, Vec2[]>(joints.map((j) => [j, []]))
    for (let i = 0; i <= N; i++) {
      const s = resolvePose(timeline.sample((i / N) * timeline.totalMs).pose)
      for (const j of joints) acc.get(j)!.push(pick(s, j))
    }
    return [...acc].map(([joint, points]) => ({ joint, points }))
  }, [timeline, anim.guides, showTrail])

  const startPose = anim.keyframes[0]
  const finishPose = anim.keyframes.find((k) => k.label && k.label !== anim.keyframes[0]?.label)

  const maxH = compact ? 170 : mode === 'compare' ? 270 : 390

  return (
    <div className="w-full">
      {/* カードは常に横幅いっぱい。SVG 側が縦横比と最大高さで自分のサイズを決める。
          カードを w-fit にすると SVG の width:100% と循環参照になり絵が縮む */}
      <div className="relative rounded-xl overflow-hidden bg-[#141210] border border-white/10 flex justify-center">
        {mode === 'play' ? (
          <>
            <StickFigure
              skeleton={skeleton}
              props={anim.props}
              camera={anim.camera}
              guides={anim.guides}
              trails={trails}
              hideFar={anim.hideFar}
              maxHeightPx={maxH}
            />
            {frame.label && (
              <span className="absolute top-2 left-3 text-xs tracking-widest text-amber-400/90">
                {frame.label}
                {frame.holding && ' ・静止'}
              </span>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-white/10 w-full">
            {[startPose, finishPose ?? anim.keyframes[anim.keyframes.length - 1]].map((kf, i) => (
              <div key={i} className="relative">
                <StickFigure
                  skeleton={resolvePose(kf!.pose)}
                  props={anim.props}
                  camera={anim.camera}
                  guides={anim.guides}
                  hideFar={anim.hideFar}
                  maxHeightPx={maxH}
                />
                <span className="absolute top-2 left-3 text-xs tracking-widest text-amber-400/90">
                  {kf?.label ?? (i === 0 ? 'スタート' : 'フィニッシュ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* シークバー */}
      {mode === 'play' && (
        <input
          type="range"
          min={0}
          max={timeline.totalMs}
          step={1}
          value={ms}
          aria-label="再生位置"
          onPointerDown={() => (scrubbing.current = true)}
          onPointerUp={() => (scrubbing.current = false)}
          onChange={(e) => setMs(Number(e.target.value))}
          className="w-full mt-3 accent-amber-500 h-6"
        />
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {mode === 'play' && (
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="px-4 h-11 rounded-lg bg-amber-500 text-black font-bold text-sm min-w-20"
          >
            {playing ? '一時停止' : '再生'}
          </button>
        )}

        <div className="flex rounded-lg overflow-hidden border border-white/15">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={`px-3 h-11 text-sm ${
                speed === s ? 'bg-white/15 text-white' : 'text-white/55'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMode((m) => (m === 'play' ? 'compare' : 'play'))}
          className="px-3 h-11 rounded-lg border border-white/15 text-sm text-white/80"
        >
          {mode === 'play' ? '2姿勢で比較' : 'アニメに戻る'}
        </button>

        <button
          type="button"
          onClick={() => setShowTrail((v) => !v)}
          className={`px-3 h-11 rounded-lg border text-sm ${
            showTrail ? 'border-amber-500/60 text-amber-400' : 'border-white/15 text-white/55'
          }`}
        >
          動作域
        </button>
      </div>
    </div>
  )
}

function pick(s: Skeleton, j: TrailJoint): Vec2 {
  switch (j) {
    case 'head':
      return s.head
    case 'shoulder':
      return s.shoulder
    case 'pelvis':
      return s.pelvis
    case 'chest':
      return s.chest
    case 'wristNear':
      return s.armNear.end
    case 'ankleNear':
      return s.legNear.end
    case 'kneeNear':
      return s.legNear.mid
  }
}
