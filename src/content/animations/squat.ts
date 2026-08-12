import type { Animation, Keyframe, Pose } from '@/anim/types'

/**
 * スクワット・シリーズのアニメーション。
 * 角度は原本 p.115 / p.117 の写真から起こしたもの。
 *
 * 注意: スキャン画像のファイル番号は、この章では「書籍のページ番号 - 1」になっている。
 * プッシュアップ章（オフセット0）とズレているので、写真を見るときは必ず
 * ページ下部のノンブルで確認すること。
 */

/** ステップ1 ショルダースタンド・スクワット（p.114-115） */
export const squat01: Animation = {
  id: 'squat-01',
  durationMs: 4000,
  camera: { minX: -2, maxX: 78, minY: -8, maxY: 100 },
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'kneeNear' }],
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // 肩・背中・上腕で体を支え、脚を垂直に立てる。首に体重を乗せない
        pelvis: { x: 50, y: 42 },
        torso: -90,
        head: 175,
        armNear: { mode: 'ik', target: { x: 44, y: 20 }, bend: 1, ext: 60 },
        legNear: { mode: 'fk', upper: 90, lower: 90, ext: 100 },
      },
    },
    {
      // 中間姿勢。これがないと、太ももの角度が最短経路で回ってしまい、
      // 膝が体の外側（右）を通る＝実際とは逆向きの軌道になる。
      // 股関節を屈曲させて膝を体の前（頭側）に運ぶ経路を、ここで固定する。
      t: 0.25,
      pose: {
        pelvis: { x: 42.9, y: 41.3 },
        torso: -78,
        head: 175,
        armNear: { mode: 'ik', target: { x: 43, y: 22 }, bend: 1, ext: 60 },
        legNear: { mode: 'fk', upper: 130, lower: 90, ext: 100 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 体幹をできるだけまっすぐ保ったまま、膝が額に触れるまで折りたたむ。
        // あおむけなので額は上を向いている。膝は頭の「横」ではなく「真上」に降りてくる
        pelvis: { x: 35.8, y: 38.9 },
        torso: -65.3,
        head: 175,
        armNear: { mode: 'ik', target: { x: 41, y: 21 }, bend: 1, ext: 60 },
        legNear: { mode: 'fk', upper: -84.3, lower: 160, ext: 200 },
      },
    },
    {
      t: 0.75,
      pose: {
        pelvis: { x: 42.9, y: 41.3 },
        torso: -78,
        head: 175,
        armNear: { mode: 'ik', target: { x: 43, y: 22 }, bend: 1, ext: 60 },
        legNear: { mode: 'fk', upper: 130, lower: 90, ext: 100 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 50, y: 42 },
        torso: -90,
        head: 175,
        armNear: { mode: 'ik', target: { x: 44, y: 20 }, bend: 1, ext: 60 },
        legNear: { mode: 'fk', upper: 90, lower: 90, ext: 100 },
      },
    },
  ],
}

/** ステップ2 ジャックナイフ・スクワット（p.116-117） */
export const squat02: Animation = {
  id: 'squat-02',
  durationMs: 4000,
  camera: { minX: 8, maxX: 126, minY: -8, maxY: 72 },
  props: [
    { kind: 'ground' },
    { kind: 'block', x: 78.5, y: 0, w: 42, h: 28, label: '膝の高さの台' },
  ],
  guides: [{ kind: 'trail', joint: 'pelvis' }],
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // 脚はまっすぐ。股関節だけを折って前傾し、手を台につく
        pelvis: { x: 30, y: 48 },
        torso: 15.4,
        head: -5,
        armNear: { mode: 'ik', target: { x: 78.5, y: 28 }, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: { x: 30, y: 4 }, bend: 1, ext: -30 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // ハムストリングスがふくらはぎに付くまで沈む。かかとは床から離さない
        pelvis: { x: 22, y: 12 },
        torso: 20,
        head: 0,
        armNear: { mode: 'ik', target: { x: 78.5, y: 28 }, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: { x: 30, y: 4 }, bend: 1, ext: -30 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 30, y: 48 },
        torso: 15.4,
        head: -5,
        armNear: { mode: 'ik', target: { x: 78.5, y: 28 }, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: { x: 30, y: 4 }, bend: 1, ext: -30 },
      },
    },
  ],
}

