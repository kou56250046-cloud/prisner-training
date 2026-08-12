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

export const pullupAnimations: Record<string, Animation> = {
  'pullup-01': pullup01,
  'pullup-02': pullup02,
  'pullup-03': pullup03,
}
