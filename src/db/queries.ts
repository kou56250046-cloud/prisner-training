import type { ChapterId } from '@/content/types'
import {
  DEFAULT_SETTINGS,
  db,
  type CoachEvent,
  type Entry,
  type EntryKind,
  type Progress,
  type Session,
  type Settings,
} from './schema'

const CHAPTERS: ChapterId[] = ['pushup', 'squat', 'pullup', 'legraise', 'bridge', 'hspu']

export function todayKey(d = new Date()): string {
  // ローカル日付。UTC に変換すると深夜のトレーニングが前日扱いになる
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** todayKey の逆。ローカル日付として解釈する（UTC 扱いだと1日ずれる） */
export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export function weekdayKey(d = new Date()) {
  return (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[d.getDay()]!
}

const uid = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

/**
 * 書籍は「どれだけ筋力があってもビッグ6すべてステップ1から始めろ」と明言している。
 * 初回起動時は全種目をステップ1で作る。
 */
export async function ensureProgress(): Promise<Progress[]> {
  const existing = await db.progress.toArray()
  if (existing.length === CHAPTERS.length) return existing

  const have = new Set(existing.map((p) => p.chapterId))
  const missing = CHAPTERS.filter((c) => !have.has(c)).map<Progress>((chapterId) => ({
    chapterId,
    currentStep: 1,
    unlockedStep: 1,
    updatedAt: Date.now(),
  }))
  if (missing.length) await db.progress.bulkAdd(missing)
  return db.progress.toArray()
}

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('app')) ?? DEFAULT_SETTINGS
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch, key: 'app' as const }
  await db.settings.put(next)
  return next
}

export async function setCurrentStep(chapterId: ChapterId, step: number): Promise<void> {
  const p = await db.progress.get(chapterId)
  await db.progress.put({
    chapterId,
    currentStep: step,
    unlockedStep: Math.max(step, p?.unlockedStep ?? step),
    updatedAt: Date.now(),
  })
}

/** 進級させる。解禁済みステップも同時に進む */
export async function promote(chapterId: ChapterId): Promise<number> {
  const p = await db.progress.get(chapterId)
  const next = Math.min(10, (p?.currentStep ?? 1) + 1)
  await setCurrentStep(chapterId, next)
  return next
}

/**
 * その日の記録の器を返す。なければ作る。
 *
 * 図鑑から思い立った種目を記録していく形なので「セッションを始める・終える」
 * という区切りがない。1日1つのセッションに記録を貯めていく。
 */
export async function getOrCreateTodaySession(routineId: string): Promise<Session> {
  const date = todayKey()
  const today = await db.sessions.where('date').equals(date).toArray()
  const existing = today.sort((a, b) => a.startedAt - b.startedAt)[0]
  if (existing) return existing

  const s: Session = {
    id: uid(),
    date,
    routineId,
    status: 'done',
    startedAt: Date.now(),
  }
  await db.sessions.add(s)
  return s
}

export async function recordSet(e: Omit<Entry, 'id' | 'completedAt'>): Promise<Entry> {
  const entry: Entry = { ...e, id: uid(), completedAt: Date.now() }
  await db.entries.add(entry)
  return entry
}

/**
 * ひとつのステップのセットをまとめて記録する。
 *
 * 同じステップを1日に何度もやることがあるので、セット番号は
 * その日すでに記録したぶんの続きから振る。
 */
export async function recordSets(input: {
  stepId: string
  chapterId: ChapterId
  targetReps: number
  reps: number[]
  kind?: EntryKind
  routineId: string
}): Promise<Entry[]> {
  const session = await getOrCreateTodaySession(input.routineId)
  const same = await db.entries.where('sessionId').equals(session.id).toArray()
  const from = same.filter((e) => e.stepId === input.stepId).length

  const now = Date.now()
  const entries = input.reps.map<Entry>((actualReps, i) => ({
    id: uid(),
    sessionId: session.id,
    stepId: input.stepId,
    chapterId: input.chapterId,
    setNo: from + i + 1,
    kind: input.kind ?? 'work',
    targetReps: input.targetReps,
    actualReps: Math.max(0, Math.round(actualReps)),
    // 同じミリ秒に並ぶと順序が不定になるので、セット順に1msずつずらす
    completedAt: now + i,
  }))

  await db.entries.bulkAdd(entries)
  // 終了時刻も伸ばしておく。カレンダーで「何時までやったか」が読める
  await db.sessions.put({ ...session, finishedAt: now })
  return entries
}

export async function getSessionEntries(sessionId: string): Promise<Entry[]> {
  return db.entries.where('sessionId').equals(sessionId).sortBy('completedAt')
}

/**
 * あるステップの、セッションごとのワークセット実績。新しい順。
 * 進級判定・停滞検知はすべてこれを入力にする。
 */
export async function getStepHistory(
  stepId: string,
  limit = 12,
): Promise<{ sessionId: string; reps: number[]; targetReps: number; at: number }[]> {
  const rows = await db.entries.where('stepId').equals(stepId).toArray()
  const work = rows.filter((r) => r.kind === 'work')

  const bySession = new Map<string, Entry[]>()
  for (const r of work) {
    const list = bySession.get(r.sessionId)
    if (list) list.push(r)
    else bySession.set(r.sessionId, [r])
  }

  return [...bySession.values()]
    .map((list) => {
      const sorted = [...list].sort((a, b) => a.setNo - b.setNo)
      return {
        sessionId: sorted[0]!.sessionId,
        reps: sorted.map((r) => r.actualReps),
        targetReps: Math.max(...sorted.map((r) => r.targetReps)),
        at: Math.max(...sorted.map((r) => r.completedAt)),
      }
    })
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
}

