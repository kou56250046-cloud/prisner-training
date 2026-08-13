import { useCallback, useEffect, useState } from 'react'
import { canPromote, type SetTarget } from '@/coach/rules'
import { namedWarmup, resolveTarget } from '@/coach/session'
import { useContent } from '@/content/ContentProvider'
import { metricLabel, type ChapterId, type Step } from '@/content/types'
import {
  addCoachEvent,
  getSettings,
  getStepHistory,
  getStepTotals,
  promote,
  recordSets,
} from '@/db/queries'
import { useMetronome } from '@/hooks/useMetronome'
import { buzz, useWakeLock } from '@/hooks/useWakeLock'

type Result = {
  total: number
  sets: number
  /** 進級した場合の移動先ステップ */
  promotedTo?: number
  /** 自己ベストを更新した場合のレップス数 */
  best?: number
}

/**
 * 図鑑のステップ詳細から開く記録シート。
 *
 * 「今日のメニュー」を組んでから消化するのではなく、やった種目をその場で書く。
 * 手順とアニメを表示している画面のまま開くので、やり方を確認しながら記録できる。
 */
export function RecordSheet({
  step,
  chapterId,
  isCurrentStep,
  onClose,
}: {
  step: Step
  chapterId: ChapterId
  /** いま取り組んでいるステップか。進級判定はこのときだけ行う */
  isCurrentStep: boolean
  onClose: (recorded: boolean) => void
}) {
  const content = useContent()
  const unit = metricLabel(step.metric)
  // 秒で数えるステップは5刻み。1秒ずつ押させない
  const stride = step.metric === 'seconds' ? 5 : 1

  const [target, setTarget] = useState<SetTarget | null>(null)
  const [reps, setReps] = useState(0)
  const [sets, setSets] = useState(1)
  /** セットごとに入力しているときの値。null なら一括入力 */
  const [perSet, setPerSet] = useState<number[] | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [recorded, setRecorded] = useState(false)
  const [saving, setSaving] = useState(false)

  const [metronomeOn, setMetronomeOn] = useState(false)
  const [rest, setRest] = useState<number | null>(null)
  const [restSeconds, setRestSeconds] = useState(90)

  useMetronome(metronomeOn)
  // シートを開いている間＝トレーニング中なので画面を消さない
  useWakeLock(true)

  useEffect(() => {
    void (async () => {
      const [t, settings] = await Promise.all([
        resolveTarget(step.id, step.standards),
        getSettings(),
      ])
      setTarget(t)
      setReps(t.reps)
      setSets(t.sets)
      setRestSeconds(settings.restSeconds)
      setMetronomeOn(settings.metronome ?? true)
    })()
  }, [step])

  // 休憩タイマー
  useEffect(() => {
    if (rest === null) return
    if (rest <= 0) {
      buzz([120, 80, 120])
      setRest(null)
      return
    }
    const t = window.setTimeout(() => setRest((r) => (r === null ? null : r - 1)), 1000)
    return () => window.clearTimeout(t)
  }, [rest])

  const close = useCallback(() => onClose(recorded), [onClose, recorded])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const values = perSet ?? Array.from({ length: sets }, () => reps)
  const total = values.reduce((a, b) => a + b, 0)

  const warmup = namedWarmup(step.stepNo, content.stepsByChapter.get(chapterId) ?? [])

  const save = async () => {
    if (!target || saving || values.length === 0) return
    setSaving(true)
    try {
      const before = (await getStepTotals()).get(step.id)?.bestSet ?? 0
      const settings = await getSettings()

      await recordSets({
        stepId: step.id,
        chapterId,
        targetReps: target.reps,
        reps: values,
        routineId: settings.routineId,
      })

      const next: Result = { total, sets: values.length }

      // 自己ベスト更新。積み上げが目に見えるほど続く理由になる
      const bestNow = Math.max(...values)
      if (bestNow > before && bestNow > 0) {
        next.best = bestNow
        await addCoachEvent({
          type: 'personalBest',
          chapterId,
          message: `${step.name}で${bestNow}${unit}。自己ベストを更新しました。`,
        })
      }

      // 進級判定は取り組み中のステップだけ。先のステップを試し記録しても進めない
      if (isCurrentStep) {
        const history = await getStepHistory(step.id, 3)
        if (canPromote(history.map((h) => h.reps), step.standards)) {
          const to = await promote(chapterId)
          next.promotedTo = to
          await addCoachEvent({
            type: 'promote',
            chapterId,
            message: `${step.name}で上級者の標準を2回連続で達成。ステップ${to}に進みます。`,
          })
        }
      }

      setResult(next)
      setRecorded(true)
      buzz(60)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="閉じる"
        onClick={close}
        className="absolute inset-0 bg-black/70"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${step.name}を記録`}
        className="relative max-h-[90vh] flex flex-col rounded-t-2xl border-t border-white/15 bg-neutral-950"
      >
        <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-widest text-amber-500">
              STEP {step.stepNo}
            </p>
            <h2 className="text-base font-bold truncate">{step.name}</h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="h-10 px-4 rounded-lg border border-white/15 text-sm shrink-0 active:bg-white/10"
          >
            閉じる
          </button>
        </header>

        <div className="overflow-y-auto px-4 pb-8">
          {result ? (
            <ResultView
              result={result}
              unit={unit}
              onAgain={() => {
                setResult(null)
                setPerSet(null)
              }}
              onClose={close}
            />
          ) : !target ? (
            <p className="text-sm text-white/40 py-8 text-center">読み込み中…</p>
          ) : (
            <>
              {warmup.length > 0 && (
                <p className="text-[11px] text-white/40 leading-relaxed mb-4">
                  ウォームアップの目安:{' '}
                  {warmup.map((w) => `STEP${w.stepNo} ${w.reps}回`).join(' → ')}
                </p>
              )}

              <p className="text-[11px] text-white/45 mb-3 tabular-nums">
                今日の目標 {target.reps}
                {unit} × {target.sets}セット
              </p>

              {perSet ? (
                <PerSetInput
                  values={perSet}
                  unit={unit}
                  stride={stride}
                  onChange={setPerSet}
                  onCollapse={() => {
                    setSets(perSet.length)
                    setReps(perSet[0] ?? reps)
                    setPerSet(null)
                  }}
                />
              ) : (
                <>
                  <Row
                    label={unit}
                    value={reps}
                    onChange={(v) => setReps(Math.max(0, v))}
                    stride={stride}
                  />
                  <Row
                    label="セット"
                    value={sets}
                    onChange={(v) => setSets(Math.min(20, Math.max(1, v)))}
                    stride={1}
                  />
                  <button
                    type="button"
                    onClick={() => setPerSet(Array.from({ length: sets }, () => reps))}
                    className="w-full h-10 rounded-lg border border-white/12 text-[12px] text-white/60 mt-3"
                  >
                    セットごとに入力する
                  </button>
                </>
              )}

              <p className="text-center text-sm text-white/70 mt-4 tabular-nums">
                合計 <span className="text-lg font-bold text-white">{total}</span>
                {unit}
                <span className="text-white/40"> ／ {values.length}セット</span>
              </p>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setMetronomeOn((v) => !v)}
                  aria-pressed={metronomeOn}
                  className={`flex-1 h-11 rounded-lg border text-[12px] ${
                    metronomeOn
                      ? 'border-amber-500/60 text-amber-400'
                      : 'border-white/12 text-white/45'
                  }`}
                >
                  ♪ リズム音 {metronomeOn ? 'オン' : 'オフ'}
                </button>
                <button
                  type="button"
                  onClick={() => setRest(rest === null ? restSeconds : null)}
                  className={`flex-1 h-11 rounded-lg border text-[12px] tabular-nums ${
                    rest === null
                      ? 'border-white/12 text-white/45'
                      : 'border-sky-400/60 text-sky-300'
                  }`}
                >
                  {rest === null ? `休憩 ${restSeconds}秒` : `残り ${rest}秒`}
                </button>
              </div>

              {metronomeOn && (
                <p className="text-center text-[10px] text-white/30 mt-2">
                  {step.metric === 'seconds'
                    ? '1拍＝1秒。高い音は5秒ごと'
                    : '2秒で上げ・1秒静止・2秒で下ろす。高い音が1レップの頭'}
                </p>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="w-full h-16 rounded-xl bg-amber-500 text-black text-lg font-bold mt-5 active:bg-amber-400 disabled:opacity-40"
              >
                記録する
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** 記録したあとの表示。進級と自己ベストはここで見せる */
function ResultView({
  result,
  unit,
  onAgain,
  onClose,
}: {
  result: Result
  unit: string
  onAgain: () => void
  onClose: () => void
}) {
  return (
    <div className="py-4">
      {result.promotedTo !== undefined ? (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-5 text-center">
          <p className="text-[11px] font-bold tracking-[0.3em] text-amber-400">進級</p>
          <p className="text-3xl font-bold mt-2 tabular-nums">STEP {result.promotedTo}</p>
          <p className="text-[12px] text-white/70 mt-2 leading-relaxed">
            上級者の標準を2回連続で達成しました。次のステップに進みます。
          </p>
        </div>
      ) : result.best !== undefined ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5 text-center">
          <p className="text-[11px] font-bold tracking-[0.3em] text-amber-400">自己ベスト更新</p>
          <p className="text-3xl font-bold mt-2 tabular-nums">
            {result.best}
            <span className="text-sm font-normal text-white/50 ml-1">{unit}</span>
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/12 p-5 text-center">
          <p className="text-sm font-bold">記録しました</p>
          <p className="text-2xl font-bold mt-2 tabular-nums">
            {result.total}
            <span className="text-sm font-normal text-white/50 ml-1">{unit}</span>
          </p>
          <p className="text-[11px] text-white/40 mt-1 tabular-nums">{result.sets}セット</p>
        </div>
      )}

      <div className="flex gap-2 mt-5">
        <button
          type="button"
          onClick={onAgain}
          className="flex-1 h-12 rounded-lg border border-white/15 text-sm"
        >
          続けて記録する
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 h-12 rounded-lg bg-amber-500 text-black font-bold"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}

function PerSetInput({
  values,
  unit,
  stride,
  onChange,
  onCollapse,
}: {
  values: number[]
  unit: string
  stride: number
  onChange: (v: number[]) => void
  onCollapse: () => void
}) {
  const set = (i: number, v: number) =>
    onChange(values.map((x, j) => (j === i ? Math.max(0, v) : x)))

  return (
    <div>
      <ul className="space-y-2">
        {values.map((v, i) => (
          // 並び順が意味を持つ固定長のリストなので、添字をキーにしてよい
          <li key={i} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-[11px] text-white/45 tabular-nums">
              {i + 1}セット
            </span>
            <StepButton label="−" aria={`${i + 1}セット目を減らす`} onClick={() => set(i, v - stride)} />
            <span className="flex-1 text-center tabular-nums">
              <span className="text-2xl font-bold">{v}</span>
              <span className="text-[10px] text-white/40 ml-0.5">{unit}</span>
            </span>
            <StepButton label="＋" aria={`${i + 1}セット目を増やす`} onClick={() => set(i, v + stride)} />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              disabled={values.length <= 1}
              aria-label={`${i + 1}セット目を削除`}
              className="w-9 h-9 shrink-0 rounded-lg text-white/30 text-[11px] disabled:opacity-20"
            >
              削除
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => onChange([...values, values[values.length - 1] ?? 0])}
          className="flex-1 h-10 rounded-lg border border-white/12 text-[12px] text-white/60"
        >
          ＋ セットを追加
        </button>
        <button
          type="button"
          onClick={onCollapse}
          className="flex-1 h-10 rounded-lg border border-white/12 text-[12px] text-white/45"
        >
          一括入力に戻す
        </button>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  onChange,
  stride,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  stride: number
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-14 shrink-0 text-[12px] text-white/50">{label}</span>
      <StepButton label="−" aria={`${label}を減らす`} onClick={() => onChange(value - stride)} />
      <span className="flex-1 text-center">
        <span className="text-4xl font-bold tabular-nums">{value}</span>
      </span>
      <StepButton label="＋" aria={`${label}を増やす`} onClick={() => onChange(value + stride)} />
    </div>
  )
}

function StepButton({
  label,
  aria,
  onClick,
}: {
  label: string
  aria: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={() => {
        buzz(15)
        onClick()
      }}
      className="w-12 h-12 shrink-0 rounded-full border border-white/20 text-xl font-bold grid place-items-center active:bg-white/10"
    >
      {label}
    </button>
  )
}
