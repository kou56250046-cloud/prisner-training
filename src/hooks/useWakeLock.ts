import { useEffect, useRef } from 'react'

/**
 * トレーニング中に画面が消えないようにする。
 *
 * iOS は 16.4 以降で Screen Wake Lock に対応している。使えない端末では
 * 単に何もしない（機能検出のみで、代替のハックは入れない）。
 * バックグラウンドから戻るとロックは解除されるので、復帰時に取り直す。
 */
export function useWakeLock(enabled: boolean) {
  const lock = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let cancelled = false

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void sentinel.release()
          return
        }
        lock.current = sentinel
      } catch {
        // 電池残量が少ないときなどに失敗する。トレーニング自体は続けられる
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !lock.current) void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock.current?.release()
      lock.current = null
    }
  }, [enabled])
}

/** 端末が振動に対応していれば短く振動させる */
export function buzz(pattern: number | number[] = 200) {
  if ('vibrate' in navigator) navigator.vibrate(pattern)
}
