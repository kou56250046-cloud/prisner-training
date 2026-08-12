/**
 * アニメーションの幾何を数値で検証する。
 *
 * 棒人間は目で見ても「なんとなく変」までしかわからないので、破綻を機械的に潰す:
 *   - 手足が床を突き抜けていないか
 *   - 接地させたはずの手首が動作中にずれていないか
 *   - 肘/膝が解剖学的にありえない角度になっていないか
 *
 * 残り57種目を作るときの回帰チェックとして使う。
 *   npm run verify
 */
import { buildTimeline } from '../src/anim/interpolate'
import { resolvePose } from '../src/anim/rig'
import type { Animation, Skeleton } from '../src/anim/types'
import { pushupAnimations } from '../src/content/animations/pushup'

const r1 = (n: number) => Math.round(n * 10) / 10

/** 3点から中央の関節の内角（度）を求める */
function jointAngle(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  const ab = Math.hypot(a.x - b.x, a.y - b.y)
  const cb = Math.hypot(c.x - b.x, c.y - b.y)
  const ac = Math.hypot(a.x - c.x, a.y - c.y)
  const cos = (ab * ab + cb * cb - ac * ac) / (2 * ab * cb)
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
}

function allPoints(s: Skeleton) {
  return [
    { name: '頭', p: s.head },
    { name: '肩', p: s.shoulder },
    { name: '骨盤', p: s.pelvis },
    { name: '肘', p: s.armNear.mid },
    { name: '手首', p: s.armNear.end },
    { name: '指先', p: s.armNear.tip },
    { name: '膝', p: s.legNear.mid },
    { name: '足首', p: s.legNear.end },
    { name: 'つま先', p: s.legNear.tip },
  ]
}

type Issue = { anim: string; msg: string }

function verify(anim: Animation): Issue[] {
  const issues: Issue[] = []
  const tl = buildTimeline(anim)
  const hasGround = anim.props.some((p) => p.kind === 'ground')
  const N = 60

  // 接地させた手首/足首は、動作中ずっと同じ位置にいなければならない
  const pinnedWrist = anim.keyframes.every((k) => k.pose.armNear.mode === 'ik')
  const wristPts: { x: number; y: number }[] = []

  for (let i = 0; i <= N; i++) {
    const s = resolvePose(tl.sample((i / N) * tl.totalMs).pose)
    wristPts.push(s.armNear.end)

    if (hasGround) {
      for (const { name, p } of allPoints(s)) {
        // 頭は半径ぶん余裕を見る
        const floor = name === '頭' ? 7 : 0
        if (p.y < floor - 1.0) {
          issues.push({
            anim: anim.id,
            msg: `${name}が床を突き抜けている (t=${r1(i / N)}, y=${r1(p.y)})`,
          })
        }
      }
    }

    const elbow = jointAngle(s.shoulder, s.armNear.mid, s.armNear.end)
    if (elbow < 25) {
      issues.push({ anim: anim.id, msg: `肘が畳まれすぎ (t=${r1(i / N)}, ${r1(elbow)}°)` })
    }
    const knee = jointAngle(s.pelvis, s.legNear.mid, s.legNear.end)
    if (knee < 25) {
      issues.push({ anim: anim.id, msg: `膝が畳まれすぎ (t=${r1(i / N)}, ${r1(knee)}°)` })
    }
  }

  if (pinnedWrist) {
    const xs = wristPts.map((p) => p.x)
    const ys = wristPts.map((p) => p.y)
    const drift = Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
    )
    if (drift > 0.5) {
      issues.push({ anim: anim.id, msg: `接地した手首が ${r1(drift)} ずれている` })
    }
  }

  return issues
}

const all: Record<string, Animation> = { ...pushupAnimations }
const issues: Issue[] = []

for (const [id, anim] of Object.entries(all)) {
  console.log(`\n=== ${id} ===`)
  const tl = buildTimeline(anim)
  for (const kf of anim.keyframes) {
    const s = resolvePose(kf.pose)
    console.log(
      `  t=${kf.t}${kf.label ? ` [${kf.label}]` : ''}  ` +
        `肘=${r1(jointAngle(s.shoulder, s.armNear.mid, s.armNear.end))}° ` +
        `膝=${r1(jointAngle(s.pelvis, s.legNear.mid, s.legNear.end))}° ` +
        `頭=(${r1(s.head.x)},${r1(s.head.y)}) ` +
        `手首=(${r1(s.armNear.end.x)},${r1(s.armNear.end.y)}) ` +
        `つま先=(${r1(s.legNear.tip.x)},${r1(s.legNear.tip.y)})`,
    )
  }
  console.log(`  総再生時間 ${tl.totalMs}ms`)
  issues.push(...verify(anim))
}

console.log('\n--------------------------------')
if (issues.length === 0) {
  console.log(`✓ ${Object.keys(all).length}件のアニメーション、問題なし`)
} else {
  for (const i of issues) console.log(`✗ [${i.anim}] ${i.msg}`)
  process.exitCode = 1
}
