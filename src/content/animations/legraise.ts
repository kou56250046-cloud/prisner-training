import type { Animation } from '@/anim/types'

/**
 * レッグレイズ・シリーズのアニメーション（ステップ1〜3）。
 *
 * あおむけ系は頭が +x 側、脚が -x 側に伸びる向きで統一してある。
 * 膝の曲げ角を保ったまま脚を上げる種目（ステップ3）では、
 * 脚を IK でつなぐことで「膝の角度をロックしたまま」を自動的に満たせる。
 */

/** ステップ1 ニー・タック（p.188-189） */
export const legraise01: Animation = {
  id: 'legraise-01',
  durationMs: 4000,
  camera: { minX: -6, maxX: 96, minY: -8, maxY: 82 },
  props: [
    { kind: 'ground' },
    { kind: 'block', x: -2, y: 0, w: 46, h: 30, label: '椅子・ベッドの端' },
  ],
  guides: [{ kind: 'trail', joint: 'kneeNear' }],
  caption:
    '息は膝を引くときに吐き、脚を伸ばすときに吸う。腹部は常に背側にたくし込む。セット中は足を床につけない。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // 端をつかんで少し後ろに傾き、脚をまっすぐ伸ばしてかかとを床から数センチ浮かせる
        pelvis: { x: 40, y: 29 },
        torso: 98.5,
        head: 95,
        armNear: { mode: 'ik', target: { x: 30, y: 30 }, bend: -1, ext: -90 },
        legNear: { mode: 'fk', upper: -34.6, lower: -34.6, ext: 20 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 膝を胸から15〜25センチの位置まで引き上げる。ここで息を吐ききる
        pelvis: { x: 40, y: 29 },
        torso: 98.5,
        head: 95,
        armNear: { mode: 'ik', target: { x: 30, y: 30 }, bend: -1, ext: -90 },
        legNear: { mode: 'fk', upper: 75, lower: -40, ext: 20 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 40, y: 29 },
        torso: 98.5,
        head: 95,
        armNear: { mode: 'ik', target: { x: 30, y: 30 }, bend: -1, ext: -90 },
        legNear: { mode: 'fk', upper: -34.6, lower: -34.6, ext: 20 },
      },
    },
  ],
}

/** ステップ2 フラット・ニー・レイズ（p.190-191） */
export const legraise02: Animation = {
  id: 'legraise-02',
  durationMs: 4000,
  camera: { minX: 12, maxX: 122, minY: -8, maxY: 48 },
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'kneeNear' }],
  caption:
    '腕は体の両サイドに伸ばし、手で床を強く押すと体幹が安定する。動作を始めたらセット終了まで足を床につけない。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // 膝をおよそ直角に曲げ、足を床から3〜5センチ離す
        pelvis: { x: 60, y: 6 },
        torso: 0,
        head: 0,
        armNear: { mode: 'fk', upper: 180, lower: 180, ext: 180 },
        legNear: { mode: 'fk', upper: 140, lower: -120, ext: 120 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 膝を股関節の上まで移動させる。大腿が床に垂直、ふくらはぎが平行になる
        pelvis: { x: 60, y: 6 },
        torso: 0,
        head: 0,
        armNear: { mode: 'fk', upper: 180, lower: 180, ext: 180 },
        legNear: { mode: 'fk', upper: 90, lower: 180, ext: 180 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 60, y: 6 },
        torso: 0,
        head: 0,
        armNear: { mode: 'fk', upper: 180, lower: 180, ext: 180 },
        legNear: { mode: 'fk', upper: 140, lower: -120, ext: 120 },
      },
    },
  ],
}

