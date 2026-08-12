import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Content } from '@/content/load'
import type { Chapter, Routine, Step } from '@/content/types'
import {
  ensureProgress,
  finishSession,
  getDailyVolume,
  getStepHistory,
  getStepTotals,
  promote,
  recordSet,
  startSession,
  todayKey,
} from '@/db/queries'
import { db } from '@/db/schema'
import { canPromote } from './rules'
import { buildSessionPlan, flattenPlan, nextTrainingDay, resolveTarget } from './session'

/** テスト用の最小コンテンツ。プッシュアップの3ステップだけ持つ */
function makeContent(): Content {
  const chapter: Chapter = {
    id: 'pushup',
    name: 'プッシュアップ',
    nameEn: 'THE PUSHUP',
    tagline: '',
    purpose: '',
    benefits: [],
    cautions: [],
  }
  const mk = (n: number, beg: number, int: number, adv: number): Step => ({
    id: `pushup-0${n}`,
    chapterId: 'pushup',
    stepNo: n,
    name: `ステップ${n}`,
    isMasterStep: false,
    howTo: [],
    description: '',
    purpose: '',
    benefits: [],
    standards: {
      beginner: { reps: beg, sets: 1 },
      intermediate: { reps: int, sets: 2 },
      advanced: { reps: adv, sets: 2 },
    },
    technique: '',
    cautions: [],
    equipment: [],
    sourcePages: [0, 0],
  })
  const steps = [mk(1, 10, 25, 30), mk(2, 10, 20, 25), mk(3, 10, 15, 20)]

  return {
    version: 1,
    builtAt: '',
    chapters: [chapter],
    steps,
    routines: [],
    episodes: [],
    stepById: new Map(steps.map((s) => [s.id, s])),
    stepsByChapter: new Map([['pushup', steps]]),
    chapterById: new Map([['pushup', chapter]]),
  }
}

const ROUTINE: Routine = {
  id: 'new_blood',
  name: '新入り',
  nameEn: 'NEW BLOOD',
  level: '入門',
  description: '',
  schedule: {
    mon: [{ chapterId: 'pushup', sets: [2, 3] }],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  },
  notes: [],
}

async function clearDb() {
  await Promise.all([
    db.progress.clear(),
    db.sessions.clear(),
    db.entries.clear(),
    db.settings.clear(),
    db.coachEvents.clear(),
  ])
}

