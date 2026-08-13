import type { Animation, Keyframe, Pose } from '@/anim/types'

/**
 * ハンドスタンド・プッシュアップ・シリーズのアニメーション。
 *
 * 逆立ちなので体幹の向きが上下反転する。骨盤が上、肩が下にくるので
 * torso は -90 付近（骨盤から見て肩が真下）になる。
 * 壁は右（+x）に置き、かかとを壁に触れさせる。
 */

const HS_CAMERA = { minX: 20, maxX: 120, minY: -8, maxY: 118 }
const HS_WALL_X = 108
/** 手を置く位置。壁から15〜25センチ（およそ12単位）離す */
const HS_HAND = { x: 96, y: 2 }
const HS_PROPS: Animation['props'] = [
  { kind: 'ground' },
  { kind: 'wall', x: HS_WALL_X, facing: 'left' },
]

/**
 * 逆立ちの姿勢をつくる。
 * @param shoulderY 肩の高さ。腕を曲げるほど低くなる
 */
function handstandPose(shoulderY: number, opts: Partial<Pose> = {}): Pose {
  // 肩は手の真上あたり。骨盤はその上に体幹の長さだけ伸びる
  const shoulder = { x: 96, y: shoulderY }
  const pelvis = { x: shoulder.x + 2, y: shoulder.y + 34 }
  return {
    pelvis,
    // 骨盤から見て肩は真下。わずかに壁側へ倒して背側のアーチをつくる
    torso: -93,
    // 頭は肩から下向き（逆立ちなので床を向く）
    head: -80,
    spineArch: -3,
    armNear: { mode: 'ik', target: HS_HAND, bend: 1, ext: 0 },
    // かかとを壁につけた、ほぼまっすぐな脚
    legNear: { mode: 'fk', upper: 84, lower: 84, ext: 20 },
    ...opts,
  }
}

/** 腕を伸ばしきった逆立ち。肩は手のひらから腕の長さ分だけ上 */
const HS_TOP = handstandPose(35)
/** 頭頂が床に触れた位置 */
const HS_BOTTOM = handstandPose(20, { head: -80 })
/** 動作域の半分 */
const HS_HALF = handstandPose(27)

/** 上下運動する種目の往復キーフレーム */
function hspuKeyframes(top: Pose, bottom: Pose): Keyframe[] {
  return [
    { t: 0, label: 'スタート', hold: 500, pose: top },
    { t: 0.5, label: 'フィニッシュ', hold: 400, pose: bottom },
    { t: 1, pose: top },
  ]
}

