import type { ChapterId } from './types'

/**
 * ビッグ6の色。
 *
 * オレンジ → 赤 → ピンク → 紫 のひと続きのスペクトルに並べてある。
 * 隣り合う種目は近い色になるが、グラフ全体が1本の帯として読めることを優先した。
 * 黒地（concrete-950）の上で彩度を保つため、いずれも 500 相当の明るさで揃えている。
 */
export const CHAPTER_COLOR: Record<ChapterId, string> = {
  pushup: '#f59e0b',
  squat: '#f97316',
  pullup: '#ef4444',
  legraise: '#ec4899',
  bridge: '#d946ef',
  hspu: '#a855f7',
}

/** 章IDが未知でも落ちないようにするための取り出し口 */
export function chapterColor(id: string): string {
  return CHAPTER_COLOR[id as ChapterId] ?? '#f59e0b'
}

/** 半透明にした同じ色。枠線や薄い背景に使う */
export function chapterTint(id: string, alpha: number): string {
  const hex = chapterColor(id)
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
