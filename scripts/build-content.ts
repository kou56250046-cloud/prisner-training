/**
 * content/source/ の平文コンテンツをまとめ、暗号化して public/content.enc に書き出す。
 *
 * public リポジトリで運用するため、平文は絶対にコミットしない（.gitignore 済み）。
 * コミットするのはこのスクリプトが吐く暗号化済みファイルだけ。
 *
 *   npm run content
 *
 * 合い言葉は環境変数 CONTENT_PASSPHRASE、または .content-passphrase ファイルから読む。
 */
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { encryptContent } from '../src/content/crypto'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(root, 'content', 'source')
const OUT = join(root, 'public', 'content.enc')

async function readPassphrase(): Promise<string> {
  const fromEnv = process.env['CONTENT_PASSPHRASE']
  if (fromEnv) return fromEnv

  const file = join(root, '.content-passphrase')
  if (existsSync(file)) {
    const v = (await readFile(file, 'utf8')).trim()
    if (v) return v
  }
  throw new Error(
    '合い言葉が見つかりません。環境変数 CONTENT_PASSPHRASE を設定するか、\n' +
      'プロジェクト直下に .content-passphrase を作って1行で書いてください（gitignore 済み）。',
  )
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T
}

async function readJsonIfExists<T>(path: string, fallback: T): Promise<T> {
  return existsSync(path) ? readJson<T>(path) : fallback
}

async function main() {
  const passphrase = await readPassphrase()

  const chaptersDir = join(SOURCE, 'chapters')
  if (!existsSync(chaptersDir)) {
    throw new Error(`${chaptersDir} がありません。content/source/chapters/*.json を用意してください。`)
  }

  const files = (await readdir(chaptersDir)).filter((f) => f.endsWith('.json')).sort()
  const chapters: unknown[] = []
  const steps: unknown[] = []

  for (const f of files) {
    const data = await readJson<{ chapter: unknown; steps: unknown[] }>(join(chaptersDir, f))
    chapters.push(data.chapter)
    steps.push(...data.steps)
  }

  const bundle = {
    version: 1,
    builtAt: new Date().toISOString(),
    chapters,
    steps,
    routines: await readJsonIfExists<unknown[]>(join(SOURCE, 'routines.json'), []),
    episodes: await readJsonIfExists<unknown[]>(join(SOURCE, 'episodes.json'), []),
    wisdom: await readJsonIfExists<unknown>(join(SOURCE, 'wisdom.json'), null),
  }

  const json = JSON.stringify(bundle)
  const blob = await encryptContent(json, passphrase)

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, blob)

  const kb = (blob.length / 1024).toFixed(1)
  console.log(
    `✓ ${files.length}章 / ${steps.length}ステップ / ` +
      `ルーチン${(bundle.routines as unknown[]).length}件 / ` +
      `エピソード${(bundle.episodes as unknown[]).length}件`,
  )
  console.log(`  平文 ${(json.length / 1024).toFixed(1)}KB → 暗号化 ${kb}KB`)
  console.log(`  → ${OUT}`)
}

main().catch((e) => {
  console.error(`✗ ${e instanceof Error ? e.message : e}`)
  process.exitCode = 1
})
