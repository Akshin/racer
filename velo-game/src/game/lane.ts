/**
 * Полоса дороги одного велосипедиста. В сплите — половина экрана, в соло — вся ширина.
 *
 * Неподвижное (небо, солнце, горы, земля, обочина, асфальт, сплошные линии)
 * рисуется один раз на изменение размера. Двигаются пунктир, деревья, флаги, баннеры
 * и педали велосипедиста: меш и пул спрайтов, потому что у Graphics пересборка
 * геометрии каждый кадр стоит дорого, а у меша обновление вершин — это перезапись
 * небольшого массива.
 */

import {
  AnimatedSprite,
  Color,
  Container,
  FillGradient,
  Graphics,
  MeshSimple,
  PerspectiveMesh,
  Sprite,
  Text,
  Texture,
} from 'pixi.js'
import { raceSheetTextures, raceSprite, whiteTexture } from './assets'
import {
  BANNER_DISTANCE_M,
  BANNER_FADE_M,
  BANNER_GAP_M,
  BANNER_HEIGHT_M,
  BANNER_LEG_M,
  BANNER_OFFSET_M,
  BANNER_PERIOD_M,
  BANNER_PHASE_LEFT,
  BANNER_PHASE_RIGHT,
  BANNER_SLOTS_PER_SIDE,
  BANNER_TUBE_M,
  BANNER_UNTIL_M,
  BANNER_WIDTH_M,
  BERM_HEIGHT_M,
  BERM_WIDTH_M,
  COLOR_ASPHALT,
  COLOR_ASPHALT_SUN,
  COLOR_BERM,
  COLOR_BERM_LIT,
  COLOR_BERM_SHADE,
  COLOR_GROUND,
  COLOR_MARKING,
  COLOR_METAL,
  COLOR_METAL_LIT,
  COLOR_SKY_HORIZON,
  COLOR_SKY_MID,
  COLOR_SKY_TOP,
  COLOR_SUN_GLOW_INNER,
  COLOR_SUN_GLOW_MID,
  CYCLIST_ANIM_AT_KMH,
  CYCLIST_ANIM_SPEED,
  CYCLIST_HEIGHT_M,
  CYCLIST_Z_M,
  DASH_DISTANCE_M,
  DASH_LENGTH_M,
  DASH_PERIOD_M,
  DISTANCE_CATCHUP,
  DISTANCE_CATCHUP_MAX_MS,
  DISTANCE_CATCHUP_MAX_SPEED_GAP,
  FLAG_ANCHOR_X,
  FLAG_CLUSTER_SLOTS,
  FLAG_DISTANCE_M,
  FLAG_FADE_M,
  FLAG_HEIGHT_M,
  FLAG_OFFSET_M,
  FLAG_PERIOD_M,
  FLAG_ROW_GAP_M,
  FLAG_ROWS,
  FLAG_SINK_M,
  LINE_WIDTH_M,
  MAX_DASHES,
  MOUNTAINS_ANCHOR_Y,
  MOUNTAINS_CONTENT_TOP,
  MOUNTAINS_WIDTH_RATIO,
  RACE_DISTANCE_M,
  ROAD_DISTANCE_M,
  ROAD_WIDTH_M,
  SPEED_SCALE,
  SPEED_TAU_ACCEL_MS,
  SPEED_TAU_MS,
  COAST_TAU_MS,
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
  TREE_SINK_M,
  TREE_SLOTS_PER_SIDE,
} from './config'
import { createProjection, roadQuad, slopeQuad, wallCorners, wallQuad } from './projection'

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
  #berm = new Graphics()
  #road = new Graphics()
  #trees = new Container({ sortableChildren: true })
  #treePool: Sprite[] = []
  #treeTextures: Texture[] = []
  #flagPool: Sprite[] = []
  #flagTextures: Texture[] = []
  #bannerPool: BannerProp[] = []
  #bannerTextures: Texture[] = []
  #dashes: MeshSimple
  #mask = new Graphics()
  #offline = new Container()
  #offlineBox = new Graphics()
  #offlineText = new Text({ text: 'нет сигнала', style: { fill: 0xffffff, fontSize: 20 } })
  #cyclist: AnimatedSprite | null = null

  /** Сглаженная скорость, км/ч. */
  #speed = 0
  /** Пройденный путь в метрах — по нему считается фаза пунктира и деревьев. */
  #traveled = 0
  /** Пока true — не догоняем дистанцию адаптера: она могла накопиться на отсчёте. */
  #ignoreAdapterDistance = true
  /** Первый кадр после «поехали»: сразу берём скорость с ноды, не разгоняемся с нуля. */
  #snapSpeedOnStart = false
  /** Множитель визуальной скорости: меняется со страницы проверки без перезапуска. */
  #visualScale = SPEED_SCALE
  /** Длина заезда в метрах адаптера — финишные флаги стоят на visualScale × этом числе. */
  #raceDistanceM = RACE_DISTANCE_M

  /** Собирает слои половины экрана: фон, дорога, деревья, плашку, маску. */
  constructor(racerAlias = 'racer1') {
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

    this.#flagTextures = raceSheetTextures('flags')
    const flagCount = FLAG_CLUSTER_SLOTS * FLAG_ROWS * 2
    const flagFallback = this.#flagTextures[0] ?? Texture.EMPTY
    for (let i = 0; i < flagCount; i++) {
      const sprite = new Sprite({ texture: flagFallback })
      sprite.anchor.set(FLAG_ANCHOR_X, 1)
      sprite.visible = false
      this.#flagPool.push(sprite)
      this.#trees.addChild(sprite)
    }

    this.#bannerTextures = raceSheetTextures('banners')
    const bannerCount = BANNER_SLOTS_PER_SIDE * 2
    const bannerFallback = this.#bannerTextures[0] ?? Texture.EMPTY
    for (let i = 0; i < bannerCount; i++) {
      const poster = new PerspectiveMesh({
        texture: bannerFallback,
        verticesX: 12,
        verticesY: 6,
      })
      const fence = new Graphics()
      const group = new Container()
      group.visible = false
      group.addChild(poster, fence)
      this.#bannerPool.push({ group, poster, fence })
      this.#trees.addChild(group)
    }

    const cyclistFrames = raceSheetTextures(racerAlias)
    if (cyclistFrames.length > 0) {
      this.#cyclist = new AnimatedSprite({
        textures: cyclistFrames,
        autoPlay: false,
        loop: true,
        animationSpeed: 0,
        anchor: { x: 0.5, y: 1 },
      })
    }

    const vertices = new Float32Array(MAX_DASHES * COORDS_PER_QUAD)
    const indices = new Uint32Array(MAX_DASHES * 6)
    for (let dash = 0; dash < MAX_DASHES; dash++) {
      const first = dash * 4
      indices.set([first, first + 1, first + 2, first, first + 2, first + 3], dash * 6)
    }

    // Texture.WHITE + tint: цвет разметки задаём оттенком, текстура не нужна.
    this.#dashes = new MeshSimple({
      texture: whiteTexture(),
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
    this.view.addChild(this.#berm, this.#road, this.#dashes, this.#trees)
    if (this.#cyclist !== null) this.view.addChild(this.#cyclist)
    this.view.addChild(this.#offline, this.#mask)
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
    this.#drawBerms()
    this.#drawRoad()
    this.#layoutOffline()
    this.#drawTrees()
    this.#drawFlags()
    this.#drawBanners()
    this.#drawDashes()
    this.#layoutCyclist()
  }

  /**
   * Один кадр анимации: по телеметрии обновляет «пробег» дороги и двигает пунктир.
   * Вызывается из ticker Pixi (~60 раз/с), не путать с километрами в HUD — те с адаптера.
   */
  update(deltaMs: number, telemetry: PlayerTelemetry, visualScale: number, raceDistanceM: number): void {
    // Скорость с адаптера уже сглажена, но при потере датчика падает в ноль
    // мгновенно — своё сглаживание нужно, чтобы дорога замирала плавно.
    if (this.#snapSpeedOnStart) {
      this.#speed = telemetry.speed
      this.#snapSpeedOnStart = false
    } else {
      const tau = telemetry.speed > this.#speed ? SPEED_TAU_ACCEL_MS : SPEED_TAU_MS
      const catchUp = 1 - Math.exp(-deltaMs / tau)
      this.#speed += (telemetry.speed - this.#speed) * catchUp
    }
    this.#traveled += this.#speed * KMH_TO_MS * (deltaMs / 1000)

    // После «поехали» адаптер ещё кадр-два шлёт старую дистанцию. Если догнать —
    // дорога прыгнет вперёд, как будто гонка шла на отсчёте.
    if (this.#ignoreAdapterDistance) {
      if (telemetry.distance <= this.#traveled + 1.5) this.#ignoreAdapterDistance = false
    } else if (
      telemetry.distance > this.#traveled &&
      Math.abs(telemetry.speed - this.#speed) <= DISTANCE_CATCHUP_MAX_SPEED_GAP
    ) {
      const gap = telemetry.distance - this.#traveled
      const capped = DISTANCE_CATCHUP_MAX_MS * (deltaMs / 1000)
      this.#traveled += Math.min(gap * DISTANCE_CATCHUP, capped)
    }

    this.#offline.visible = !telemetry.connected
    this.#visualScale = visualScale
    this.#raceDistanceM = raceDistanceM
    this.#drawTrees()
    this.#drawFlags()
    this.#drawBanners()
    this.#drawDashes()
    this.#syncCyclistAnim()
  }

  /** Параметры заезда до первого кадра гонки — иначе флаги на отсчёте стоят в другой фазе. */
  setParams(visualScale: number, raceDistanceM: number): void {
    if (this.#visualScale === visualScale && this.#raceDistanceM === raceDistanceM) return
    this.#visualScale = visualScale
    this.#raceDistanceM = raceDistanceM
    this.#drawTrees()
    this.#drawFlags()
    this.#drawBanners()
    this.#drawDashes()
  }

  /** Старт заезда: дорога с нуля, без догона старой дистанции адаптера. */
  beginRace(): void {
    this.#speed = 0
    this.#traveled = 0
    this.#ignoreAdapterDistance = true
    this.#snapSpeedOnStart = true
    this.#drawTrees()
    this.#drawFlags()
    this.#drawBanners()
    this.#drawDashes()
    this.#syncCyclistAnim()
  }

  /**
   * Выкат после финиша: скорость к нулю, телеметрию больше не слушаем.
   * Дорога не откатывается и не догоняет адаптер — гонка уже посчитана.
   */
  coast(deltaMs: number): void {
    const catchUp = 1 - Math.exp(-deltaMs / COAST_TAU_MS)
    this.#speed += (0 - this.#speed) * catchUp
    if (this.#speed < 0.08) this.#speed = 0
    this.#traveled += this.#speed * KMH_TO_MS * (deltaMs / 1000)
    this.#drawTrees()
    this.#drawFlags()
    this.#drawBanners()
    this.#drawDashes()
    this.#syncCyclistAnim()
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

  /** Клин обочины: свет у асфальта, тень на гребне. Полосы по склону, не FillGradient — у него AABB уезжает за экран. */
  #drawBerms(): void {
    const projection = this.#projection
    const halfRoad = ROAD_WIDTH_M / 2
    const bands = [
      { t: 1, color: COLOR_BERM_SHADE },
      { t: 0.62, color: COLOR_BERM },
      { t: 0.28, color: COLOR_BERM_LIT },
    ]

    this.#berm.clear()
    for (const sign of [-1, 1]) {
      for (const { t, color } of bands) {
        this.#berm
          .poly(
            slopeQuad(
              projection,
              sign * halfRoad,
              sign * (halfRoad + BERM_WIDTH_M * t),
              0,
              BERM_HEIGHT_M * t,
              projection.nearZ,
              ROAD_DISTANCE_M,
            ),
          )
          .fill(color)
      }
    }
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
      .fill(
        new FillGradient({
          start: { x: 0.5, y: 0 },
          end: { x: 0.5, y: 1 },
          colorStops: [
            { offset: 0, color: COLOR_ASPHALT_SUN },
            { offset: 1, color: COLOR_ASPHALT },
          ],
        }),
      )

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
      const baseIndex = Math.floor((traveled + projection.nearZ - phase) / TREE_PERIOD_M)

      for (let slot = 0; slot < TREE_SLOTS_PER_SIDE; slot++) {
        const treeIndex = baseIndex + slot
        const slotZ = treeIndex * TREE_PERIOD_M + phase + TREE_PERIOD_M * 0.5
        const worldZ = slotZ + (hash01(treeIndex * 19.1 + side) * 2 - 1) * 1.1
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

        const texture = textures[treeKind(treeIndex, side, textures.length)]
        if (texture !== undefined) sprite.texture = texture
        const px = projection.scale(camZ)
        const heightVary = 0.78 + 0.44 * hash01(treeIndex * 37.3 + side)
        const size = (TREE_HEIGHT_M * heightVary * px) / sprite.texture.height
        const offset =
          TREE_OFFSET_M + TREE_OFFSET_SPREAD_M * (hash01(treeIndex * 71.9 + side * 4.3) * 2 - 1)
        const fade = Math.min(1, Math.max(0, (TREE_DISTANCE_M - camZ) / TREE_FADE_M))
        sprite.alpha = fade * fade * (3 - 2 * fade)
        sprite.scale.set(sign > 0 ? -size : size, size)
        const rise = BERM_HEIGHT_M * Math.min(1, Math.max(0, offset / BERM_WIDTH_M))
        sprite.position.set(
          projection.centerX + sign * (halfRoad + offset) * px,
          projection.y(camZ) - (rise - TREE_SINK_M) * px,
        )
        sprite.zIndex = -camZ
      }
    }

    for (let i = used; i < this.#treePool.length; i++) {
      const extra = this.#treePool[i]
      if (extra !== undefined) extra.visible = false
    }
  }

  /** Четыре ряда флагов каждые 100 м. */
  #drawFlags(): void {
    const textures = this.#flagTextures
    if (textures.length === 0) {
      for (const sprite of this.#flagPool) sprite.visible = false
      return
    }

    const projection = this.#projection
    const traveled = this.#traveled * this.#visualScale
    const period = FLAG_PERIOD_M * this.#visualScale
    const gap = FLAG_ROW_GAP_M * this.#visualScale
    const halfRoad = ROAD_WIDTH_M / 2
    const baseCluster = Math.floor(traveled / period)
    let used = 0

    for (let slot = 0; slot < FLAG_CLUSTER_SLOTS; slot++) {
      const cluster = baseCluster + slot
      if (cluster < 0) continue
      for (let row = 0; row < FLAG_ROWS; row++) {
        const worldZ = cluster * period + row * gap
        const camZ = worldZ - traveled
        const visible = camZ > projection.nearZ && camZ < FLAG_DISTANCE_M
        for (let side = 0; side < 2; side++) {
          const sprite = this.#flagPool[used]
          if (sprite === undefined) return
          used += 1
          sprite.visible = visible
          if (!visible) continue

          const texture = textures[(row * 2 + side) % textures.length]
          if (texture !== undefined) sprite.texture = texture
          const px = projection.scale(camZ)
          const size = (FLAG_HEIGHT_M * px) / sprite.texture.height
          const fade = Math.min(1, Math.max(0, (FLAG_DISTANCE_M - camZ) / FLAG_FADE_M))
          const sign = side === 0 ? -1 : 1
          sprite.alpha = fade * fade * (3 - 2 * fade)
          sprite.scale.set(sign > 0 ? -size : size, size)
          const rise = BERM_HEIGHT_M * Math.min(1, Math.max(0, FLAG_OFFSET_M / BERM_WIDTH_M))
          sprite.position.set(
            projection.centerX + sign * (halfRoad + FLAG_OFFSET_M) * px,
            projection.y(camZ) - (rise - FLAG_SINK_M) * px,
          )
          sprite.zIndex = -camZ
        }
      }
    }

    for (let i = used; i < this.#flagPool.length; i++) {
      const extra = this.#flagPool[i]
      if (extra !== undefined) extra.visible = false
    }
  }

  /** Баннеры вдоль кромки — только первые BANNER_UNTIL_M метров заезда. */
  #drawBanners(): void {
    const textures = this.#bannerTextures
    if (textures.length === 0) {
      for (const banner of this.#bannerPool) banner.group.visible = false
      return
    }

    const projection = this.#projection
    const traveled = this.#traveled * this.#visualScale
    const untilZ = BANNER_UNTIL_M * this.#visualScale
    const xM = ROAD_WIDTH_M / 2 + BANNER_OFFSET_M
    const rise = BERM_HEIGHT_M * Math.min(1, Math.max(0, BANNER_OFFSET_M / BERM_WIDTH_M))
    const panelBot = rise + BANNER_LEG_M
    const posterBot = panelBot + BANNER_TUBE_M + BANNER_GAP_M
    const posterTop = posterBot + BANNER_HEIGHT_M
    const panelTop = posterTop + BANNER_GAP_M + BANNER_TUBE_M
    let used = 0

    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1
      const phase = side === 0 ? BANNER_PHASE_LEFT : BANNER_PHASE_RIGHT
      const wallX = sign * xM
      const baseIndex = Math.floor((traveled - phase) / BANNER_PERIOD_M)

      for (let slot = 0; slot < BANNER_SLOTS_PER_SIDE; slot++) {
        const bannerIndex = baseIndex + slot
        const worldZ = bannerIndex * BANNER_PERIOD_M + phase
        if (worldZ < 0 || worldZ >= untilZ) continue
        const z0 = worldZ - traveled
        const z1 = z0 + BANNER_WIDTH_M
        const nearZ = Math.max(z0, projection.nearZ)
        const farZ = Math.min(z1, BANNER_DISTANCE_M)
        if (farZ - nearZ <= 0.08) continue

        const banner = this.#bannerPool[used]
        if (banner === undefined) return
        used += 1

        const texture = textures[bannerKind(bannerIndex, side, textures.length)]
        if (texture !== undefined) banner.poster.texture = texture
        const fade = Math.min(1, Math.max(0, (BANNER_DISTANCE_M - nearZ) / BANNER_FADE_M))
        banner.group.visible = true
        banner.group.alpha = fade * fade * (3 - 2 * fade)
        setBannerPoster(banner.poster, projection, wallX, posterBot, posterTop, nearZ, farZ, sign)
        paintBannerFence(banner.fence, projection, wallX, rise, panelBot, panelTop, nearZ, farZ)
        banner.group.zIndex = -nearZ + 0.1
      }
    }

    for (let i = used; i < this.#bannerPool.length; i++) {
      const extra = this.#bannerPool[i]
      if (extra !== undefined) extra.group.visible = false
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

  /** Велосипедист стоит на асфальте на фиксированном z — камера как бы едет за ним. */
  #layoutCyclist(): void {
    if (this.#cyclist === null) return
    const projection = this.#projection
    const px = projection.scale(CYCLIST_Z_M)
    const origH = this.#cyclist.texture.orig.height
    const size = (CYCLIST_HEIGHT_M * px) / origH
    this.#cyclist.scale.set(size)
    this.#cyclist.position.set(projection.centerX, projection.y(CYCLIST_Z_M))
  }

  /** Кадры крутятся как дорога: сглаженная скорость × factor со страницы проверки. */
  #syncCyclistAnim(): void {
    const cyclist = this.#cyclist
    if (cyclist === null) return
    const visualKmh = this.#speed * this.#visualScale
    if (visualKmh < 0.15) {
      cyclist.animationSpeed = 0
      if (cyclist.playing) cyclist.stop()
      return
    }
    cyclist.animationSpeed = (visualKmh / CYCLIST_ANIM_AT_KMH) * CYCLIST_ANIM_SPEED
    if (!cyclist.playing) cyclist.play()
  }
}

function hash01(seed: number): number {
  const n = Math.sin(seed * 12.9898) * 43758.5453
  return n - Math.floor(n)
}

function treeKind(index: number, side: number, count: number): number {
  return Math.floor(hash01(index * 13.7 + side * 17.2) * count) % count
}

function bannerKind(index: number, side: number, count: number): number {
  return Math.floor(hash01(index * 23.1 + side * 9.7) * count) % count
}

type BannerProp = {
  group: Container
  poster: PerspectiveMesh
  fence: Graphics
}

function setBannerPoster(
  mesh: PerspectiveMesh,
  projection: Projection,
  xM: number,
  bottomM: number,
  topM: number,
  nearZ: number,
  farZ: number,
  sign: number,
): void {
  const c = wallCorners(projection, xM, bottomM, topM, nearZ, farZ)
  // Слева логотип читается к горизонту; справа — с дороги, без зеркала.
  if (sign < 0) {
    mesh.setCorners(c.nearTop.x, c.nearTop.y, c.farTop.x, c.farTop.y, c.farBot.x, c.farBot.y, c.nearBot.x, c.nearBot.y)
  } else {
    mesh.setCorners(c.farTop.x, c.farTop.y, c.nearTop.x, c.nearTop.y, c.nearBot.x, c.nearBot.y, c.farBot.x, c.farBot.y)
  }
}

function paintBannerFence(
  g: Graphics,
  projection: Projection,
  xM: number,
  rise: number,
  panelBot: number,
  panelTop: number,
  nearZ: number,
  farZ: number,
): void {
  const tube = BANNER_TUBE_M
  const postFar = Math.min(farZ, nearZ + tube)
  const postNearFar = Math.max(nearZ, farZ - tube)
  g.clear()
  g.poly(wallQuad(projection, xM, rise, panelBot, nearZ, postFar)).fill(COLOR_METAL)
  g.poly(wallQuad(projection, xM, rise, panelBot, postNearFar, farZ)).fill(COLOR_METAL)
  g.poly(wallQuad(projection, xM, panelBot, panelTop, nearZ, postFar)).fill(COLOR_METAL)
  g.poly(wallQuad(projection, xM, panelBot, panelTop, postNearFar, farZ)).fill(COLOR_METAL)
  g.poly(wallQuad(projection, xM, panelTop - tube, panelTop, nearZ, farZ)).fill(COLOR_METAL)
  g.poly(wallQuad(projection, xM, panelBot, panelBot + tube, nearZ, farZ)).fill(COLOR_METAL)
  const hi = tube * 0.28
  g.poly(wallQuad(projection, xM, panelTop - tube + hi, panelTop - hi, nearZ, farZ)).fill(COLOR_METAL_LIT)
}
