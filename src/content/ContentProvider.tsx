import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { WrongPassphraseError } from './crypto'
import { loadCachedContent, refreshContent, unlockContent, type Content } from './load'

const Ctx = createContext<Content | null>(null)

/** 復号済みコンテンツを取り出す。ContentGate の内側でだけ使える */
export function useContent(): Content {
  const c = useContext(Ctx)
  if (!c) throw new Error('useContent は ContentGate の内側で使ってください')
  return c
}

type State =
  | { phase: 'loading' }
  | { phase: 'locked'; error?: string }
  | { phase: 'ready'; content: Content }

/**
 * 書籍由来のコンテンツは暗号化して配置してあるので、初回だけ合い言葉を求める。
 * 一度解錠すれば端末内に保存され、以降はオフラインでもそのまま開く。
 */
export function ContentGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ phase: 'loading' })
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      const cachedContent = await loadCachedContent()
      if (!alive) return
      if (cachedContent) {
        setState({ phase: 'ready', content: cachedContent })
        // 解錠済みなら、裏でコンテンツの更新を取りに行く
        void refreshContent().then((fresh) => {
          if (alive && fresh) setState({ phase: 'ready', content: fresh })
        })
      } else {
        setState({ phase: 'locked' })
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const submit = useCallback(async () => {
    if (!input.trim() || busy) return
    setBusy(true)
    try {
      const content = await unlockContent(input.trim())
      setState({ phase: 'ready', content })
    } catch (e) {
      setState({
        phase: 'locked',
        error:
          e instanceof WrongPassphraseError
            ? '合い言葉が違います'
            : e instanceof Error
              ? e.message
              : '解錠に失敗しました',
      })
    } finally {
      setBusy(false)
    }
  }, [input, busy])

  if (state.phase === 'loading') {
    return (
      <div className="min-h-full grid place-items-center text-white/40 text-sm">読み込み中…</div>
    )
  }

  if (state.phase === 'locked') {
    return (
      <div className="min-h-full grid place-items-center px-6">
        <form
          className="w-full max-w-sm"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <p className="text-[11px] tracking-[0.25em] text-amber-500/80">CONVICT CONDITIONING</p>
          <h1 className="text-2xl font-bold mt-2">プリズナートレーニング</h1>
          <p className="text-sm text-white/55 mt-4 leading-relaxed">
            解説データは暗号化して置いてあります。合い言葉を入れてください。
            <br />
            一度入れれば、この端末では次から聞かれません。
          </p>

          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="current-password"
            placeholder="合い言葉"
            className="w-full mt-5 h-12 px-4 rounded-lg bg-white/8 border border-white/15 text-base outline-none focus:border-amber-500"
          />

          {state.error && <p className="text-sm text-red-400 mt-2">{state.error}</p>}

          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="w-full mt-4 h-12 rounded-lg bg-amber-500 text-black font-bold disabled:opacity-35"
          >
            {busy ? '解錠中…' : '解錠する'}
          </button>
        </form>
      </div>
    )
  }

  return <Ctx.Provider value={state.content}>{children}</Ctx.Provider>
}