/** ステップ3 フラット・ベント・レッグレイズ（p.192-193） */
export const legraise03: Animation = {
  id: 'legraise-03',
  durationMs: 4500,
  camera: { minX: 4, maxX: 122, minY: -8, maxY: 62 },
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'ankleNear' }],
  caption:
    '膝の角度は動作中ずっと45度でロックする。上げるのに2秒、下ろすのに2秒。上げる時に息を吐き、下ろす時に吸う。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // 膝を45度に曲げた状態で、足を床から3〜5センチに保つ。
        // 脚を IK でつなぐと、骨盤から足首までの距離が一定＝膝の角度が
        // 自動的にロックされる
        pelvis: { x: 60, y: 6 },
        torso: 0,
        head: 0,
        armNear: { mode: 'fk', upper: 180, lower: 180, ext: 180 },
        legNear: { mode: 'ik', target: { x: 19.4, y: 4.2 }, bend: -1, ext: 150 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 足が骨盤の真上に来るまで持ち上げる
        pelvis: { x: 60, y: 6 },
        torso: 0,
        head: 0,
        armNear: { mode: 'fk', upper: 180, lower: 180, ext: 180 },
        legNear: { mode: 'ik', target: { x: 60, y: 46.6 }, bend: -1, ext: 100 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 60, y: 6 },
        torso: 0,
        head: 0,
        armNear: { mode: 'fk', upper: 180, lower: 180, ext: 180 },
        legNear: { mode: 'ik', target: { x: 19.4, y: 4.2 }, bend: -1, ext: 150 },
      },
    },
  ],
}

/** ステップ4 フラット・フロッグ・レイズ（p.194-195） */
export const legraise04: Animation = {
  id: 'legraise-04',
  durationMs: 6000,
  camera: { minX: 2, maxX: 124, minY: -8, maxY: 68 },
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'ankleNear' }],
  caption:
    '膝を45度に曲げたまま上げ、トップで脚を伸ばす。そこから、まっすぐのまま4秒かけて下ろす。下ろす局面こそが腹部を鍛える。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 400,
      pose: {
        pelvis: { x: 60, y: 6 },
        torso: 0,
        head: 0,
        armNear: { mode: 'fk', upper: 180, lower: 180, ext: 180 },
        legNear: { mode: 'ik', target: { x: 19.4, y: 4.2 }, bend: -1, ext: 150 },
      },
    },
    {
      t: 0.28,
      pose: {
        pelvis: { x: 60, y: 6 },
        torso: 0,
        head: 0,
        armNear: { mode: 'fk', upper: 180, lower: 180, ext: 180 },
        // 膝を曲げたまま、足が骨盤の真上に来る
        legNear: { mode: 'ik', target: { x: 60, y: 46.6 }, bend: -1, ext: 100 },
      },
    },
    {
      t: 0.42,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        pelvis: { x: 60, y: 6 },
        torso: 0,
        head: 0,
        armNear: { mode: 'fk', upper: 180, lower: 180, ext: 180 },
        // トップで脚を伸ばしきる。床と体幹に対して直角になる
        legNear: { mode: 'ik', target: { x: 60, y: 50 }, bend: -1, ext: 100 },
      },
    },
    {
      t: 0.9,
      pose: {
        pelvis: { x: 60, y: 6 },
        torso: 0,
        head: 0,
        armNear: { mode: 'fk', upper: 180, lower: 180, ext: 180 },
        // 脚をまっすぐのまま、床から3〜5センチのところまで下ろす
        legNear: { mode: 'ik', target: { x: 16.1, y: 4 }, bend: -1, ext: 150 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 60, y: 6 },
        torso: 0,
        head: 0,
        armNear: { mode: 'fk', upper: 180, lower: 180, ext: 180 },
        legNear: { mode: 'ik', target: { x: 19.4, y: 4.2 }, bend: -1, ext: 150 },
      },
    },
  ],
}

/** ステップ5 フラット・ストレート・レッグレイズ（p.196-197） */
export const legraise05: Animation = {
  id: 'legraise-05',
  durationMs: 5000,
  camera: { minX: 2, maxX: 124, minY: -8, maxY: 68 },
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'ankleNear' }],
  caption:
    '膝を終始ロックし、セットが完了するまで床面にかかとが触れないようにする。膝を曲げて足を床で弾ませると効果が大きく落ちる。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        pelvis: { x: 60, y: 6 },
        torso: 0,
        head: 0,
        armNear: { mode: 'fk', upper: 180, lower: 180, ext: 180 },
        // 脚をまっすぐロックしたまま、足を床から3〜5センチ浮かせる
        legNear: { mode: 'ik', target: { x: 16.1, y: 4 }, bend: -1, ext: 150 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        pelvis: { x: 60, y: 6 },
        torso: 0,
        head: 0,
        armNear: { mode: 'fk', upper: 180, lower: 180, ext: 180 },
        // 脚と体幹が直角になるところまで
        legNear: { mode: 'ik', target: { x: 60, y: 50 }, bend: -1, ext: 100 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 60, y: 6 },
        torso: 0,
        head: 0,
        armNear: { mode: 'fk', upper: 180, lower: 180, ext: 180 },
        legNear: { mode: 'ik', target: { x: 16.1, y: 4 }, bend: -1, ext: 150 },
      },
    },
  ],
}

