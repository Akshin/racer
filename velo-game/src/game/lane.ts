/**
 * Половина сплитскрина: дорога одного велосипедиста.
 *
 * Неподвижное (небо, земля, асфальт, сплошные линии) рисуется один раз на
 * изменение размера. Двигается только пунктир, и он сделан мешем: у Graphics
 * пересборка геометрии каждый кадр стоит дорого, а у меша обновление вершин —
 * это перезапись небольшого массива.
 */

import { Container, FillGradient, Graphics, MeshSimple, Text, Texture } from 'pixi.js'
import {
  COLOR_ASPHALT,
  COLOR_GROUND,
  COLOR_MARKING,
  COLOR_SKY_HORIZON,
  COLOR_SKY_TOP,
  DASH_DISTANCE_M,
  DASH_LENGTH_M,
  DASH_PERIOD_M,
  DISTANCE_CATCHUP,
  LINE_WIDTH_M,
  MAX_DASHES,
  ROAD_DISTANCE_M,
  ROAD_WIDTH_M,
  SPEED_TAU_MS,
} from './config'
import { createProjection, roadQuad } from './projection'

const COORDS_PER_QUAD = 8
const KMH_TO_MS = 1 / 3.6

export class Lane {
  readonly view = new Container()

  #projection = createProjection(1, 1)
  #static = new Graphics()
  #dashes: MeshSimple
  #mask = new Graphics()
  #offline = new Container()
  #offlineBox = new Graphics()
  #offlineText = new Text({ text: 'нет сигнала', style: { fill: 0xffffff, fontSize: 20 } })

  /** Сглаженная скорость, км/ч. */
  #speed = 0
  /** Пройденный путь в метрах — по нему считается фаза пунктира. */
  #traveled = 0
  /** Множитель визуальной скорости: меняется со страницы проверки без перезапуска. */
  #visualScale = 1

  /** Собирает слои половины экрана: фон, пунктир, плашку «нет сигнала», маску обрезки. */
  constructor() {
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

    this.view.addChild(this.#static, this.#dashes, this.#offline, this.#mask)
    // У нижнего края дорога шире половины экрана — без маски она залезала бы к соседу.
    this.view.mask = this.#mask
  }

  /** Пересчитывает камеру и всю статичную картинку, когда меняется размер половины экрана. */
  resize(width: number, height: number): void {
    this.#projection = createProjection(width, height)
    this.#mask.clear().rect(0, 0, width, height).fill(0xffffff)
    this.#drawStatic()
    this.#layoutOffline()
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
    this.#drawDashes()
  }

  /** Рисует небо, землю, асфальт и сплошные белые линии по краям — один раз на resize. */
  #drawStatic(): void {
    const projection = this.#projection
    const { width, height, horizonY } = projection
    const halfRoad = ROAD_WIDTH_M / 2
    const edgeCenter = halfRoad - LINE_WIDTH_M / 2
    const halfLine = LINE_WIDTH_M / 2

    const sky = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: COLOR_SKY_TOP },
        { offset: 1, color: COLOR_SKY_HORIZON },
      ],
    })

    this.#static
      .clear()
      .rect(0, 0, width, horizonY)
      .fill(sky)
      .rect(0, horizonY, width, height - horizonY)
      .fill(COLOR_GROUND)
      .poly(roadQuad(projection, -halfRoad, halfRoad, projection.nearZ, ROAD_DISTANCE_M))
      .fill(COLOR_ASPHALT)

    for (const side of [-1, 1]) {
      const center = side * edgeCenter
      this.#static
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
