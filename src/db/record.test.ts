import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getDailyVolume,
  getDayRecords,
  getOrCreateTodaySession,
  getStepHistory,
  recordSets,
  sessionDaysInRange,
  todayKey,
} from './queries'
import { db } from './schema'

async function clearDb() {
  await Promise.all([db.sessions.clear(), db.entries.clear()])
}

const PUSHUP = { stepId: 'pushup-01', chapterId: 'pushup' as const, routineId: 'new_blood' }

/** 書き忘れた日をあとから埋めるテスト用 */
const YESTERDAY = todayKey(new Date(Date.now() - 86_400_000))

describe('図鑑からの記録', () => {
  beforeEach(clearDb)

  it('その日のセッションは1つだけ作られる', async () => {
    const a = await getOrCreateTodaySession('new_blood')
    const b = await getOrCreateTodaySession('new_blood')

    expect(b.id).toBe(a.id)
    expect(a.status).toBe('done')
    expect(await db.sessions.count()).toBe(1)
  })

  it('レップスとセット数をまとめて記録できる', async () => {
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [10, 8, 6] })

    const volume = await getDailyVolume()
    expect(volume.get(todayKey())).toEqual({ sets: 3, reps: 24 })

    const entries = (await getDayRecords(todayKey()))[0]!.entries
    expect(entries.map((e) => e.setNo)).toEqual([1, 2, 3])
    expect(entries.every((e) => e.kind === 'work')).toBe(true)
  })

  it('同じ日に同じステップを2回記録するとセット番号が続きから振られる', async () => {
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [10, 10] })
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [8] })

    const entries = (await getDayRecords(todayKey()))[0]!.entries
    expect(entries.map((e) => e.setNo)).toEqual([1, 2, 3])
    // 同じセッションに貯まる
    expect(await db.sessions.count()).toBe(1)
  })

  it('ステップが違えばセット番号は1から振り直す', async () => {
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [10, 10] })
    await recordSets({ ...PUSHUP, stepId: 'pushup-02', targetReps: 5, reps: [5] })

    const entries = (await getDayRecords(todayKey()))[0]!.entries
    const second = entries.filter((e) => e.stepId === 'pushup-02')
    expect(second.map((e) => e.setNo)).toEqual([1])
  })

  it('記録した順にセットが並ぶ', async () => {
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [10, 8, 6] })

    const history = await getStepHistory(PUSHUP.stepId)
    expect(history[0]!.reps).toEqual([10, 8, 6])
  })

  it('レップス数は負にならず整数に丸められる', async () => {
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [-3, 7.6] })

    const entries = (await getDayRecords(todayKey()))[0]!.entries
    expect(entries.map((e) => e.actualReps)).toEqual([0, 8])
  })

  it('書き忘れた日をあとから記録できる', async () => {
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [10, 10], date: YESTERDAY })

    const volume = await getDailyVolume()
    expect(volume.get(YESTERDAY)).toEqual({ sets: 2, reps: 20 })

    const day = (await getDayRecords(YESTERDAY))[0]!
    expect(day.session.date).toBe(YESTERDAY)
    // 記録時刻もその日に収まる。今日の時刻が付くと履歴の順序が狂う
    expect(todayKey(new Date(day.entries[0]!.completedAt))).toBe(YESTERDAY)
  })

  it('過去の日に足しても今日のセッションとは分かれる', async () => {
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [10] })
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [8], date: YESTERDAY })

    expect(await db.sessions.count()).toBe(2)
    expect((await getDayRecords(todayKey()))[0]!.entries).toHaveLength(1)
    expect((await getDayRecords(YESTERDAY))[0]!.entries).toHaveLength(1)
  })

  it('過去の日の記録は履歴で今日より後ろに並ぶ', async () => {
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [5] })
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [8], date: YESTERDAY })

    const history = await getStepHistory(PUSHUP.stepId)
    // 新しい順。あとから書いても昨日ぶんは昨日の位置に入る
    expect(history.map((h) => h.reps)).toEqual([[5], [8]])
  })

  it('過去の日に2回に分けて記録してもセット番号が続く', async () => {
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [10, 10], date: YESTERDAY })
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [8], date: YESTERDAY })

    const entries = (await getDayRecords(YESTERDAY))[0]!.entries
    expect(entries.map((e) => e.setNo)).toEqual([1, 2, 3])
    expect(entries.map((e) => e.actualReps)).toEqual([10, 10, 8])
  })

  it('実施日数は1日に何度記録しても1日と数える', async () => {
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [10] })
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [10] })
    await db.sessions.add({
      id: 'old',
      date: '2026-08-01',
      routineId: 'new_blood',
      status: 'done',
      startedAt: Date.parse('2026-08-01T09:00:00Z'),
    })

    expect(await sessionDaysInRange(0)).toBe(2)
    // 昨日以降に絞ると今日のぶんだけ残る
    expect(await sessionDaysInRange(Date.now() - 86_400_000)).toBe(1)
  })
})
