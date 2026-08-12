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

export const legraiseAnimations: Record<string, Animation> = {
  'legraise-01': legraise01,
  'legraise-02': legraise02,
  'legraise-03': legraise03,
}
