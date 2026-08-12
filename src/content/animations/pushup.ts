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

/* ------------------------------------------------------------------
 * ステップ4以降はすべて「つま先で支えるプランク」が土台になる。
 * 足首は (11.5, 7) に固定し、手のひらは (85, 0) の床。
 * 体幹角度と腕の畳み具合だけを変えることで、10段階の負荷差を表現する。
 * ---------------------------------------------------------------- */

const PRONE_CAMERA = { minX: 5, maxX: 118, minY: -8, maxY: 46 }
const ANKLE = { x: 11.5, y: 7 }
const HAND = { x: 85, y: 0 }

/** 腰のくびれに当てた手（ワンアーム系で使う）。前腕を背側に回す */
const HAND_ON_WAIST = { mode: 'fk', upper: 200, lower: 190, ext: 190 } as const

/** ステップ4 ハーフ・プッシュアップ（p.78-79） */
export const pushup04: Animation = {
  id: 'pushup-04',
  durationMs: 4000,
  camera: PRONE_CAMERA,
  props: [{ kind: 'ground' }, { kind: 'ball', x: 54.9, y: 7, r: 7 }],
  guides: [{ kind: 'trail', joint: 'pelvis' }],
  caption: 'バスケットボールを股関節の真下に置くと、見なくても深さがわかる。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        pelvis: { x: 52.9, y: 21.8 },
        torso: 19.6,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 肘が直角になる深さ。股関節がボールにやさしく触れる
        pelvis: { x: 54.9, y: 14 },
        torso: 9.15,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 52.9, y: 21.8 },
        torso: 19.6,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
  ],
}

/** ステップ5 フル・プッシュアップ（p.80-81） */
export const pushup05: Animation = {
  id: 'pushup-05',
  durationMs: 4000,
  camera: PRONE_CAMERA,
  props: [{ kind: 'ground' }, { kind: 'ball', x: 80, y: 2.5, r: 2.5 }],
  guides: [{ kind: 'trail', joint: 'chest' }],
  caption: '胸の真下に野球かテニスのボールを置くと、毎回同じ深さで止められる。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        pelvis: { x: 52.9, y: 21.8 },
        torso: 19.6,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 胸骨が床からこぶしひとつ分
        pelvis: { x: 55.4, y: 9.84 },
        torso: 3.7,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 52.9, y: 21.8 },
        torso: 19.6,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
  ],
}

/** ステップ6 クローズ・プッシュアップ（p.82-83） */
export const pushup06: Animation = {
  id: 'pushup-06',
  durationMs: 4000,
  camera: PRONE_CAMERA,
  props: [{ kind: 'ground' }],
  guides: [{ kind: 'trail', joint: 'chest' }],
  caption:
    '両手の人差し指の先端を触れ合わせる。真横からでは手の間隔が見えないので注意。フル・プッシュアップより肘が深く曲がる。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        pelvis: { x: 52.9, y: 21.8 },
        torso: 19.6,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 手の甲に胸がやさしく触れるまで。肘は直角を大きく超えて曲がる
        pelvis: { x: 55.5, y: 8.97 },
        torso: 2.57,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 52.9, y: 21.8 },
        torso: 19.6,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
  ],
}

/** ステップ7 アンイーブン・プッシュアップ（p.84-85） */
export const pushup07: Animation = {
  id: 'pushup-07',
  asymmetric: true,
  durationMs: 4000,
  camera: PRONE_CAMERA,
  props: [{ kind: 'ground' }, { kind: 'ball', x: 85, y: 6, r: 6 }],
  guides: [{ kind: 'trail', joint: 'shoulder' }],
  caption:
    '片手をバスケットボールの上に置く。両手とも肩の真下に置き、体重を均等に分散させる。ボールを安定させる作業がローテーターカフを鍛える。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        pelvis: { x: 53.6, y: 19.9 },
        torso: 17,
        head: 5,
        // 手前の腕はボールの上、奥の腕は床
        armNear: { mode: 'ik', target: { x: 85, y: 12 }, bend: -1, ext: 0 },
        armFar: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // ボールの上の手の甲に胸が触れるまで
        pelvis: { x: 54.7, y: 15.5 },
        torso: 11.2,
        head: 5,
        armNear: { mode: 'ik', target: { x: 85, y: 12 }, bend: -1, ext: 0 },
        armFar: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 53.6, y: 19.9 },
        torso: 17,
        head: 5,
        armNear: { mode: 'ik', target: { x: 85, y: 12 }, bend: -1, ext: 0 },
        armFar: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
  ],
}

