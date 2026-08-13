import { useEffect, useRef, useState } from 'react'
import { useContent } from '@/content/ContentProvider'
import { downloadBackup, importBackup } from '@/db/backup'
import { ensureProgress, getSettings, saveSettings, setCurrentStep } from '@/db/queries'
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