export type StepTotal = {
  stepId: string
  chapterId: ChapterId
  /** ワークセットとウォームアップを合わせた累計レップス */
  totalReps: number
  /** ワークセットだけの累計 */
  workReps: number
  sets: number
  /** 1セットの自己最高記録 */
  bestSet: number
  lastAt: number
}

/**
 * ステップごとの累計。積み上がった数字は、それ自体が続ける理由になる。
 * ウォームアップのレップスも、実際にやった回数なので合算する。
 */
export async function getStepTotals(): Promise<Map<string, StepTotal>> {
  const all = await db.entries.toArray()
  const map = new Map<string, StepTotal>()

  for (const e of all) {
    const cur = map.get(e.stepId) ?? {
      stepId: e.stepId,
      chapterId: e.chapterId,
      totalReps: 0,
      workReps: 0,
      sets: 0,
      bestSet: 0,
      lastAt: 0,
    }
    cur.totalReps += e.actualReps
    if (e.kind === 'work') cur.workReps += e.actualReps
    cur.sets += 1
    cur.bestSet = Math.max(cur.bestSet, e.actualReps)
    cur.lastAt = Math.max(cur.lastAt, e.completedAt)
    map.set(e.stepId, cur)
  }
  return map
}

/** 日付ごとの実施セット数。カレンダー表示に使う */
export async function getDailyVolume(): Promise<Map<string, { sets: number; reps: number }>> {
  const [sessions, entries] = await Promise.all([db.sessions.toArray(), db.entries.toArray()])
  const dateOf = new Map(sessions.map((s) => [s.id, s.date]))
  const out = new Map<string, { sets: number; reps: number }>()

  for (const e of entries) {
    const date = dateOf.get(e.sessionId)
    if (!date) continue
    const cur = out.get(date) ?? { sets: 0, reps: 0 }
    cur.sets += 1
    cur.reps += e.actualReps
    out.set(date, cur)
  }
  return out
}

/** ある日の記録。カレンダーからの修正で使う */
export type DayRecord = { session: Session; entries: Entry[] }

/** 指定した日の記録を、セッション単位で古い順に返す */
export async function getDayRecords(date: string): Promise<DayRecord[]> {
  const sessions = await db.sessions.where('date').equals(date).toArray()
  sessions.sort((a, b) => a.startedAt - b.startedAt)

  return Promise.all(
    sessions.map(async (session) => {
      const entries = await db.entries.where('sessionId').equals(session.id).toArray()
      // 連続して押すと completedAt が同じミリ秒になりうるので、セット番号で並びを固定する
      entries.sort((a, b) => a.completedAt - b.completedAt || a.setNo - b.setNo)
      return { session, entries }
    }),
  )
}

/** 打ち間違えたレップス数を直す */
export async function updateEntryReps(id: string, actualReps: number): Promise<void> {
  const e = await db.entries.get(id)
  if (!e) return
  await db.entries.put({ ...e, actualReps: Math.max(0, Math.round(actualReps)) })
}

/** 余分に記録してしまったセットを消す */
export async function deleteEntry(id: string): Promise<void> {
  await db.entries.delete(id)
}

/** セッションごと消す。ぶら下がっているセットも一緒に消える */
export async function deleteSession(id: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.entries, async () => {
    await db.entries.where('sessionId').equals(id).delete()
    await db.sessions.delete(id)
  })
}

/**
 * セッションを別の日に移す。
 * 深夜のトレーニングを日付が変わってから記録した、といった取り違えを直すためのもの。
 */
export async function moveSessionDate(id: string, date: string): Promise<void> {
  const s = await db.sessions.get(id)
  if (!s) return
  await db.sessions.put({ ...s, date })
}

/** 主観強度を付け直す。オーバーワーク判定の入力なので後から直せるようにしておく */
export async function updateSessionRpe(id: string, rpe: Session['rpe']): Promise<void> {
  const s = await db.sessions.get(id)
  if (!s) return
  const next: Session = { ...s }
  if (rpe) next.rpe = rpe
  else delete next.rpe
  await db.sessions.put(next)
}

export async function countSessionsInRange(fromMs: number): Promise<number> {
  const all = await db.sessions.where('status').equals('done').toArray()
  return all.filter((s) => s.startedAt >= fromMs).length
}

/** 期間内に実施した「日数」。1日に何度記録しても1日と数える */
export async function sessionDaysInRange(fromMs: number): Promise<number> {
  const all = await db.sessions.where('status').equals('done').toArray()
  return new Set(all.filter((s) => s.startedAt >= fromMs).map((s) => s.date)).size
}

export async function recentRpe(limit = 4): Promise<NonNullable<Session['rpe']>[]> {
  const all = await db.sessions.where('status').equals('done').toArray()
  return all
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit)
    .flatMap((s) => (s.rpe ? [s.rpe] : []))
}

export async function addCoachEvent(e: Omit<CoachEvent, 'id' | 'createdAt' | 'ack'>) {
  await db.coachEvents.add({ ...e, id: uid(), ack: false, createdAt: Date.now() })
}

export async function unacknowledgedEvents(): Promise<CoachEvent[]> {
  const all = await db.coachEvents.toArray()
  return all.filter((e) => !e.ack).sort((a, b) => b.createdAt - a.createdAt)
}

export async function ackEvent(id: string) {
  const e = await db.coachEvents.get(id)
  if (e) await db.coachEvents.put({ ...e, ack: true })
}

/** 連続実施日数 */
export async function currentStreak(): Promise<number> {
  const done = await db.sessions.where('status').equals('done').toArray()
  const days = new Set(done.map((s) => s.date))
  let streak = 0
  const d = new Date()
  // 今日まだやっていなくても、昨日までの連続は途切れていない扱いにする
  if (!days.has(todayKey(d))) d.setDate(d.getDate() - 1)
  while (days.has(todayKey(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}
