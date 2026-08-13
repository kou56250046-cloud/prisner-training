import type { Animation } from '@/anim/types'
import { bridgeAnimations } from './bridge'
import { hspuAnimations } from './hspu'
import { legraiseAnimations } from './legraise'
import { pullupAnimations } from './pullup'
import { pushupAnimations } from './pushup'
import { squatAnimations } from './squat'

/**
 * 全種目のアニメーション。ステップIDで引く。
 *
 * 関節角度は写真から起こした数値データであり、書籍本文ではないので
 * 暗号化コンテンツには含めず、通常のソースとして扱う。
 */
export const animations: Record<string, Animation> = {
  ...pushupAnimations,
  ...squatAnimations,
  ...pullupAnimations,
  ...legraiseAnimations,
  ...bridgeAnimations,
  ...hspuAnimations,
}