/** ステップ1 ウォール・ヘッドスタンド（p.264-265） */
export const hspu01: Animation = {
  id: 'hspu-01',
  asymmetric: true,
  durationMs: 4000,
  camera: HS_CAMERA,
  props: [...HS_PROPS, { kind: 'block', x: 90, y: 0, w: 14, h: 3, label: 'クッション' }],
  guides: [],
  caption:
    '頭頂をクッションに置き、頭の両側に肩幅で手をつく。強いほうの脚を押し下げながら、もう一方を蹴り上げて壁を「見つける」。口を閉じ、鼻で呼吸する。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 600,
      pose: {
        // 手と膝を床につけ、片脚を引きつけた蹴り上げ前の姿勢
        pelvis: { x: 64, y: 42 },
        torso: -30,
        head: -70,
        armNear: { mode: 'ik', target: { x: 92, y: 2 }, bend: 1, ext: 0 },
        // 蹴る脚は後ろにまっすぐ、支える脚は膝を肘に引きつける
        legNear: { mode: 'ik', target: { x: 56, y: 4 }, bend: -1, ext: 20 },
        legFar: { mode: 'fk', upper: -120, lower: -60, ext: 20 },
      },
    },
    {
      // 蹴り上げの途中。ここを置かないと脚がありえない角度に折れる
      t: 0.25,
      pose: {
        pelvis: { x: 80, y: 52 },
        torso: -70,
        head: -30,
        armNear: { mode: 'ik', target: { x: 92, y: 2 }, bend: 1, ext: 0 },
        // 蹴る脚が先に上がり、支える脚が床を離れて追いかける
        legNear: { mode: 'fk', upper: 40, lower: 60, ext: 20 },
        legFar: { mode: 'fk', upper: -60, lower: -80, ext: 20 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 900,
      pose: {
        // 頭頂・両手の三点で支え、脚を伸ばして壁に沿わせる
        pelvis: { x: 96, y: 56 },
        torso: -93,
        head: -80,
        spineArch: -2,
        armNear: { mode: 'ik', target: { x: 92, y: 2 }, bend: 1, ext: 0 },
        legNear: { mode: 'fk', upper: 86, lower: 86, ext: 20 },
        legFar: { mode: 'fk', upper: 82, lower: 82, ext: 20 },
      },
    },
    {
      t: 0.75,
      pose: {
        pelvis: { x: 80, y: 52 },
        torso: -70,
        head: -30,
        armNear: { mode: 'ik', target: { x: 92, y: 2 }, bend: 1, ext: 0 },
        // 蹴る脚が先に上がり、支える脚が床を離れて追いかける
        legNear: { mode: 'fk', upper: 40, lower: 60, ext: 20 },
        legFar: { mode: 'fk', upper: -60, lower: -80, ext: 20 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 64, y: 42 },
        torso: -30,
        head: -70,
        armNear: { mode: 'ik', target: { x: 92, y: 2 }, bend: 1, ext: 0 },
        // 蹴る脚は後ろにまっすぐ、支える脚は膝を肘に引きつける
        legNear: { mode: 'ik', target: { x: 56, y: 4 }, bend: -1, ext: 20 },
        legFar: { mode: 'fk', upper: -120, lower: -60, ext: 20 },
      },
    },
  ],
}

/** ステップ2 クロウ・スタンド（p.266-267） */
export const hspu02: Animation = {
  id: 'hspu-02',
  durationMs: 4000,
  camera: { minX: 40, maxX: 130, minY: -8, maxY: 70 },
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'kneeNear' }],
  caption:
    '肘の外側に膝をしっかり乗せ、少しずつ体を前に傾けて体重を手のひらへ移す。胸側に倒れそうになったら指で強く押す。背側に倒れないよう脚をきちんと上げる。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // しゃがんで手を床につき、肘の外側に膝を置く
        pelvis: { x: 88, y: 44 },
        torso: -70,
        head: 0,
        armNear: { mode: 'ik', target: { x: 100, y: 2 }, bend: 1, ext: 0 },
        legNear: { mode: 'ik', target: { x: 76, y: 4 }, bend: -1, ext: 30 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 900,
      pose: {
        // バランス点が足から手へ移り、足が床から浮く
        pelvis: { x: 92, y: 52 },
        torso: -75,
        head: 0,
        armNear: { mode: 'ik', target: { x: 100, y: 2 }, bend: 1, ext: 0 },
        legNear: { mode: 'fk', upper: -55, lower: 155, ext: 160 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 88, y: 44 },
        torso: -70,
        head: 0,
        armNear: { mode: 'ik', target: { x: 100, y: 2 }, bend: 1, ext: 0 },
        legNear: { mode: 'ik', target: { x: 76, y: 4 }, bend: -1, ext: -20 },
      },
    },
  ],
}

