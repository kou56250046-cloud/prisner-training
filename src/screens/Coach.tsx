import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  canGraduateNewBlood,
  canSuggestConsolidation,
  describeGraduation,
  detectOverwork,
  detectPlateau,
  INTENSITY_PREREQUISITES,
  PLATEAU_REMEDIES,
  shouldDemote,
} from '@/coach/rules'
import { useContent } from '@/content/ContentProvider'
import type { Episode } from '@/content/types'
import {
  countSessionsInRange,
  ensureProgress,
  getSettings,
  getStepHistory,
  recentRpe,
} from '@/db/queries'

type Diagnosis = {
  chapterId: string
  chapterName: string
  stepId: string
  stepNo: number
  stepName: string
  graduation: string
  plateau: boolean
  demote: boolean
  consolidation: boolean
}

export function Coach() {
  const content = useContent()
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([])
  const [overwork, setOverwork] = useState(false)
  const [graduateNewBlood, setGraduateNewBlood] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void (async () => {
      const [progress, settings] = await Promise.all([ensureProgress(), getSettings()])
      const now = Date.now()

      const rows: Diagnosis[] = []
      for (const p of progress) {
        const chapter = content.chapterById.get(p.chapterId)
        const steps = content.stepsByChapter.get(p.chapterId) ?? []
        const step = steps.find((s) => s.stepNo === p.currentStep)
        if (!chapter || !step) continue

        const history = await getStepHistory(step.id, 8)
        if (history.length === 0) continue

        const recentBest = Math.max(0, ...(history[0]?.reps ?? []))
        rows.push({
          chapterId: p.chapterId,
          chapterName: chapter.name,
          stepId: step.id,
          stepNo: step.stepNo,
          stepName: step.name,
          graduation: describeGraduation(step, history[0]?.reps ?? null),
          plateau: detectPlateau(
            history.map((h) => ({ reps: h.reps, at: h.at })),
            now,
          ),
          demote: shouldDemote(
            history.map((h) => h.reps),
            step.standards,
            step.stepNo,
          ),
          consolidation: canSuggestConsolidation(recentBest),
        })
      }
      setDiagnoses(rows)

      // 週の実施回数と主観強度からオーバーワークを見る
      const routine = content.routines.find((r) => r.id === settings.routineId)
      const plannedPerWeek = routine
        ? Object.values(routine.schedule).filter((d) => d.length > 0).length
        : 3
      const weekAgo = now - 7 * 86_400_000
      setOverwork(
        detectOverwork(await countSessionsInRange(weekAgo), plannedPerWeek, await recentRpe()),
      )

      setGraduateNewBlood(
        settings.routineId === 'new_blood' &&
          canGraduateNewBlood(Object.fromEntries(progress.map((p) => [p.chapterId, p.currentStep]))),
      )
      setReady(true)
    })()
  }, [content])

  if (!ready) return <div className="p-6 text-white/40 text-sm">読み込み中…</div>

  const stuck = diagnoses.filter((d) => d.plateau || d.demote)

  return (
    <div className="pb-24">
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold">コーチ</h1>
        <p className="text-xs text-white/45 mt-1">
          判断はすべて書籍のルールに基づいています
        </p>
      </header>

      {graduateNewBlood && (
        <Alert tone="good" title="ルーチンを卒業できます">
          4種目すべてがステップ6を超えました。「新入り」から「善行」へ移る時期です。
          設定画面から変更できます。
        </Alert>
      )}

      {overwork && (
        <Alert tone="warn" title="オーバーワークの兆候">
          ルーチンの想定より多くトレーニングしていて、きつさが続いています。
          休日を増やすか、「善行」や「ベテラン」のようなルーチンに戻ると、また進歩が始まります。
        </Alert>
      )}

      {stuck.length > 0 && (
        <section className="px-4 mb-7">
          <h2 className="text-xs font-bold tracking-widest text-white/45 mb-2">停滞の診断</h2>
          <ul className="space-y-3">
            {stuck.map((d) => (
              <li key={d.chapterId} className="rounded-xl border border-red-400/30 bg-red-400/5 p-4">
                <p className="font-bold">
                  {d.chapterName}
                  <span className="text-[11px] text-white/45 font-normal ml-2">
                    STEP {d.stepNo} {d.stepName}
                  </span>
                </p>
                {d.demote ? (
                  <p className="text-sm mt-2 leading-relaxed text-white/85">
                    初心者の標準に3回続けて届いていません。ひとつ前のステップに戻り、
                    上級者の標準以上のレップス数で練習してからもう一度挑んでください。
                  </p>
                ) : (
                  <p className="text-sm mt-2 leading-relaxed text-white/85">
                    3週間以上、最高記録が更新されていません。下の4つの打開策を試してください。
                  </p>
                )}
                {d.consolidation && (
                  <p className="text-[12px] mt-2 text-amber-400/90 leading-relaxed">
                    いまは1〜2レップスしかできない状態です。「強化トレーニング」の条件に当てはまります。
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="px-4 mb-7">
        <h2 className="text-xs font-bold tracking-widest text-white/45 mb-2">次のステップまで</h2>
        {diagnoses.length === 0 ? (
          <p className="text-sm text-white/50 leading-relaxed">
            まだ記録がありません。ひとつセッションを終えると、ここに診断が出ます。
          </p>
        ) : (
          <ul className="space-y-2">
            {diagnoses.map((d) => (
              <li key={d.chapterId} className="rounded-lg border border-white/12 p-3">
                <Link to={`/library/${d.chapterId}/${d.stepNo}`} className="text-sm font-medium">
                  {d.chapterName}
                </Link>
                <p className="text-[12px] text-white/60 mt-1 leading-relaxed">{d.graduation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Section title="停滞したときの4つの打開策">
        <ol className="space-y-3">
          {PLATEAU_REMEDIES.map((r, i) => (
            <li key={r.title} className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 grid place-items-center text-[11px] font-bold">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-bold">{r.title}</p>
                <p className="text-[12px] text-white/65 mt-0.5 leading-relaxed">{r.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="強化トレーニング">
        <p className="text-[12px] text-white/65 leading-relaxed">
          あるステップから次のステップへの移行がどうしてもできないときだけ使う技術です。
          新しいステップを週1〜2回やってレップス数を増やそうとするのではなく、
          <strong className="text-white/85">毎日、時には1日2〜3回、1〜2レップスだけ</strong>
          行います。朝に1レップ、昼食後に1レップ、消灯前に1レップ。正しいフォームで、無理はしない。
          痛みを覚えたら2〜3日休みます。1〜2週間続けると、不可能に思えたステップがたやすく見えてきます。
        </p>
        <p className="text-[12px] text-red-400/80 mt-3 leading-relaxed">
          すでに複数レップスできるエクササイズにこのやり方を使ってはいけません。
        </p>
      </Section>

      <Section title="激しくトレーニングしてよい条件">
        <ul className="space-y-1.5">
          {INTENSITY_PREREQUISITES.map((p) => (
            <li key={p} className="text-[12px] text-white/70 flex gap-2 leading-relaxed">
              <span className="text-white/35 shrink-0">□</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="監獄からの言葉">
        <EpisodeList episodes={content.episodes} />
      </Section>
    </div>
  )
}

function EpisodeList({ episodes }: { episodes: Episode[] }) {
  const [open, setOpen] = useState<string | null>(null)
  if (episodes.length === 0) {
    return <p className="text-[12px] text-white/40">まだ収録されていません。</p>
  }
  return (
    <ul className="space-y-2">
      {episodes.map((e) => {
        const isOpen = open === e.id
        return (
          <li key={e.id} className="rounded-lg border border-white/12 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : e.id)}
              className="w-full text-left p-3"
            >
              <p className="text-sm font-medium">{e.title}</p>
              <p className="text-[11px] text-white/40 mt-0.5">{e.source}</p>
            </button>
            {isOpen && (
              <div className="px-3 pb-3">
                {e.body.split('\n\n').map((para, i) => (
                  <p key={i} className="text-[13px] leading-relaxed text-white/80 mb-2 last:mb-0">
                    {para}
                  </p>
                ))}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Alert({
  tone,
  title,
  children,
}: {
  tone: 'good' | 'warn'
  title: string
  children: React.ReactNode
}) {
  const cls =
    tone === 'good'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
      : 'border-orange-400/40 bg-orange-400/10 text-orange-300'
  return (
    <section className="px-4 mb-4">
      <div className={`rounded-xl border p-4 ${cls}`}>
        <p className="text-[11px] font-bold tracking-widest">{title}</p>
        <p className="text-sm mt-1.5 leading-relaxed text-white/85">{children}</p>
      </div>
    </section>
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
