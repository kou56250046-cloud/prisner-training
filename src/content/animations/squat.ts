import type { Animation } from '@/anim/types'

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

export const squatAnimations: Record<string, Animation> = {
  'squat-01': squat01,
  'squat-02': squat02,
  'squat-03': squat03,
}
