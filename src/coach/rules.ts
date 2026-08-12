/**
 * コーチングの判断ロジック。すべて純関数で、書籍の記述だけを実装する。
 *
 * ここに推測を混ぜないこと。「なんとなくこうしたほうが良さそう」は入れない。
 * 出典は原本のページ番号をコメントに残してある。
 */
import type { Standards, Step } from '@/content/types'

export type SetTarget = { reps: number; sets: number }

export const SET_TARGET_EQ = (a: SetTarget, b: SetTarget) => a.reps === b.reps && a.sets === b.sets

/** 目標を満たしているか。全セットで目標レップス以上なら達成 */
export function meetsTarget(achieved: number[], target: SetTarget): boolean {
  if (achieved.length < target.sets) return false
  return achieved.slice(0, target.sets).every((r) => r >= target.reps)
}

export function meetsStandard(achieved: number[], std: SetTarget): boolean {
  return meetsTarget(achieved, std)
}

/**
 * 次に狙う目標を返す（原本 p.300「進歩を確実にするには?」）。
 *
 *   初心者の標準から始める
 *   → 1セットで10レップスに達するまでレップスを足す
 *   → 10レップスに達したら中級者のセット数に分ける
 *   → 両セットのレップスを増やして中級者の標準へ
 *   → 上級者の標準がセット数を増やすよう指定していればセットを追加
 *   → 上級者の標準までレップスを重ねる
 */
export function nextTarget(prev: SetTarget, s: Standards): SetTarget {
  const inter = s.intermediate
  const adv = s.advanced

  // まだセットを分けていない段階
  if (prev.sets < inter.sets) {
    if (prev.reps < 10) return { reps: prev.reps + 1, sets: prev.sets }
    // 10レップス1セットに到達 → セットに分ける
    return { reps: Math.max(5, Math.ceil(prev.reps / inter.sets)), sets: inter.sets }
  }

  if (prev.reps < inter.reps) return { reps: prev.reps + 1, sets: prev.sets }

  // 中級者の標準に到達。上級者がより多いセット数を求めるならセットを足す
  if (prev.sets < adv.sets) return { reps: prev.reps, sets: prev.sets + 1 }

  if (prev.reps < adv.reps) return { reps: prev.reps + 1, sets: prev.sets }

  return prev
}

/** そのステップで最初に狙う目標 */
export function initialTarget(s: Standards): SetTarget {
  return { ...s.beginner }
}

/**
 * 進級できるか（原本 p.300）。
 * 上級者の標準を2セッション連続で満たしたら次のステップへ。
 *
 * @param recent 新しい順に並べた、そのステップの各セッションの実績レップス
 */
export function canPromote(recent: number[][], s: Standards): boolean {
  if (recent.length < 2) return false
  return recent.slice(0, 2).every((a) => meetsStandard(a, s.advanced))
}

/**
 * ひとつ前のステップに戻るべきか（原本 p.299-300）。
 * 「あるステップに進んで初心者の標準を満たせない場合は、ひとつ前のステップに戻る」
 *
 * 1回できなかっただけで降格させると気持ちが折れるので、
 * 直近3セッションすべてで初心者の標準に届かなかった場合に提案する。
 */
export function shouldDemote(recent: number[][], s: Standards, stepNo: number): boolean {
  if (stepNo <= 1) return false
  if (recent.length < 3) return false
  return recent.slice(0, 3).every((a) => !meetsStandard(a, s.beginner))
}

/**
 * 停滞しているか（原本 p.301「トラブルシューティング」）。
 * 同じステップで最大レップスが更新されない状態が続いたら停滞とみなす。
 */
export function detectPlateau(
  recent: { reps: number[]; at: number }[],
  now: number,
  opts = { sessions: 6, days: 21 },
): boolean {
  if (recent.length < opts.sessions) return false
  const window = recent.slice(0, opts.sessions)
  const best = Math.max(...window.map((r) => Math.max(0, ...r.reps)))
  const latestBest = Math.max(0, ...(window[0]?.reps ?? []))
  const oldest = window[window.length - 1]!
  const spanDays = (now - oldest.at) / 86_400_000

  // 直近が期間中の最高を更新できていない、かつ十分な期間が経っている
  return latestBest < best && spanDays >= opts.days
}

