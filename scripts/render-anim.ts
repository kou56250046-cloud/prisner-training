/**
 * アニメーションを PNG のコンタクトシートとして書き出す。
 *
 *   npm run render            # 全種目
 *   npm run render pushup     # 前方一致で絞り込み
 *
 * ブラウザを立ち上げずに姿勢を目で確認するための道具。
 * 姿勢の計算は本番と同じ src/anim を通すので、ここで正しく見えれば
 * アプリ上でも同じ形になる（線の太さや色だけは簡略化してある）。
 *
 * 1種目につき、スタート → 中間 → フィニッシュ の3コマを横に並べる。
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { buildTimeline } from '../src/anim/interpolate'
import { DIM, resolvePose } from '../src/anim/rig'
import type { Animation, Camera, Prop, Skeleton, Vec2 } from '../src/anim/types'
import { animations } from '../src/content/animations'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, '.render')

const BONE = '#f5f0e8'
const FAR = 'rgba(245,240,232,0.28)'
const FAR_STRONG = 'rgba(245,240,232,0.62)'
const ACCENT = '#e8a33d'
const STRUCT = '#4a4540'

function limbPath(l: { root: Vec2; mid: Vec2; end: Vec2; tip: Vec2 }, stroke: string, w: number) {
  return `<polyline points="${l.root.x},${l.root.y} ${l.mid.x},${l.mid.y} ${l.end.x},${l.end.y} ${l.tip.x},${l.tip.y}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
}

function propSvg(p: Prop, c: Camera): string {
  const hatch = 'url(#h)'
  switch (p.kind) {
    case 'ground':
      return `<rect x="${c.minX}" y="${c.minY}" width="${c.maxX - c.minX}" height="${-c.minY}" fill="#100e0c"/><rect x="${c.minX}" y="${c.minY}" width="${c.maxX - c.minX}" height="${-c.minY}" fill="${hatch}"/><line x1="${c.minX}" y1="0" x2="${c.maxX}" y2="0" stroke="${STRUCT}" stroke-width="2.5"/>`
    case 'wall': {
      const d = Math.max(10, c.maxX - p.x)
      const x0 = p.facing === 'left' ? p.x : p.x - d
      return `<rect x="${x0}" y="${c.minY}" width="${d}" height="${c.maxY - c.minY}" fill="#100e0c"/><rect x="${x0}" y="${c.minY}" width="${d}" height="${c.maxY - c.minY}" fill="${hatch}"/><line x1="${p.x}" y1="${c.minY}" x2="${p.x}" y2="${c.maxY}" stroke="${STRUCT}" stroke-width="2.5"/>`
    }
    case 'block':
      return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#100e0c"/><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${hatch}"/><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="none" stroke="${STRUCT}" stroke-width="2"/>`
    case 'bar':
      return `<circle cx="${p.x}" cy="${p.y}" r="3.4" fill="#100e0c" stroke="${ACCENT}" stroke-width="2.2"/>`
    case 'ball':
      return `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="none" stroke="${ACCENT}" stroke-width="1.4"/>`
  }
}

function frameSvg(anim: Animation, s: Skeleton): string {
  const c = anim.camera
  const K = c.minY + c.maxY
  const order = { ground: 0, wall: 1, block: 2, bar: 3, ball: 4 }
  const sorted = [...anim.props].sort((a, b) => order[a.kind] - order[b.kind])
  // バーだけは体より手前（顔の手前にあるため）
  const props = sorted.filter((p) => p.kind !== 'bar').map((p) => propSvg(p, c)).join('')
  const propsFg = sorted.filter((p) => p.kind === 'bar').map((p) => propSvg(p, c)).join('')

  const farColor = anim.asymmetric ? FAR_STRONG : FAR
  const far = anim.hideFar
    ? ''
    : `<g transform="translate(-2.5,-0.8)">${limbPath(s.legFar, farColor, 3)}${limbPath(s.armFar, farColor, 3)}</g>`

  const guides = (anim.guides ?? [])
    .map((g) =>
      g.kind === 'hline'
        ? `<line x1="${c.minX}" y1="${g.y}" x2="${c.maxX}" y2="${g.y}" stroke="${ACCENT}" stroke-width="0.9" stroke-dasharray="3 3" opacity="0.7"/>`
        : g.kind === 'vline'
          ? `<line x1="${g.x}" y1="${c.minY}" x2="${g.x}" y2="${c.maxY}" stroke="${ACCENT}" stroke-width="0.9" stroke-dasharray="3 3" opacity="0.7"/>`
          : '',
    )
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${c.minX} ${c.minY} ${c.maxX - c.minX} ${c.maxY - c.minY}" width="${(c.maxX - c.minX) * 3.4}" height="${(c.maxY - c.minY) * 3.4}">
<defs><pattern id="h" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" stroke="${STRUCT}" stroke-width="1.2"/></pattern></defs>
<rect x="${c.minX}" y="${c.minY}" width="${c.maxX - c.minX}" height="${c.maxY - c.minY}" fill="#141210"/>
<g transform="translate(0,${K}) scale(1,-1)">
${props}${guides}${far}
<line x1="${s.pelvis.x}" y1="${s.pelvis.y}" x2="${s.shoulder.x}" y2="${s.shoulder.y}" stroke="${BONE}" stroke-width="5.5" stroke-linecap="round"/>
<line x1="${s.shoulder.x}" y1="${s.shoulder.y}" x2="${s.head.x}" y2="${s.head.y}" stroke="${BONE}" stroke-width="3.5" stroke-linecap="round"/>
${limbPath(s.legNear, BONE, 4.5)}${limbPath(s.armNear, BONE, 4)}
<circle cx="${s.head.x}" cy="${s.head.y}" r="${DIM.headR}" fill="#141210" stroke="${BONE}" stroke-width="3"/>
${propsFg}
<circle cx="${s.shoulder.x}" cy="${s.shoulder.y}" r="1.7" fill="${ACCENT}"/>
<circle cx="${s.pelvis.x}" cy="${s.pelvis.y}" r="1.7" fill="${ACCENT}"/>
<circle cx="${s.armNear.mid.x}" cy="${s.armNear.mid.y}" r="1.7" fill="${ACCENT}"/>
<circle cx="${s.legNear.mid.x}" cy="${s.legNear.mid.y}" r="1.7" fill="${ACCENT}"/>
</g></svg>`
}

async function render(anim: Animation) {
  const tl = buildTimeline(anim)
  // スタート / 動作の途中 / フィニッシュ の3コマ。
  // 途中のコマが破綻していないかを見るのがこのツールの主目的
  const times = [0, 0.25, 0.5].map((f) => f * tl.totalMs)
  const pngs = await Promise.all(
    times.map((t) =>
      sharp(Buffer.from(frameSvg(anim, resolvePose(tl.sample(t).pose)))).png().toBuffer(),
    ),
  )
  const metas = await Promise.all(pngs.map((b) => sharp(b).metadata()))
  const w = metas[0]!.width!
  const h = metas[0]!.height!
  const gap = 8

  const sheet = await sharp({
    create: {
      width: w * 3 + gap * 4,
      height: h + gap * 2,
      channels: 3,
      background: '#0a0908',
    },
  })
    .composite(pngs.map((input, i) => ({ input, left: gap + i * (w + gap), top: gap })))
    .png()
    .toBuffer()

  await writeFile(join(OUT, `${anim.id}.png`), sheet)
  console.log(`  ${anim.id}.png  (${w}x${h} ×3コマ)`)
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const filter = process.argv[2]
  const list = Object.values(animations).filter((a) => !filter || a.id.startsWith(filter))
  if (!list.length) {
    console.log(`該当なし: ${filter}`)
    return
  }
  for (const a of list) await render(a)
  console.log(`\n✓ ${list.length}件を .render/ に出力しました`)
}

main().catch((e) => {
  console.error(`✗ ${e instanceof Error ? e.message : e}`)
  process.exitCode = 1
})
