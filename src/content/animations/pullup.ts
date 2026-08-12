import type { Animation } from '@/anim/types'

/**
 * プルアップ・シリーズのアニメーション（ステップ1〜3）。
 *
 * 引く動作はプッシュアップと逆で、「スタート＝力を抜いた位置」ではなく
 * ステップ1のように「スタート＝縮んだ位置」の種目もある。
 * ラベルは書籍の呼び方（スタート／フィニッシュ）に合わせてある。
 */

/** ステップ1 ヴァーチカル・プル（p.154-155） */
export const pullup01: Animation = {
  id: 'pullup-01',
  durationMs: 4000,
  camera: { minX: 48, maxX: 118, minY: -8, maxY: 108 },
  props: [{ kind: 'ground' }, { kind: 'wall', x: 100, facing: 'left' }],
  guides: [{ kind: 'trail', joint: 'shoulder' }],
  caption:
    'つま先を対象物から7〜15センチ離して立つ。ドアのフレームや手すりなど、体重をかけても安全なものを選ぶ。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // 対象物の近くに立っているので腕はしっかり曲がっている
        pelvis: { x: 88, y: 48 },
        torso: 90,
        head: 90,
        armNear: { mode: 'ik', target: { x: 96, y: 70 }, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: { x: 88, y: 4 }, bend: -1, ext: -20 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 腕がほとんどまっすぐになるまで、体を斜め後方に傾けていく。
        // ここで上背部と腕にやわらかい伸びを感じる
        pelvis: { x: 74.5, y: 45.9 },
        torso: 107.9,
        head: 100,
        armNear: { mode: 'ik', target: { x: 96, y: 70 }, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: { x: 88, y: 4 }, bend: -1, ext: -20 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 88, y: 48 },
        torso: 90,
        head: 90,
        armNear: { mode: 'ik', target: { x: 96, y: 70 }, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: { x: 88, y: 4 }, bend: -1, ext: -20 },
      },
    },
  ],
}

/** ステップ2 ホリゾンタル・プル（p.156-157） */
export const pullup02: Animation = {
  id: 'pullup-02',
  durationMs: 4000,
  camera: { minX: -2, maxX: 112, minY: -8, maxY: 58 },
  props: [
    { kind: 'ground' },
    // テーブルは天板だけを描く。体が下にもぐり込むので箱にすると隠れてしまう
    { kind: 'block', x: -20, y: 40, w: 98, h: 4, label: '股関節の高さの台' },
    { kind: 'block', x: 68, y: 0, w: 6, h: 40 },
  ],
  guides: [{ kind: 'trail', joint: 'chest' }],
  caption:
    '台の下にもぐり込み、胸と下半身を台の下に置いてふちをつかむ。体を一直線にロックし、手とかかとだけで体重を支える。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // 体を緊張させて一直線にロックした、ぶら下がりの位置
        pelvis: { x: 53.8, y: 7.0 },
        torso: 5.2,
        head: 0,
        armNear: { mode: 'ik', target: { x: 78, y: 40 }, bend: 1, ext: 90 },
        legNear: { mode: 'ik', target: { x: 10, y: 3 }, bend: 1, ext: 70 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 膝まで整列させたまま、手をかけたふちに胸を引き上げる
        pelvis: { x: 51.9, y: 16.3 },
        torso: 17.6,
        head: 10,
        armNear: { mode: 'ik', target: { x: 78, y: 40 }, bend: 1, ext: 90 },
        legNear: { mode: 'ik', target: { x: 10, y: 3 }, bend: 1, ext: 70 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 53.8, y: 7.0 },
        torso: 5.2,
        head: 0,
        armNear: { mode: 'ik', target: { x: 78, y: 40 }, bend: 1, ext: 90 },
        legNear: { mode: 'ik', target: { x: 10, y: 3 }, bend: 1, ext: 70 },
      },
    },
  ],
}