/** ステップ8 ハーフ・ワンアーム・プッシュアップ（p.86-87） */
export const pushup08: Animation = {
  id: 'pushup-08',
  asymmetric: true,
  durationMs: 4000,
  camera: PRONE_CAMERA,
  props: [{ kind: 'ground' }, { kind: 'ball', x: 54.9, y: 7, r: 7 }],
  guides: [{ kind: 'trail', joint: 'pelvis' }],
  caption:
    '空いている手は腰のくびれに置く。支える手は胸骨の真下。上腕三頭筋が弱いと体幹をねじりたくなるが、耐えて一直線に保つ。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        pelvis: { x: 52.9, y: 21.8 },
        torso: 19.6,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        armFar: HAND_ON_WAIST,
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        pelvis: { x: 54.9, y: 14 },
        torso: 9.15,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        armFar: HAND_ON_WAIST,
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 52.9, y: 21.8 },
        torso: 19.6,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        armFar: HAND_ON_WAIST,
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
  ],
}

/** ステップ9 レバー・プッシュアップ（p.88-89） */
export const pushup09: Animation = {
  id: 'pushup-09',
  asymmetric: true,
  durationMs: 4500,
  camera: { minX: 5, maxX: 135, minY: -8, maxY: 46 },
  props: [
    { kind: 'ground' },
    { kind: 'ball', x: 80, y: 2.5, r: 2.5 },
    { kind: 'ball', x: 122, y: 6, r: 6 },
  ],
  guides: [{ kind: 'trail', joint: 'chest' }],
  caption:
    'ボールは実際には「体の真横」に、腕を伸ばしきれるぎりぎりの位置へ置く。真横からの図では表現できないため、ここでは前方に描いている。体を下ろすとボールは遠くへ転がっていく。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        pelvis: { x: 52.9, y: 21.8 },
        torso: 19.6,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        // 空いている腕はまっすぐ伸ばしてボールの上に置く
        armFar: { mode: 'ik', target: { x: 116, y: 12 }, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        pelvis: { x: 55.4, y: 9.84 },
        torso: 3.7,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        armFar: { mode: 'ik', target: { x: 118, y: 12 }, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 52.9, y: 21.8 },
        torso: 19.6,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        armFar: { mode: 'ik', target: { x: 116, y: 12 }, bend: -1, ext: 0 },
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
  ],
}

/** マスターステップ ワンアーム・プッシュアップ（p.90-91） */
export const pushup10: Animation = {
  id: 'pushup-10',
  asymmetric: true,
  durationMs: 4500,
  camera: PRONE_CAMERA,
  props: [{ kind: 'ground' }],
  guides: [
    { kind: 'trail', joint: 'head' },
    { kind: 'hline', y: 6, label: '顎はこぶしひとつ分まで' },
  ],
  caption:
    '支える腕は横や前ではなく、胸のまっすぐ下。空いている手は腰のくびれに置く。脚を広げたり体幹をねじったりしないこと。',
  keyframes: [
    {
      t: 0,
      label: 'スタート',
      hold: 500,
      pose: {
        pelvis: { x: 52.9, y: 21.8 },
        torso: 19.6,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        armFar: HAND_ON_WAIST,
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
    {
      t: 0.5,
      label: 'フィニッシュ',
      hold: 400,
      pose: {
        // 顎が床からこぶしひとつ分
        pelvis: { x: 55.4, y: 9.84 },
        torso: 3.7,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        armFar: HAND_ON_WAIST,
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
    {
      t: 1,
      pose: {
        pelvis: { x: 52.9, y: 21.8 },
        torso: 19.6,
        head: 5,
        armNear: { mode: 'ik', target: HAND, bend: -1, ext: 0 },
        armFar: HAND_ON_WAIST,
        legNear: { mode: 'ik', target: ANKLE, bend: -1, ext: -60 },
      },
    },
  ],
}

export const pushupAnimations: Record<string, Animation> = {
  'pushup-01': pushup01,
  'pushup-02': pushup02,
  'pushup-03': pushup03,
  'pushup-04': pushup04,
  'pushup-05': pushup05,
  'pushup-06': pushup06,
  'pushup-07': pushup07,
  'pushup-08': pushup08,
  'pushup-09': pushup09,
  'pushup-10': pushup10,
}