/** ステップ3 サポーティド・スクワット（p.118-119） */
export const squat03: Animation = {
  id: 'squat-03',
  durationMs: 4500,
  camera: { minX: 2, maxX: 96, minY: -8, maxY: 100 },
  props: [
    { kind: 'ground' },
    { kind: 'block', x: 48, y: 0, w: 40, h: 52, label: '太ももより高い台' },
  ],
  guides: [{ kind: 'trail', joint: 'pelvis' }],
  caption:
    '腕はできるだけまっすぐに保ち、引き上げるのではなく下向きに押して補助する。楽になるごとに腕にかける力を弱めていく。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // 腕を前に伸ばして下ろし、台に手のひらをつける
        pelvis: { x: 30, y: 48 },
        torso: 78,
        head: 80,
        armNear: { mode: 'ik', target: { x: 48, y: 52 }, bend: -1, ext: -20 },
        legNear: { mode: 'ik', target: { x: 30, y: 4 }, bend: 1, ext: -30 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 背中をまっすぐ保ったまま、ハムストリングスがふくらはぎに当たるまで沈む
        pelvis: { x: 22, y: 12 },
        torso: 68,
        head: 70,
        armNear: { mode: 'ik', target: { x: 48, y: 52 }, bend: -1, ext: -20 },
        legNear: { mode: 'ik', target: { x: 30, y: 4 }, bend: 1, ext: -30 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 30, y: 48 },
        torso: 78,
        head: 80,
        armNear: { mode: 'ik', target: { x: 48, y: 52 }, bend: -1, ext: -20 },
        legNear: { mode: 'ik', target: { x: 30, y: 4 }, bend: 1, ext: -30 },
      },
    },
  ],
}

/* ------------------------------------------------------------------
 * ステップ4以降は「かかとを床から離さない立位スクワット」が土台。
 * 支えている足首を (30, 4) に固定し、体幹角度と深さだけを変える。
 * 膝が前に出る向きにしたいので、脚の IK は bend: +1 で統一。
 * ---------------------------------------------------------------- */

const SQ_CAMERA = { minX: -8, maxX: 94, minY: -8, maxY: 100 }
const SQ_ANKLE = { x: 30, y: 4 }
/** 支えている脚。かかとは常に床 */
const STANCE_LEG = { mode: 'ik', target: SQ_ANKLE, bend: 1, ext: -30 } as const
/** 立位。骨盤は足首の真上 */
const STAND_PELVIS = { x: 30, y: 48 }
/** 深くしゃがみきった位置（ハムストリングスがふくらはぎに当たる） */
const DEEP_PELVIS = { x: 22, y: 12 }
/** ハーフ・スクワットで脛が垂直に保たれるときの、動かない膝の位置 */
const KNEE_PIVOT = { x: 30, y: 26 }
const THIGH_LEN = 22

/** 膝を中心とした円弧上の骨盤位置。deg は膝から見た方向 */
function pelvisOnArc(deg: number) {
  const r = (deg * Math.PI) / 180
  return {
    x: KNEE_PIVOT.x + THIGH_LEN * Math.cos(r),
    y: KNEE_PIVOT.y + THIGH_LEN * Math.sin(r),
  }
}

/**
 * ハーフ・スクワット（膝90度・太ももが床と平行）の往復キーフレームを組み立てる。
 *
 * このフォームでは脛が垂直のままなので、膝は動かず、骨盤が膝を中心とした
 * 円弧を描いて後ろへ回る。始点と終点だけを置いて直線補間すると、
 * 途中で膝が前後に大きく揺れてしまう。円弧上に点を刻んで軌道を固定する。
 */
function halfSquatKeyframes(
  armNear: Pose['armNear'],
  legFar?: (u: number) => NonNullable<Pose['legFar']>,
): Keyframe[] {
  // 15度刻み。粗いと弦のたわみで膝が前後に動いて見えるので、細かく刻む
  const stops = [90, 105, 120, 135, 150, 165, 180]
  const last = stops.length - 1

  const poseAt = (i: number): Pose => {
    const u = i / last
    return {
      pelvis: pelvisOnArc(stops[i]!),
      torso: 90 - 25 * u,
      head: 90 - 20 * u,
      armNear,
      legNear: STANCE_LEG,
      ...(legFar ? { legFar: legFar(u) } : {}),
    }
  }

  const down: Keyframe[] = stops.map((_, i) => ({
    t: (i / last) * 0.5,
    pose: poseAt(i),
    ...(i === 0 ? { label: 'スタート', hold: 500 } : {}),
    ...(i === last ? { label: 'フィニッシュ', hold: 400 } : {}),
  }))

  const up: Keyframe[] = []
  for (let i = last - 1; i >= 0; i--) {
    up.push({ t: 1 - (i / last) * 0.5, pose: poseAt(i) })
  }
  return [...down, ...up]
}
/** 胸の前でまっすぐ前方に伸ばした腕 */
const ARMS_FRONT = { mode: 'fk', upper: 0, lower: 0, ext: 0 } as const
/** 体側に下ろした腕 */
const ARMS_DOWN = { mode: 'fk', upper: -85, lower: -85, ext: -85 } as const

