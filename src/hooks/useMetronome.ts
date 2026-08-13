import { useEffect, useRef } from 'react'

type AudioCtor = typeof AudioContext

function audioCtor(): AudioCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }
  return w.AudioContext ?? w.webkitAudioContext
}

export type MetronomeOptions = {
  /** 拍の間隔(ms) */
  intervalMs?: number
  /** 何拍ごとに高い音を鳴らすか。0 でアクセントなし */
  accentEvery?: number
}

/**
 * 1秒ごとにクリック音を鳴らすメトロノーム。
 *
 * 書籍が繰り返し言うとおり、動作の質はスピードで決まる。標準のペースは
 * 「2秒で上げ、頂点で1秒静止、2秒で下ろす」。5拍ごとに高い音を入れて、
 * 1レップの頭が耳で分かるようにしてある。
 *
 * setInterval で直接鳴らすと端末の負荷で拍がぶれるので、AudioContext の
 * 時計を使って少し先まで予約しておく（先読みスケジューリング）。
 */
export function useMetronome(
  enabled: boolean,
  { intervalMs = 1000, accentEvery = 5 }: MetronomeOptions = {},
) {
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!enabled) return
    const Ctor = audioCtor()
    if (!Ctor) return

    const ctx = ctxRef.current ?? new Ctor()
    ctxRef.current = ctx
    void ctx.resume()

    // 操作なしの再生を止める端末があるので、最初のタップでも鳴らせるようにしておく
    const resume = () => void ctx.resume()
    window.addEventListener('pointerdown', resume)

    const period = intervalMs / 1000
    const lookahead = 0.2
    let beat = 0
    let next = ctx.currentTime + 0.15
    // 止めるときに予約済みの音まで消せるよう、鳴らす前のものを持っておく
    const pending = new Set<OscillatorNode>()

    const click = (at: number, accent: boolean) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = accent ? 1760 : 1174
      // 立ち上がりに1msかけてブツッというノイズを避け、40msで消す
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(accent ? 0.32 : 0.18, at + 0.001)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.04)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.onended = () => pending.delete(osc)
      pending.add(osc)
      osc.start(at)
      osc.stop(at + 0.05)
    }

    const timer = window.setInterval(() => {
      while (next < ctx.currentTime + lookahead) {
        click(next, accentEvery > 0 && beat % accentEvery === 0)
        beat += 1
        next += period
      }
    }, 25)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('pointerdown', resume)
      for (const osc of pending) {
        try {
          osc.stop()
        } catch {
          // すでに鳴り終わっているだけなので無視してよい
        }
      }
      pending.clear()
      void ctx.suspend()
    }
  }, [enabled, intervalMs, accentEvery])

  // 画面を離れるまで AudioContext は使い回す。作り直すと鳴り始めが遅れる
  useEffect(
    () => () => {
      void ctxRef.current?.close()
      ctxRef.current = null
    },
    [],
  )
}
