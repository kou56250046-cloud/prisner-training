import { useCallback, useEffect, useState } from 'react'
import { useContent } from '@/content/ContentProvider'
import { metricLabel } from '@/content/types'
import {
  dateFromKey,
  deleteEntry,
  deleteSession,
  getDayRecords,
  moveSessionDate,
  todayKey,
  updateEntryReps,
  updateSessionRpe,
  type DayRecord,
} from '@/db/queries'
import type { Entry, Session } from '@/db/schema'
import { buzz } from '@/hooks/useWakeLock'

const KIND_LABEL: Record<Entry['kind'], string> = {
  warmup: 'ウォームアップ',
  work: 'ワークセット',
  consolidation: '強化',
}

const KIND_COLOR: Record<Entry['kind'], string> = {
  warmup: 'bg-sky-400',
  work: 'bg-amber-500',
  consolidation: 'bg-emerald-400',
}

const STATUS_LABEL: Record<Session['status'], string> = {
  in_progress: '実施中',
  done: '完了',
  abandoned: '中断',
}

const RPE_LABEL = [
  ['easy', '楽'],
  ['ok', '普通'],
  ['hard', 'きつい'],
] as const

function formatDate(date: string): string {
  const dt = dateFromKey(date)
  const w = ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()]
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日(${w})`
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

/**
 * カレンダーの日付から開く記録の修正シート。
 *
 * 数え間違いや押し間違いは必ず起きるので、レップス数の修正・セットの削除・
 * セッションごとの削除・日付の付け替えまで、この場で完結できるようにする。
 */
export function DayEditor({
  date,
  planned = [],
  onClose,
}: {
  date: string
  /** その日にルーチンが指示している種目名 */
  planned?: string[]
  onClose: (changed: boolean) => void
}) {
  const content = useContent()
  const [records, setRecords] = useState<DayRecord[] | null>(null)
  const [changed, setChanged] = useState(false)
  // 削除は取り消せないので、対象を1つだけ保持して2段階で確認する
  const [confirming, setConfirming] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setRecords(await getDayRecords(date))
  }, [date])

  useEffect(() => {
    void reload()
  }, [reload])

  const close = useCallback(() => onClose(changed), [onClose, changed])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const changeReps = async (entry: Entry, delta: number) => {
    const next = Math.max(0, entry.actualReps + delta)
    if (next === entry.actualReps) return
    buzz(15)
    setRecords(
      (prev) =>
        prev?.map((r) => ({
          ...r,
          entries: r.entries.map((e) => (e.id === entry.id ? { ...e, actualReps: next } : e)),
        })) ?? null,
    )
    await updateEntryReps(entry.id, next)
    setChanged(true)
  }

  const removeEntry = async (id: string) => {
    await deleteEntry(id)
    setConfirming(null)
    setChanged(true)
    await reload()
  }

  const removeSession = async (id: string) => {
    await deleteSession(id)
    setConfirming(null)
    setChanged(true)
    await reload()
  }

  const move = async (id: string, to: string) => {
    if (!to || to === date) return
    await moveSessionDate(id, to)
    setChanged(true)
    await reload()
  }

  const setRpe = async (id: string, rpe: NonNullable<Session['rpe']>, current?: string) => {
    await updateSessionRpe(id, current === rpe ? undefined : rpe)
    setChanged(true)
    await reload()
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
        aria-label={`${formatDate(date)}の記録`}
        className="relative max-h-[85vh] flex flex-col rounded-t-2xl border-t border-white/15 bg-neutral-950"
      >
        <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold truncate">{formatDate(date)}</h2>
            <p className="text-[11px] text-white/45 mt-0.5">記録の修正</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="h-10 px-4 rounded-lg border border-white/15 text-sm shrink-0 active:bg-white/10"
          >
            閉じる
          </button>
        </header>

        <div className="overflow-y-auto px-4 pb-8 space-y-3">
          {planned.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/4 p-3">
              <p className="text-[10px] tracking-widest text-white/40">この日の予定</p>
              <p className="text-[13px] mt-1">{planned.join(' / ')}</p>
            </div>
          )}

          {records === null && <p className="text-sm text-white/40 py-6">読み込み中…</p>}

          {records?.length === 0 &&
            (date > todayKey() ? (
              <p className="text-sm text-white/45 py-8 text-center leading-relaxed">
                これからの日です。
                <br />
                <span className="text-white/30 text-[12px]">
                  記録は図鑑のステップ詳細から行います
                </span>
              </p>
            ) : (
              <p className="text-sm text-white/45 py-8 text-center leading-relaxed">
                この日の記録はありません。
                <br />
                <span className="text-white/30 text-[12px]">
                  修正できるのは、実際に記録した日だけです
                </span>
              </p>
            ))}

          {records?.map(({ session, entries }) => {
            const totalReps = entries.reduce((a, e) => a + e.actualReps, 0)
            const deleting = confirming === `s:${session.id}`

            return (
              <article key={session.id} className="rounded-xl border border-white/12 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] text-white/50 tabular-nums">
                    {formatTime(session.startedAt)}
                    {session.finishedAt ? `〜${formatTime(session.finishedAt)}` : ''}
                    <span className="ml-2 text-white/35">{STATUS_LABEL[session.status]}</span>
                  </p>
                  <p className="text-[11px] text-white/45 tabular-nums shrink-0">
                    {entries.length}セット ・ {totalReps.toLocaleString()}レップス
                  </p>
                </div>

                {entries.length === 0 ? (
                  <p className="text-[12px] text-white/35 mt-3">記録されたセットはありません</p>
                ) : (
                  <ul className="mt-3 space-y-2.5">
                    {entries.map((e) => {
                      const step = content.stepById.get(e.stepId)
                      const unit = metricLabel(step?.metric)
                      // 秒で数えるステップは5刻み。1秒ずつ押させない
                      const stride = step?.metric === 'seconds' ? 5 : 1
                      const rowDeleting = confirming === `e:${e.id}`

                      return (
                        <li key={e.id} className="rounded-lg bg-white/4 p-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${KIND_COLOR[e.kind]}`}
                            />
                            <p className="text-[13px] truncate">{step?.name ?? e.stepId}</p>
                          </div>
                          <p className="text-[10px] text-white/40 mt-0.5 tabular-nums">
                            {KIND_LABEL[e.kind]} {e.setNo}セット目 ・ 目標 {e.targetReps}
                            {unit}
                          </p>

                          {rowDeleting ? (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[12px] text-white/60 mr-auto">
                                このセットを削除しますか？
                              </span>
                              <button
                                type="button"
                                onClick={() => setConfirming(null)}
                                className="h-9 px-3 rounded-lg border border-white/15 text-[12px]"
                              >
                                やめる
                              </button>
                              <button
                                type="button"
                                onClick={() => void removeEntry(e.id)}
                                className="h-9 px-3 rounded-lg bg-red-500/90 text-black text-[12px] font-bold"
                              >
                                削除
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-2">
                              <StepButton
                                label="−"
                                aria={`${stride}${unit}減らす`}
                                onClick={() => void changeReps(e, -stride)}
                              />
                              <span className="w-16 text-center tabular-nums">
                                <span className="text-xl font-bold">{e.actualReps}</span>
                                <span className="text-[10px] text-white/40 ml-0.5">{unit}</span>
                              </span>
                              <StepButton
                                label="＋"
                                aria={`${stride}${unit}増やす`}
                                onClick={() => void changeReps(e, stride)}
                              />
                              <button
                                type="button"
                                onClick={() => setConfirming(`e:${e.id}`)}
                                className="ml-auto h-9 px-3 rounded-lg text-[12px] text-red-400/80 active:bg-white/10"
                              >
                                削除
                              </button>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}

                <div className="mt-3 pt-3 border-t border-white/8">
                  <p className="text-[10px] text-white/40 mb-1.5">今日のきつさ</p>
                  <div className="flex gap-1.5">
                    {RPE_LABEL.map(([v, label]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => void setRpe(session.id, v, session.rpe)}
                        className={`h-9 px-3 rounded-lg text-[12px] border ${
                          session.rpe === v
                            ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                            : 'border-white/12 text-white/55'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <label className="text-[10px] text-white/40 shrink-0" htmlFor={`d-${session.id}`}>
                    日付
                  </label>
                  <input
                    id={`d-${session.id}`}
                    type="date"
                    value={session.date}
                    max={todayKey()}
                    onChange={(ev) => void move(session.id, ev.target.value)}
                    className="h-9 px-2 rounded-lg bg-white/8 border border-white/12 text-[12px] tabular-nums"
                  />
                  {deleting ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="ml-auto h-9 px-3 rounded-lg border border-white/15 text-[12px]"
                      >
                        やめる
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeSession(session.id)}
                        className="h-9 px-3 rounded-lg bg-red-500/90 text-black text-[12px] font-bold"
                      >
                        まとめて削除
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(`s:${session.id}`)}
                      className="ml-auto h-9 px-3 rounded-lg text-[12px] text-red-400/80 active:bg-white/10"
                    >
                      この記録を削除
                    </button>
                  )}
                </div>
              </article>
            )
          })}

          {!!records?.length && (
            <p className="text-[11px] text-white/30 leading-relaxed pt-1">
              修正した内容は累計レップスや進捗にもすぐ反映されます。
              なお、すでに上がったステップは自動では戻りません。設定から現在のステップを直してください。
            </p>
          )}
        </div>
      </div>
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
      onClick={onClick}
      aria-label={aria}
      className="w-11 h-11 rounded-full border border-white/20 text-xl font-bold grid place-items-center active:bg-white/10 shrink-0"
    >
      {label}
    </button>
  )
}