/** ステップ3 ジャックナイフ・プル（p.158-159） */
export const pullup03: Animation = {
  id: 'pullup-03',
  durationMs: 4500,
  camera: { minX: 30, maxX: 130, minY: -8, maxY: 108 },
  props: [
    { kind: 'ground' },
    { kind: 'bar', x: 60, y: 90 },
    { kind: 'block', x: 96, y: 0, w: 24, h: 25, label: '背の高い椅子' },
  ],
  guides: [{ kind: 'trail', joint: 'shoulder' }],
  caption:
    'バーを使うときは常に肩を締める。腕は完全に脱力せず、肘を少し曲げておく。セット後は、足が体の真下にくる前に手を離さないこと。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // 脚をまっすぐ伸ばして椅子に乗せ、体がジャックナイフのように直角に曲がる
        pelvis: { x: 60.1, y: 25 },
        torso: 90.2,
        head: 80,
        armNear: { mode: 'ik', target: { x: 60, y: 90 }, bend: -1, ext: 90 },
        legNear: { mode: 'ik', target: { x: 104, y: 25 }, bend: -1, ext: 90 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // まっすぐな脚で下方に押して補助しながら、顎がバーを通過するまで引き上げる
        pelvis: { x: 65.8, y: 46.9 },
        torso: 103.3,
        head: 100,
        armNear: { mode: 'ik', target: { x: 60, y: 90 }, bend: -1, ext: 90 },
        legNear: { mode: 'ik', target: { x: 104, y: 25 }, bend: -1, ext: 90 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 60.1, y: 25 },
        torso: 90.2,
        head: 80,
        armNear: { mode: 'ik', target: { x: 60, y: 90 }, bend: -1, ext: 90 },
        legNear: { mode: 'ik', target: { x: 104, y: 25 }, bend: -1, ext: 90 },
      },
    },
  ],
}

/* ------------------------------------------------------------------
 * ステップ4以降はすべて「バーにぶら下がる」姿勢が土台。
 * バーを (60, 108) に固定し、腕は IK でバーに繋ぐ。
 * 膝を曲げて足首を後ろで組む姿勢は全ステップ共通なので定数にしてある。
 * ---------------------------------------------------------------- */

const HANG_CAMERA = { minX: 18, maxX: 106, minY: -6, maxY: 126 }
const BAR = { x: 60, y: 108 }
/** 膝を曲げ、体の後ろで足首を組む。全ステップ共通。すねは後ろ斜め上へ */
const LEGS_TUCKED = { mode: 'fk', upper: -95, lower: 140, ext: 150 } as const
/** 腕を伸ばしきってぶら下がった位置 */
const HANG_PELVIS = { x: 60, y: 41 }
/** 顎がバーを越えた位置 */
const TOP_PELVIS = { x: 58, y: 63 }
/** 肘が直角。上腕が床とほぼ平行になる高さ */
const HALF_PELVIS = { x: 60, y: 50.7 }
/** バーを握る腕。肘は前方に出る */
const ARM_ON_BAR = { mode: 'ik', target: BAR, bend: -1, ext: 90 } as const
/**
 * 腰のくびれに当てた手。ぶら下がりでは体幹が垂直なので、腕は真下へ下ろす。
 * うつ伏せ種目と同じ角度を使うと、腕が真横に突き出てしまう。
 */
const HAND_ON_WAIST = { mode: 'fk', upper: -90, lower: -80, ext: -80 } as const

type HangOpts = {
  /** ぶら下がりの開始位置。ハーフ系は途中から始まる */
  startPelvis: { x: number; y: number }
  armFar?: (top: boolean) => NonNullable<Animation['keyframes'][number]['pose']['armFar']>
}

/** ぶら下がって引き上げ、また下ろすまでの往復キーフレーム */
function pullupKeyframes({ startPelvis, armFar }: HangOpts): Animation['keyframes'] {
  const pose = (pelvis: { x: number; y: number }, top: boolean) => ({
    pelvis,
    torso: 90,
    head: top ? 95 : 88,
    armNear: ARM_ON_BAR,
    legNear: LEGS_TUCKED,
    ...(armFar ? { armFar: armFar(top) } : {}),
  })
  return [
    { t: 0, label: 'スタート', hold: 500, pose: pose(startPelvis, false) },
    { t: 0.5, label: 'フィニッシュ', hold: 400, pose: pose(TOP_PELVIS, true) },
    { t: 1, pose: pose(startPelvis, false) },
  ]
}

/** ステップ4 ハーフ・プルアップ（p.160-161） */
export const pullup04: Animation = {
  id: 'pullup-04',
  durationMs: 4000,
  camera: HANG_CAMERA,
  props: [{ kind: 'ground' }, { kind: 'bar', ...BAR }],
  guides: [{ kind: 'trail', joint: 'shoulder' }],
  caption:
    'ほとんど直角に曲げた腕（上腕が床と平行）で体重を支えるところから始める。動作を通じて脚は固定したまま。',
  keyframes: pullupKeyframes({ startPelvis: HALF_PELVIS }),
}

/** ステップ5 フル・プルアップ（p.162-163） */
export const pullup05: Animation = {
  id: 'pullup-05',
  durationMs: 4500,
  camera: HANG_CAMERA,
  props: [{ kind: 'ground' }, { kind: 'bar', ...BAR }],
  guides: [{ kind: 'trail', joint: 'shoulder' }],
  caption:
    '2秒で上げ、2秒で下ろし、トップとボトムで1秒静止する。爆発的にやらない。筋肉はスムーズな動作の中でつくられる。',
  keyframes: pullupKeyframes({ startPelvis: HANG_PELVIS }),
}