/** ステップ4 ハーフ・スクワット（p.120-121） */
export const squat04: Animation = {
  id: 'squat-04',
  durationMs: 4000,
  camera: SQ_CAMERA,
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'pelvis' }],
  caption:
    'つま先をわずかに外へ向ける。膝は常に足と同じ方向を指すようにし、内側に入れない。手は股関節・胸・肩など心地よいところへ。',
  keyframes: halfSquatKeyframes({ mode: 'fk', upper: -100, lower: 20, ext: 20 }),
}

/** ステップ5 フル・スクワット（p.122-123） */
export const squat05: Animation = {
  id: 'squat-05',
  durationMs: 4000,
  camera: SQ_CAMERA,
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'pelvis' }],
  caption:
    '太ももが床と平行になったら、座る時のように体重を後方へ移す。跳ね返りたい・つま先立ちになりたい衝動に抵抗し、筋肉の純粋な力だけで戻る。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        pelvis: STAND_PELVIS,
        torso: 90,
        head: 90,
        armNear: ARMS_DOWN,
        legNear: STANCE_LEG,
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 太ももの後ろがふくらはぎに当たって止まるまで
        pelvis: DEEP_PELVIS,
        torso: 55,
        head: 65,
        armNear: { mode: 'fk', upper: -10, lower: -10, ext: -10 },
        legNear: STANCE_LEG,
      },
    },
    {
      t: 1,
      pose: {
        pelvis: STAND_PELVIS,
        torso: 90,
        head: 90,
        armNear: ARMS_DOWN,
        legNear: STANCE_LEG,
      },
    },
  ],
}

/** ステップ6 クローズ・スクワット（p.124-125） */
export const squat06: Animation = {
  id: 'squat-06',
  durationMs: 4000,
  camera: SQ_CAMERA,
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'chest' }],
  caption:
    '両足のかかとをつけて立つ（真横からでは足の間隔が見えないので注意）。腕を前に伸ばすと体重が前方に移り、後ろへ倒れにくくなる。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        pelvis: STAND_PELVIS,
        torso: 90,
        head: 90,
        armNear: ARMS_FRONT,
        legNear: STANCE_LEG,
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 胸を太ももに向けて押し進める
        pelvis: DEEP_PELVIS,
        torso: 50,
        head: 60,
        armNear: ARMS_FRONT,
        legNear: STANCE_LEG,
      },
    },
    {
      t: 1,
      pose: {
        pelvis: STAND_PELVIS,
        torso: 90,
        head: 90,
        armNear: ARMS_FRONT,
        legNear: STANCE_LEG,
      },
    },
  ],
}

/** ステップ7 アンイーブン・スクワット（p.126-127） */
export const squat07: Animation = {
  id: 'squat-07',
  durationMs: 4000,
  camera: SQ_CAMERA,
  asymmetric: true,
  props: [{ kind: 'ground' }, { kind: 'ball', x: 52, y: 6, r: 6 }],
  guides: [{ kind: 'trail', joint: 'pelvis' }],
  caption:
    'ボールは床についた足の先から一足分だけ前に置く。ボールに乗せた足で押しつぶさないこと。深いスクワットでは後方に十分なスペースを確保する。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        pelvis: STAND_PELVIS,
        torso: 90,
        head: 90,
        armNear: ARMS_FRONT,
        legNear: STANCE_LEG,
        legFar: { mode: 'ik', target: { x: 52, y: 12 }, bend: 1, ext: 40 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        pelvis: DEEP_PELVIS,
        torso: 52,
        head: 62,
        armNear: ARMS_FRONT,
        legNear: STANCE_LEG,
        legFar: { mode: 'ik', target: { x: 52, y: 12 }, bend: 1, ext: 40 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: STAND_PELVIS,
        torso: 90,
        head: 90,
        armNear: ARMS_FRONT,
        legNear: STANCE_LEG,
        legFar: { mode: 'ik', target: { x: 52, y: 12 }, bend: 1, ext: 40 },
      },
    },
  ],
}

