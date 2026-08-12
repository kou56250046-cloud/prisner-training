import { DIM } from './rig'
import type { Camera, Guide, Prop, ResolvedLimb, Skeleton, TrailJoint, Vec2 } from './types'

type Props = {
  skeleton: Skeleton
  props: Prop[]
  camera: Camera
  guides?: Guide[]
  /** 動作域の可視化用に、あらかじめサンプリングした関節の軌跡 */
  trails?: { joint: TrailJoint; points: Vec2[] }[]
  /** 参考表示するゴースト姿勢（スタート位置の残像など） */
  ghost?: Skeleton
  hideFar?: boolean
  /** 奥側の手足を濃く描く（左右非対称の種目） */
  asymmetric?: boolean
  className?: string
  /** 描画の最大高さ(px)。カメラの縦横比を保ったまま収める */
  maxHeightPx?: number
}

const NEAR = '#f5f0e8'
const FAR = 'rgba(245, 240, 232, 0.28)'
/** 左右非対称の種目で、奥側の手足も「もう一本の腕/脚」として読み取れる濃さ */
const FAR_STRONG = 'rgba(245, 240, 232, 0.62)'
const ACCENT = '#e8a33d'
const STRUCTURE = '#4a4540'

export function StickFigure({
  skeleton,
  props,
  camera,
  guides,
  trails,
  ghost,
  hideFar,
  asymmetric,
  className,
  maxHeightPx = 340,
}: Props) {
  const { minX, maxX, minY, maxY } = camera
  const w = maxX - minX
  const h = maxY - minY
  // y 軸を上向きにするための反転。K を軸にして折り返す
  const K = minY + maxY
  const toScreen = (v: Vec2): Vec2 => ({ x: v.x, y: K - v.y })

  return (
    <svg
      viewBox={`${minX} ${minY} ${w} ${h}`}
      className={className}
      // カメラの縦横比をそのまま要素の比率にする。こうしないと横長のカメラで
      // 上下に大きな空白が出て、絵が小さくなってしまう
      style={{
        width: '100%',
        aspectRatio: `${w} / ${h}`,
        maxHeight: `${maxHeightPx}px`,
        maxWidth: `${(maxHeightPx * w) / h}px`,
        margin: '0 auto',
      }}
      preserveAspectRatio="xMidYMid meet"
      role="img"
    >
      <defs>
        <pattern
          id="hatch"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="4" stroke={STRUCTURE} strokeWidth="1.2" />
        </pattern>
      </defs>

      <g transform={`translate(0, ${K}) scale(1, -1)`}>
        <PropLayer props={props} camera={camera} />

        {trails?.map((t) => (
          <polyline
            key={t.joint}
            points={t.points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={ACCENT}
            strokeWidth="0.8"
            strokeDasharray="2 2"
            opacity="0.55"
            strokeLinecap="round"
          />
        ))}

        {ghost && <Figure skeleton={ghost} hideFar color="rgba(245,240,232,0.16)" ghost />}
        <Figure skeleton={skeleton} hideFar={hideFar} asymmetric={asymmetric} />

        {/* バーは顔の手前にあるので、体より後に描かないと頭に隠れてしまう */}
        <PropLayer props={props} camera={camera} foreground />

        <GuideLayer guides={guides} camera={camera} skeleton={skeleton} />
      </g>

      {/* テキストは反転させたくないので、座標を手で変換して別レイヤーに描く */}
      <GuideLabels guides={guides} props={props} toScreen={toScreen} camera={camera} />
    </svg>
  )
}

function Figure({
  skeleton,
  hideFar,
  asymmetric,
  color,
  ghost,
}: {
  skeleton: Skeleton
  hideFar?: boolean
  asymmetric?: boolean
  color?: string
  ghost?: boolean
}) {
  const near = color ?? NEAR
  const far = color ?? (asymmetric ? FAR_STRONG : FAR)

  return (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      {/* 奥側の手足はわずかに後ろへずらして描く。真横からの図で
          左右が完全に重なると片手片足に見えてしまうため */}
      {!hideFar && (
        <g transform="translate(-2.5, -0.8)">
          <Limb limb={skeleton.legFar} stroke={far} width={3} />
          <Limb limb={skeleton.armFar} stroke={far} width={3} />
        </g>
      )}

      {/* 体幹 */}
      <line
        x1={skeleton.pelvis.x}
        y1={skeleton.pelvis.y}
        x2={skeleton.shoulder.x}
        y2={skeleton.shoulder.y}
        stroke={near}
        strokeWidth={5.5}
      />
      {/* 首 */}
      <line
        x1={skeleton.shoulder.x}
        y1={skeleton.shoulder.y}
        x2={skeleton.head.x}
        y2={skeleton.head.y}
        stroke={near}
        strokeWidth={3.5}
      />

      <Limb limb={skeleton.legNear} stroke={near} width={4.5} />
      <Limb limb={skeleton.armNear} stroke={near} width={4} />

      {/* 頭は手足より後に描く。プルアップのように腕が頭の横を通る種目で、
          腕が頭を串刺しにしたように見えるのを防ぐ */}
      <circle
        cx={skeleton.head.x}
        cy={skeleton.head.y}
        r={DIM.headR}
        stroke={near}
        strokeWidth={3}
        fill={ghost ? 'none' : '#141210'}
      />

      {!ghost && (
        <>
          <Joint at={skeleton.shoulder} />
          <Joint at={skeleton.pelvis} />
          <Joint at={skeleton.armNear.mid} />
          <Joint at={skeleton.legNear.mid} />
        </>
      )}
    </g>
  )
}

function Limb({ limb, stroke, width }: { limb: ResolvedLimb; stroke: string; width: number }) {
  return (
    <polyline
      points={`${limb.root.x},${limb.root.y} ${limb.mid.x},${limb.mid.y} ${limb.end.x},${limb.end.y} ${limb.tip.x},${limb.tip.y}`}
      stroke={stroke}
      strokeWidth={width}
    />
  )
}

function Joint({ at }: { at: Vec2 }) {
  return <circle cx={at.x} cy={at.y} r={1.7} fill={ACCENT} stroke="none" />
}

/** コンクリート面。塗りつぶしてから斜線を重ねるので、後から描いた面が手前になる */
function Surface({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} fill="#100e0c" />
      <rect x={x} y={y} width={w} height={h} fill="url(#hatch)" opacity="0.55" />
    </>
  )
}

