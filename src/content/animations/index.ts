import type { Animation } from '@/anim/types'
import { pushupAnimations } from './pushup'

/**
 * 全種目のアニメーション。ステップIDで引く。
 *
 * 関節角度は写真から起こした数値データであり、書籍本文ではないので
 * 暗号化コンテンツには含めず、通常のソースとして扱う。
 */
export const animations: Record<string, Animation> = {
  ...pushupAnimations,
}
