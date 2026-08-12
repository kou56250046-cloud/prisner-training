import { describe, expect, it } from 'vitest'
import type { Standards } from '@/content/types'
import {
  buildWarmup,
  canGraduateNewBlood,
  canPromote,
  canSuggestConsolidation,
  detectOverwork,
  detectPlateau,
  initialTarget,
  meetsStandard,
  nextTarget,
  shouldDemote,
} from './rules'

/** ウォール・プッシュアップ（初10×1 / 中25×2 / 上50×3） */
const PUSHUP_01: Standards = {
  beginner: { reps: 10, sets: 1 },
  intermediate: { reps: 25, sets: 2 },
  advanced: { reps: 50, sets: 3 },
}

/** フル・プッシュアップ（初5×1 / 中10×2 / 上20×2） */
const PUSHUP_05: Standards = {
  beginner: { reps: 5, sets: 1 },
  intermediate: { reps: 10, sets: 2 },
  advanced: { reps: 20, sets: 2 },
}

describe('meetsStandard', () => {
  it('全セットで基準以上なら達成', () => {
    expect(meetsStandard([25, 25], PUSHUP_01.intermediate)).toBe(true)
    expect(meetsStandard([26, 25], PUSHUP_01.intermediate)).toBe(true)
  })

  it('1セットでも足りなければ未達', () => {
    expect(meetsStandard([25, 24], PUSHUP_01.intermediate)).toBe(false)
  })

  it('セット数が足りなければ未達', () => {
    expect(meetsStandard([25], PUSHUP_01.intermediate)).toBe(false)
  })

  it('余分なセットは判定に影響しない', () => {
    expect(meetsStandard([25, 25, 3], PUSHUP_01.intermediate)).toBe(true)
  })
})

describe('nextTarget（原本 p.300 の漸増ルール）', () => {
  it('1セットのうちはレップスを1ずつ足す', () => {
    expect(nextTarget({ reps: 5, sets: 1 }, PUSHUP_05)).toEqual({ reps: 6, sets: 1 })
  })

  it('1セットで10レップスに達したらセットに分ける', () => {
    expect(nextTarget({ reps: 10, sets: 1 }, PUSHUP_05)).toEqual({ reps: 5, sets: 2 })
  })

  it('分けた後は両セットのレップスを増やして中級者の標準へ', () => {
    expect(nextTarget({ reps: 9, sets: 2 }, PUSHUP_05)).toEqual({ reps: 10, sets: 2 })
  })

  it('上級者がセット数を増やすよう求めていればセットを足す', () => {
    // 中級 25×2 に到達 → 上級は 3セット指定なので3セット目を追加
    expect(nextTarget({ reps: 25, sets: 2 }, PUSHUP_01)).toEqual({ reps: 25, sets: 3 })
  })

  it('セット数が揃った後は上級者のレップスまで伸ばす', () => {
    expect(nextTarget({ reps: 25, sets: 3 }, PUSHUP_01)).toEqual({ reps: 26, sets: 3 })
  })

  it('上級者の標準に到達したらそれ以上は上げない', () => {
    expect(nextTarget({ reps: 50, sets: 3 }, PUSHUP_01)).toEqual({ reps: 50, sets: 3 })
    expect(nextTarget({ reps: 20, sets: 2 }, PUSHUP_05)).toEqual({ reps: 20, sets: 2 })
  })

  it('初心者の標準から始まる', () => {
    expect(initialTarget(PUSHUP_05)).toEqual({ reps: 5, sets: 1 })
  })
})

describe('canPromote（上級者の標準を2回連続）', () => {
  it('2回連続で達成したら進級できる', () => {
    expect(canPromote([[20, 20], [20, 21]], PUSHUP_05)).toBe(true)
  })

  it('1回だけでは進級できない', () => {
    expect(canPromote([[20, 20], [19, 20]], PUSHUP_05)).toBe(false)
  })

  it('記録が1回しかなければ進級できない', () => {
    expect(canPromote([[20, 20]], PUSHUP_05)).toBe(false)
  })

  it('ちょうど基準値なら達成扱い', () => {
    expect(canPromote([[20, 20], [20, 20]], PUSHUP_05)).toBe(true)
  })

  it('1レップ足りなければ達成ではない', () => {
    expect(canPromote([[20, 19], [20, 20]], PUSHUP_05)).toBe(false)
  })
})

describe('shouldDemote（原本 p.299-300）', () => {
  it('3セッション連続で初心者の標準に届かなければ降格を提案', () => {
    expect(shouldDemote([[4], [3], [4]], PUSHUP_05, 5)).toBe(true)
  })

  it('1回でも達成していれば降格させない', () => {
    expect(shouldDemote([[4], [5], [4]], PUSHUP_05, 5)).toBe(false)
  })

  it('ステップ1では降格先がないので提案しない', () => {
    expect(shouldDemote([[4], [3], [4]], PUSHUP_05, 1)).toBe(false)
  })

  it('記録が3回に満たなければ判断しない', () => {
    expect(shouldDemote([[4], [3]], PUSHUP_05, 5)).toBe(false)
  })
})

