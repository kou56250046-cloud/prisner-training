export type ChapterId = 'pushup' | 'squat' | 'pullup' | 'legraise' | 'bridge' | 'hspu'

export type Standard = { reps: number; sets: number }

/**
 * 基準の単位。ハンドスタンドの最初の3ステップだけは、
 * 回数ではなく「何秒保てるか」が基準になっている。
 */
export type Metric = 'reps' | 'seconds'

export type Standards = {
  beginner: Standard
  intermediate: Standard
  advanced: Standard
}

export type Chapter = {
  id: ChapterId
  name: string
  nameEn: string
  /** 章のサブタイトル。書籍の見出しをそのまま使う */
  tagline: string
  /** この種目を行う目的 */
  purpose: string
  /** 得られる効果 */
  benefits: string[]
  /** 種目全体に関わる注意点 */
  cautions: string[]
  /** 「その先へ」 */
  beyond?: string
  variations?: string[]
  /** 他の種目の基礎ができるまで着手しない種目か（ブリッジ・ハンドスタンド） */
  advancedOnly?: boolean
}

export type Step = {
  id: string
  chapterId: ChapterId
  stepNo: number
  name: string
  isMasterStep: boolean
  /** 「やり方」を手順に分解したもの */
  howTo: string[]
  /** 「説明」 */
  description: string
  /** このステップの目的 */
  purpose: string
  /** このステップで得られる効果 */
  benefits: string[]
  standards: Standards
  /** 基準の単位。省略時は回数 */
  metric?: Metric
  /** 「技術を完璧にするために」 */
  technique: string
  /** つまずきポイント・注意点 */
  cautions: string[]
  /** 必要なもの */
  equipment: string[]
  /** 出典ページ（解説ページ, 写真ページ） */
  sourcePages: [number, number]
}

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type RoutineSlot = {
  chapterId: ChapterId
  /** ワークセット数の範囲。書籍の「2〜3セット」に対応 */
  sets: [number, number]
  /** 「さまざまなグリップワーク」などの補助ワーク */
  note?: string
}

export type Routine = {
  id: string
  name: string
  nameEn: string
  level: string
  description: string
  schedule: Record<Weekday, RoutineSlot[]>
  /** 書籍の「■」箇条書き */
  notes: string[]
  /** 次のルーチンへ移る条件 */
  graduationHint?: string
  /** このルーチンを始める前提条件 */
  prerequisite?: string
}

/** 鼓舞用のエピソード・名言 */
export type Episode = {
  id: string
  title: string
  body: string
  /** 出典（CHAPTER と原本ページ） */
  source: string
  /** どういう場面で出すか: 停滞時 / 初回 / 進級時 / 継続 など */
  tags: string[]
}

/** 上級者の標準を「20レップスを2セット」のような表記にする */
export function formatStandard(s: Standard, metric: Metric = 'reps'): string {
  if (metric === 'seconds') {
    const label = s.reps >= 60 && s.reps % 60 === 0 ? `${s.reps / 60}分` : `${s.reps}秒`
    return s.sets > 1 ? `${label}を${s.sets}セット` : label
  }
  return `${s.reps}レップスを${s.sets}セット`
}

/** 単位のラベル。カウンターの見出しなどに使う */
export function metricLabel(metric: Metric = 'reps'): string {
  return metric === 'seconds' ? '秒' : 'レップス'
}
