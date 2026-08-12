import { db } from '@/db/schema'
import { decryptContent, WrongPassphraseError } from './crypto'
import type { Chapter, Episode, Routine, Step } from './types'

export type ContentBundle = {
  version: number
  builtAt: string
  chapters: Chapter[]
  steps: Step[]
  routines: Routine[]
  episodes: Episode[]
}

/** 種目・ステップを引きやすくしたインデックス付きコンテンツ */
export type Content = ContentBundle & {
  stepById: Map<string, Step>
  stepsByChapter: Map<string, Step[]>
  chapterById: Map<string, Chapter>
}

function index(bundle: ContentBundle): Content {
  const stepsByChapter = new Map<string, Step[]>()
  for (const s of bundle.steps) {
    const list = stepsByChapter.get(s.chapterId)
    if (list) list.push(s)
    else stepsByChapter.set(s.chapterId, [s])
  }
  for (const list of stepsByChapter.values()) list.sort((a, b) => a.stepNo - b.stepNo)

  return {
    ...bundle,
    stepById: new Map(bundle.steps.map((s) => [s.id, s])),
    stepsByChapter,
    chapterById: new Map(bundle.chapters.map((c) => [c.id, c])),
  }
}

let cached: Content | null = null

async function fetchBlob(): Promise<Uint8Array> {
  // BASE_URL 経由で引く。GitHub Pages のサブパス配信でも壊れない
  const res = await fetch(`${import.meta.env.BASE_URL}content.enc`, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`コンテンツを取得できませんでした (${res.status})`)
  return new Uint8Array(await res.arrayBuffer())
}

/**
 * 保存済みの合い言葉で復号を試みる。
 * 初回や合い言葉が変わったときは null を返すので、呼び出し側が入力を求める。
 */
export async function loadCachedContent(): Promise<Content | null> {
  if (cached) return cached

  const saved = await db.contentCache.get('content')
  if (!saved) return null

  try {
    // 保存済みの平文をそのまま使う。合い言葉の再入力もPBKDF2の再計算も要らない
    cached = index(JSON.parse(saved.json) as ContentBundle)
    return cached
  } catch {
    await db.contentCache.delete('content')
    return null
  }
}

/** 合い言葉を受け取って復号し、成功したら端末に保存する */
export async function unlockContent(passphrase: string): Promise<Content> {
  const blob = await fetchBlob()
  const json = await decryptContent(blob, passphrase)

  let bundle: ContentBundle
  try {
    bundle = JSON.parse(json) as ContentBundle
  } catch {
    throw new Error('コンテンツの中身が壊れています')
  }

  await db.contentCache.put({ key: 'content', json, passphrase, cachedAt: Date.now() })
  cached = index(bundle)
  return cached
}

/**
 * コンテンツが更新された（content.enc が新しくなった）ときに、
 * 保存済みの合い言葉で黙って取り直す。
 */
export async function refreshContent(): Promise<Content | null> {
  const saved = await db.contentCache.get('content')
  if (!saved) return null
  try {
    const blob = await fetchBlob()
    const json = await decryptContent(blob, saved.passphrase)
    const bundle = JSON.parse(json) as ContentBundle
    if (bundle.builtAt === (cached?.builtAt ?? '')) return cached
    await db.contentCache.put({ ...saved, json, cachedAt: Date.now() })
    cached = index(bundle)
    return cached
  } catch (e) {
    // 合い言葉が変わった場合だけは再入力してもらう必要がある
    if (e instanceof WrongPassphraseError) {
      await db.contentCache.delete('content')
      return null
    }
    // オフラインなど、取得できないだけならキャッシュを使い続ける
    return cached
  }
}

export async function forgetContent(): Promise<void> {
  cached = null
  await db.contentCache.delete('content')
}
