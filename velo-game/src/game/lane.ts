/**
 * Половина сплитскрина: дорога одного велосипедиста.
 *
 * Неподвижное (небо, солнце, горы, земля, асфальт, сплошные линии) рисуется
 * один раз на изменение размера. Двигаются пунктир и деревья: меш и пул
 * спрайтов, потому что у Graphics пересборка геометрии каждый кадр стоит
 * дорого, а у меша обновление вершин — это перезапись небольшого массива.
 */

import {
  Color,
  Container,
  FillGradient,
  Graphics,
  MeshSimple,
  Sprite,
  Text,
  Texture,
} from 'pixi.js'
import { raceSheetTextures, raceSprite } from './assets'
import {
  COLOR_ASPHALT,
  COLOR_GROUND,
  COLOR_MARKING,
  COLOR_SKY_HORIZON,
  COLOR_SKY_MID,
  COLOR_SKY_TOP,
  COLOR_SUN_GLOW_INNER,
  COLOR_SUN_GLOW_MID,
  DASH_DISTANCE_M,
  DASH_LENGTH_M,
  DASH_PERIOD_M,
  DISTANCE_CATCHUP,
  LINE_WIDTH_M,
  MAX_DASHES,
  MOUNTAINS_ANCHOR_Y,
  MOUNTAINS_CONTENT_TOP,
  MOUNTAINS_WIDTH_RATIO,
  ROAD_DISTANCE_M,
  ROAD_WIDTH_M,
  SPEED_TAU_MS,
  SUN_CONTENT_BOTTOM,
  SUN_CONTENT_LEFT,
  SUN_CONTENT_RIGHT,
  SUN_CONTENT_TOP,
  SUN_GLOW_SCALE,
  SUN_OFFSET_X_RATIO,
  SUN_PEAK_GAP_RATIO,
  SUN_TOP_MARGIN_RATIO,
  SUN_WIDTH_RATIO,
  TREE_DISTANCE_M,
  TREE_FADE_M,
  TREE_HEIGHT_M,
  TREE_OFFSET_M,
  TREE_OFFSET_SPREAD_M,
  TREE_PERIOD_M,
  TREE_PHASE_LEFT,
  TREE_PHASE_RIGHT,
  TREE_SLOTS_PER_SIDE,
} from './config'
import { createProjection, roadQuad } from './projection'

const COORDS_PER_QUAD = 8
const KMH_TO_MS = 1 / 3.6

export class Lane {
  readonly view = new Container()

  #projection = createProjection(1, 1)
  #sky = new Graphics()
  #sunGlow = new Graphics()
  #sun: Sprite | null
  #mountains: Sprite | null
  #ground = new Graphics()
  #road = new Graphics()
  #trees = new Container({ sortableChildren: true })
  #treePool: Sprite[] = []
  #treeTextures: Texture[] = []
  #dashes: MeshSimple
  #mask = new Graphics()
  #offline = new Container()
  #offlineBox = new Graphics()
  #offlineText = new Text({ text: 'нет сигнала', style: { fill: 0xffffff, fontSize: 20 } })

  /** Сглаженная скорость, км/ч. */
  #speed = 0
  /** Пройденный путь в метрах — по нему считается фаза пунктира и деревьев. */
  #traveled = 0
  /** Множитель визуальной скорости: меняется со страницы проверки без перезапуска. */
  #visualScale = 1

