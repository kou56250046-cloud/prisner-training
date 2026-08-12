/**
 * 棒人間アニメーションの型定義。
 *
 * 座標系: x は右、y は「上」。地面が y=0。身長がおよそ 100 単位。
 * 角度: 度数法。+x 軸から反時計回り（東=0, 北=90, 西=180, 南=270）。
 *
 * 角度はすべて「絶対角」で持つ。親からの相対角にすると写真から起こすときに
 * 誤差が積み上がるが、絶対角なら写真を見て「体幹は水平から10度」と
 * そのまま書き写せる。
 */

export type Vec2 = { x: number; y: number }

/**
 * 手足の姿勢の指定方法。
 *
 * - `fk`: 上腕/前腕（大腿/下腿）の絶対角を直接指定する。宙に浮いている手足に使う。
 * - `ik`: 手首（足首）のワールド座標を指定し、関節角は逆運動学で解く。
 *          壁・床・バーに接している手足に使う。キーフレーム間を IK 同士で
 *          つなぐと接地点が動作中ずっと固定されるので、フォームが破綻しない。
 */
export type LimbPose =
  | { mode: 'fk'; upper: number; lower: number; ext?: number }
  | { mode: 'ik'; target: Vec2; bend: 1 | -1; ext?: number }

/** 肘/膝の曲がる向き。IK の解の分岐を決める。 */
export type Bend = 1 | -1

export type Pose = {
  /** 骨盤（股関節の中心）のワールド座標 */
  pelvis: Vec2
  /** 体幹の絶対角（骨盤 → 肩）。直立で 90、うつ伏せで 0 付近 */
  torso: number
  /** 首から頭の絶対角（肩 → 頭の中心） */
  head: number
  /**
   * 背骨の反り。骨盤→肩の直線から、どれだけ膨らませるか（単位）。
   * 正で進行方向の左（＝反時計回り90度）へ膨らむ。
   * ブリッジのように背中を弓なりにする種目で使う。0 なら直線。
   */
  spineArch?: number
  /** 手前側の腕（濃く描く） */
  armNear: LimbPose
  /** 奥側の腕。省略時は armNear と同じ姿勢 */
  armFar?: LimbPose
  /** 手前側の脚 */
  legNear: LimbPose
  /** 奥側の脚。省略時は legNear と同じ姿勢 */
  legFar?: LimbPose
}

export type Keyframe = {
  /** タイムライン上の位置（0〜1）。昇順で並べる */
  t: number
  pose: Pose
  /** 「スタート」「フィニッシュ」などの表示ラベル */
  label?: string
  /** このキーフレームで静止する時間(ms)。書籍の「一時静止」を再現する */
  hold?: number
}

/** 背景に描く器具・環境 */
export type Prop =
  | { kind: 'ground' }
  | { kind: 'wall'; x: number; facing: 'left' | 'right' }
  | { kind: 'bar'; x: number; y: number }
  | { kind: 'block'; x: number; y: number; w: number; h: number; label?: string }
  | { kind: 'ball'; x: number; y: number; r: number }

/** 動作の理解を助ける補助線・注釈 */
export type Guide =
  | { kind: 'hline'; y: number; label?: string }
  | { kind: 'vline'; x: number; label?: string }
  /** 指定した関節の軌跡を薄く描く（動作域の可視化） */
  | { kind: 'trail'; joint: TrailJoint }
  /** 2点間の距離を寸法線で示す（「胸が床からこぶしひとつ」など） */
  | { kind: 'gap'; from: TrailJoint; to: Vec2; label?: string }

export type TrailJoint =
  | 'head'
  | 'shoulder'
  | 'pelvis'
  | 'wristNear'
  | 'ankleNear'
  | 'kneeNear'
  | 'chest'

export type Camera = { minX: number; maxX: number; minY: number; maxY: number }

export type Animation = {
  id: string
  /** 1往復にかける時間(ms)。hold は含まない */
  durationMs: number
  keyframes: Keyframe[]
  props: Prop[]
  camera: Camera
  guides?: Guide[]
  /** 左右非対称の種目で、奥側の手足を薄く描かず隠す */
  hideFar?: boolean
  /**
   * 左右で動きが違う種目（アンイーブン、ワンアーム、レバーなど）。
   * 奥側の手足を濃く描き、「腕が2本あってそれぞれ別の位置にある」ことを
   * 読み取れるようにする。左右対称の種目では薄い影のままにする。
   */
  asymmetric?: boolean
  /**
   * 図の下に出す補足。真横からの図では表現しきれないこと
   * （両手の間隔、体の横に置いたボールの位置など）を言葉で補う。
   */
  caption?: string
}

/** 解決済みの骨格。描画はこれだけを見る */
export type Skeleton = {
  pelvis: Vec2
  shoulder: Vec2
  head: Vec2
  chest: Vec2
  /** 背骨を2次ベジェで描くときの制御点。反りが0なら中点に一致する */
  spineControl: Vec2
  armNear: ResolvedLimb
  armFar: ResolvedLimb
  legNear: ResolvedLimb
  legFar: ResolvedLimb
}

export type ResolvedLimb = {
  /** 付け根（肩 or 股関節） */
  root: Vec2
  /** 肘 or 膝 */
  mid: Vec2
  /** 手首 or 足首 */
  end: Vec2
  /** 指先 or つま先 */
  tip: Vec2
}