/** バーだけは体より手前に描く。それ以外は背景として体より後ろに描く */
const IS_FOREGROUND = (p: Prop) => p.kind === 'bar'

function PropLayer({
  props,
  camera,
  foreground,
}: {
  props: Prop[]
  camera: Camera
  foreground?: boolean
}) {
  // 床 → 壁 → 台 の順に描く。後のものが塗りつぶしで手前に来るので、
  // 床の線が壁を突き抜けて見えることがなくなる
  const order = { ground: 0, wall: 1, block: 2, bar: 3, ball: 4 } as const
  const sorted = [...props]
    .filter((p) => !!foreground === IS_FOREGROUND(p))
    .sort((a, b) => order[a.kind] - order[b.kind])

  return (
    <g>
      {sorted.map((p, i) => {
        switch (p.kind) {
          case 'ground':
            return (
              <g key={i}>
                <Surface
                  x={camera.minX}
                  y={camera.minY}
                  w={camera.maxX - camera.minX}
                  h={-camera.minY}
                />
                <line
                  x1={camera.minX}
                  y1={0}
                  x2={camera.maxX}
                  y2={0}
                  stroke={STRUCTURE}
                  strokeWidth="2.5"
                />
              </g>
            )
          case 'wall': {
            const depth = Math.max(10, camera.maxX - p.x)
            const x0 = p.facing === 'left' ? p.x : p.x - depth
            return (
              <g key={i}>
                <Surface x={x0} y={camera.minY} w={depth} h={camera.maxY - camera.minY} />
                <line
                  x1={p.x}
                  y1={camera.minY}
                  x2={p.x}
                  y2={camera.maxY}
                  stroke={STRUCTURE}
                  strokeWidth="2.5"
                />
              </g>
            )
          }
          case 'block':
            return (
              <g key={i}>
                <Surface x={p.x} y={p.y} w={p.w} h={p.h} />
                <rect
                  x={p.x}
                  y={p.y}
                  width={p.w}
                  height={p.h}
                  fill="none"
                  stroke={STRUCTURE}
                  strokeWidth="2"
                />
              </g>
            )
          case 'bar':
            // バーは手に隠れやすいので、暗色ではなくアクセント色の輪で描く
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={3.4}
                fill="#100e0c"
                stroke={ACCENT}
                strokeWidth="2.2"
              />
            )
          case 'ball':
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill="none"
                stroke={ACCENT}
                strokeWidth="1.4"
              />
            )
        }
      })}
    </g>
  )
}

