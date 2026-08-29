/**
 * Единственное место, где описаны типы проекта. Объявления лежат в `declare global`,
 * поэтому в `.ts` и `.vue` доступны без импорта.
 *
 * Блок `declare global` (а не просто объявления в `.d.ts`) нужен ради компилятора Vue:
 * в макросах вида `defineProps<...>()` он разбирает глобальные типы сам и видит только
 * содержимое `declare global`. Файл указан ему в vite.config.ts как globalTypeFiles.
 *
 * Значения времени выполнения (например, PROTOCOL_VERSION) в `.d.ts` жить не могут —
 * они лежат в `src/net/protocol.ts`.
 */

import type { Application } from 'pixi.js'

declare global {
  // ──────────────────────────────────────────────────────────────────────────
  // Контракт WebSocket-обмена между velo-node и velo-game.
  // Единицы измерения: cadence — об/мин, speed — км/ч, distance — метры, t — epoch ms.
  // Копия раздела «Контракт с velo-game» из velo-node/src/types.ts —
  // источник истины там, описания держим синхронными.
  // ──────────────────────────────────────────────────────────────────────────

  type PlayerId = 'p1' | 'p2'

  type PlayerTelemetry = {
    id: PlayerId
    /** Датчик привязан и на связи. Если false — значения обнуляются. */
    connected: boolean
    cadence: number
    speed: number
    distance: number
  }

  /** Какой датчик закреплён за игроком и на связи ли он. */
  type SensorState = {
    player: PlayerId
    sensorId: string
    name: string
    connected: boolean
  }

  /** Первое сообщение новому клиенту: параметры сессии, состояние игроков и датчиков. */
  type HelloMessage = {
    type: 'hello'
    protocol: number
    tickHz: number
    /** Метры «проезда» за один оборот педалей — модель виртуальной передачи. */
    metersPerCrankRev: number
    players: PlayerTelemetry[]
    /** Иначе клиент, подключившийся после привязки датчиков, не узнал бы их имён. */
    sensors: SensorState[]
  }

  /** Периодический снапшот, отправляется tickHz раз в секунду. */
  type TelemetryMessage = {
    type: 'telemetry'
    t: number
    players: PlayerTelemetry[]
  }

  /** Изменение статуса датчика: привязался/отвалился. */
  type SensorMessage = { type: 'sensor' } & SensorState

  type ServerMessage = HelloMessage | TelemetryMessage | SensorMessage

  /** Сброс накопленной дистанции — вызывается фронтом при старте новой гонки. */
  type ClientMessage = { type: 'reset' }

  // ──────────────────────────────────────────────────────────────────────────
  // Транспорт: WebSocket-клиент (src/net/telemetryClient.ts).
  // ──────────────────────────────────────────────────────────────────────────

  type ConnectionStatus = 'offline' | 'connecting' | 'online'

  type LogLevel = 'info' | 'warn' | 'error'

  /** Клиент ничего не решает сам — обо всём сообщает стору через эти обработчики. */
  type TelemetryHandlers = {
    onMessage: (message: ServerMessage) => void
    onStatus: (status: ConnectionStatus) => void
    onLog: (level: LogLevel, text: string) => void
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Состояние сессии (src/stores/session.ts).
  // ──────────────────────────────────────────────────────────────────────────

  type LogEntry = { id: number; at: number; level: LogLevel; text: string }

  type SensorInfo = { sensorId: string; name: string }

  /** Всё, что нужно знать про одного игрока на странице проверки. */
  type PlayerCheck = {
    telemetry: PlayerTelemetry
    sensor: SensorInfo | null
    /** Датчик хоть раз передал обороты после подключения. */
    spinning: boolean
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Игра на PixiJS (src/game) и её HTML-оверлей.
  // ──────────────────────────────────────────────────────────────────────────

  /** Управление запущенной игрой. */
  type Game = {
    app: Application
    /** Снимает канвас со страницы и освобождает ресурсы рендерера. */
    destroy: () => void
  }

  /** Откуда игра берёт телеметрию: вызывается каждый кадр, порядок = порядок половин. */
  type GameFeed = () => readonly PlayerTelemetry[]

  /** Настройки заезда со страницы проверки. Живут в localStorage. */
  type RaceSettings = {
    /** true — в гонку пускает один проверенный датчик. Для зала с одним тренажёром. */
    allowOneTrainer: boolean
    /** Множитель визуальной скорости дороги. Не меняет км/ч в HUD. */
    speedScale: number
    /** Длина заезда в метрах. */
    raceDistanceM: number
  }

  /** Данные одной половины для HTML-оверлея поверх канваса. */
  type LaneHud = {
    index: number
    telemetry: PlayerTelemetry
    sensor: SensorInfo | null
    /** 1 — лидер по дистанции. */
    place: number
    /** Доля пройденного заезда, 0..1. */
    progress: number
    /** Та же доля у лучшего из соперников — его метка на той же шкале. */
    rivalProgress: number
    elapsedMs: number
  }

  /**
   * Перспектива одной половины экрана: перевод дорожных метров в пиксели.
   * z — расстояние впереди камеры в метрах, x — смещение от центра дороги в метрах.
   */
  type Projection = {
    width: number
    height: number
    centerX: number
    horizonY: number
    /** Ближе этого расстояния дорога уходит за нижний край кадра. */
    nearZ: number
    /** Экранный y точки дороги на расстоянии z. */
    y: (z: number) => number
    /** Сколько пикселей занимает метр ширины на расстоянии z. */
    scale: (z: number) => number
  }
}
