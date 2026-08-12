import { DIM, step, toFk } from './rig'
import type { Animation, Keyframe, LimbPose, Pose, Vec2 } from './types'

/** 最短経路で角度を補間する（350度 → 10度 を 340度分回さない） */
export function lerpAngle(a: number, b: number, u: number): number {
  let d = ((b - a) % 360 + 540) % 360 - 180
  return a + d * u
}

export function lerpVec(a: Vec2, b: Vec2, u: number): Vec2 {
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }
}

/** 書籍の「ゆっくりとした一定のペース」に合う、加減速のなめらかなイージング */
export function easeInOutSine(u: number): number {
  return -(Math.cos(Math.PI * u) - 1) / 2
}

function lerpLimb(
  a: LimbPose,
  b: LimbPose,
  u: number,
  rootA: Vec2,
  rootB: Vec2,
  l1: number,
  l2: number,
): LimbPose {
  // 両端が IK なら接地点そのものを補間する。
  // こうすると壁や床に置いた手が、動作の途中でも一切ずれない。
  if (a.mode === 'ik' && b.mode === 'ik') {
    const out: LimbPose = {
      mode: 'ik',
      target: lerpVec(a.target, b.target, u),
      bend: u < 0.5 ? a.bend : b.bend,
    }
    if (a.ext !== undefined && b.ext !== undefined) out.ext = lerpAngle(a.ext, b.ext, u)
    return out
  }

  // 片方でも FK なら、双方を絶対角に落としてから角度補間する
  const fa = toFk(rootA, a, l1, l2)
  const fb = toFk(rootB, b, l1, l2)
  const out: LimbPose = {
    mode: 'fk',
    upper: lerpAngle(fa.upper, fb.upper, u),
    lower: lerpAngle(fa.lower, fb.lower, u),
  }
  const extA = fa.ext ?? fa.lower
  const extB = fb.ext ?? fb.lower
  out.ext = lerpAngle(extA, extB, u)
  return out
}

export function lerpPose(a: Pose, b: Pose, u: number): Pose {
  const pelvis = lerpVec(a.pelvis, b.pelvis, u)
  const torso = lerpAngle(a.torso, b.torso, u)

  const shoulderA = step(a.pelvis, a.torso, DIM.torso)
  const shoulderB = step(b.pelvis, b.torso, DIM.torso)

  return {
    pelvis,
    torso,
    head: lerpAngle(a.head, b.head, u),
    spineArch: (a.spineArch ?? 0) + ((b.spineArch ?? 0) - (a.spineArch ?? 0)) * u,
    armNear: lerpLimb(a.armNear, b.armNear, u, shoulderA, shoulderB, DIM.upperArm, DIM.forearm),
    armFar: lerpLimb(
      a.armFar ?? a.armNear,
      b.armFar ?? b.armNear,
      u,
      shoulderA,
      shoulderB,
      DIM.upperArm,
      DIM.forearm,
    ),
    legNear: lerpLimb(a.legNear, b.legNear, u, a.pelvis, b.pelvis, DIM.thigh, DIM.shin),
    legFar: lerpLimb(
      a.legFar ?? a.legNear,
      b.legFar ?? b.legNear,
      u,
      a.pelvis,
      b.pelvis,
      DIM.thigh,
      DIM.shin,
    ),
  }
}

/** キーフレームと hold を並べた、実時間のタイムライン */
export type Timeline = {
  totalMs: number
  /** 経過msから姿勢を取り出す */
  sample: (ms: number) => { pose: Pose; label?: string; holding: boolean }
  /** ラベル付きキーフレームの、タイムライン上の位置(ms) */
  marks: { ms: number; label: string }[]
}

type Segment =
  | { kind: 'hold'; ms: number; frame: Keyframe }
  | { kind: 'move'; ms: number; from: Keyframe; to: Keyframe }

export function buildTimeline(anim: Animation): Timeline {
  const kfs = [...anim.keyframes].sort((p, q) => p.t - q.t)
  const first = kfs[0]
  if (!first) throw new Error(`アニメーション ${anim.id} にキーフレームがありません`)

  const segments: Segment[] = []
  const marks: { ms: number; label: string }[] = []
  let cursor = 0

  for (let i = 0; i < kfs.length; i++) {
    const kf = kfs[i]!
    if (kf.label) marks.push({ ms: cursor, label: kf.label })
    if (kf.hold) {
      segments.push({ kind: 'hold', ms: kf.hold, frame: kf })
      cursor += kf.hold
    }
    const next = kfs[i + 1]
    if (next) {
      const ms = (next.t - kf.t) * anim.durationMs
      segments.push({ kind: 'move', ms, from: kf, to: next })
      cursor += ms
    }
  }

  const totalMs = Math.max(cursor, 1)

  const sample = (ms: number) => {
    let t = ((ms % totalMs) + totalMs) % totalMs
    for (const seg of segments) {
      if (t > seg.ms) {
        t -= seg.ms
        continue
      }
      if (seg.kind === 'hold') {
        const r: { pose: Pose; label?: string; holding: boolean } = {
          pose: seg.frame.pose,
          holding: true,
        }
        if (seg.frame.label) r.label = seg.frame.label
        return r
      }
      const u = easeInOutSine(seg.ms > 0 ? t / seg.ms : 1)
      const r: { pose: Pose; label?: string; holding: boolean } = {
        pose: lerpPose(seg.from.pose, seg.to.pose, u),
        holding: false,
      }
      const label = u < 0.02 ? seg.from.label : u > 0.98 ? seg.to.label : undefined
      if (label) r.label = label
      return r
    }
    const last = kfs[kfs.length - 1]!
    const r: { pose: Pose; label?: string; holding: boolean } = { pose: last.pose, holding: true }
    if (last.label) r.label = last.label
    return r
  }

  return { totalMs, sample, marks }
}
