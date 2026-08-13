import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  deleteEntry,
  deleteSession,
  getDailyVolume,
  getDayRecords,
  moveSessionDate,
  recordSets,
  todayKey,
  updateEntryReps,
  updateSessionRpe,
} from './queries'
import { db } from './schema'

async function clearDb() {
  await Promise.all([db.sessions.clear(), db.entries.clear()])
}

/** ワークセットを3本だけ記録したセッションを作る */
async function seed() {
  await recordSets({
    stepId: 'pushup-01',
    chapterId: 'pushup',
    targetReps: 10,
    reps: [10, 8, 6],
    routineId: 'new_blood',
  })
  return (await getDayRecords(todayKey()))[0]!.session
}

describe('記録の修正', () => {
  beforeEach(clearDb)

  it('その日の記録をセッション単位で取り出せる', async () => {
    const s = await seed()
    const records = await getDayRecords(todayKey())

    expect(records).toHaveLength(1)
    expect(records[0]!.session.id).toBe(s.id)
    expect(records[0]!.entries.map((e) => e.actualReps)).toEqual([10, 8, 6])
  })

  it('記録のない日は空になる', async () => {
    await seed()
    expect(await getDayRecords('2000-01-01')).toEqual([])
  })

  it('レップス数を直すと集計にも反映される', async () => {
    await seed()
    const entries = (await getDayRecords(todayKey()))[0]!.entries
    await updateEntryReps(entries[0]!.id, 12)

    const volume = await getDailyVolume()
    expect(volume.get(todayKey())).toEqual({ sets: 3, reps: 26 })
  })

  it('レップス数は負の数にならない', async () => {
    await seed()
    const entries = (await getDayRecords(todayKey()))[0]!.entries
    await updateEntryReps(entries[0]!.id, -5)

    const after = await db.entries.get(entries[0]!.id)
    expect(after!.actualReps).toBe(0)
  })

  it('余分なセットだけを消せる', async () => {
    await seed()
    const entries = (await getDayRecords(todayKey()))[0]!.entries
    await deleteEntry(entries[2]!.id)

    const rest = (await getDayRecords(todayKey()))[0]!.entries
    expect(rest.map((e) => e.actualReps)).toEqual([10, 8])
  })

  it('セッションを消すとぶら下がるセットも消える', async () => {
    const s = await seed()
    await deleteSession(s.id)

    expect(await getDayRecords(todayKey())).toEqual([])
    expect(await db.entries.count()).toBe(0)
  })

  it('セッションを別の日へ移すとカレンダーの集計も移る', async () => {
    const s = await seed()
    await moveSessionDate(s.id, '2026-08-01')

    const volume = await getDailyVolume()
    expect(volume.has(todayKey())).toBe(false)
    expect(volume.get('2026-08-01')).toEqual({ sets: 3, reps: 24 })
  })

  it('主観強度を付け直せる。同じ値を渡し直すと外れる', async () => {
    const s = await seed()
    await updateSessionRpe(s.id, 'hard')
    expect((await db.sessions.get(s.id))!.rpe).toBe('hard')

    await updateSessionRpe(s.id, undefined)
    expect((await db.sessions.get(s.id))!.rpe).toBeUndefined()
  })
})
