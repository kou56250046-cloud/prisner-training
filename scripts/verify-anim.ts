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
import { DIM, resolvePose } from '../src/anim/rig'
import type { Animation, Skeleton } from '../src/anim/types'
import { animations } from '../src/content/animations'

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

/**
 * IK のターゲットが手足の届く範囲にあるか。
 * 届かない位置を指定すると、腕や脚が伸びきったまま目標に届かず、
 * 見た目には「関節が外れている」ように見える。
 */
function checkReach(anim: Animation): Issue[] {
  const out: Issue[] = []
  for (const kf of anim.keyframes) {
    const s = resolvePose(kf.pose)
    const checks: [string, { x: number; y: number } | undefined, { x: number; y: number }, number][] =
      [
        ['腕', kf.pose.armNear.mode === 'ik' ? kf.pose.armNear.target : undefined, s.shoulder, DIM.upperArm + DIM.forearm],
        ['奥の腕', kf.pose.armFar?.mode === 'ik' ? kf.pose.armFar.target : undefined, s.shoulder, DIM.upperArm + DIM.forearm],
        ['脚', kf.pose.legNear.mode === 'ik' ? kf.pose.legNear.target : undefined, s.pelvis, DIM.thigh + DIM.shin],
        ['奥の脚', kf.pose.legFar?.mode === 'ik' ? kf.pose.legFar.target : undefined, s.pelvis, DIM.thigh + DIM.shin],
      ]
    for (const [name, target, root, reach] of checks) {
      if (!target) continue
      const d = Math.hypot(target.x - root.x, target.y - root.y)
      // 腕を伸ばしきる姿勢では丸め誤差で数値がわずかに超える。
      // 1単位（身長の1%）までは見た目に影響しないので許容する
      if (d > reach + 1) {
        out.push({
          anim: anim.id,
          msg: `t=${kf.t} の${name}のIKターゲットが届かない（距離 ${r1(d)} > 到達長 ${reach}）`,
        })
      }
    }
  }
  return out
}

function verify(anim: Animation): Issue[] {
  const issues: Issue[] = [...checkReach(anim)]
  const tl = buildTimeline(anim)
  const hasGround = anim.props.some((p) => p.kind === 'ground')
  const N = 60

  // 全キーフレームで同じ位置にある関節は「接地点」とみなす。
  // 接地点が動作の途中で動いたら、そのフォームは物理的にありえない。
  // FK で角度だけを補間すると簡単にこれが起きるので、機械的に検出する。
  const kfSkeletons = anim.keyframes.map((k) => resolvePose(k.pose))
  const pinned = allPoints(kfSkeletons[0]!)
    .map((_, idx) => idx)
    .filter((idx) => {
      const first = allPoints(kfSkeletons[0]!)[idx]!.p
      return kfSkeletons.every((s) => {
        const p = allPoints(s)[idx]!.p
        return Math.hypot(p.x - first.x, p.y - first.y) < 0.5
      })
    })
  const pinnedTracks = new Map<number, { x: number; y: number }[]>(pinned.map((i) => [i, []]))

  for (let i = 0; i <= N; i++) {
    const s = resolvePose(tl.sample((i / N) * tl.totalMs).pose)
    const pts = allPoints(s)
    for (const idx of pinned) pinnedTracks.get(idx)!.push(pts[idx]!.p)

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

  const names = allPoints(kfSkeletons[0]!)
  for (const idx of pinned) {
    const track = pinnedTracks.get(idx)!
    const first = track[0]!
    const drift = Math.max(...track.map((p) => Math.hypot(p.x - first.x, p.y - first.y)))
    // 骨盤を根とした順運動学なので、床についた肩などは補間中にわずかに動く。
    // 身長100に対して1.5未満のズレは目で見てもわからないため許容し、
    // それを超えるものだけを「接地が破綻している」として弾く。
    if (drift > 1.5) {
      issues.push({
        anim: anim.id,
        msg: `接地点であるはずの${names[idx]!.name}が動作中に ${r1(drift)} ずれている（IK でピン留めすべき）`,
      })
    }
  }

  return issues
}

const all: Record<string, Animation> = animations
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