/** ステップ8 ハーフ・ワンレッグ・スクワット（p.128-129） */
export const squat08: Animation = {
  id: 'squat-08',
  durationMs: 4000,
  camera: SQ_CAMERA,
  asymmetric: true,
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'pelvis' }],
  caption:
    '前に伸ばした脚は、立っている脚の太ももあたりの高さに保つ。持ち上げた足を床につけないこと。背中と、支えている足の裏は常に平らに。',
  // 前に伸ばした脚は、下がるにつれて水平から少し上向きへ移る
  keyframes: halfSquatKeyframes(ARMS_FRONT, (u) => ({
    mode: 'fk',
    upper: -20 + 35 * u,
    lower: -20 + 35 * u,
    ext: 40 + 20 * u,
  })),
}

/** ステップ9 アシステッド・ワンレッグ・スクワット（p.130-131） */
export const squat09: Animation = {
  id: 'squat-09',
  durationMs: 4500,
  camera: SQ_CAMERA,
  asymmetric: true,
  props: [{ kind: 'ground' }, { kind: 'ball', x: 46, y: 6, r: 6 }],
  guides: [{ kind: 'trail', joint: 'pelvis' }],
  caption:
    'ボールは実際には鍛える側の脚の「真横」に置く。ボトムから戻る最初の数センチだけボールを押して助けにし、あとは脚の力で立つ。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        pelvis: STAND_PELVIS,
        torso: 85,
        head: 88,
        // 片腕は下向きにぶら下げ、もう一方は前方へ
        armNear: { mode: 'fk', upper: -90, lower: -90, ext: -90 },
        armFar: ARMS_FRONT,
        legNear: STANCE_LEG,
        legFar: { mode: 'fk', upper: -15, lower: -15, ext: 40 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        pelvis: DEEP_PELVIS,
        torso: 55,
        head: 65,
        // 下ろしていた手をボールの上にしっかり置く
        armNear: { mode: 'ik', target: { x: 46, y: 12 }, bend: -1, ext: 0 },
        armFar: ARMS_FRONT,
        legNear: STANCE_LEG,
        legFar: { mode: 'fk', upper: 12, lower: 12, ext: 60 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: STAND_PELVIS,
        torso: 85,
        head: 88,
        armNear: { mode: 'fk', upper: -90, lower: -90, ext: -90 },
        armFar: ARMS_FRONT,
        legNear: STANCE_LEG,
        legFar: { mode: 'fk', upper: -15, lower: -15, ext: 40 },
      },
    },
  ],
}

/** マスターステップ ワンレッグ・スクワット（p.132-133） */
export const squat10: Animation = {
  id: 'squat-10',
  durationMs: 5000,
  camera: SQ_CAMERA,
  asymmetric: true,
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'pelvis' }],
  caption:
    '伸ばした脚は股関節とほぼ同じ高さ、できる限りまっすぐに。わずかなりとも弾みをつけないこと。支えている足のかかとはしっかり床につけたまま。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        pelvis: STAND_PELVIS,
        torso: 90,
        head: 90,
        armNear: ARMS_FRONT,
        legNear: STANCE_LEG,
        legFar: { mode: 'fk', upper: 0, lower: 0, ext: 50 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 支えている脚の太ももの前と体幹の隙間がほとんどなくなる
        pelvis: DEEP_PELVIS,
        torso: 45,
        head: 58,
        armNear: ARMS_FRONT,
        legNear: STANCE_LEG,
        legFar: { mode: 'fk', upper: 10, lower: 10, ext: 60 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: STAND_PELVIS,
        torso: 90,
        head: 90,
        armNear: ARMS_FRONT,
        legNear: STANCE_LEG,
        legFar: { mode: 'fk', upper: 0, lower: 0, ext: 50 },
      },
    },
  ],
}

export const squatAnimations: Record<string, Animation> = {
  'squat-01': squat01,
  'squat-02': squat02,
  'squat-03': squat03,
  'squat-04': squat04,
  'squat-05': squat05,
  'squat-06': squat06,
  'squat-07': squat07,
  'squat-08': squat08,
  'squat-09': squat09,
  'squat-10': squat10,
}