/** ステップ3 ウォール・ハンドスタンド（p.268-269） */
export const hspu03: Animation = {
  id: 'hspu-03',
  asymmetric: true,
  durationMs: 4000,
  camera: HS_CAMERA,
  props: HS_PROPS,
  guides: [],
  caption:
    '両足のかかとが同時に壁に触れるようにする。腕はまっすぐ、体は壁に向かってわずかにアーチを描きつつ腕と整列させる。自然呼吸で姿勢を保つ。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 600,
      pose: {
        // 手をついて膝を曲げ、蹴り上げる直前
        pelvis: { x: 64.6, y: 45 },
        torso: -30,
        head: -75,
        armNear: { mode: 'ik', target: HS_HAND, bend: 1, ext: 0 },
        legNear: { mode: 'ik', target: { x: 58, y: 4 }, bend: -1, ext: 20 },
        legFar: { mode: 'fk', upper: -120, lower: -60, ext: 20 },
      },
    },
    {
      t: 0.28,
      pose: {
        pelvis: { x: 82, y: 58 },
        torso: -62,
        head: -78,
        armNear: { mode: 'ik', target: HS_HAND, bend: 1, ext: 0 },
        legNear: { mode: 'fk', upper: 40, lower: 60, ext: 20 },
        legFar: { mode: 'fk', upper: -60, lower: -80, ext: 20 },
      },
    },
    { t: 0.5, label: 'フィニッシュ', hold: 1000, pose: HS_TOP },
    {
      t: 0.72,
      pose: {
        pelvis: { x: 82, y: 58 },
        torso: -62,
        head: -78,
        armNear: { mode: 'ik', target: HS_HAND, bend: 1, ext: 0 },
        legNear: { mode: 'fk', upper: 40, lower: 60, ext: 20 },
        legFar: { mode: 'fk', upper: -60, lower: -80, ext: 20 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 64.6, y: 45 },
        torso: -30,
        head: -75,
        armNear: { mode: 'ik', target: HS_HAND, bend: 1, ext: 0 },
        legNear: { mode: 'ik', target: { x: 58, y: 4 }, bend: -1, ext: 20 },
        legFar: { mode: 'fk', upper: -120, lower: -60, ext: 20 },
      },
    },
  ],
}

/** ステップ4 ハーフ・ハンドスタンド・プッシュアップ（p.270-271） */
export const hspu04: Animation = {
  id: 'hspu-04',
  durationMs: 4000,
  camera: HS_CAMERA,
  props: HS_PROPS,
  guides: [{ kind: 'trail', joint: 'head' }],
  caption:
    '動作域はおよそ15センチ。頭頂が床に触れるまでの距離の半分まで下ろす。最初は体を下げすぎないよう注意する。',
  keyframes: hspuKeyframes(HS_TOP, HS_HALF),
}

/** ステップ5 ハンドスタンド・プッシュアップ（p.272-273） */
export const hspu05: Animation = {
  id: 'hspu-05',
  durationMs: 4500,
  camera: HS_CAMERA,
  props: HS_PROPS,
  guides: [{ kind: 'trail', joint: 'head' }],
  caption:
    '頭頂が床と軽く接触するまで下ろす。頭を守るため「キス・ザ・ベイビー」のようにやさしく触れること。戻るときは細心の注意を払って筋肉を制御する。',
  keyframes: hspuKeyframes(HS_TOP, HS_BOTTOM),
}

/** ステップ6 クローズ・ハンドスタンド・プッシュアップ（p.274-275） */
export const hspu06: Animation = {
  id: 'hspu-06',
  durationMs: 4500,
  camera: HS_CAMERA,
  props: HS_PROPS,
  guides: [{ kind: 'trail', joint: 'head' }],
  caption:
    '両手の人差し指を触れ合わせる（真横からでは手の間隔が見えない）。肘を前方に向かわせながら下ろす。手が近づくと肩帯が使えなくなり、肘に大きな負荷がかかる。',
  keyframes: hspuKeyframes(HS_TOP, HS_BOTTOM),
}

