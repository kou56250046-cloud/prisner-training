import { useEffect, useRef, useState } from 'react'
import { useContent } from '@/content/ContentProvider'
import { downloadBackup, importBackup } from '@/db/backup'
import { ensureProgress, getSettings, saveSettings, setCurrentStep } from '@/db/queries'
import { pullFromSheet, pushToSheet } from '@/db/sheetSync'
import type { Progress, Settings as SettingsRow } from '@/db/schema'
import type { ChapterId } from '@/content/types'

export function Settings() {
  const content = useContent()
  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [progress, setProgress] = useState<Progress[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void (async () => {
      setSettings(await getSettings())
      setProgress(await ensureProgress())
    })()
  }, [])

  if (!settings) return <div className="p-6 text-white/40 text-sm">読み込み中…</div>

  const patch = async (p: Partial<SettingsRow>) => setSettings(await saveSettings(p))

  /** スプレッドシートから戻したあと、画面に出ている値を取り直す */
  const onRestored = async () => {
    setProgress(await ensureProgress())
    setSettings(await getSettings())
  }

  const onImport = async (file: File) => {
    const ok = window.confirm(
      'いまの記録をすべて消して、ファイルの内容で置き換えます。よろしいですか？',
    )
    if (!ok) return
    try {
      const r = await importBackup(await file.text())
      setProgress(await ensureProgress())
      setSettings(await getSettings())
      setMessage(`復元しました（${r.sessions}セッション / ${r.entries}セット）`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '読み込みに失敗しました')
    }
  }

  return (
    <div className="pb-24">
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold">設定</h1>
      </header>

      <Section title="ルーチン">
        <ul className="space-y-2">
          {content.routines.map((r) => {
            const active = r.id === settings.routineId
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => void patch({ routineId: r.id })}
                  className={`w-full text-left rounded-xl border p-3 ${
                    active ? 'border-amber-500/60 bg-amber-500/5' : 'border-white/12'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold">{r.name}</span>
                    <span className="text-[11px] text-white/45 shrink-0">{r.level}</span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-1 leading-relaxed line-clamp-2">
                    {r.description}
                  </p>
                  {r.prerequisite && (
                    <p className="text-[11px] text-red-400/70 mt-1.5">前提: {r.prerequisite}</p>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section title="セット間の休憩">
        <p className="text-[11px] text-white/45 mb-2 leading-relaxed">
          記録シートの休憩ボタンを押したときの秒数です。
        </p>
        <div className="flex gap-2">
          {[60, 90, 120, 180].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void patch({ restSeconds: s })}
              className={`flex-1 h-12 rounded-lg border text-sm tabular-nums ${
                settings.restSeconds === s
                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-400'
                  : 'border-white/12 text-white/60'
              }`}
            >
              {s}秒
            </button>
          ))}
        </div>
      </Section>

      <Section title="リズム音">
        <button
          type="button"
          onClick={() => void patch({ metronome: !(settings.metronome ?? true) })}
          className={`w-full h-12 rounded-lg border text-sm ${
            settings.metronome ?? true
              ? 'border-amber-500/60 bg-amber-500/10 text-amber-400'
              : 'border-white/12 text-white/60'
          }`}
        >
          {settings.metronome ?? true ? '1秒ごとに鳴らす' : '鳴らさない'}
        </button>
        <p className="text-[11px] text-white/40 mt-2 leading-relaxed">
          書籍の標準ペースは「2秒で上げ、1秒静止、2秒で下ろす」。
          5拍ごとに高い音が入るので、そこが1レップの頭になります。
          記録シートからも切り替えられます。
        </p>
      </Section>

      <Section title="画面のスリープ防止">
        <button
          type="button"
          onClick={() => void patch({ wakeLock: !settings.wakeLock })}
          className={`w-full h-12 rounded-lg border text-sm ${
            settings.wakeLock
              ? 'border-amber-500/60 bg-amber-500/10 text-amber-400'
              : 'border-white/12 text-white/60'
          }`}
        >
          {settings.wakeLock ? 'トレーニング中は画面を消さない' : 'スリープ防止をしない'}
        </button>
        <p className="text-[11px] text-white/40 mt-2 leading-relaxed">
          記録シートを開いている間だけ働きます。iOS 16.4 以降で有効。
          対応していない端末では自動的に無視されます。
        </p>
      </Section>

      <Section title="現在のステップ">
        <p className="text-[11px] text-white/45 mb-2 leading-relaxed">
          書籍は「どれだけ筋力があってもビッグ6すべてステップ1から始めろ」と明言しています。
          飛ばす場合は自己責任で。
        </p>
        <ul className="space-y-2">
          {progress.map((p) => {
            const chapter = content.chapterById.get(p.chapterId)
            if (!chapter) return null
            return (
              <li key={p.chapterId} className="flex items-center gap-3">
                <span className="text-sm w-32 shrink-0">{chapter.name}</span>
                <StepStepper
                  value={p.currentStep}
                  onChange={async (v) => {
                    await setCurrentStep(p.chapterId as ChapterId, v)
                    setProgress(await ensureProgress())
                  }}
                />
              </li>
            )
          })}
        </ul>
      </Section>

      <SheetSection settings={settings} onSaved={setSettings} onRestored={onRestored} />

      <Section title="バックアップ">
        <p className="text-[11px] text-white/45 mb-3 leading-relaxed">
          記録はこの端末の中にしかありません。機種変更の前に必ず書き出してください。
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void downloadBackup()}
            className="flex-1 h-12 rounded-lg border border-white/20 text-sm"
          >
            書き出す
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex-1 h-12 rounded-lg border border-white/20 text-sm"
          >
            読み込む
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onImport(f)
            e.target.value = ''
          }}
        />
        {message && <p className="text-[12px] text-amber-400 mt-3">{message}</p>}
      </Section>

      <Section title="おことわり">
        <p className="text-[11px] text-white/45 leading-relaxed">
          細心の注意を払い、自己責任のもとにトレーニングを進めてください。
          どんなトレーニングプログラムであろうと、始める前に医師に相談するよう、
          あらゆる医療専門家がアドバイスしています。なによりも安全第一に。
        </p>
      </Section>
    </div>
  )
}

function formatMoment(ms: number): string {
  return new Date(ms).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Google スプレッドシートへの写し。
 *
 * 記録が端末の中にしかないのは、機種変更や端末の故障で全部消えるということ。
 * GAS のウェブアプリを1枚立ててもらい、記録するたびに全件を送り直す。
 */
function SheetSection({
  settings,
  onSaved,
  onRestored,
}: {
  settings: SettingsRow
  onSaved: (s: SettingsRow) => void
  onRestored: () => Promise<void>
}) {
  const [url, setUrl] = useState(settings.sheetUrl ?? '')
  const [token, setToken] = useState(settings.sheetToken ?? '')
  const [busy, setBusy] = useState<'push' | 'pull' | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const auto = settings.sheetAutoSync !== false

  const save = async (patch: Partial<SettingsRow>) => onSaved(await saveSettings(patch))

  const sync = async () => {
    setBusy('push')
    setNote(null)
    try {
      await save({ sheetUrl: url.trim(), sheetToken: token.trim() })
      const r = await pushToSheet()
      setNote(`同期しました（${r.rows.toLocaleString()}セット）`)
    } catch (e) {
      setNote(e instanceof Error ? e.message : '同期に失敗しました')
    } finally {
      onSaved(await getSettings())
      setBusy(null)
    }
  }

  const restore = async () => {
    const ok = window.confirm(
      'いまの端末の記録をすべて消して、スプレッドシートの内容で置き換えます。よろしいですか？',
    )
    if (!ok) return
    setBusy('pull')
    setNote(null)
    try {
      await save({ sheetUrl: url.trim(), sheetToken: token.trim() })
      const r = await pullFromSheet()
      await onRestored()
      setNote(`復元しました（${r.sessions}セッション / ${r.entries}セット）`)
    } catch (e) {
      setNote(e instanceof Error ? e.message : '復元に失敗しました')
    } finally {
      onSaved(await getSettings())
      setBusy(null)
    }
  }

  return (
    <Section title="スプレッドシート連携">
      <p className="text-[11px] text-white/45 mb-3 leading-relaxed">
        記録するたびに、全件を Google スプレッドシートに書き写します。
        端末が壊れても記録が残り、シート上で集計やグラフも作れます。
      </p>

      <label className="block text-[11px] text-white/40 mb-1" htmlFor="sheet-url">
        ウェブアプリのURL
      </label>
      <input
        id="sheet-url"
        type="url"
        inputMode="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={() => void save({ sheetUrl: url.trim() })}
        placeholder="https://script.google.com/macros/s/.../exec"
        className="w-full h-11 px-3 rounded-lg bg-white/8 border border-white/15 text-[13px] outline-none focus:border-amber-500"
      />

      <label className="block text-[11px] text-white/40 mt-3 mb-1" htmlFor="sheet-token">
        合い言葉（スクリプトの TOKEN と同じ文字列）
      </label>
      {/* パスワード欄にするとブラウザが解錠用の合い言葉を勝手に流し込むので、素の文字列で扱う */}
      <input
        id="sheet-token"
        type="text"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        onBlur={() => void save({ sheetToken: token.trim() })}
        autoComplete="off"
        spellCheck={false}
        className="w-full h-11 px-3 rounded-lg bg-white/8 border border-white/15 text-[13px] outline-none focus:border-amber-500"
      />

      <button
        type="button"
        onClick={() => void save({ sheetAutoSync: !auto })}
        className={`w-full h-12 rounded-lg border text-sm mt-3 ${
          auto ? 'border-amber-500/60 bg-amber-500/10 text-amber-400' : 'border-white/12 text-white/60'
        }`}
      >
        {auto ? '記録するたびに自動で送る' : '自動では送らない'}
      </button>

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          disabled={!url.trim() || busy !== null}
          onClick={() => void sync()}
          className="flex-1 h-12 rounded-lg border border-white/20 text-sm disabled:opacity-35"
        >
          {busy === 'push' ? '送信中…' : '今すぐ同期'}
        </button>
        <button
          type="button"
          disabled={!url.trim() || busy !== null}
          onClick={() => void restore()}
          className="flex-1 h-12 rounded-lg border border-white/20 text-sm disabled:opacity-35"
        >
          {busy === 'pull' ? '復元中…' : 'シートから復元'}
        </button>
      </div>

      {note && <p className="text-[12px] text-amber-400 mt-3">{note}</p>}

      {settings.sheetSyncedAt !== undefined && (
        <p className="text-[11px] text-white/35 mt-2 tabular-nums">
          最終同期 {formatMoment(settings.sheetSyncedAt)}
        </p>
      )}
      {settings.sheetSyncError && (
        <p className="text-[11px] text-red-400/80 mt-1">未送信: {settings.sheetSyncError}</p>
      )}

      <details className="mt-3">
        <summary className="text-[12px] text-white/50 cursor-pointer">はじめて設定するとき</summary>
        <ol className="text-[11px] text-white/45 leading-relaxed mt-2 space-y-1 list-decimal pl-4">
          <li>記録先のスプレッドシートを開き、拡張機能 → Apps Script</li>
          <li>
            リポジトリの <code className="text-white/60">gas/Code.gs</code> を貼って保存
          </li>
          <li>
            プロジェクトの設定 → スクリプト プロパティ に、
            <code className="text-white/60">TOKEN</code> という名前で合い言葉を登録する
          </li>
          <li>
            デプロイ → 新しいデプロイ → ウェブアプリ。実行ユーザーは「自分」、
            アクセスは「全員」
          </li>
          <li>表示された /exec で終わるURLと、TOKEN に登録した文字列を上の欄に入れる</li>
          <li>「今すぐ同期」を押す</li>
        </ol>
        <p className="text-[11px] text-white/35 mt-2 leading-relaxed">
          アクセスを「全員」にするのは、URLを知っていれば誰でも叩けるということです。
          書き込みは合い言葉で止めているので、推測されにくい文字列にしてください。
          解錠用の合い言葉の使い回しは避けてください。
        </p>
      </details>
    </Section>
  )
}

function StepStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-10 h-10 rounded-lg border border-white/15 text-lg"
        aria-label="ステップを下げる"
      >
        −
      </button>
      <span className="w-10 text-center font-bold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(10, value + 1))}
        className="w-10 h-10 rounded-lg border border-white/15 text-lg"
        aria-label="ステップを上げる"
      >
        ＋
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 mb-7">
      <h2 className="text-xs font-bold tracking-widest text-white/45 mb-2">{title}</h2>
      {children}
    </section>
  )
}
