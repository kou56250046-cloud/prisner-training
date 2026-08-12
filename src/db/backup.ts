import { db } from './schema'

/**
 * 全記録の書き出し・読み込み。
 *
 * 記録は端末の中にしかないので、これが唯一のバックアップ手段になる。
 * 書籍のコンテンツ（content.enc から復号したもの）は再取得できるので含めない。
 */
export type BackupFile = {
  app: 'prisoner-training'
  version: 1
  exportedAt: string
  progress: unknown[]
  sessions: unknown[]
  entries: unknown[]
  settings: unknown[]
  coachEvents: unknown[]
}

export async function exportBackup(): Promise<BackupFile> {
  const [progress, sessions, entries, settings, coachEvents] = await Promise.all([
    db.progress.toArray(),
    db.sessions.toArray(),
    db.entries.toArray(),
    db.settings.toArray(),
    db.coachEvents.toArray(),
  ])
  return {
    app: 'prisoner-training',
    version: 1,
    exportedAt: new Date().toISOString(),
    progress,
    sessions,
    entries,
    settings,
    coachEvents,
  }
}

export async function downloadBackup(): Promise<void> {
  const data = await exportBackup()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `prisoner-training-${data.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export class InvalidBackupError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'InvalidBackupError'
  }
}

function assertBackup(v: unknown): asserts v is BackupFile {
  const o = v as Partial<BackupFile>
  if (!o || o.app !== 'prisoner-training') {
    throw new InvalidBackupError('このアプリのバックアップファイルではありません')
  }
  if (o.version !== 1) {
    throw new InvalidBackupError(`対応していないバージョンです (${String(o.version)})`)
  }
  for (const k of ['progress', 'sessions', 'entries', 'settings', 'coachEvents'] as const) {
    if (!Array.isArray(o[k])) throw new InvalidBackupError(`${k} が壊れています`)
  }
}

/** 全置換で復元する。取り違えを防ぐため、呼び出し側で必ず確認を取ること */
export async function importBackup(json: string): Promise<{ entries: number; sessions: number }> {
  const parsed: unknown = JSON.parse(json)
  assertBackup(parsed)

  await db.transaction(
    'rw',
    [db.progress, db.sessions, db.entries, db.settings, db.coachEvents],
    async () => {
      await Promise.all([
        db.progress.clear(),
        db.sessions.clear(),
        db.entries.clear(),
        db.settings.clear(),
        db.coachEvents.clear(),
      ])
      await Promise.all([
        db.progress.bulkAdd(parsed.progress as never[]),
        db.sessions.bulkAdd(parsed.sessions as never[]),
        db.entries.bulkAdd(parsed.entries as never[]),
        db.settings.bulkAdd(parsed.settings as never[]),
        db.coachEvents.bulkAdd(parsed.coachEvents as never[]),
      ])
    },
  )

  return { entries: parsed.entries.length, sessions: parsed.sessions.length }
}
