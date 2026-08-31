import { loadCachedContent } from '@/content/load'
import { metricLabel } from '@/content/types'
import { exportBackup, importBackup } from './backup'
import { dateFromKey, getSettings, saveSettings } from './queries'
import { db } from './schema'

/**
 * Google スプレッドシートへの記録の写し。
 *
 * 記録は端末の IndexedDB にしかないので、端末が壊れれば全部消える。
 * GAS のウェブアプリを1枚立てて、記録するたびに全件を送り直す。
 * 差分ではなく全置換にしてあるのは、修正や削除もそのまま反映させるため。
 */

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** 1枚のシートに書き出す表 */
export type SheetTable = {
  name: string
  header: string[]
  rows: (string | number)[][]
}

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

const RPE_LABEL: Record<string, string> = { easy: '楽', ok: '普通', hard: 'きつい' }
const KIND_LABEL: Record<string, string> = {
  warmup: 'ウォームアップ',
  work: 'ワークセット',
  consolidation: '強化',
}

function weekdayOf(date: string): string {
  return WEEKDAYS[dateFromKey(date).getDay()] ?? ''
}

function timeOf(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

function dateTimeOf(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${timeOf(ms)}`
}

/**
 * 表を組み立てる。
 *
 * ステップ名や種目名は暗号化コンテンツ側にあるので、端末で名前を解決してから送る。
 * GAS 側に書籍のデータを置かずに済む。
 */
export async function buildTables(): Promise<SheetTable[]> {
  const content = await loadCachedContent()
  const stepName = (id: string) => content?.stepById.get(id)?.name ?? id
  const stepNo = (id: string) => content?.stepById.get(id)?.stepNo ?? 0
  const unitOf = (id: string) => metricLabel(content?.stepById.get(id)?.metric)
  const chapterName = (id: string) => content?.chapterById.get(id)?.name ?? id

  const [sessions, entries, progress] = await Promise.all([
    db.sessions.toArray(),
    db.entries.toArray(),
    db.progress.toArray(),
  ])
  const sessionById = new Map(sessions.map((s) => [s.id, s]))

  // 記録: 1セット1行。ピボットでも素の並べ替えでも扱えるようにしておく
  const rows = entries
    .map((e) => {
      const s = sessionById.get(e.sessionId)
      return { e, date: s?.date ?? '', at: e.completedAt }
    })
    .filter((r) => r.date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at)

  const records: SheetTable = {
    name: '記録',
    header: [
      '日付',
      '曜日',
      '種目',
      'STEP',
      'ステップ名',
      '種別',
      'セット',
      '目標',
      '実績',
      '単位',
      '記録時刻',
      '記録ID',
    ],
    rows: rows.map(({ e, date }) => [
      date,
      weekdayOf(date),
      chapterName(e.chapterId),
      stepNo(e.stepId),
      stepName(e.stepId),
      KIND_LABEL[e.kind] ?? e.kind,
      e.setNo,
      e.targetReps,
      e.actualReps,
      unitOf(e.stepId),
      timeOf(e.completedAt),
      e.id,
    ]),
  }

  // 日別: 続いているかどうかを見るための1日1行
  const byDate = new Map<string, { sets: number; reps: number; chapters: Set<string>; rpe: string }>()
  for (const { e, date } of rows) {
    const cur = byDate.get(date) ?? { sets: 0, reps: 0, chapters: new Set<string>(), rpe: '' }
    cur.sets += 1
    cur.reps += e.actualReps
    cur.chapters.add(chapterName(e.chapterId))
    byDate.set(date, cur)
  }
  for (const s of sessions) {
    const cur = byDate.get(s.date)
    if (cur && s.rpe) cur.rpe = RPE_LABEL[s.rpe] ?? s.rpe
  }

  const daily: SheetTable = {
    name: '日別',
    header: ['日付', '曜日', 'セット数', '総レップス', 'きつさ', '種目'],
    rows: [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => [
        date,
        weekdayOf(date),
        v.sets,
        v.reps,
        v.rpe,
        [...v.chapters].join(' / '),
      ]),
  }

  // ステップ別: 積み上げた量と自己ベスト
  const byStep = new Map<string, { reps: number; sets: number; best: number; last: number }>()
  for (const { e } of rows) {
    const cur = byStep.get(e.stepId) ?? { reps: 0, sets: 0, best: 0, last: 0 }
    cur.reps += e.actualReps
    cur.sets += 1
    cur.best = Math.max(cur.best, e.actualReps)
    cur.last = Math.max(cur.last, e.completedAt)
    byStep.set(e.stepId, cur)
  }

  const steps: SheetTable = {
    name: 'ステップ別',
    header: ['種目', 'STEP', 'ステップ名', '累計', 'セット数', '自己ベスト', '単位', '最終実施'],
    rows: [...byStep.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, v]) => [
        chapterName(content?.stepById.get(id)?.chapterId ?? ''),
        stepNo(id),
        stepName(id),
        v.reps,
        v.sets,
        v.best,
        unitOf(id),
        dateTimeOf(v.last),
      ]),
  }

  const progressTable: SheetTable = {
    name: '進捗',
    header: ['種目', '現在STEP', 'ステップ名', '解禁STEP', '最終更新'],
    rows: progress
      .map((p) => {
        const step = content?.stepsByChapter
          .get(p.chapterId)
          ?.find((s) => s.stepNo === p.currentStep)
        return [
          chapterName(p.chapterId),
          p.currentStep,
          step?.name ?? '',
          p.unlockedStep,
          dateTimeOf(p.updatedAt),
        ] as (string | number)[]
      })
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  }

  return [records, daily, steps, progressTable]
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
