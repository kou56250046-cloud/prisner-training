import type { Animation } from '@/anim/types'

/**
 * プッシュアップ・シリーズのアニメーション。
 *
 * 角度と座標は、書籍のスタート/フィニッシュ写真（p.73 / p.75 / p.77）から
 * 起こしたもの。壁・机・床に触れている手は IK のターゲットとして固定してあるので、
 * 動作の途中でも接地点が一切ずれない。
 *
 * 肘は全ステップで bend: -1（肘が体側に向かって畳まれる向き）。
 */

/** ステップ1 ウォール・プッシュアップ（p.72-73） */
export const pushup01: Animation = {
  id: 'pushup-01',
  durationMs: 4000,
  camera: { minX: 25, maxX: 115, minY: -10, maxY: 108 },
  props: [{ kind: 'ground' }, { kind: 'wall', x: 100, facing: 'left' }],
  guides: [{ kind: 'trail', joint: 'head' }],
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // 体幹を一直線に保ったまま、足首を支点にして 78度で立つ
        pelvis: { x: 61.15, y: 47.0 },
        torso: 78,
        head: 80,
        armNear: { mode: 'ik', target: { x: 100, y: 73.5 }, bend: -1, ext: 90 },
        legNear: { mode: 'fk', upper: -102, lower: -102, ext: -30 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 額が壁に触れるところまで。手のひらの位置は動かさない
        pelvis: { x: 69.2, y: 44.5 },
        torso: 67,
        head: 40,
        armNear: { mode: 'ik', target: { x: 100, y: 73.5 }, bend: -1, ext: 90 },
        legNear: { mode: 'fk', upper: -113, lower: -113, ext: -30 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 61.15, y: 47.0 },
        torso: 78,
        head: 80,
        armNear: { mode: 'ik', target: { x: 100, y: 73.5 }, bend: -1, ext: 90 },
        legNear: { mode: 'fk', upper: -102, lower: -102, ext: -30 },
      },
    },
  ],
}

/** ステップ2 インクライン・プッシュアップ（p.74-75） */
export const pushup02: Animation = {
  id: 'pushup-02',
  durationMs: 4000,
  camera: { minX: 8, maxX: 120, minY: -10, maxY: 96 },
  props: [{ kind: 'ground' }, { kind: 'block', x: 67.5, y: 0, w: 45, h: 45, label: '股関節の高さ' }],
  guides: [{ kind: 'trail', joint: 'chest' }],
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // 台のふちを掴んで腕を伸ばしきった位置
        pelvis: { x: 35.1, y: 43.1 },
        torso: 62.8,
        head: 55,
        armNear: { mode: 'ik', target: { x: 67.5, y: 45 }, bend: -1, ext: -70 },
        legNear: { mode: 'fk', upper: -117.2, lower: -117.2, ext: -30 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 体幹が台の上部にやさしく触れるまで傾斜する。肩は手より前に出る
        pelvis: { x: 47.6, y: 33.6 },
        torso: 42.2,
        head: 30,
        armNear: { mode: 'ik', target: { x: 67.5, y: 45 }, bend: -1, ext: -70 },
        legNear: { mode: 'fk', upper: -137.8, lower: -137.8, ext: -30 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 35.1, y: 43.1 },
        torso: 62.8,
        head: 55,
        armNear: { mode: 'ik', target: { x: 67.5, y: 45 }, bend: -1, ext: -70 },
        legNear: { mode: 'fk', upper: -117.2, lower: -117.2, ext: -30 },
      },
    },
  ],
}

/** ステップ3 ニーリング・プッシュアップ（p.76-77） */
export const pushup03: Animation = {
  id: 'pushup-03',
  durationMs: 4000,
  camera: { minX: 8, maxX: 126, minY: -8, maxY: 50 },
  props: [{ kind: 'ground' }],
  guides: [
    { kind: 'trail', joint: 'chest' },
    { kind: 'hline', y: 6, label: '胸はこぶしひとつ分まで' },
  ],
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        // 膝から頭までを一直線に。手のひらは胸の真下の床面
        pelvis: { x: 58.6, y: 14.8 },
        torso: 32.4,
        head: 30,
        armNear: { mode: 'ik', target: { x: 87.3, y: 0 }, bend: -1, ext: 0 },
        legNear: { mode: 'fk', upper: -147.6, lower: 130, ext: 150 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 膝を軸にして、胸が床からこぶしひとつ分のところまで下ろす
        pelvis: { x: 62.0, y: 4.4 },
        torso: 3.7,
        head: 18,
        armNear: { mode: 'ik', target: { x: 87.3, y: 0 }, bend: -1, ext: 0 },
        legNear: { mode: 'fk', upper: -176.3, lower: 130, ext: 150 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 58.6, y: 14.8 },
        torso: 32.4,
        head: 30,
        armNear: { mode: 'ik', target: { x: 87.3, y: 0 }, bend: -1, ext: 0 },
        legNear: { mode: 'fk', upper: -147.6, lower: 130, ext: 150 },
      },
    },
  ],
}

export const pushupAnimations: Record<string, Animation> = {
  'pushup-01': pushup01,
  'pushup-02': pushup02,
  'pushup-03': pushup03,
}
