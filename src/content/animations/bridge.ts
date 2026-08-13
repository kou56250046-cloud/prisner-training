import type { Animation, Keyframe, Pose } from '@/anim/types'

/**
 * ブリッジ・シリーズのアニメーション。
 *
 * この章だけは背骨の反り（spineArch）が主役になる。体幹を直線で描くと
 * 「背中を弓なりにする」というこの種目の本質がまったく伝わらないため、
 * リグに背骨の曲線を持たせてある。
 *
 * 向きは全ステップ共通で、頭が +x（右）、足が -x（左）。あおむけで
 * お腹が上を向くので、spineArch は正の値で上向きに膨らむ。
 */

const BR_CAMERA = { minX: -4, maxX: 118, minY: -8, maxY: 84 }
/** 床のブリッジで手を置く位置（頭の横） */
const BR_HAND = { x: 96, y: 2 }
/** 床のブリッジで足を置く位置 */
const BR_FOOT = { x: 30, y: 4 }
// あおむけで手足を床につくので、肘と膝は必ず天井側へ折れる。
// 向きを逆にすると床を突き抜ける
const BR_ARM = { mode: 'ik', target: BR_HAND, bend: 1, ext: 180 } as const
const BR_LEG = { mode: 'ik', target: BR_FOOT, bend: -1, ext: 180 } as const

/** ブリッジ・ホールド。腕と脚を伸ばしきり、股関節を高く押し上げた姿勢 */
const BRIDGE_HOLD: Pose = {
  pelvis: { x: 53, y: 41 },
  torso: -12,
  head: -55,
  spineArch: 9,
  armNear: BR_ARM,
  legNear: BR_LEG,
}

/** ステップ1 ショート・ブリッジ（p.226-227） */
export const bridge01: Animation = {
  id: 'bridge-01',
  durationMs: 4000,
  camera: { minX: -4, maxX: 118, minY: -8, maxY: 60 },
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'pelvis' }],
  caption:
    'かかとは尻から15〜20センチの位置に。トップで太ももと胴体がほぼまっすぐになり、股関節がたるまないようにする。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        pelvis: { x: 55, y: 7 },
        torso: 0,
        head: 0,
        armNear: { mode: 'fk', upper: 170, lower: 170, ext: 170 },
        legNear: { mode: 'ik', target: { x: 35, y: 4 }, bend: -1, ext: 180 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 肩と足だけで体重を支え、太ももと胴体を一直線にする。
        // 肩と頭は床についたままなので、体幹の角度から骨盤の位置を決める
        pelvis: { x: 58.5, y: 22 },
        torso: -26.2,
        head: 0,
        spineArch: 2,
        armNear: { mode: 'fk', upper: 175, lower: 155, ext: 155 },
        legNear: { mode: 'ik', target: { x: 35, y: 4 }, bend: -1, ext: 180 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 55, y: 7 },
        torso: 0,
        head: 0,
        armNear: { mode: 'fk', upper: 170, lower: 170, ext: 170 },
        legNear: { mode: 'ik', target: { x: 35, y: 4 }, bend: -1, ext: 180 },
      },
    },
  ],
}

/** ステップ2 ストレート・ブリッジ（p.228-229） */
export const bridge02: Animation = {
  id: 'bridge-02',
  durationMs: 4000,
  camera: { minX: -20, maxX: 100, minY: -8, maxY: 70 },
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'pelvis' }],
  caption:
    '指はつま先と同じ方角へ向ける。トップでは顎を上げて天井を見る。体重は手のひらとかかとにかかる。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // 床に座って脚を前に伸ばし、上半身を脚に対して直角に立てる
        pelvis: { x: 54.8, y: 3.2 },
        torso: 84.6,
        head: 84.6,
        armNear: { mode: 'ik', target: { x: 58, y: 6 }, bend: -1, ext: -90 },
        legNear: { mode: 'ik', target: { x: 11, y: 3 }, bend: -1, ext: 60 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 脚と体幹が直線を描くまで股関節を押し上げる
        pelvis: { x: 27.2, y: 21.6 },
        torso: 25,
        head: 70,
        armNear: { mode: 'ik', target: { x: 58, y: 6 }, bend: -1, ext: -90 },
        legNear: { mode: 'ik', target: { x: -12.7, y: 3 }, bend: -1, ext: 60 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 54.8, y: 3.2 },
        torso: 84.6,
        head: 84.6,
        armNear: { mode: 'ik', target: { x: 58, y: 6 }, bend: -1, ext: -90 },
        legNear: { mode: 'ik', target: { x: 11, y: 3 }, bend: -1, ext: 60 },
      },
    },
  ],
}

