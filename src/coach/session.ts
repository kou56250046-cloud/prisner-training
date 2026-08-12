import type { Content } from '@/content/load'
import type { ChapterId, Routine, Weekday } from '@/content/types'
import { getStepHistory } from '@/db/queries'
import type { Progress } from '@/db/schema'
import { buildWarmup, initialTarget, meetsTarget, nextTarget, type SetTarget } from './rules'

export type PlannedSet = {
  kind: 'warmup' | 'work'
  chapterId: ChapterId
  stepId: string
  stepNo: number
  stepName: string
  setNo: number
  targetReps: number
}

export type PlannedExercise = {
  chapterId: ChapterId
  chapterName: string
  /** 本番で取り組むステップ */
  stepId: string
  stepNo: number
  stepName: string
  target: SetTarget
  /** ルーチンが示すワークセット数の目安（書籍の「2〜3セット」） */
  routineSets: [number, number]
  warmup: PlannedSet[]
  work: PlannedSet[]
  note?: string
}

export type SessionPlan = {
  routineId: string
  routineName: string
  weekday: Weekday
  exercises: PlannedExercise[]
  /** 休息日なら true */
  isRestDay: boolean
  /** ルーチンの予定ではなく、自分で種目を選んだセッション */
  adHoc?: boolean
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
 * その日のメニューを組み立てる。
 *
 * ウォームアップは現在のステップから機械的に導かれる（原本 p.291-292）ので、
 * ユーザーが毎回考える必要はない。
 */
export async function buildSessionPlan(
  routine: Routine,
  weekday: Weekday,
  progress: Progress[],
  content: Content,
  opts: { extraWarmup?: boolean; chapters?: ChapterId[] } = {},
): Promise<SessionPlan> {
  // 種目を明示されたら、ルーチンの予定を無視してその種目でメニューを組む。
  // 休息日でも体を動かしたいときや、書籍のルーチンから外れて
  // 一種目だけやりたいときのための逃げ道。
  const slots: { chapterId: ChapterId; sets: [number, number]; note?: string }[] = opts.chapters
    ? opts.chapters.map((chapterId) => ({ chapterId, sets: [2, 3] as [number, number] }))
    : (routine.schedule[weekday] ?? [])

  const byChapter = new Map(progress.map((p) => [p.chapterId, p]))
  const exercises: PlannedExercise[] = []

  for (const slot of slots) {
    const chapter = content.chapterById.get(slot.chapterId)
    const steps = content.stepsByChapter.get(slot.chapterId) ?? []
    const currentStep = byChapter.get(slot.chapterId)?.currentStep ?? 1
    const step = steps.find((s) => s.stepNo === currentStep)
    // まだ解説を用意していない種目・ステップはメニューに出さない
    if (!chapter || !step) continue

    const target = await resolveTarget(step.id, step.standards)

    const warmup = buildWarmup(currentStep, {
      ...(opts.extraWarmup !== undefined ? { extra: opts.extraWarmup } : {}),
    }).flatMap<PlannedSet>((w, i) => {
      const ws = steps.find((s) => s.stepNo === w.stepNo)
      // 解説を用意していないステップはウォームアップから静かに落とす
      if (!ws) return []
      return [
        {
          kind: 'warmup',
          chapterId: slot.chapterId,
          stepId: ws.id,
          stepNo: ws.stepNo,
          stepName: ws.name,
          setNo: i + 1,
          targetReps: w.reps,
        },
      ]
    })

    const work: PlannedSet[] = Array.from({ length: target.sets }, (_, i) => ({
      kind: 'work' as const,
      chapterId: slot.chapterId,
      stepId: step.id,
      stepNo: step.stepNo,
      stepName: step.name,
      setNo: i + 1,
      targetReps: target.reps,
    }))

    exercises.push({
      chapterId: slot.chapterId,
      chapterName: chapter.name,
      stepId: step.id,
      stepNo: step.stepNo,
      stepName: step.name,
      target,
      routineSets: slot.sets,
      warmup,
      work,
      ...(slot.note ? { note: slot.note } : {}),
    })
  }

  return {
    routineId: routine.id,
    routineName: opts.chapters ? '自分で選んだメニュー' : routine.name,
    weekday,
    exercises,
    isRestDay: slots.length === 0,
    ...(opts.chapters ? { adHoc: true } : {}),
  }
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

/** 実行順に並べたセットの列。ウォームアップ → ワークセット を種目ごとに繰り返す */
export function flattenPlan(plan: SessionPlan): PlannedSet[] {
  return plan.exercises.flatMap((e) => [...e.warmup, ...e.work])
}
