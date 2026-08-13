import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Content } from '@/content/load'
import type { Chapter, Routine, Step } from '@/content/types'
import {
  ensureProgress,
  getDailyVolume,
  getStepHistory,
  getStepTotals,
  promote,
  recordSet,
  todayKey,
} from '@/db/queries'
import { db } from '@/db/schema'
import { canPromote } from './rules'
import {
  nextTrainingDay,
  planForDay,
  resolveTarget,
  scheduledChapters,
  trainingDaysPerWeek,
} from './session'

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

/** 指定した日の記録の器を作る。進級判定は日をまたいだ連続を見るので日付を指定できるようにする */
let seq = 0
async function makeSession(date = todayKey()): Promise<string> {
  const id = `s${++seq}`
  await db.sessions.add({
    id,
    date,
    routineId: 'new_blood',
    status: 'done',
    startedAt: Date.parse(`${date}T09:00:00Z`) + seq,
  })
  return id
}

/** ワークセットを1本記録する */
async function work(sessionId: string, stepId: string, setNo: number, target: number, actual: number) {
  await recordSet({
    sessionId,
    stepId,
    chapterId: 'pushup',
    setNo,
    kind: 'work',
    targetReps: target,
    actualReps: actual,
  })
}

describe('今日の予定', () => {
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

  it('月曜の予定は現在ステップと初回の目標を示す', async () => {
    const content = makeContent()
    const plan = await planForDay(ROUTINE, 'mon', await ensureProgress(), content)

    expect(plan).toHaveLength(1)
    const ex = plan[0]!
    expect(ex.stepNo).toBe(1)
    // ステップ1なので、ウォームアップはそのステップ自体を20/15レップス
    expect(ex.warmup.map((w) => [w.stepNo, w.reps])).toEqual([
      [1, 20],
      [1, 15],
    ])
    // 初回の目標は初心者の標準（10レップス×1セット）
    expect(ex.target).toEqual({ reps: 10, sets: 1 })
  })

  it('休息日は予定が空になる', async () => {
    const content = makeContent()
    expect(await planForDay(ROUTINE, 'tue', await ensureProgress(), content)).toHaveLength(0)
  })

  it('解説が未収録のステップは予定に出さない', async () => {
    const content = makeContent()
    await ensureProgress()
    // ステップ7には解説がない
    await db.progress.put({
      chapterId: 'pushup',
      currentStep: 7,
      unlockedStep: 7,
      updatedAt: Date.now(),
    })
    expect(await planForDay(ROUTINE, 'mon', await ensureProgress(), content)).toHaveLength(0)
  })

  it('曜日ごとの種目を純関数で引ける', () => {
    expect(scheduledChapters(ROUTINE, 'mon')).toEqual(['pushup'])
    expect(scheduledChapters(ROUTINE, 'tue')).toEqual([])
  })

  it('1週間の実施予定日数を数える', () => {
    expect(trainingDaysPerWeek(ROUTINE)).toBe(1)
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
})

describe('目標の決まり方', () => {
  beforeEach(clearDb)

  it('目標を達成すると次回の目標が1段上がる', async () => {
    const step = makeContent().stepById.get('pushup-01')!
    await work(await makeSession(), step.id, 1, 10, 10)

    // 10レップス1セットに到達しているので、次は中級者のセット数に分かれる
    expect(await resolveTarget(step.id, step.standards)).toEqual({ reps: 5, sets: 2 })
  })

  it('目標に届かなければ同じ目標をもう一度出す', async () => {
    const step = makeContent().stepById.get('pushup-01')!
    await work(await makeSession(), step.id, 1, 10, 8)

    expect(await resolveTarget(step.id, step.standards)).toEqual({ reps: 10, sets: 1 })
  })

  it('ウォームアップは進級判定に混ざらない', async () => {
    const step = makeContent().stepById.get('pushup-01')!
    await recordSet({
      sessionId: await makeSession(),
      stepId: step.id,
      chapterId: 'pushup',
      setNo: 1,
      kind: 'warmup',
      targetReps: 20,
      actualReps: 20,
    })
    expect(await getStepHistory(step.id)).toHaveLength(0)
  })

  it('上級者の標準を2セッション連続で達成すると進級できる', async () => {
    const step = makeContent().stepById.get('pushup-01')!
    await ensureProgress()

    for (const date of ['2026-08-10', '2026-08-12']) {
      const s = await makeSession(date)
      await work(s, step.id, 1, 30, 30)
      await work(s, step.id, 2, 30, 30)
    }

    const history = await getStepHistory(step.id)
    expect(history).toHaveLength(2)
    expect(canPromote(history.map((h) => h.reps), step.standards)).toBe(true)

    expect(await promote('pushup')).toBe(2)
    expect((await db.progress.get('pushup'))?.unlockedStep).toBe(2)
  })

  it('1セッションだけの達成では進級しない', async () => {
    const step = makeContent().stepById.get('pushup-01')!
    const s = await makeSession()
    await work(s, step.id, 1, 30, 30)
    await work(s, step.id, 2, 30, 30)

    const history = await getStepHistory(step.id)
    expect(canPromote(history.map((h) => h.reps), step.standards)).toBe(false)
  })
})

describe('累計の集計', () => {
  beforeEach(clearDb)

  it('ステップごとにレップスとセットを積み上げる', async () => {
    const s = await makeSession()
    // ウォームアップはステップ1、ワークセットはステップ3に記録される
    await recordSet({
      sessionId: s,
      stepId: 'pushup-01',
      chapterId: 'pushup',
      setNo: 1,
      kind: 'warmup',
      targetReps: 20,
      actualReps: 20,
    })
    await work(s, 'pushup-03', 1, 10, 12)
    await work(s, 'pushup-03', 2, 10, 9)

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
    const s = await makeSession()
    await work(s, 'pushup-01', 1, 10, 10)
    await work(s, 'pushup-01', 2, 10, 8)

    const volume = await getDailyVolume()
    expect(volume.get(todayKey())).toEqual({ sets: 2, reps: 18 })
  })

  it('記録がなければ空の集計になる', async () => {
    expect((await getStepTotals()).size).toBe(0)
    expect((await getDailyVolume()).size).toBe(0)
  })
})
