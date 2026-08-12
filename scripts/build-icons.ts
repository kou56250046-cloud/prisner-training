/**
 * PWA / iOS ホーム画面用のアイコンを生成する。
 *
 *   npm run icons
 *
 * 素材は SVG 1枚で、そこから必要なサイズの PNG を書き出す。
 * 意匠は監獄の鉄格子。小さいサイズでも形が潰れないよう、線は太く本数は少なくする。
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(root, 'public')

const BG = '#0a0908'
const BAR = '#e8a33d'

/** @param inset 余白の割合。マスカブルは端が切られるので中央に寄せる */
function svg(size: number, inset: number, rounded: boolean): string {
  const s = size
  const pad = s * inset
  const inner = s - pad * 2
  // 縦4本の鉄格子と、それを横切る帯
  const barW = inner * 0.11
  const gap = (inner - barW * 4) / 3
  const bars = Array.from({ length: 4 }, (_, i) => {
    const x = pad + i * (barW + gap)
    return `<rect x="${x}" y="${pad}" width="${barW}" height="${inner}" rx="${barW * 0.35}" fill="${BAR}"/>`
  }).join('')
  const railH = inner * 0.1
  const railY = pad + inner * 0.45
  const rail = `<rect x="${pad - barW * 0.3}" y="${railY}" width="${inner + barW * 0.6}" height="${railH}" rx="${railH * 0.4}" fill="${BAR}"/>`

  const bg = rounded
    ? `<rect width="${s}" height="${s}" rx="${s * 0.22}" fill="${BG}"/>`
    : `<rect width="${s}" height="${s}" fill="${BG}"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${bg}${bars}${rail}</svg>`
}

async function png(name: string, size: number, inset: number, rounded: boolean) {
  const buf = await sharp(Buffer.from(svg(size, inset, rounded))).png().toBuffer()
  await writeFile(join(PUBLIC, name), buf)
  console.log(`  ${name} (${size}x${size})`)
}

async function main() {
  await mkdir(PUBLIC, { recursive: true })

  // ブラウザのタブ用
  await writeFile(join(PUBLIC, 'favicon.svg'), svg(64, 0.2, false), 'utf8')
  console.log('  favicon.svg')

  await png('icon-192.png', 192, 0.2, false)
  await png('icon-512.png', 512, 0.2, false)
  // マスカブルは外周20%が切り落とされる前提で、内側に寄せる
  await png('icon-512-maskable.png', 512, 0.3, false)
  // iOS はアイコンを自分で角丸にするので、こちらは角丸なしの塗り切り
  await png('apple-touch-icon.png', 180, 0.2, false)

  await writeFile(
    join(PUBLIC, 'robots.txt'),
    'User-agent: *\nDisallow: /\n',
    'utf8',
  )
  console.log('  robots.txt')
  console.log('✓ アイコンを生成しました')
}

main().catch((e) => {
  console.error(`✗ ${e instanceof Error ? e.message : e}`)
  process.exitCode = 1
})
