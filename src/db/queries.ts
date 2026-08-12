import type { ChapterId } from '@/content/types'
import {
  DEFAULT_SETTINGS,
  db,
  type CoachEvent,
  type Entry,
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

export async function startSession(routineId: string): Promise<Session> {
  const open = await db.sessions.where('status').equals('in_progress').first()
  if (open) return open

  const s: Session = {
    id: uid(),
    date: todayKey(),
    routineId,
    status: 'in_progress',
    startedAt: Date.now(),
  }
  await db.sessions.add(s)
  return s
}

export async function getOpenSession(): Promise<Session | undefined> {
  return db.sessions.where('status').equals('in_progress').first()
}

export async function finishSession(
  id: string,
  rpe?: Session['rpe'],
): Promise<void> {
  const s = await db.sessions.get(id)
  if (!s) return
  await db.sessions.put({
    ...s,
    status: 'done',
    finishedAt: Date.now(),
    ...(rpe ? { rpe } : {}),
  })
}

export async function abandonSession(id: string): Promise<void> {
  const s = await db.sessions.get(id)
  if (!s) return
  await db.sessions.put({ ...s, status: 'abandoned', finishedAt: Date.now() })
}

export async function recordSet(e: Omit<Entry, 'id' | 'completedAt'>): Promise<Entry> {
  const entry: Entry = { ...e, id: uid(), completedAt: Date.now() }
  await db.entries.add(entry)
  return entry
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

export async function countSessionsInRange(fromMs: number): Promise<number> {
  const all = await db.sessions.where('status').equals('done').toArray()
  return all.filter((s) => s.startedAt >= fromMs).length
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