  /** Собирает слои половины экрана: фон, дорога, деревья, плашку, маску. */
  constructor() {
    this.#sun = raceSprite('sun')
    this.#mountains = raceSprite('mountains')
    if (this.#sun) this.#sun.anchor.set(0.5, 0.5)
    if (this.#mountains) this.#mountains.anchor.set(0.5, MOUNTAINS_ANCHOR_Y)

    this.#treeTextures = raceSheetTextures('trees')
    const treeCount = TREE_SLOTS_PER_SIDE * 2
    for (let i = 0; i < treeCount; i++) {
      const sprite = new Sprite({ texture: this.#treeTextures[0] ?? Texture.EMPTY })
      sprite.anchor.set(0.5, 1)
      sprite.visible = false
      this.#treePool.push(sprite)
      this.#trees.addChild(sprite)
    }

    const vertices = new Float32Array(MAX_DASHES * COORDS_PER_QUAD)
    const indices = new Uint32Array(MAX_DASHES * 6)
    for (let dash = 0; dash < MAX_DASHES; dash++) {
      const first = dash * 4
      indices.set([first, first + 1, first + 2, first, first + 2, first + 3], dash * 6)
    }

    // Texture.WHITE + tint: цвет разметки задаём оттенком, текстура не нужна.
    this.#dashes = new MeshSimple({
      texture: Texture.WHITE,
      vertices,
      indices,
      uvs: new Float32Array(MAX_DASHES * COORDS_PER_QUAD),
    })
    this.#dashes.tint = COLOR_MARKING

    this.#offline.addChild(this.#offlineBox, this.#offlineText)
    this.#offline.visible = false

    this.view.addChild(this.#sky)
    if (this.#sun !== null) {
      this.#sunGlow.blendMode = 'add'
      this.view.addChild(this.#sunGlow, this.#sun)
    }
    this.view.addChild(this.#ground)
    if (this.#mountains !== null) this.view.addChild(this.#mountains)
    this.view.addChild(this.#road, this.#dashes, this.#trees, this.#offline, this.#mask)
    // У нижнего края дорога шире половины экрана — без маски она залезала бы к соседу.
    this.view.mask = this.#mask
  }

  /** Пересчитывает камеру и всю статичную картинку, когда меняется размер половины экрана. */
  resize(width: number, height: number): void {
    this.#projection = createProjection(width, height)
    this.#mask.clear().rect(0, 0, width, height).fill(0xffffff)
    this.#drawSky()
    this.#layoutHorizon()
    this.#drawGround()
    this.#drawRoad()
    this.#layoutOffline()
    this.#drawTrees()
    this.#drawDashes()
  }

  /**
   * Один кадр анимации: по телеметрии обновляет «пробег» дороги и двигает пунктир.
   * Вызывается из ticker Pixi (~60 раз/с), не путать с километрами в HUD — те с адаптера.
   */
  update(deltaMs: number, telemetry: PlayerTelemetry, visualScale: number): void {
    // Скорость с адаптера уже сглажена, но при потере датчика падает в ноль
    // мгновенно — своё сглаживание нужно, чтобы дорога замирала плавно.
    const catchUp = 1 - Math.exp(-deltaMs / SPEED_TAU_MS)
    this.#speed += (telemetry.speed - this.#speed) * catchUp
    this.#traveled += this.#speed * KMH_TO_MS * (deltaMs / 1000)

    // Догоняем дистанцию адаптера, если отстали (например, вкладка была свёрнута
    // и кадры не шли), но никогда не откатываемся: дорога не может поехать назад.
    if (telemetry.distance > this.#traveled) {
      this.#traveled += (telemetry.distance - this.#traveled) * DISTANCE_CATCHUP
    }

    this.#offline.visible = !telemetry.connected
    this.#visualScale = visualScale
    this.#drawTrees()
    this.#drawDashes()
  }

  /** Небо до горизонта. Земля рисуется после солнца, чтобы диск не торчал из-под гор. */
  #drawSky(): void {
    const { width, horizonY } = this.#projection

    const sky = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: COLOR_SKY_TOP },
        { offset: 0.45, color: COLOR_SKY_MID },
        { offset: 1, color: COLOR_SKY_HORIZON },
      ],
    })

    this.#sky.clear().rect(0, 0, width, horizonY).fill(sky)
  }

  #drawGround(): void {
    const { width, height, horizonY } = this.#projection
    this.#ground
      .clear()
      .rect(0, horizonY, width, height - horizonY)
      .fill(COLOR_GROUND)
  }

  /** Солнце над хребтом, оба на дальнем фоне — не едут с дорогой. */
  #layoutHorizon(): void {
    const { width, height, centerX, horizonY } = this.#projection

    if (this.#mountains !== null) {
      const rangeWidth = width * MOUNTAINS_WIDTH_RATIO
      const scaleX = rangeWidth / this.#mountains.texture.width
      this.#mountains.scale.set(scaleX)
      this.#mountains.position.set(centerX, horizonY)
    }

    if (this.#sun !== null) {
      const texture = this.#sun.texture
      const contentW = (SUN_CONTENT_RIGHT - SUN_CONTENT_LEFT) * texture.width
      this.#sun.scale.set((width * SUN_WIDTH_RATIO) / contentW)

      const peakY =
        this.#mountains === null
          ? horizonY * 0.55
          : horizonY - (MOUNTAINS_ANCHOR_Y - MOUNTAINS_CONTENT_TOP) * this.#mountains.height
      const diskTopPx = SUN_CONTENT_TOP * this.#sun.height
      const diskHeight = (SUN_CONTENT_BOTTOM - SUN_CONTENT_TOP) * this.#sun.height
      const diskTop = Math.max(
        height * SUN_TOP_MARGIN_RATIO,
        peakY - height * SUN_PEAK_GAP_RATIO - diskHeight,
      )
      this.#sun.position.set(
        centerX + width * SUN_OFFSET_X_RATIO,
        diskTop - diskTopPx + this.#sun.height / 2,
      )
      this.#drawSunGlow()
    }
  }

  /** Мягкий персиковый ареол за диском. */
  #drawSunGlow(): void {
    if (this.#sun === null) return

    const { x, y } = this.#sun.position
    const diskR = ((SUN_CONTENT_RIGHT - SUN_CONTENT_LEFT) * this.#sun.width) / 2
    const glowR = diskR * SUN_GLOW_SCALE
    const coreR = diskR * 1.45
    const diskEdge = diskR / glowR
    const outer = new FillGradient({
      type: 'radial',
      center: { x: 0.5, y: 0.5 },
      innerRadius: 0,
      outerCenter: { x: 0.5, y: 0.5 },
      outerRadius: 0.5,
      colorStops: [
        { offset: 0, color: new Color(COLOR_SUN_GLOW_INNER).setAlpha(0.9) },
        { offset: diskEdge, color: new Color(COLOR_SUN_GLOW_MID).setAlpha(0.45) },
        { offset: 1, color: new Color(COLOR_SUN_GLOW_MID).setAlpha(0) },
      ],
    })
    const core = new FillGradient({
      type: 'radial',
      center: { x: 0.5, y: 0.5 },
      innerRadius: 0,
      outerCenter: { x: 0.5, y: 0.5 },
      outerRadius: 0.5,
      colorStops: [
        { offset: 0, color: new Color(0xfff8ea).setAlpha(0.7) },
        { offset: 0.55, color: new Color(COLOR_SUN_GLOW_INNER).setAlpha(0.35) },
        { offset: 1, color: new Color(COLOR_SUN_GLOW_INNER).setAlpha(0) },
      ],
    })

    this.#sunGlow.position.set(x, y)
    this.#sunGlow.clear().circle(0, 0, glowR).fill(outer).circle(0, 0, coreR).fill(core)
  }

  /** Асфальт и сплошные белые линии по краям. */
  #drawRoad(): void {
    const projection = this.#projection
    const halfRoad = ROAD_WIDTH_M / 2
    const edgeCenter = halfRoad - LINE_WIDTH_M / 2
    const halfLine = LINE_WIDTH_M / 2

    this.#road
      .clear()
      .poly(roadQuad(projection, -halfRoad, halfRoad, projection.nearZ, ROAD_DISTANCE_M))
      .fill(COLOR_ASPHALT)

    for (const side of [-1, 1]) {
      const center = side * edgeCenter
      this.#road
        .poly(
          roadQuad(
            projection,
            center - halfLine,
            center + halfLine,
            projection.nearZ,
            ROAD_DISTANCE_M,
          ),
        )
        .fill(COLOR_MARKING)
    }
  }

  /**
   * Деревья на обочине: билбордом в перспективе.
   * Справа зеркалим — в PNG свет запечён справа, у обочины он должен смотреть к солнцу.
   */
  #drawTrees(): void {
    const textures = this.#treeTextures
    if (textures.length === 0) {
      for (const sprite of this.#treePool) sprite.visible = false
      return
    }

    const projection = this.#projection
    const traveled = this.#traveled * this.#visualScale
    const halfRoad = ROAD_WIDTH_M / 2
    let used = 0

    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1
      const phase = side === 0 ? TREE_PHASE_LEFT : TREE_PHASE_RIGHT
      const first =
        Math.floor((traveled + projection.nearZ - phase) / TREE_PERIOD_M) * TREE_PERIOD_M +
        phase +
        TREE_PERIOD_M * 0.5

      for (let slot = 0; slot < TREE_SLOTS_PER_SIDE; slot++) {
        const slotZ = first + slot * TREE_PERIOD_M
        const worldZ = slotZ + (hash01(slotZ * 0.19 + side) * 2 - 1) * 1.1
        const camZ = worldZ - traveled
        const sprite = this.#treePool[used]
        if (sprite === undefined) return
        used += 1

        const visible = camZ > projection.nearZ && camZ < TREE_DISTANCE_M
        sprite.visible = visible
        if (!visible) {
          sprite.alpha = 0
          continue
        }

        const texture = textures[treeKind(worldZ, side, textures.length)]
        if (texture !== undefined) sprite.texture = texture
        const px = projection.scale(camZ)
        const heightVary = 0.78 + 0.44 * hash01(worldZ * 0.37 + side)
        const size = (TREE_HEIGHT_M * heightVary * px) / sprite.texture.height
        const offset =
          TREE_OFFSET_M + TREE_OFFSET_SPREAD_M * (hash01(worldZ * 0.71 + side * 4.3) * 2 - 1)
        const fade = Math.min(1, Math.max(0, (TREE_DISTANCE_M - camZ) / TREE_FADE_M))
        sprite.alpha = fade * fade * (3 - 2 * fade)
        sprite.scale.set(sign > 0 ? -size : size, size)
        sprite.position.set(
          projection.centerX + sign * (halfRoad + offset) * px,
          projection.y(camZ),
        )
        sprite.zIndex = -camZ
      }
    }

    for (let i = used; i < this.#treePool.length; i++) {
      const extra = this.#treePool[i]
      if (extra !== undefined) extra.visible = false
    }
  }

  /** Сдвигает штрихи центрального пунктира вперёд — от #traveled и visualScale. */
  #drawDashes(): void {
    const projection = this.#projection
    const vertices = this.#dashes.vertices
    const halfLine = LINE_WIDTH_M / 2
    // Пунктир набегает на камеру: с ростом пробега начало каждого штриха уменьшается.
    const phase =
      (((this.#traveled * this.#visualScale) % DASH_PERIOD_M) + DASH_PERIOD_M) % DASH_PERIOD_M

    for (let dash = 0; dash < MAX_DASHES; dash++) {
      const start = dash * DASH_PERIOD_M - phase
      const nearZ = Math.max(start, projection.nearZ)
      const farZ = Math.min(start + DASH_LENGTH_M, DASH_DISTANCE_M)
      const at = dash * COORDS_PER_QUAD

      if (farZ <= nearZ) {
        // Штрих уехал под нижний край кадра — сворачиваем квад в точку на горизонте.
        for (let offset = 0; offset < COORDS_PER_QUAD; offset += 2) {
          vertices[at + offset] = projection.centerX
          vertices[at + offset + 1] = projection.horizonY
        }
        continue
      }

      vertices.set(roadQuad(projection, -halfLine, halfLine, nearZ, farZ), at)
    }

    this.#dashes.vertices = vertices
  }

  /** Подгоняет размер и позицию плашки «нет сигнала» под высоту экрана. */
  #layoutOffline(): void {
    const size = Math.round(this.#projection.height * 0.022)
    const padX = size * 0.8
    const padY = size * 0.5

    this.#offlineText.style.fontSize = size
    this.#offlineText.position.set(padX, padY)
    this.#offlineBox
      .clear()
      .roundRect(
        0,
        0,
        this.#offlineText.width + padX * 2,
        this.#offlineText.height + padY * 2,
        size * 0.4,
      )
      .fill({ color: 0x000000, alpha: 0.55 })
    this.#offline.position.set(size, size)
  }
}

function hash01(seed: number): number {
  const n = Math.sin(seed * 12.9898) * 43758.5453
  return n - Math.floor(n)
}

function treeKind(worldZ: number, side: number, count: number): number {
  return Math.floor(hash01(worldZ * 0.13 + side * 17.2) * count) % count
}