/** ステップ3 アングルド・ブリッジ（p.230-231） */
export const bridge03: Animation = {
  id: 'bridge-03',
  durationMs: 4500,
  camera: { minX: -6, maxX: 118, minY: -8, maxY: 76 },
  props: [
    { kind: 'ground' },
    { kind: 'block', x: 45, y: 0, w: 68, h: 26, label: '膝の高さの寝台' },
  ],
  guides: [{ kind: 'trail', joint: 'pelvis' }],
  caption:
    '頭の両側に手を置き、指を足のほうへ向ける。腕は完全に伸ばす必要はない。数センチ持ち上がるだけでもよい。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // 寝台に横になり、股関節を端から外して垂らす
        pelvis: { x: 36.3, y: 25.8 },
        torso: 7,
        head: 0,
        armNear: { mode: 'ik', target: { x: 80, y: 26 }, bend: 1, ext: 180 },
        legNear: { mode: 'ik', target: { x: 8, y: 4 }, bend: -1, ext: 180 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 手を押し下げ、股関節を押し上げ、背中を弓なりにして寝台から離れる
        pelvis: { x: 33, y: 38 },
        torso: 5,
        head: -35,
        spineArch: 7,
        armNear: { mode: 'ik', target: { x: 80, y: 26 }, bend: 1, ext: 180 },
        legNear: { mode: 'ik', target: { x: 8, y: 4 }, bend: -1, ext: 180 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 36.3, y: 25.8 },
        torso: 7,
        head: 0,
        armNear: { mode: 'ik', target: { x: 80, y: 26 }, bend: 1, ext: 180 },
        legNear: { mode: 'ik', target: { x: 8, y: 4 }, bend: -1, ext: 180 },
      },
    },
  ],
}

/** ステップ4 ヘッド・ブリッジ（p.232-233） */
export const bridge04: Animation = {
  id: 'bridge-04',
  durationMs: 4500,
  camera: BR_CAMERA,
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'pelvis' }],
  caption:
    '頭蓋骨のてっぺんが床にやさしく触れるところまで腕と脚を曲げ、またブリッジ・ホールドに戻る。頭を床にぶつけないよう注意深く。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // 頭頂部が床に触れた、動作域の下端
        pelvis: { x: 52, y: 30 },
        torso: -20,
        head: -60,
        spineArch: 6,
        armNear: BR_ARM,
        legNear: BR_LEG,
      },
    },
    { t: 0.5, label: 'フィニッシュ', hold: 400, pose: BRIDGE_HOLD },
    {
      t: 1,
      pose: {
        pelvis: { x: 52, y: 30 },
        torso: -20,
        head: -60,
        spineArch: 6,
        armNear: BR_ARM,
        legNear: BR_LEG,
      },
    },
  ],
}

/** ステップ5 ハーフ・ブリッジ（p.234-235） */
export const bridge05: Animation = {
  id: 'bridge-05',
  durationMs: 4500,
  camera: BR_CAMERA,
  props: [{ kind: 'ground' }, { kind: 'ball', x: 52, y: 8, r: 8 }],
  guides: [{ kind: 'trail', joint: 'pelvis' }],
  caption:
    'ボールは腰のくびれた部分を支える。腰がボールに軽く触れるところで止め、ボールの上で休まないこと。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // 足裏・ボール・手のひらだけで体重を支える
        pelvis: { x: 52, y: 25 },
        torso: -8,
        head: -35,
        spineArch: 5,
        armNear: BR_ARM,
        legNear: BR_LEG,
      },
    },
    { t: 0.5, label: 'フィニッシュ', hold: 400, pose: BRIDGE_HOLD },
    {
      t: 1,
      pose: {
        pelvis: { x: 52, y: 25 },
        torso: -8,
        head: -35,
        spineArch: 5,
        armNear: BR_ARM,
        legNear: BR_LEG,
      },
    },
  ],
}

/** ステップ6 フル・ブリッジ（p.236-237） */
export const bridge06: Animation = {
  id: 'bridge-06',
  durationMs: 5000,
  camera: BR_CAMERA,
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'pelvis' }],
  caption:
    '腕が完全にまっすぐになるのが完璧なブリッジ。後ろにある壁が見えるまで、両腕の間で頭を後方に傾ける。下ろすときは急に落とさない。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // あおむけ。頭の横の床に手を置き、肘は天井を向く
        pelvis: { x: 52, y: 7 },
        torso: 0,
        head: 0,
        armNear: BR_ARM,
        legNear: BR_LEG,
      },
    },
    {
      // 途中を置かないと、股関節が直線で上がって膝が前後に大きく揺れる
      t: 0.25,
      pose: {
        pelvis: { x: 52.5, y: 25 },
        torso: -6,
        head: -28,
        spineArch: 5,
        armNear: BR_ARM,
        legNear: BR_LEG,
      },
    },
    { t: 0.5, label: 'フィニッシュ', hold: 400, pose: BRIDGE_HOLD },
    {
      t: 0.75,
      pose: {
        pelvis: { x: 52.5, y: 25 },
        torso: -6,
        head: -28,
        spineArch: 5,
        armNear: BR_ARM,
        legNear: BR_LEG,
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 52, y: 7 },
        torso: 0,
        head: 0,
        armNear: BR_ARM,
        legNear: BR_LEG,
      },
    },
  ],
}

