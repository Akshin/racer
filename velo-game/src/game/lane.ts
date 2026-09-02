/**
 * Половина сплитскрина: дорога одного велосипедиста.
 *
 * Неподвижное (небо, солнце, горы, земля, асфальт, сплошные линии) рисуется
 * один раз на изменение размера. Двигаются пунктир и кочки обочины: оба меши,
 * потому что у Graphics пересборка геометрии каждый кадр стоит дорого, а у меша
 * обновление вершин — это перезапись небольшого массива.
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
import { raceSprite } from './assets'
import {
  BERM_DISTANCE_M,
  BERM_HEIGHT_M,
  BERM_MOUNDS_PER_SIDE,
  BERM_PERIOD_M,
  BERM_PHASE_LEFT,
  BERM_PHASE_RIGHT,
  BERM_RADIUS_M,
  BERM_RINGS_PER_MOUND,
  BERM_WIDTH_M,
  COLOR_ASPHALT,
  COLOR_BERM,
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
} from './config'
import { createProjection, roadQuad } from './projection'

const COORDS_PER_QUAD = 8
const KMH_TO_MS = 1 / 3.6
const BERM_ARC_POINTS = 8
const BERM_VERT_COUNT = 2 * BERM_MOUNDS_PER_SIDE * BERM_RINGS_PER_MOUND * BERM_ARC_POINTS

export class Lane {
  readonly view = new Container()

  #projection = createProjection(1, 1)
  #sky = new Graphics()
  #sunGlow = new Graphics()
  #sun: Sprite | null
  #mountains: Sprite | null
  #ground = new Graphics()
  #road = new Graphics()
  #berm: MeshSimple
  #dashes: MeshSimple
  #mask = new Graphics()
  #offline = new Container()
  #offlineBox = new Graphics()
  #offlineText = new Text({ text: 'нет сигнала', style: { fill: 0xffffff, fontSize: 20 } })

  /** Сглаженная скорость, км/ч. */
  #speed = 0
  /** Пройденный путь в метрах — по нему считается фаза пунктира и холмиков. */
  #traveled = 0
  /** Множитель визуальной скорости: меняется со страницы проверки без перезапуска. */
  #visualScale = 1

  /** Собирает слои половины экрана: фон, обочина, дорога, пунктир, плашку, маску. */
  constructor() {
    this.#berm = createBermMesh(COLOR_BERM)
    this.#sun = raceSprite('sun')
    this.#mountains = raceSprite('mountains')
    if (this.#sun) this.#sun.anchor.set(0.5, 0.5)
    if (this.#mountains) this.#mountains.anchor.set(0.5, MOUNTAINS_ANCHOR_Y)

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
    this.view.addChild(this.#berm, this.#road, this.#dashes, this.#offline, this.#mask)
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
    this.#drawBerms()
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
    this.#drawBerms()
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

  /** Асфальт и сплошные белые линии по краям — поверх бруствера, чтобы кромка была чистой. */
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
   * Кочки у обочины: каждая — своя полусфера с собственной сеткой,
   * чтобы ближние не превращались в клинья из трёх полигонов.
   */
  #drawBerms(): void {
    const projection = this.#projection
    const traveled = this.#traveled * this.#visualScale
    const halfRoad = ROAD_WIDTH_M / 2
    const vertices = this.#berm.vertices as Float32Array
    const rx = BERM_WIDTH_M * 0.5

    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1
      const phase = side === 0 ? BERM_PHASE_LEFT : BERM_PHASE_RIGHT
      const first =
        Math.floor((traveled + projection.nearZ - phase) / BERM_PERIOD_M) * BERM_PERIOD_M +
        phase +
        BERM_PERIOD_M * 0.5

      for (let slot = 0; slot < BERM_MOUNDS_PER_SIDE; slot++) {
        const worldZ = first + slot * BERM_PERIOD_M
        const camZ = worldZ - traveled
        const vary = 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(worldZ * 0.11 + phase))
        const visible = camZ > projection.nearZ && camZ < BERM_DISTANCE_M

        for (let ring = 0; ring < BERM_RINGS_PER_MOUND; ring++) {
          const dz = ((ring / (BERM_RINGS_PER_MOUND - 1)) * 2 - 1) * BERM_RADIUS_M
          const z = visible ? camZ + dz : projection.nearZ
          const scale = projection.scale(Math.max(z, projection.nearZ))
          const groundY = projection.y(Math.max(z, projection.nearZ))
          const ringBase =
            ((side * BERM_MOUNDS_PER_SIDE + slot) * BERM_RINGS_PER_MOUND + ring) *
            BERM_ARC_POINTS *
            2

          for (let point = 0; point < BERM_ARC_POINTS; point++) {
            const t = point / (BERM_ARC_POINTS - 1)
            const xFromRoad = BERM_WIDTH_M * t
            const dx = xFromRoad - rx
            const e = (dx / rx) * (dx / rx) + (dz / BERM_RADIUS_M) * (dz / BERM_RADIUS_M)
            const height = visible && e < 1 ? BERM_HEIGHT_M * Math.sqrt(1 - e) * vary : 0
            const pair = ringBase + point * 2
            vertices[pair] =
              projection.centerX + sign * (halfRoad + (height > 0 ? xFromRoad : 0)) * scale
            vertices[pair + 1] = groundY - height * scale
          }
        }
      }
    }

    this.#berm.vertices = vertices
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

function createBermMesh(tint: number): MeshSimple {
  const vertices = new Float32Array(BERM_VERT_COUNT * 2)
  const uvs = new Float32Array(BERM_VERT_COUNT * 2)
  const quads = 2 * BERM_MOUNDS_PER_SIDE * (BERM_RINGS_PER_MOUND - 1) * (BERM_ARC_POINTS - 1)
  const indices = new Uint32Array(quads * 6)

  let offset = 0
  for (let side = 0; side < 2; side++) {
    for (let mound = 0; mound < BERM_MOUNDS_PER_SIDE; mound++) {
      const moundBase =
        (side * BERM_MOUNDS_PER_SIDE + mound) * BERM_RINGS_PER_MOUND * BERM_ARC_POINTS
      for (let ring = 0; ring < BERM_RINGS_PER_MOUND - 1; ring++) {
        const ringBase = moundBase + ring * BERM_ARC_POINTS
        for (let edge = 0; edge < BERM_ARC_POINTS - 1; edge++) {
          const a = ringBase + edge
          const b = a + 1
          const d = a + BERM_ARC_POINTS
          const c = d + 1
          indices.set([a, b, c, a, c, d], offset)
          offset += 6
        }
      }
    }
  }

  const mesh = new MeshSimple({ texture: Texture.WHITE, vertices, indices, uvs })
  mesh.tint = tint
  return mesh
}