describe('buildWarmup（原本 p.291-292）', () => {
  it('ステップ6なら3つ前を20レップス、2つ前を15レップス', () => {
    expect(buildWarmup(6)).toEqual([
      { stepNo: 3, reps: 20 },
      { stepNo: 4, reps: 15 },
    ])
  })

  it('ステップ4が下限。3つ前はステップ1になる', () => {
    expect(buildWarmup(4)).toEqual([
      { stepNo: 1, reps: 20 },
      { stepNo: 2, reps: 15 },
    ])
  })

  it('ステップ3以下ではそのステップ自体を使う', () => {
    expect(buildWarmup(3)).toEqual([
      { stepNo: 3, reps: 20 },
      { stepNo: 3, reps: 15 },
    ])
    expect(buildWarmup(1)).toEqual([
      { stepNo: 1, reps: 20 },
      { stepNo: 1, reps: 15 },
    ])
  })

  it('体調や気温に不安があるときは12レップスを足して3セットにする', () => {
    expect(buildWarmup(6, { extra: true })).toEqual([
      { stepNo: 3, reps: 20 },
      { stepNo: 4, reps: 12 },
      { stepNo: 4, reps: 12 },
    ])
  })
})

describe('detectPlateau', () => {
  const day = 86_400_000
  const now = 30 * day

  it('6セッション3週間で最高記録を更新できていなければ停滞', () => {
    const recent = [
      { reps: [12], at: now - 1 * day },
      { reps: [12], at: now - 5 * day },
      { reps: [13], at: now - 9 * day },
      { reps: [12], at: now - 13 * day },
      { reps: [12], at: now - 17 * day },
      { reps: [12], at: now - 22 * day },
    ]
    expect(detectPlateau(recent, now)).toBe(true)
  })

  it('直近が最高を更新していれば停滞ではない', () => {
    const recent = [
      { reps: [14], at: now - 1 * day },
      { reps: [12], at: now - 5 * day },
      { reps: [13], at: now - 9 * day },
      { reps: [12], at: now - 13 * day },
      { reps: [12], at: now - 17 * day },
      { reps: [12], at: now - 22 * day },
    ]
    expect(detectPlateau(recent, now)).toBe(false)
  })

  it('期間が短ければ停滞と決めつけない', () => {
    const recent = Array.from({ length: 6 }, (_, i) => ({ reps: [12], at: now - i * day }))
    expect(detectPlateau(recent, now)).toBe(false)
  })

  it('セッション数が足りなければ判断しない', () => {
    expect(detectPlateau([{ reps: [12], at: now - 22 * day }], now)).toBe(false)
  })
})

describe('canSuggestConsolidation（原本 p.303 の禁止事項）', () => {
  it('1〜2レップスしかできないときだけ提案する', () => {
    expect(canSuggestConsolidation(1)).toBe(true)
    expect(canSuggestConsolidation(2)).toBe(true)
  })

  it('すでに複数レップスできるなら提案しない', () => {
    expect(canSuggestConsolidation(3)).toBe(false)
    expect(canSuggestConsolidation(9)).toBe(false)
  })
})

describe('detectOverwork', () => {
  it('想定より多く、かつ連続で「きつい」ならオーバーワーク', () => {
    expect(detectOverwork(4, 2, ['hard', 'hard', 'ok'])).toBe(true)
  })

  it('想定内の頻度なら判定しない', () => {
    expect(detectOverwork(2, 2, ['hard', 'hard'])).toBe(false)
  })

  it('きつさが続いていなければ判定しない', () => {
    expect(detectOverwork(4, 2, ['hard', 'ok'])).toBe(false)
  })
})

describe('canGraduateNewBlood（原本 p.313-314）', () => {
  it('4種目すべてステップ6超で卒業', () => {
    expect(canGraduateNewBlood({ pushup: 7, squat: 7, pullup: 7, legraise: 7 })).toBe(true)
  })

  it('ちょうどステップ6ではまだ卒業できない', () => {
    expect(canGraduateNewBlood({ pushup: 6, squat: 7, pullup: 7, legraise: 7 })).toBe(false)
  })

  it('ブリッジとハンドスタンドは条件に含まれない', () => {
    expect(
      canGraduateNewBlood({ pushup: 7, squat: 7, pullup: 7, legraise: 7, bridge: 1, hspu: 1 }),
    ).toBe(true)
  })
})