/* ------------------------------------------------------------------
 * ステップ7以降は立った姿勢からブリッジへ移る。
 * 立位は骨盤 (60,48)・体幹90度で共通。
 * ---------------------------------------------------------------- */

/* 立位から後方に反っていく一連の姿勢。
 *
 * 壁は +x 側にあり、後ろに反ると肩は壁へ近づく。したがって体幹の角度は
 * 直立の 90 度から「減って」いく。ここを逆向きにすると、肩が壁から
 * 遠ざかったまま手だけが壁に届くことになり、腕が伸びきって破綻する。
 * 立ち位置は「壁から腕の長さ分」＝肩が壁から約38の距離。
 */
const WALL_X = 112
const STAND: Pose = {
  pelvis: { x: 74, y: 48 },
  torso: 90,
  head: 90,
  armNear: { mode: 'fk', upper: -85, lower: -85, ext: -85 },
  legNear: { mode: 'ik', target: { x: 74, y: 4 }, bend: 1, ext: -30 },
}

/** 壁に手をついて反り始めた姿勢。手は頭と同じ高さ */
const WALL_HIGH: Pose = {
  pelvis: { x: 68, y: 46 },
  torso: 70,
  head: 30,
  spineArch: 5,
  armNear: { mode: 'ik', target: { x: 107, y: 82 }, bend: 1, ext: 0 },
  legNear: { mode: 'ik', target: { x: 74, y: 4 }, bend: 1, ext: -30 },
}

/** 壁の中ほどまで手で歩いて下りた姿勢。足も少し前へ動かす */
const WALL_MID: Pose = {
  pelvis: { x: 66, y: 44 },
  torso: 45,
  head: -10,
  spineArch: 8,
  armNear: { mode: 'ik', target: { x: 107, y: 52 }, bend: 1, ext: 0 },
  legNear: { mode: 'ik', target: { x: 60, y: 4 }, bend: 1, ext: -30 },
}

/** 壁の根元で床に手をついたブリッジ・ホールド */
const WALL_BOTTOM: Pose = {
  pelvis: { x: 63, y: 41 },
  torso: -12,
  head: -55,
  spineArch: 9,
  armNear: { mode: 'ik', target: { x: 105, y: 3 }, bend: 1, ext: 180 },
  legNear: { mode: 'ik', target: { x: 40, y: 4 }, bend: 1, ext: -30 },
}

const WALL_PROPS: Animation['props'] = [
  { kind: 'ground' },
  { kind: 'wall', x: WALL_X, facing: 'left' },
]

function walkFrames(down: boolean): Keyframe[] {
  const seq = down
    ? [STAND, WALL_HIGH, WALL_MID, WALL_BOTTOM]
    : [WALL_BOTTOM, WALL_MID, WALL_HIGH, STAND]
  const n = seq.length - 1
  const forward: Keyframe[] = seq.map((pose, i) => ({
    t: (i / n) * 0.5,
    pose,
    ...(i === 0 ? { label: 'スタート', hold: 500 } : {}),
    ...(i === n ? { label: 'フィニッシュ', hold: 400 } : {}),
  }))
  const back: Keyframe[] = []
  for (let i = n - 1; i >= 0; i--) back.push({ t: 1 - (i / n) * 0.5, pose: seq[i]! })
  return [...forward, ...back]
}

/** ステップ7 ウォールウォーキング・ブリッジ（下向き）（p.238-239） */
export const bridge07: Animation = {
  id: 'bridge-07',
  durationMs: 6000,
  camera: { minX: 24, maxX: 126, minY: -8, maxY: 112 },
  props: WALL_PROPS,
  guides: [{ kind: 'trail', joint: 'head' }],
  caption:
    '壁から腕の長さ分だけ離れて立つ。手を交互に少しずつ下げて壁を「歩いて」下りる。歩幅を小さくしたほうが簡単。',
  keyframes: walkFrames(true),
}

/** ステップ8 ウォールウォーキング・ブリッジ（上向き）（p.240-241） */
export const bridge08: Animation = {
  id: 'bridge-08',
  durationMs: 6000,
  camera: { minX: 24, maxX: 126, minY: -8, maxY: 112 },
  props: WALL_PROPS,
  guides: [{ kind: 'trail', joint: 'head' }],
  caption:
    '床にあった手のひらを壁に戻す移行が、このステップでもっとも難しい。体が起きてきたら少しステップバックして壁に近づく。',
  keyframes: walkFrames(false),
}