describe('記録フロー', () => {
  beforeEach(clearDb)

  it('初回はビッグ6すべてがステップ1で作られる', async () => {
    const p = await ensureProgress()
    expect(p).toHaveLength(6)
    expect(p.every((x) => x.currentStep === 1 && x.unlockedStep === 1)).toBe(true)
  })

  it('ensureProgress を繰り返しても重複しない', async () => {
    await ensureProgress()
    const p = await ensureProgress()
    expect(p).toHaveLength(6)
  })

  it('月曜のメニューはウォームアップ2本＋ワークセットになる', async () => {
    const content = makeContent()
    const progress = await ensureProgress()
    const plan = await buildSessionPlan(ROUTINE, 'mon', progress, content)

    expect(plan.isRestDay).toBe(false)
    expect(plan.exercises).toHaveLength(1)

    const ex = plan.exercises[0]!
    // ステップ1なので、ウォームアップはそのステップ自体を20/15レップス
    expect(ex.warmup.map((w) => [w.stepNo, w.targetReps])).toEqual([
      [1, 20],
      [1, 15],
    ])
    // 初回のワークセットは初心者の標準（10レップス×1セット）
    expect(ex.target).toEqual({ reps: 10, sets: 1 })
    expect(ex.work).toHaveLength(1)
  })

  it('休息日は空のメニューになる', async () => {
    const content = makeContent()
    const progress = await ensureProgress()
    const plan = await buildSessionPlan(ROUTINE, 'tue', progress, content)
    expect(plan.isRestDay).toBe(true)
    expect(flattenPlan(plan)).toHaveLength(0)
  })

  it('解説が未収録のステップはメニューに出さない', async () => {
    const content = makeContent()
    await ensureProgress()
    // ステップ7には解説がない
    await db.progress.put({
      chapterId: 'pushup',
      currentStep: 7,
      unlockedStep: 7,
      updatedAt: Date.now(),
    })
    const plan = await buildSessionPlan(ROUTINE, 'mon', await ensureProgress(), content)
    expect(plan.exercises).toHaveLength(0)
  })

  it('目標を達成すると次回の目標が1レップ上がる', async () => {
    const content = makeContent()
    const step = content.stepById.get('pushup-01')!

    const s = await startSession('new_blood')
    await recordSet({
      sessionId: s.id,
      stepId: step.id,
      chapterId: 'pushup',
      setNo: 1,
      kind: 'work',
      targetReps: 10,
      actualReps: 10,
    })
    await finishSession(s.id, 'ok')

    // 10レップス1セットに到達しているので、次は中級者のセット数に分かれる
    expect(await resolveTarget(step.id, step.standards)).toEqual({ reps: 5, sets: 2 })
  })

  it('目標に届かなければ同じ目標をもう一度出す', async () => {
    const content = makeContent()
    const step = content.stepById.get('pushup-01')!

    const s = await startSession('new_blood')
    await recordSet({
      sessionId: s.id,
      stepId: step.id,
      chapterId: 'pushup',
      setNo: 1,
      kind: 'work',
      targetReps: 10,
      actualReps: 8,
    })
    await finishSession(s.id, 'hard')

    expect(await resolveTarget(step.id, step.standards)).toEqual({ reps: 10, sets: 1 })
  })

  it('ウォームアップは進級判定に混ざらない', async () => {
    const step = makeContent().stepById.get('pushup-01')!
    const s = await startSession('new_blood')
    await recordSet({
      sessionId: s.id,
      stepId: step.id,
      chapterId: 'pushup',
      setNo: 1,
      kind: 'warmup',
      targetReps: 20,
      actualReps: 20,
    })
    const history = await getStepHistory(step.id)
    expect(history).toHaveLength(0)
  })

  it('上級者の標準を2セッション連続で達成すると進級できる', async () => {
    const content = makeContent()
    const step = content.stepById.get('pushup-01')!
    await ensureProgress()

    for (let i = 0; i < 2; i++) {
      const s = await startSession('new_blood')
      for (const setNo of [1, 2]) {
        await recordSet({
          sessionId: s.id,
          stepId: step.id,
          chapterId: 'pushup',
          setNo,
          kind: 'work',
          targetReps: 30,
          actualReps: 30,
        })
      }
      await finishSession(s.id, 'ok')
    }

    const history = await getStepHistory(step.id)
    expect(history).toHaveLength(2)
    expect(canPromote(history.map((h) => h.reps), step.standards)).toBe(true)

    const to = await promote('pushup')
    expect(to).toBe(2)
    expect((await db.progress.get('pushup'))?.unlockedStep).toBe(2)
  })

  it('1セッションだけの達成では進級しない', async () => {
    const content = makeContent()
    const step = content.stepById.get('pushup-01')!

    const s = await startSession('new_blood')
    for (const setNo of [1, 2]) {
      await recordSet({
        sessionId: s.id,
        stepId: step.id,
        chapterId: 'pushup',
        setNo,
        kind: 'work',
        targetReps: 30,
        actualReps: 30,
      })
    }
    await finishSession(s.id, 'ok')

    const history = await getStepHistory(step.id)
    expect(canPromote(history.map((h) => h.reps), step.standards)).toBe(false)
  })

  it('種目を指定すれば休息日でもメニューを組める', async () => {
    const content = makeContent()
    const progress = await ensureProgress()
    // 火曜は「新入り」では休息日
    const plan = await buildSessionPlan(ROUTINE, 'tue', progress, content, {
      chapters: ['pushup'],
    })

    expect(plan.adHoc).toBe(true)
    expect(plan.exercises).toHaveLength(1)
    expect(plan.exercises[0]!.chapterId).toBe('pushup')
    // ウォームアップも通常どおり組まれる
    expect(plan.exercises[0]!.warmup).toHaveLength(2)
  })

  it('次の実施日を正しく返す', () => {
    // 月曜だけのルーチンで、水曜から見た次の実施日は5日後の月曜
    expect(nextTrainingDay(ROUTINE, 'wed')).toEqual({ weekday: 'mon', inDays: 5 })
    // 月曜当日から見ると、次は7日後の月曜
    expect(nextTrainingDay(ROUTINE, 'mon')).toEqual({ weekday: 'mon', inDays: 7 })
  })

  it('実施日が1日もないルーチンでは次の実施日が無い', () => {
    const empty: Routine = {
      ...ROUTINE,
      schedule: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
    }
    expect(nextTrainingDay(empty, 'wed')).toBeNull()
  })

  it('進行中のセッションがあれば新しく作らず再開する', async () => {
    const a = await startSession('new_blood')
    const b = await startSession('new_blood')
    expect(b.id).toBe(a.id)
    expect(await db.sessions.count()).toBe(1)
  })
})

describe('累計の集計', () => {
  beforeEach(clearDb)

  it('ステップごとにレップスとセットを積み上げる', async () => {
    const s = await startSession('new_blood')
    // ウォームアップはステップ1、ワークセットはステップ3に記録される
    await recordSet({
      sessionId: s.id,
      stepId: 'pushup-01',
      chapterId: 'pushup',
      setNo: 1,
      kind: 'warmup',
      targetReps: 20,
      actualReps: 20,
    })
    await recordSet({
      sessionId: s.id,
      stepId: 'pushup-03',
      chapterId: 'pushup',
      setNo: 1,
      kind: 'work',
      targetReps: 10,
      actualReps: 12,
    })
    await recordSet({
      sessionId: s.id,
      stepId: 'pushup-03',
      chapterId: 'pushup',
      setNo: 2,
      kind: 'work',
      targetReps: 10,
      actualReps: 9,
    })

    const totals = await getStepTotals()

    // ウォームアップのレップスも、実際にやった回数として積み上がる
    expect(totals.get('pushup-01')).toMatchObject({ totalReps: 20, workReps: 0, sets: 1 })
    expect(totals.get('pushup-03')).toMatchObject({
      totalReps: 21,
      workReps: 21,
      sets: 2,
      bestSet: 12,
    })
  })

  it('日付ごとのボリュームを集計する', async () => {
    const s = await startSession('new_blood')
    await recordSet({
      sessionId: s.id,
      stepId: 'pushup-01',
      chapterId: 'pushup',
      setNo: 1,
      kind: 'work',
      targetReps: 10,
      actualReps: 10,
    })
    await recordSet({
      sessionId: s.id,
      stepId: 'pushup-01',
      chapterId: 'pushup',
      setNo: 2,
      kind: 'work',
      targetReps: 10,
      actualReps: 8,
    })

    const volume = await getDailyVolume()
    expect(volume.get(todayKey())).toEqual({ sets: 2, reps: 18 })
  })

  it('記録がなければ空の集計になる', async () => {
    expect((await getStepTotals()).size).toBe(0)
    expect((await getDailyVolume()).size).toBe(0)
  })
})
