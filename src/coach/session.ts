import type { Content } from '@/content/load'
import type { ChapterId, Metric, Routine, Weekday } from '@/content/types'
import { getStepHistory } from '@/db/queries'
import type { Progress } from '@/db/schema'
import { buildWarmup, initialTarget, meetsTarget, nextTarget, type SetTarget, type WarmupSet } from './rules'

/** その日ルーチンが指示している種目ひとつ分 */
export type PlannedChapter = {
  chapterId: ChapterId
  chapterName: string
  stepId: string
  stepNo: number
  stepName: string
  /** 今日狙う目標 */
  target: SetTarget
  /** 回数ではなく秒数で数えるステップか（逆立ちの保持系） */
  metric?: Metric
  /** ウォームアップの目安 */
  warmup: { stepNo: number; stepName: string; reps: number }[]
  /** ルーチンが示すワークセット数の目安（書籍の「2〜3セット」） */
  routineSets: [number, number]
  /** 「さまざまなグリップワーク」などの補助ワーク */
  note?: string
}

/**
 * 直近の実績から、今日狙う目標を決める。
 *
 * 前回の目標を達成していれば1段進め、達成できていなければ同じ目標をもう一度。
 * 「気持ちのペースではなく、体のペースに従う」（原本 p.302）。
 */
export async function resolveTarget(stepId: string, standards: {
  beginner: SetTarget
  intermediate: SetTarget
  advanced: SetTarget
}): Promise<SetTarget> {
  const history = await getStepHistory(stepId, 3)
  const last = history[0]
  if (!last) return initialTarget(standards)

  const lastTarget: SetTarget = { reps: last.targetReps, sets: last.reps.length }
  return meetsTarget(last.reps, lastTarget) ? nextTarget(lastTarget, standards) : lastTarget
}

/**
 * その曜日にルーチンが指示している種目。
 *
 * カレンダーが1か月ぶんの日付から何十回も呼ぶので、DB を触らない純関数にしてある。
 */
export function scheduledChapters(routine: Routine, weekday: Weekday): ChapterId[] {
  return (routine.schedule[weekday] ?? []).map((slot) => slot.chapterId)
}

/** ルーチンが1週間に何日トレーニングを置いているか */
export function trainingDaysPerWeek(routine: Routine): number {
  return Object.values(routine.schedule).filter((slots) => slots.length > 0).length
}

/**
 * その日の予定を組み立てる。
 *
 * 記録そのものは図鑑から行うので、これは「今日はこれをやる日」を示すための
 * 案内でしかない。セット数を固定したメニューは作らない。
 * ウォームアップは現在のステップから機械的に導かれる（原本 p.291-292）。
 */
export async function planForDay(
  routine: Routine,
  weekday: Weekday,
  progress: Progress[],
  content: Content,
): Promise<PlannedChapter[]> {
  const byChapter = new Map(progress.map((p) => [p.chapterId, p]))
  const out: PlannedChapter[] = []

  for (const slot of routine.schedule[weekday] ?? []) {
    const chapter = content.chapterById.get(slot.chapterId)
    const steps = content.stepsByChapter.get(slot.chapterId) ?? []
    const currentStep = byChapter.get(slot.chapterId)?.currentStep ?? 1
    const step = steps.find((s) => s.stepNo === currentStep)
    // まだ解説を用意していない種目・ステップは案内に出さない
    if (!chapter || !step) continue

    out.push({
      chapterId: slot.chapterId,
      chapterName: chapter.name,
      stepId: step.id,
      stepNo: step.stepNo,
      stepName: step.name,
      target: await resolveTarget(step.id, step.standards),
      ...(step.metric ? { metric: step.metric } : {}),
      warmup: namedWarmup(currentStep, steps),
      routineSets: slot.sets,
      ...(slot.note ? { note: slot.note } : {}),
    })
  }
  return out
}

/** ウォームアップの各セットに、そのステップの名前を添える */
export function namedWarmup(
  currentStep: number,
  steps: { stepNo: number; name: string }[],
  opts: { extra?: boolean } = {},
): { stepNo: number; stepName: string; reps: number }[] {
  return buildWarmup(currentStep, opts).flatMap<{
    stepNo: number
    stepName: string
    reps: number
  }>((w: WarmupSet) => {
    const s = steps.find((x) => x.stepNo === w.stepNo)
    // 解説を用意していないステップは静かに落とす
    return s ? [{ stepNo: w.stepNo, stepName: s.name, reps: w.reps }] : []
  })
}

/** ルーチンの次の実施日を返す。休息日にいつ再開するのかを示すため */
export function nextTrainingDay(routine: Routine, from: Weekday): { weekday: Weekday; inDays: number } | null {
  const order: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const start = order.indexOf(from)
  for (let i = 1; i <= 7; i++) {
    const w = order[(start + i) % 7]!
    if ((routine.schedule[w] ?? []).length > 0) return { weekday: w, inDays: i }
  }
  return null
}

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  sun: '日',
  mon: '月',
  tue: '火',
  wed: '水',
  thu: '木',
  fri: '金',
  sat: '土',
}

export const WEEKDAY_ORDER: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