/* ------------------------------------------------------------------
 * ステップ6以降はバーにぶら下がって行う。
 * 脚をまっすぐ下ろしても足が床につかない高さが要るので、
 * プルアップ章より高い (60, 120) にバーを置いてある。
 * 体幹は垂直のまま動かず、脚だけが動く。
 * ---------------------------------------------------------------- */

const LR_BAR = { x: 60, y: 120 }
const LR_CAMERA = { minX: 18, maxX: 120, minY: -6, maxY: 140 }
/** ぶら下がったときの骨盤。体は一直線のまま動かない */
const LR_PELVIS = { x: 60, y: 53 }
const LR_ARM = { mode: 'ik', target: LR_BAR, bend: -1, ext: 90 } as const

/** ぶら下がり系レッグレイズの、脚だけが動く往復キーフレーム */
function hangingLegKeyframes(
  legs: { start: Animation['keyframes'][number]['pose']['legNear']; finish: Animation['keyframes'][number]['pose']['legNear'] },
): Animation['keyframes'] {
  const pose = (legNear: Animation['keyframes'][number]['pose']['legNear']) => ({
    pelvis: LR_PELVIS,
    torso: 90,
    head: 88,
    armNear: LR_ARM,
    legNear,
  })
  return [
    { t: 0, label: 'スタート', hold: 500, pose: pose(legs.start) },
    { t: 0.5, label: 'フィニッシュ', hold: 400, pose: pose(legs.finish) },
    { t: 1, pose: pose(legs.start) },
  ]
}

/** ステップ6 ハンギング・ニー・レイズ（p.198-199） */
export const legraise06: Animation = {
  id: 'legraise-06',
  durationMs: 4500,
  camera: LR_CAMERA,
  props: [{ kind: 'ground' }, { kind: 'bar', ...LR_BAR }],
  guides: [{ kind: 'trail', joint: 'kneeNear' }],
  caption:
    'ここから重力を完全に克服する段階に入る。弾みをつけたい衝動に抵抗すること。スムーズで制御された動作を、この早い段階から習慣づける。',
  keyframes: hangingLegKeyframes({
    // 体を一直線にしてぶら下がる
    start: { mode: 'fk', upper: -90, lower: -90, ext: -70 },
    // 膝が骨盤と同じ高さ。脚が直角になり、太ももが床と平行
    finish: { mode: 'fk', upper: 0, lower: -90, ext: -70 },
  }),
}

/** ステップ7 ハンギング・ベント・レッグレイズ（p.200-201） */
export const legraise07: Animation = {
  id: 'legraise-07',
  durationMs: 4500,
  camera: LR_CAMERA,
  props: [{ kind: 'ground' }, { kind: 'bar', ...LR_BAR }],
  guides: [{ kind: 'trail', joint: 'ankleNear' }],
  caption:
    '膝を45度でロックしたまま、股関節だけを動かす。下ろすときに脚がまっすぐになりやすいので注意。角度を戻そうとすると体が振れる原因になる。',
  keyframes: hangingLegKeyframes({
    // 膝を45度に曲げ、足は体の数センチ後ろ
    start: { mode: 'ik', target: { x: 57, y: 12.5 }, bend: -1, ext: -60 },
    // 骨盤の正面側に足がくるまで
    finish: { mode: 'ik', target: { x: 100, y: 47 }, bend: -1, ext: 20 },
  }),
}