function jointPos(skeleton: Skeleton, joint: TrailJoint): Vec2 {
  switch (joint) {
    case 'head':
      return skeleton.head
    case 'shoulder':
      return skeleton.shoulder
    case 'pelvis':
      return skeleton.pelvis
    case 'chest':
      return skeleton.chest
    case 'wristNear':
      return skeleton.armNear.end
    case 'ankleNear':
      return skeleton.legNear.end
    case 'kneeNear':
      return skeleton.legNear.mid
  }
}

function GuideLayer({
  guides,
  camera,
  skeleton,
}: {
  guides?: Guide[]
  camera: Camera
  skeleton: Skeleton
}) {
  if (!guides?.length) return null
  return (
    <g stroke={ACCENT} strokeWidth="0.9" strokeDasharray="3 3" opacity="0.7" fill="none">
      {guides.map((g, i) => {
        if (g.kind === 'hline')
          return <line key={i} x1={camera.minX} y1={g.y} x2={camera.maxX} y2={g.y} />
        if (g.kind === 'vline')
          return <line key={i} x1={g.x} y1={camera.minY} x2={g.x} y2={camera.maxY} />
        if (g.kind === 'gap') {
          const a = jointPos(skeleton, g.from)
          return <line key={i} x1={a.x} y1={a.y} x2={g.to.x} y2={g.to.y} strokeDasharray="2 2" />
        }
        return null
      })}
    </g>
  )
}

function GuideLabels({
  guides,
  props,
  toScreen,
  camera,
}: {
  guides?: Guide[]
  props: Prop[]
  toScreen: (v: Vec2) => Vec2
  camera: Camera
}) {
  const labels: { at: Vec2; text: string; anchor: 'start' | 'end' | 'middle' }[] = []

  for (const g of guides ?? []) {
    // 水平の基準線は右端に右寄せで置く。左に置くと必ず棒人間と重なる
    if (g.kind === 'hline' && g.label)
      labels.push({
        at: toScreen({ x: camera.maxX - 2, y: g.y + 2.5 }),
        text: g.label,
        anchor: 'end',
      })
    if (g.kind === 'vline' && g.label)
      labels.push({
        at: toScreen({ x: g.x - 2, y: camera.maxY - 6 }),
        text: g.label,
        anchor: 'end',
      })
    if (g.kind === 'gap' && g.label)
      labels.push({ at: toScreen({ x: g.to.x + 3, y: g.to.y + 2 }), text: g.label, anchor: 'start' })
  }
  for (const p of props) {
    if (p.kind === 'block' && p.label)
      labels.push({
        at: toScreen({ x: p.x + p.w / 2, y: p.y + p.h + 3.5 }),
        text: p.label,
        anchor: 'middle',
      })
  }

  if (!labels.length) return null
  const FS = 4.5
  return (
    <g fontSize={FS} fontFamily="ui-sans-serif, system-ui, sans-serif">
      {labels.map((l, i) => {
        // 棒人間と重なっても読めるよう、文字の下に暗い帯を敷く。
        // 日本語は全角前提で概算するが、少し広めに取れば見た目は破綻しない
        const w = l.text.length * FS * 1.02 + 3
        const x =
          l.anchor === 'end' ? l.at.x - w + 1.5 : l.anchor === 'middle' ? l.at.x - w / 2 : l.at.x - 1.5
        return (
          <g key={i}>
            <rect
              x={x}
              y={l.at.y - FS + 0.4}
              width={w}
              height={FS + 2}
              rx={1.2}
              fill="#100e0c"
              opacity="0.82"
            />
            <text x={l.at.x} y={l.at.y} textAnchor={l.anchor} fill={ACCENT}>
              {l.text}
            </text>
          </g>
        )
      })}
    </g>
  )
}
