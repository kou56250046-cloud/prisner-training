import Dexie, { type EntityTable } from 'dexie'
import type { ChapterId } from '@/content/types'

/** ビッグ6それぞれの現在地 */
export type Progress = {
  chapterId: ChapterId
  /** いま取り組んでいるステップ */
  currentStep: number
  /** 解禁済みの最高ステップ（進級判定で上がる） */
  unlockedStep: number
  updatedAt: number
}

export type SessionStatus = 'in_progress' | 'done' | 'abandoned'

/** 1回のワークアウト */
export type Session = {
  id: string
  /** YYYY-MM-DD（ローカル日付） */
  date: string
  routineId: string
  status: SessionStatus
  startedAt: number
  finishedAt?: number
  /** 主観強度。コーチのオーバーワーク判定に使う */
  rpe?: 'easy' | 'ok' | 'hard'
  note?: string
}

export type EntryKind = 'warmup' | 'work' | 'consolidation'

/** セット1本の記録 */
export type Entry = {
  id: string
  sessionId: string
  stepId: string
  chapterId: ChapterId
  setNo: number
  kind: EntryKind
  targetReps: number
  actualReps: number
  completedAt: number
}

export type Settings = {
  key: 'app'
  routineId: string
  restSeconds: number
  wakeLock: boolean
  /** トレーニング中に1秒刻みのリズム音を鳴らすか。古い記録には無いので任意 */
  metronome?: boolean
  /** 免責表示に同意したか */
  disclaimerAcceptedAt?: number
  /** 強化トレーニング中の種目 */
  consolidationStepId?: string
  consolidationStartedAt?: number
}

/** 復号済みコンテンツのキャッシュ。合い言葉の再入力を毎回求めないための保管場所 */
export type ContentCache = {
  key: 'content'
  /** 復号済み JSON。端末内にしか置かない */
  json: string
  /** 次回以降の自動復号に使う合い言葉 */
  passphrase: string
  cachedAt: number
}

export type CoachEventType =
  | 'promote'
  | 'demote'
  | 'plateau'
  | 'overwork'
  | 'routineChange'
  /** 1セットの自己最高記録を更新した */
  | 'personalBest'

export type CoachEvent = {
  id: string
  type: CoachEventType
  chapterId?: ChapterId
  message: string
  /** ユーザーが確認済みか */
  ack: boolean
  createdAt: number
}

const db = new Dexie('prisoner-training') as Dexie & {
  progress: EntityTable<Progress, 'chapterId'>
  sessions: EntityTable<Session, 'id'>
  entries: EntityTable<Entry, 'id'>
  settings: EntityTable<Settings, 'key'>
  contentCache: EntityTable<ContentCache, 'key'>
  coachEvents: EntityTable<CoachEvent, 'id'>
}

db.version(1).stores({
  progress: 'chapterId',
  sessions: 'id, date, status',
  // stepId と日付で引けるようにしておく（進級判定と停滞検知が毎回なめる）
  entries: 'id, sessionId, stepId, chapterId, completedAt',
  settings: 'key',
  contentCache: 'key',
  coachEvents: 'id, type, ack, createdAt',
})

export { db }

export const DEFAULT_SETTINGS: Settings = {
  key: 'app',
  routineId: 'new_blood',
  restSeconds: 90,
  wakeLock: true,
  metronome: true,
}