/** ステップ8 ハンギング・フロッグ・レイズ（p.202-203） */
export const legraise08: Animation = {
  id: 'legraise-08',
  durationMs: 6000,
  camera: LR_CAMERA,
  props: [{ kind: 'ground' }, { kind: 'bar', ...LR_BAR }],
  guides: [{ kind: 'trail', joint: 'ankleNear' }],
  caption:
    '膝を曲げたまま上げ、トップで脚を伸ばし、まっすぐのまま下ろす。下ろす動作のほうが上げる動作より簡単で、そこで強さと柔軟性がつく。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 400,
      pose: {
        pelvis: LR_PELVIS,
        torso: 90,
        head: 88,
        armNear: LR_ARM,
        legNear: { mode: 'ik', target: { x: 57, y: 12.5 }, bend: -1, ext: -60 },
      },
    },
    {
      t: 0.3,
      pose: {
        pelvis: LR_PELVIS,
        torso: 90,
        head: 88,
        armNear: LR_ARM,
        // 膝を曲げたまま、足が股関節と同じ高さまで上がる
        legNear: { mode: 'ik', target: { x: 100, y: 47 }, bend: -1, ext: 20 },
      },
    },
    {
      t: 0.45,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        pelvis: LR_PELVIS,
        torso: 90,
        head: 88,
        armNear: LR_ARM,
        // そのまま脚を伸ばしきる。ロックした脚が床と平行になる
        legNear: { mode: 'ik', target: { x: 104, y: 53 }, bend: -1, ext: 20 },
      },
    },
    {
      t: 0.9,
      pose: {
        pelvis: LR_PELVIS,
        torso: 90,
        head: 88,
        armNear: LR_ARM,
        // 脚をまっすぐロックしたまま、4秒かけて下ろす
        legNear: { mode: 'ik', target: { x: 60, y: 9 }, bend: -1, ext: -70 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: LR_PELVIS,
        torso: 90,
        head: 88,
        armNear: LR_ARM,
        legNear: { mode: 'ik', target: { x: 57, y: 12.5 }, bend: -1, ext: -60 },
      },
    },
  ],
}

/** ステップ9 パーシャル・ストレート・レッグレイズ（p.204-205） */
export const legraise09: Animation = {
  id: 'legraise-09',
  durationMs: 4500,
  camera: LR_CAMERA,
  props: [{ kind: 'ground' }, { kind: 'bar', ...LR_BAR }],
  guides: [{ kind: 'trail', joint: 'ankleNear' }],
  caption:
    '脚を45度まで上げてロックしたところがスタート。そこから床と平行になるまで上げ、また45度に戻す。膝はまっすぐロックしたまま。',
  keyframes: hangingLegKeyframes({
    // 45度まで上げてロックした位置
    start: { mode: 'ik', target: { x: 91.1, y: 21.9 }, bend: -1, ext: 0 },
    // 床と平行
    finish: { mode: 'ik', target: { x: 104, y: 53 }, bend: -1, ext: 20 },
  }),
}

/** マスターステップ ハンギング・ストレート・レッグレイズ（p.206-207） */
export const legraise10: Animation = {
  id: 'legraise-10',
  durationMs: 5500,
  camera: LR_CAMERA,
  props: [{ kind: 'ground' }, { kind: 'bar', ...LR_BAR }],
  guides: [{ kind: 'trail', joint: 'ankleNear' }],
  caption:
    '2秒以上かけて上げ、その間に肺の空気をすべて吐き出す。戻っても腹部の収縮を完全には解かない。常に脚をロックし、弾みは一切つけない。',
  keyframes: hangingLegKeyframes({
    // 脚をまっすぐ下ろしきった位置
    start: { mode: 'ik', target: { x: 60, y: 9 }, bend: -1, ext: -70 },
    finish: { mode: 'ik', target: { x: 104, y: 53 }, bend: -1, ext: 20 },
  }),
}

export const legraiseAnimations: Record<string, Animation> = {
  'legraise-01': legraise01,
  'legraise-02': legraise02,
  'legraise-03': legraise03,
  'legraise-04': legraise04,
  'legraise-05': legraise05,
  'legraise-06': legraise06,
  'legraise-07': legraise07,
  'legraise-08': legraise08,
  'legraise-09': legraise09,
  'legraise-10': legraise10,
}
