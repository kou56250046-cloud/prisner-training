/**
 * 書き出し済みのバックアップ JSON を、スプレッドシートに貼れる TSV に変換する。
 *
 * アプリの同期（設定 → スプレッドシート連携）を使えば手作業は要らないが、
 * GAS を立てる前に、手元の記録を先にシートへ入れておきたいときに使う。
 * 表の組み立てはアプリと同じ buildTablesFrom を通すので、中身は同期結果と一致する。
 *
 *   npm run sheets -- record/prisoner-training-2026-08-31.json
 *
 * 出力先は record/sheets/<シート名>.tsv（record/ は .gitignore 済み）。
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildTablesFrom, type SheetSource } from '../src/db/sheetTables'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const CHAPTERS = join(root, 'content', 'source', 'chapters')

type ChapterFile = {
  chapter: { id: string; name: string }
  steps: { id: string; chapterId: string; stepNo: number; name: string; metric?: 'reps' | 'seconds' }[]
}

async function readNames(): Promise<Pick<SheetSource, 'steps' | 'chapters'>> {
  const files = (await readdir(CHAPTERS)).filter((f) => f.endsWith('.json'))
  const steps: SheetSource['steps'] = []
  const chapters: SheetSource['chapters'] = []

  for (const f of files) {
    const data = JSON.parse(await readFile(join(CHAPTERS, f), 'utf8')) as ChapterFile
    chapters.push({ id: data.chapter.id, name: data.chapter.name })
    for (const s of data.steps) {
      steps.push({
        id: s.id,
        chapterId: s.chapterId,
        stepNo: s.stepNo,
        name: s.name,
        ...(s.metric ? { metric: s.metric } : {}),
      })
    }
  }
  return { steps, chapters }
}

const main = async () => {
  const input = process.argv[2]
  if (!input) {
    console.error('使い方: npx tsx scripts/backup-to-sheets.ts <バックアップJSON>')
    process.exit(1)
  }

  const backup = JSON.parse(await readFile(join(root, input), 'utf8')) as Pick<
    SheetSource,
    'sessions' | 'entries' | 'progress'
  >
  const tables = buildTablesFrom({ ...backup, ...(await readNames()) })

  const outDir = join(root, 'record', 'sheets')
  await mkdir(outDir, { recursive: true })

  for (const t of tables) {
    // タブ区切りなら、そのままシートに貼り付けられる
    const tsv = [t.header, ...t.rows].map((r) => r.join('\t')).join('\n')
    await writeFile(join(outDir, `${t.name}.tsv`), tsv, 'utf8')
    console.log(`${t.name}: ${t.rows.length} 行`)
  }
  console.log(`→ ${outDir}`)
}

void main()
