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
  opts: { extraWarmup?: boolean } = {},
): Promise<SessionPlan> {
  const slots = routine.schedule[weekday] ?? []
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
    routineName: routine.name,
    weekday,
    exercises,
    isRestDay: slots.length === 0,
  }
}

/** 実行順に並べたセットの列。ウォームアップ → ワークセット を種目ごとに繰り返す */
export function flattenPlan(plan: SessionPlan): PlannedSet[] {
  return plan.exercises.flatMap((e) => [...e.warmup, ...e.work])
}
