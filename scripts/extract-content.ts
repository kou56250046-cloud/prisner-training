/**
 * public/content.enc を復号して content/source/ に書き戻す。
 *
 * 平文はリポジトリに入れないので、別の端末で作業を再開するときや、
 * ローカルの平文を失ったときの復旧経路がこれになる。
 *
 *   npm run content:extract
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decryptContent } from '../src/content/crypto'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(root, 'content', 'source')
const IN = join(root, 'public', 'content.enc')

type Bundle = {
  chapters: { id: string }[]
  steps: { chapterId: string }[]
  routines: unknown[]
  episodes: unknown[]
  wisdom: unknown
}

async function readPassphrase(): Promise<string> {
  const fromEnv = process.env['CONTENT_PASSPHRASE']
  if (fromEnv) return fromEnv
  const file = join(root, '.content-passphrase')
  if (existsSync(file)) {
    const v = (await readFile(file, 'utf8')).trim()
    if (v) return v
  }
  throw new Error('合い言葉が見つかりません（CONTENT_PASSPHRASE か .content-passphrase）。')
}

async function main() {
  if (!existsSync(IN)) throw new Error(`${IN} がありません。`)
  const passphrase = await readPassphrase()
  const bundle = JSON.parse(await decryptContent(await readFile(IN), passphrase)) as Bundle

  await mkdir(join(SOURCE, 'chapters'), { recursive: true })

  for (const chapter of bundle.chapters) {
    const steps = bundle.steps.filter((s) => s.chapterId === chapter.id)
    await writeFile(
      join(SOURCE, 'chapters', `${chapter.id}.json`),
      JSON.stringify({ chapter, steps }, null, 2) + '\n',
      'utf8',
    )
    console.log(`  chapters/${chapter.id}.json (${steps.length}ステップ)`)
  }

  for (const [name, data] of [
    ['routines', bundle.routines],
    ['episodes', bundle.episodes],
    ['wisdom', bundle.wisdom],
  ] as const) {
    if (data == null || (Array.isArray(data) && data.length === 0)) continue
    await writeFile(join(SOURCE, `${name}.json`), JSON.stringify(data, null, 2) + '\n', 'utf8')
    console.log(`  ${name}.json`)
  }

  console.log(`✓ content/source/ に復元しました`)
}

main().catch((e) => {
  console.error(`✗ ${e instanceof Error ? e.message : e}`)
  process.exitCode = 1
})