/** ステップ6 クローズ・プルアップ（p.164-165） */
export const pullup06: Animation = {
  id: 'pullup-06',
  durationMs: 4500,
  camera: HANG_CAMERA,
  props: [{ kind: 'ground' }, { kind: 'bar', ...BAR }],
  guides: [{ kind: 'trail', joint: 'shoulder' }],
  caption:
    '両手を隣り合わせにくっつけて握る（真横からでは手の間隔が見えない）。関節が痛むなら最大10センチまで離してよい。',
  keyframes: pullupKeyframes({ startPelvis: HANG_PELVIS }),
}

/** ステップ7 アンイーブン・プルアップ（p.166-167） */
export const pullup07: Animation = {
  id: 'pullup-07',
  durationMs: 4500,
  camera: HANG_CAMERA,
  asymmetric: true,
  props: [{ kind: 'ground' }, { kind: 'bar', ...BAR }],
  guides: [{ kind: 'trail', joint: 'shoulder' }],
  caption:
    '片手でバーを握り、その手首をもう一方の手でつかむ。バーを握った腕がほぼまっすぐ、手首を握った腕はそれより曲がる。肘は体幹の真上。',
  keyframes: pullupKeyframes({
    startPelvis: HANG_PELVIS,
    // 空いている手はバーを握った手首をつかむ
    armFar: () => ({ mode: 'ik', target: { x: 57, y: 103 }, bend: -1, ext: 90 }),
  }),
}

/** ステップ8 ハーフ・ワンアーム・プルアップ（p.168-169） */
export const pullup08: Animation = {
  id: 'pullup-08',
  durationMs: 4000,
  camera: HANG_CAMERA,
  asymmetric: true,
  props: [{ kind: 'ground' }, { kind: 'bar', ...BAR }],
  guides: [{ kind: 'trail', joint: 'shoulder' }],
  caption:
    '肘が直角、上腕が床と平行の位置から始める。空いている手は腰のくびれなど、じゃまにならないところへ。腕を伸ばしきらないので、伸展域を鍛える種目と併用すること。',
  keyframes: pullupKeyframes({ startPelvis: HALF_PELVIS, armFar: () => HAND_ON_WAIST }),
}

/** ステップ9 アシステッド・ワンアーム・プルアップ（p.170-171） */
export const pullup09: Animation = {
  id: 'pullup-09',
  durationMs: 5000,
  camera: HANG_CAMERA,
  asymmetric: true,
  props: [
    { kind: 'ground' },
    { kind: 'bar', ...BAR },
    // バーにかけたタオル
    { kind: 'block', x: 67, y: 72, w: 2.5, h: 36 },
  ],
  guides: [{ kind: 'trail', joint: 'shoulder' }],
  caption:
    'タオルは目の高さでつかむ。肘が直角になるまでの前半だけタオルを引いて助け、そこから先は腕の力だけで顎をバーまで運ぶ。下でつかむほど助けが弱くなる。',
  keyframes: pullupKeyframes({
    startPelvis: HANG_PELVIS,
    // 引き上げの前半でタオルを使い、上では手を離している
    armFar: (top) =>
      top
        ? HAND_ON_WAIST
        : { mode: 'ik', target: { x: 68, y: 74 }, bend: -1, ext: 90 },
  }),
}

/** マスターステップ ワンアーム・プルアップ（p.172-173） */
export const pullup10: Animation = {
  id: 'pullup-10',
  durationMs: 5000,
  camera: HANG_CAMERA,
  asymmetric: true,
  props: [{ kind: 'ground' }, { kind: 'bar', ...BAR }],
  guides: [{ kind: 'trail', joint: 'shoulder' }],
  caption:
    '引き上げる腕はごくわずかに曲げるだけで、ほとんどまっすぐ。できるだけ弾みをつけずに顎をバーの高さまで運ぶ。',
  keyframes: pullupKeyframes({ startPelvis: HANG_PELVIS, armFar: () => HAND_ON_WAIST }),
}

export const pullupAnimations: Record<string, Animation> = {
  'pullup-01': pullup01,
  'pullup-02': pullup02,
  'pullup-03': pullup03,
  'pullup-04': pullup04,
  'pullup-05': pullup05,
  'pullup-06': pullup06,
  'pullup-07': pullup07,
  'pullup-08': pullup08,
  'pullup-09': pullup09,
  'pullup-10': pullup10,
}