/** 停滞したときの打開策（原本 p.301-302）。順番も書籍どおり */
export const PLATEAU_REMEDIES = [
  {
    title: '体重を落とす',
    body: 'シリーズのステップが上がるほど、比例するようにさらなる筋力が必要になる。筋肉の増加は障害にはならない。問題は体脂肪だ。数か月かけて余分な脂肪を落とす。',
  },
  {
    title: 'もっと休みを取る',
    body: 'オーバーワークになるとパフォーマンスが落ちていく。休日を増やす。トレーニングが過剰になったら「善行」や「ベテラン」のようなルーチンに戻るといい。',
  },
  {
    title: '耐える',
    body: 'レップス数に固執すると手を抜くようになり、筋力ではなく弾みに頼り始める。数ステップ前に戻り、フォームが完璧かどうか厳しくチェックしながらやり直す。気持ちのペースではなく、体のペースに従う。',
  },
  {
    title: '体に不純物を入れない',
    body: 'たくさん眠り、酒やドラッグを避ける。体を虐めてはならない。尊重するのだ。',
  },
] as const

/**
 * 強化トレーニングを提案してよいか（原本 p.302-303）。
 *
 * 書籍は「すでに複数レップスできるエクササイズにこのやり方を使ってはならない。
 * あるステップから次のステップへの移行ができなくて本当に苦闘している時だけ」と
 * 明確に禁止しているので、その条件をそのまま実装する。
 */
export function canSuggestConsolidation(recentBest: number): boolean {
  return recentBest <= 2
}

export type WarmupSet = { stepNo: number; reps: number }

/**
 * ウォームアップを組み立てる（原本 p.291-292）。
 *
 * 「本番で実行する予定の動作の簡単なバージョンを肩ならしに行う」
 * 現ステップが4以上なら、3つ前を20レップス・2つ前を15レップス。
 * 3以下ならそのステップ自体を使う（シリーズの最初のほうではルールが使えないため）。
 */
export function buildWarmup(
  currentStep: number,
  opts: { extra?: boolean } = {},
): WarmupSet[] {
  const sets: WarmupSet[] =
    currentStep >= 4
      ? [
          { stepNo: currentStep - 3, reps: 20 },
          { stepNo: currentStep - 2, reps: 15 },
        ]
      : [
          { stepNo: currentStep, reps: 20 },
          { stepNo: currentStep, reps: 15 },
        ]

  // 高齢・低気温・体調が万全でないときは3セット目を足す
  if (opts.extra) {
    sets[1] = { ...sets[1]!, reps: 12 }
    sets.push({ stepNo: sets[1]!.stepNo, reps: 12 })
  }
  return sets
}

/**
 * オーバーワークか（原本 p.301「もっと休みを取る」）。
 * 想定より多くトレーニングしていて、かつ主観強度が続けて「きつい」場合。
 */
export function detectOverwork(
  sessionsThisWeek: number,
  plannedPerWeek: number,
  recentRpe: ('easy' | 'ok' | 'hard')[],
): boolean {
  if (sessionsThisWeek <= plannedPerWeek) return false
  return recentRpe.slice(0, 2).length === 2 && recentRpe.slice(0, 2).every((r) => r === 'hard')
}

/**
 * 「新入り」を卒業してよいか（原本 p.313-314）。
 * プッシュアップ・スクワット・プルアップ・レッグレイズの4つすべてがステップ6超。
 */
export function canGraduateNewBlood(steps: Record<string, number>): boolean {
  return (['pushup', 'squat', 'pullup', 'legraise'] as const).every((c) => (steps[c] ?? 1) > 6)
}

/**
 * 激しくトレーニングしてよい前提を満たしているか（原本 p.299「強度」）。
 * 書籍が挙げる条件のうち、アプリが判定できるのは
 * 「そのステップの初心者の標準のレップス数を満たせること」だけ。
 * 残りは本人にしか分からないので、チェックリストとして提示する。
 */
export const INTENSITY_PREREQUISITES = [
  'ゆっくり始めるというアドバイスに従っていること',
  'フォームが完璧であること',
  '病気ではなく調子も悪くないこと',
  'ケガをしていないこと、ケガの前兆もないこと',
  'そのステップの初心者の標準に課せられるレップス数を満たせること',
] as const

/** ステップ詳細から、次のステップに進むまでの残りを説明する文言をつくる */
export function describeGraduation(step: Step, best: number[] | null): string {
  const adv = step.standards.advanced
  const target = `${adv.reps}レップス × ${adv.sets}セット`
  if (!best || best.length === 0) return `上級者の標準（${target}）を2回連続で達成すると次のステップへ進める。`
  const done = meetsStandard(best, adv)
  if (done) return `上級者の標準を達成。もう1回達成すれば次のステップへ進める。`
  const shortfall = adv.reps - Math.min(...best.slice(0, adv.sets).concat(0))
  return `上級者の標準（${target}）まであと ${Math.max(1, shortfall)} レップス。`
}
