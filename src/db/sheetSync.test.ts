import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { recordSets, todayKey, updateSessionRpe } from './queries'
import { db } from './schema'
import { buildTables } from './sheetSync'

async function clearDb() {
  await Promise.all([db.sessions.clear(), db.entries.clear(), db.progress.clear()])
}

const PUSHUP = { stepId: 'pushup-01', chapterId: 'pushup' as const, routineId: 'new_blood' }
const YESTERDAY = todayKey(new Date(Date.now() - 86_400_000))

const table = (tables: Awaited<ReturnType<typeof buildTables>>, name: string) =>
  tables.find((t) => t.name === name)!

describe('スプレッドシートに送る表', () => {
  beforeEach(clearDb)

  it('1セット1行で、古い日から並ぶ', async () => {
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [10, 8] })
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [6], date: YESTERDAY })

    const records = table(await buildTables(), '記録')
    expect(records.rows).toHaveLength(3)
    expect(records.rows.map((r) => r[0])).toEqual([YESTERDAY, todayKey(), todayKey()])
    // 実績は header の並びどおりの位置に入る
    const reps = records.header.indexOf('実績')
    expect(records.rows.map((r) => r[reps])).toEqual([6, 10, 8])
  })

  it('日別は1日1行にまとまり、きつさも載る', async () => {
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [10, 8, 6] })
    const session = (await db.sessions.toArray())[0]!
    await updateSessionRpe(session.id, 'hard')

    const daily = table(await buildTables(), '日別')
    expect(daily.rows).toHaveLength(1)
    expect(daily.rows[0]![daily.header.indexOf('セット数')]).toBe(3)
    expect(daily.rows[0]![daily.header.indexOf('総レップス')]).toBe(24)
    expect(daily.rows[0]![daily.header.indexOf('きつさ')]).toBe('きつい')
  })

  it('ステップ別は累計と自己ベストを持つ', async () => {
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [10, 20] })

    const steps = table(await buildTables(), 'ステップ別')
    expect(steps.rows).toHaveLength(1)
    expect(steps.rows[0]![steps.header.indexOf('累計')]).toBe(30)
    expect(steps.rows[0]![steps.header.indexOf('自己ベスト')]).toBe(20)
  })

  it('セッションを失ったセットは送らない', async () => {
    await recordSets({ ...PUSHUP, targetReps: 10, reps: [10] })
    await db.sessions.clear()

    expect(table(await buildTables(), '記録').rows).toHaveLength(0)
  })
})
