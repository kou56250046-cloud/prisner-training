import type { LimbPose, Pose, ResolvedLimb, Skeleton, Vec2 } from './types'

/**
 * 身体寸法。身長がおよそ 100 単位になるよう調整してある。
 * 直立時: 足首0 → 膝22 → 股関節44 → 肩78 → 頭中心90 → 頭頂97
 */
export const DIM = {
  shin: 22,
  thigh: 22,
  torso: 34,
  neck: 12,
  headR: 7,
  upperArm: 17,
  forearm: 16,
  hand: 5,
  foot: 8,
} as const

const RAD = Math.PI / 180

export function dir(deg: number): Vec2 {
  return { x: Math.cos(deg * RAD), y: Math.sin(deg * RAD) }
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function scale(a: Vec2, k: number): Vec2 {
  return { x: a.x * k, y: a.y * k }
}

export function len(a: Vec2): number {
  return Math.hypot(a.x, a.y)
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** ワールド角（度）を返す */
export function angleOf(v: Vec2): number {
  return Math.atan2(v.y, v.x) / RAD
}

/** origin から deg 方向に length だけ進んだ点 */
export function step(origin: Vec2, deg: number, length: number): Vec2 {
  return add(origin, scale(dir(deg), length))
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * 2ボーンの逆運動学。origin から target へ届くように上腕/前腕の絶対角を求める。
 * bend が +1 なら肘（膝）は進行方向に対して反時計回り側に出る。
 *
 * target が届かない距離にある場合は、届く範囲に丸めて解く（腕が伸びきった状態）。
 * これがないと、写真から起こした接地点がわずかにずれただけで描画が破綻する。
 */
export function solveTwoBone(
  origin: Vec2,
  target: Vec2,
  l1: number,
  l2: number,
  bend: 1 | -1,
): { upper: number; lower: number } {
  const delta = sub(target, origin)
  const dRaw = len(delta)
  // 完全に伸びきる/折りたたまれる特異点を避けるため、わずかに内側へ丸める
  const d = clamp(dRaw, Math.abs(l1 - l2) + 0.001, l1 + l2 - 0.001)
  const base = angleOf(delta)
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)
  const a = Math.acos(cosA) / RAD

  const upper = base + bend * a
  const elbow = step(origin, upper, l1)
  const lower = angleOf(sub(target, elbow))
  return { upper, lower }
}

/** 手足の姿勢を、実際の関節座標に解決する */
export function resolveLimb(
  root: Vec2,
  limb: LimbPose,
  l1: number,
  l2: number,
  l3: number,
): ResolvedLimb {
  let upper: number
  let lower: number
  let end: Vec2

  if (limb.mode === 'ik') {
    const solved = solveTwoBone(root, limb.target, l1, l2, limb.bend)
    upper = solved.upper
    lower = solved.lower
    // 接地点は指定された座標をそのまま使う（IK の丸めで浮かないように）
    end = limb.target
  } else {
    upper = limb.upper
    lower = limb.lower
    end = step(step(root, upper, l1), lower, l2)
  }

  const mid = step(root, upper, l1)
  const tip = step(end, limb.ext ?? lower, l3)
  return { root, mid, end, tip }
}

/** Pose を描画可能な骨格に解決する */
export function resolvePose(pose: Pose): Skeleton {
  const pelvis = pose.pelvis
  const shoulder = step(pelvis, pose.torso, DIM.torso)
  const head = step(shoulder, pose.head, DIM.neck)
  // 胸の位置（「胸が床からこぶしひとつ」などの基準に使う）
  const chest = step(pelvis, pose.torso, DIM.torso * 0.72)

  const armFarPose = pose.armFar ?? pose.armNear
  const legFarPose = pose.legFar ?? pose.legNear

  return {
    pelvis,
    shoulder,
    head,
    chest,
    armNear: resolveLimb(shoulder, pose.armNear, DIM.upperArm, DIM.forearm, DIM.hand),
    armFar: resolveLimb(shoulder, armFarPose, DIM.upperArm, DIM.forearm, DIM.hand),
    legNear: resolveLimb(pelvis, pose.legNear, DIM.thigh, DIM.shin, DIM.foot),
    legFar: resolveLimb(pelvis, legFarPose, DIM.thigh, DIM.shin, DIM.foot),
  }
}

/** 手足の姿勢を FK（絶対角）表現に正規化する。補間の前処理に使う */
export function toFk(
  root: Vec2,
  limb: LimbPose,
  l1: number,
  l2: number,
): { mode: 'fk'; upper: number; lower: number; ext?: number } {
  if (limb.mode === 'fk') return limb
  const { upper, lower } = solveTwoBone(root, limb.target, l1, l2, limb.bend)
  return limb.ext === undefined
    ? { mode: 'fk', upper, lower }
    : { mode: 'fk', upper, lower, ext: limb.ext }
}