/** ステップ9 クロージング・ブリッジ（p.242-243） */
export const bridge09: Animation = {
  id: 'bridge-09',
  durationMs: 5500,
  camera: { minX: 24, maxX: 126, minY: -8, maxY: 112 },
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'head' }],
  caption:
    '骨盤を前に押し出しながら膝を曲げ、同時に脊柱を反らせる。膝の屈曲と股関節の移動を合わせることが後ろへの転倒を防ぐ。後方に少なくとも身長分のスペースを確保すること。',
  keyframes: [
    { t: 0, label: 'スタート', hold: 500, pose: STAND },
    {
      t: 0.22,
      pose: {
        // 腰に手を置き、骨盤を前方へ押し出す
        pelvis: { x: 68, y: 47 },
        torso: 78,
        head: 50,
        spineArch: 4,
        // 腰のくびれに手を置く
        armNear: { mode: 'ik', target: { x: 73, y: 52 }, bend: 1, ext: -60 },
        legNear: { mode: 'ik', target: { x: 74, y: 4 }, bend: 1, ext: -30 },
      },
    },
    {
      t: 0.36,
      pose: {
        // 数メートル先の床が見えたら、手を肩越しに後方へ伸ばす
        pelvis: { x: 66, y: 45 },
        torso: 50,
        head: -5,
        spineArch: 8,
        // 手を肩越しに後方へ伸ばし、床へ向かう
        armNear: { mode: 'ik', target: { x: 104, y: 42 }, bend: 1, ext: 0 },
        legNear: { mode: 'ik', target: { x: 62, y: 4 }, bend: 1, ext: -30 },
      },
    },
    { t: 0.5, label: 'フィニッシュ', hold: 400, pose: WALL_BOTTOM },
    {
      t: 0.64,
      pose: {
        pelvis: { x: 66, y: 45 },
        torso: 50,
        head: -5,
        spineArch: 8,
        // 手を肩越しに後方へ伸ばし、床へ向かう
        armNear: { mode: 'ik', target: { x: 104, y: 42 }, bend: 1, ext: 0 },
        legNear: { mode: 'ik', target: { x: 62, y: 4 }, bend: 1, ext: -30 },
      },
    },
    {
      t: 0.78,
      pose: {
        pelvis: { x: 68, y: 47 },
        torso: 78,
        head: 50,
        spineArch: 4,
        // 腰のくびれに手を置く
        armNear: { mode: 'ik', target: { x: 73, y: 52 }, bend: 1, ext: -60 },
        legNear: { mode: 'ik', target: { x: 74, y: 4 }, bend: 1, ext: -30 },
      },
    },
    { t: 1, pose: STAND },
  ],
}

/** マスターステップ スタンド・トゥ・スタンド・ブリッジ（p.244-245） */
export const bridge10: Animation = {
  id: 'bridge-10',
  durationMs: 6500,
  camera: { minX: 24, maxX: 126, minY: -8, maxY: 112 },
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'head' }],
  caption:
    'ブリッジ・ホールドから太ももに体重を移し、手（最後は指）で体重を前へ送って床から離す。床を力任せに押すのではなく、体重移動の結果として離れること。',
  keyframes: [
    { t: 0, label: 'スタート', hold: 500, pose: STAND },
    {
      t: 0.3,
      pose: {
        pelvis: { x: 66, y: 45 },
        torso: 50,
        head: -5,
        spineArch: 8,
        armNear: { mode: 'ik', target: { x: 104, y: 42 }, bend: 1, ext: 0 },
        legNear: { mode: 'ik', target: { x: 62, y: 4 }, bend: 1, ext: -30 },
      },
    },
    { t: 0.5, label: 'ブリッジ・ホールド', hold: 500, pose: WALL_BOTTOM },
    {
      t: 0.72,
      pose: {
        // 体重を太ももへ移し、指が自然に床から離れていく
        pelvis: { x: 64, y: 43 },
        torso: 20,
        head: -30,
        spineArch: 8,
        // 手が床から離れていく途中
        armNear: { mode: 'ik', target: { x: 100, y: 24 }, bend: 1, ext: 180 },
        legNear: { mode: 'ik', target: { x: 50, y: 4 }, bend: 1, ext: -30 },
      },
    },
    { t: 1, label: 'フィニッシュ', hold: 400, pose: STAND },
  ],
}

export const bridgeAnimations: Record<string, Animation> = {
  'bridge-01': bridge01,
  'bridge-02': bridge02,
  'bridge-03': bridge03,
  'bridge-04': bridge04,
  'bridge-05': bridge05,
  'bridge-06': bridge06,
  'bridge-07': bridge07,
  'bridge-08': bridge08,
  'bridge-09': bridge09,
  'bridge-10': bridge10,
}
