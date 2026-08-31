import type { Metric } from '@/content/types'
import { metricLabel } from '@/content/types'
import type { Entry, Progress, Session } from './schema'

/**
 * スプレッドシートに書き出す表の組み立て。
 *
 * DB もネットワークも触らない純粋な変換にしてある。アプリからの同期と、
 * 書き出し済みのバックアップ JSON からの流し込みで、同じ表を作れるようにするため。
 */

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** 1枚のシートに書き出す表 */
export type SheetTable = {
  name: string
  header: string[]
  rows: (string | number)[][]
}

/** ステップ名や種目名は暗号化コンテンツ側にあるので、呼ぶ側が解決して渡す */
export type SheetSource = {
  sessions: Session[]
  entries: Entry[]
  progress: Progress[]
  steps: { id: string; chapterId: string; stepNo: number; name: string; metric?: Metric }[]
  chapters: { id: string; name: string }[]
}

const RPE_LABEL: Record<string, string> = { easy: '楽', ok: '普通', hard: 'きつい' }
const KIND_LABEL: Record<string, string> = {
  warmup: 'ウォームアップ',
  work: 'ワークセット',
  consolidation: '強化',
}

/** ローカル日付として解釈する（UTC 扱いだと1日ずれる） */
function weekdayOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return WEEKDAYS[new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getDay()] ?? ''
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

export function buildTablesFrom(src: SheetSource): SheetTable[] {
  const stepById = new Map(src.steps.map((s) => [s.id, s]))
  const chapterNameById = new Map(src.chapters.map((c) => [c.id, c.name]))

  const stepName = (id: string) => stepById.get(id)?.name ?? id
  const stepNo = (id: string) => stepById.get(id)?.stepNo ?? 0
  const unitOf = (id: string) => metricLabel(stepById.get(id)?.metric)
  const chapterName = (id: string) => chapterNameById.get(id) ?? id

  const dateById = new Map(src.sessions.map((s) => [s.id, s.date]))

  // 記録: 1セット1行。ピボットでも素の並べ替えでも扱えるようにしておく
  const rows = src.entries
    .map((e) => ({ e, date: dateById.get(e.sessionId) ?? '' }))
    .filter((r) => r.date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.e.completedAt - b.e.completedAt)

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
  const byDate = new Map<
    string,
    { sets: number; reps: number; chapters: Set<string>; rpe: string }
  >()
  for (const { e, date } of rows) {
    const cur = byDate.get(date) ?? { sets: 0, reps: 0, chapters: new Set<string>(), rpe: '' }
    cur.sets += 1
    cur.reps += e.actualReps
    cur.chapters.add(chapterName(e.chapterId))
    byDate.set(date, cur)
  }
  for (const s of src.sessions) {
    const cur = byDate.get(s.date)
    if (cur && s.rpe) cur.rpe = RPE_LABEL[s.rpe] ?? s.rpe
  }

  const daily: SheetTable = {
    name: '日別',
    header: ['日付', '曜日', 'セット数', '総レップス', 'きつさ', '種目'],
    rows: [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => [date, weekdayOf(date), v.sets, v.reps, v.rpe, [...v.chapters].join(' / ')]),
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
        chapterName(stepById.get(id)?.chapterId ?? ''),
        stepNo(id),
        stepName(id),
        v.reps,
        v.sets,
        v.best,
        unitOf(id),
        dateTimeOf(v.last),
      ]),
  }

  const progress: SheetTable = {
    name: '進捗',
    header: ['種目', '現在STEP', 'ステップ名', '解禁STEP', '最終更新'],
    rows: src.progress
      .map((p) => {
        const step = src.steps.find(
          (s) => s.chapterId === p.chapterId && s.stepNo === p.currentStep,
        )
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

  return [records, daily, steps, progress]
}
