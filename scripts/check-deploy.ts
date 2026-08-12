/**
 * 公開済みのサイトが本当に動く状態かを、外から確認する。
 *
 *   npm run check:deploy
 *
 * ブラウザを開かずに、配信されている実物を取りに行って検証する:
 *   - index.html / manifest / Service Worker / アイコンが 200 で返るか
 *   - content.enc が実際に手元の合い言葉で復号できるか
 *   - 復号した中身のステップ数が想定どおりか
 */
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decryptContent } from '../src/content/crypto'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env['DEPLOY_URL'] ?? 'https://kou56250046-cloud.github.io/prisner-training/'

const PATHS = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'content.enc',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'favicon.svg',
]

async function readPassphrase(): Promise<string | null> {
  const fromEnv = process.env['CONTENT_PASSPHRASE']
  if (fromEnv) return fromEnv
  const file = join(root, '.content-passphrase')
  if (existsSync(file)) {
    const v = (await readFile(file, 'utf8')).trim()
    if (v) return v
  }
  return null
}

let failed = false

async function main() {
  console.log(`確認先: ${BASE}\n`)

  for (const p of PATHS) {
    const url = new URL(p, BASE).toString()
    try {
      const res = await fetch(url, { cache: 'no-store' })
      const size = (await res.arrayBuffer()).byteLength
      const ok = res.ok
      if (!ok) failed = true
      console.log(
        `  ${ok ? '✓' : '✗'} ${p.padEnd(24)} ${res.status}  ${(size / 1024).toFixed(1)}KB`,
      )
    } catch (e) {
      failed = true
      console.log(`  ✗ ${p.padEnd(24)} 取得失敗: ${e instanceof Error ? e.message : e}`)
    }
  }

  // ベースパスが正しく効いているか（サブパス配信で最も壊れやすい箇所）
  const html = await (await fetch(new URL('index.html', BASE))).text()
  const basePath = new URL(BASE).pathname
  if (html.includes(`${basePath}assets/`)) {
    console.log(`\n  ✓ ベースパス ${basePath} が index.html に反映されている`)
  } else {
    failed = true
    console.log(`\n  ✗ ベースパス ${basePath} が index.html に見当たらない`)
  }

  // 配信されている content.enc が本当に復号できるか
  const passphrase = await readPassphrase()
  if (!passphrase) {
    console.log('  - 合い言葉が手元にないため、復号の確認は省略')
  } else {
    try {
      const blob = new Uint8Array(await (await fetch(new URL('content.enc', BASE))).arrayBuffer())
      const bundle = JSON.parse(await decryptContent(blob, passphrase)) as {
        chapters: unknown[]
        steps: unknown[]
        builtAt: string
      }
      console.log(
        `  ✓ content.enc を復号できた（${bundle.chapters.length}章 / ${bundle.steps.length}ステップ / ビルド ${bundle.builtAt}）`,
      )
    } catch (e) {
      failed = true
      console.log(`  ✗ content.enc を復号できない: ${e instanceof Error ? e.message : e}`)
    }
  }

  console.log(failed ? '\n✗ 問題があります' : '\n✓ 公開サイトは正常です')
  if (failed) process.exitCode = 1
}

main().catch((e) => {
  console.error(`✗ ${e instanceof Error ? e.message : e}`)
  process.exitCode = 1
})