/** ステップ7 アンイーブン・ハンドスタンド・プッシュアップ（p.276-277） */
export const hspu07: Animation = {
  id: 'hspu-07',
  durationMs: 4500,
  camera: HS_CAMERA,
  asymmetric: true,
  props: [...HS_PROPS, { kind: 'ball', x: 82, y: 6, r: 6 }],
  guides: [{ kind: 'trail', joint: 'head' }],
  caption:
    '壁のすぐ前にボールを置き、片手をその上に乗せる。体からボールまでの距離が肩幅になるようにする。床の手はまっすぐ、ボールの手は曲がる。最初は積み重ねた本など安定した物から始めるとよい。',
  keyframes: hspuKeyframes(
    handstandPose(35, {
      armNear: { mode: 'ik', target: { x: 82, y: 12 }, bend: 1, ext: 0 },
      armFar: { mode: 'ik', target: HS_HAND, bend: 1, ext: 0 },
    }),
    handstandPose(23, {
      armNear: { mode: 'ik', target: { x: 82, y: 12 }, bend: 1, ext: 0 },
      armFar: { mode: 'ik', target: HS_HAND, bend: 1, ext: 0 },
    }),
  ),
}

/** 空いている腕をバランス用に体から離した姿勢 */
const FREE_ARM_OUT = { mode: 'fk', upper: -150, lower: -170, ext: -170 } as const

/** ステップ8 ハーフ・ワンアーム・ハンドスタンド・プッシュアップ（p.278-279） */
export const hspu08: Animation = {
  id: 'hspu-08',
  durationMs: 4500,
  camera: HS_CAMERA,
  asymmetric: true,
  props: HS_PROPS,
  guides: [{ kind: 'trail', joint: 'head' }],
  caption:
    '片方の手のひらから数秒かけて少しずつ力を抜き、体重を反対側へ移す。浮いた手はバランスのために体から離す。指ではなく手のひらで押すこと。',
  keyframes: hspuKeyframes(
    handstandPose(35, { armFar: FREE_ARM_OUT }),
    handstandPose(27, { armFar: FREE_ARM_OUT }),
  ),
}

/** ステップ9 レバー・ハンドスタンド・プッシュアップ（p.280-281） */
export const hspu09: Animation = {
  id: 'hspu-09',
  durationMs: 5000,
  camera: { minX: 8, maxX: 120, minY: -8, maxY: 118 },
  asymmetric: true,
  props: HS_PROPS,
  guides: [{ kind: 'trail', joint: 'head' }],
  caption:
    '空いている手は甲を床に向け、指先を体と反対側へ向けてまっすぐ伸ばす。体重の約9割を支える腕に乗せる。手のひらと手の甲を同時に押して戻る。腕を体に近づけると負荷が減る。',
  keyframes: hspuKeyframes(
    handstandPose(35, {
      armFar: { mode: 'ik', target: { x: 86, y: 4 }, bend: 1, ext: 180 },
    }),
    handstandPose(20, {
      armFar: { mode: 'ik', target: { x: 86, y: 4 }, bend: 1, ext: 180 },
    }),
  ),
}

/** マスターステップ ワンアーム・ハンドスタンド・プッシュアップ（p.282-283） */
export const hspu10: Animation = {
  id: 'hspu-10',
  durationMs: 5000,
  camera: HS_CAMERA,
  asymmetric: true,
  props: HS_PROPS,
  guides: [{ kind: 'trail', joint: 'head' }],
  caption:
    'かかとを壁につけ、体はゆるやかなアーチでバランスを保つ。倒れそうになった時の助けにするため、空いている腕を準備しておく。ボトムから抜け出すときは、膝を曲げて素早く伸ばす推進力を使ってもよい。',
  keyframes: hspuKeyframes(
    handstandPose(35, { armFar: FREE_ARM_OUT }),
    handstandPose(20, { armFar: FREE_ARM_OUT }),
  ),
}

export const hspuAnimations: Record<string, Animation> = {
  'hspu-01': hspu01,
  'hspu-02': hspu02,
  'hspu-03': hspu03,
  'hspu-04': hspu04,
  'hspu-05': hspu05,
  'hspu-06': hspu06,
  'hspu-07': hspu07,
  'hspu-08': hspu08,
  'hspu-09': hspu09,
  'hspu-10': hspu10,
}
