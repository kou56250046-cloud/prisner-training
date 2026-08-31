import { loadCachedContent } from '@/content/load'
import { exportBackup, importBackup } from './backup'
import { getSettings, saveSettings } from './queries'
import { db } from './schema'
import { buildTablesFrom, type SheetTable } from './sheetTables'

/**
 * Google スプレッドシートへの記録の写し。
 *
 * 記録は端末の IndexedDB にしかないので、端末が壊れれば全部消える。
 * GAS のウェブアプリを1枚立てて、記録するたびに全件を送り直す。
 * 差分ではなく全置換にしてあるのは、修正や削除もそのまま反映させるため。
 */

export type { SheetTable } from './sheetTables'

export type SyncPayload = {
  app: 'prisoner-training'
  action: 'sync'
  token: string
  exportedAt: string
  tables: SheetTable[]
  /** 復元用の生データ。表からは戻せない情報（ID・進捗・コーチ通知）を含む */
  backup: string
}

export class SheetSyncError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'SheetSyncError'
  }
}

/** 端末の記録と、暗号化コンテンツ側にある名前を突き合わせて表にする */
export async function buildTables(): Promise<SheetTable[]> {
  const content = await loadCachedContent()
  const [sessions, entries, progress] = await Promise.all([
    db.sessions.toArray(),
    db.entries.toArray(),
    db.progress.toArray(),
  ])

  return buildTablesFrom({
    sessions,
    entries,
    progress,
    steps: (content?.steps ?? []).map((s) => ({
      id: s.id,
      chapterId: s.chapterId,
      stepNo: s.stepNo,
      name: s.name,
      ...(s.metric ? { metric: s.metric } : {}),
    })),
    chapters: (content?.chapters ?? []).map((c) => ({ id: c.id, name: c.name })),
  })
}

async function post(url: string, body: unknown): Promise<Record<string, unknown>> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      // text/plain なら preflight が飛ばない。GAS は OPTIONS に答えられない
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
    })
  } catch {
    throw new SheetSyncError('スプレッドシートに接続できませんでした（オフラインかURLが違います）')
  }

  const text = await res.text()
  if (!res.ok) throw new SheetSyncError(`スプレッドシート側でエラー (${res.status})`)

  let json: Record<string, unknown>
  try {
    json = JSON.parse(text) as Record<string, unknown>
  } catch {
    // ログイン画面の HTML が返ってくるのはたいてい公開設定の間違い
    throw new SheetSyncError('応答が読めません。ウェブアプリのアクセス権を「全員」にしてください')
  }
  if (json.ok !== true) throw new SheetSyncError(String(json.error ?? '書き込みに失敗しました'))
  return json
}

/** 全件をスプレッドシートに書き直す */
export async function pushToSheet(): Promise<{ rows: number }> {
  const settings = await getSettings()
  const url = settings.sheetUrl?.trim()
  if (!url) throw new SheetSyncError('連携先のURLが未設定です')

  const [tables, backup] = await Promise.all([buildTables(), exportBackup()])
  const payload: SyncPayload = {
    app: 'prisoner-training',
    action: 'sync',
    token: settings.sheetToken ?? '',
    exportedAt: new Date().toISOString(),
    tables,
    backup: JSON.stringify(backup),
  }

  try {
    const json = await post(url, payload)
    await saveSettings({ sheetSyncedAt: Date.now(), sheetSyncError: '' })
    return { rows: Number(json.rows ?? tables[0]?.rows.length ?? 0) }
  } catch (e) {
    await saveSettings({ sheetSyncError: e instanceof Error ? e.message : '同期に失敗しました' })
    throw e
  }
}

/** スプレッドシートに置いてある生データで端末を上書きする */
export async function pullFromSheet(): Promise<{ sessions: number; entries: number }> {
  const settings = await getSettings()
  const url = settings.sheetUrl?.trim()
  if (!url) throw new SheetSyncError('連携先のURLが未設定です')

  const json = await post(url, {
    app: 'prisoner-training',
    action: 'pull',
    token: settings.sheetToken ?? '',
  })
  const backup = String(json.backup ?? '')
  if (!backup) throw new SheetSyncError('スプレッドシートにまだ記録が入っていません')

  const r = await importBackup(backup)
  // 復元した設定で連携先が消えないよう、URL と合い言葉は入れ直す
  await saveSettings({
    sheetUrl: settings.sheetUrl ?? '',
    sheetToken: settings.sheetToken ?? '',
    sheetSyncedAt: Date.now(),
    sheetSyncError: '',
  })
  return r
}

let timer: number | undefined
let running = false
let again = false

/**
 * 記録・修正のあとに呼ぶ。設定されていれば裏で送る。
 *
 * 失敗しても画面は止めない。理由は設定に残るので、設定画面で確認できる。
 */
export function queueSheetSync(delayMs = 1200): void {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    void (async () => {
      const s = await getSettings()
      if (!s.sheetUrl?.trim() || s.sheetAutoSync === false) return
      if (running) {
        again = true
        return
      }
      running = true
      try {
        await pushToSheet()
      } catch {
        // 理由は settings.sheetSyncError に残してある
      } finally {
        running = false
        if (again) {
          again = false
          queueSheetSync(200)
        }
      }
    })()
  }, delayMs)
}
