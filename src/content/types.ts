export type ChapterId = 'pushup' | 'squat' | 'pullup' | 'legraise' | 'bridge' | 'hspu'

export type Standard = { reps: number; sets: number }

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
export function formatStandard(s: Standard): string {
  return `${s.reps}レップスを${s.sets}セット`
}
