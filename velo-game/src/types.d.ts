/**
 * Единственное место, где описаны типы проекта. Файл не содержит импортов и экспортов,
 * поэтому все объявления попадают в глобальную область: в `.ts` и `.vue` их можно
 * использовать без импорта.
 *
 * Значения времени выполнения (например, PROTOCOL_VERSION) в `.d.ts` жить не могут —
 * они лежат в `src/net/protocol.ts`.
 */

// ────────────────────────────────────────────────────────────────────────────
// Контракт WebSocket-обмена между velo-node и velo-game.
// Единицы измерения: cadence — об/мин, speed — км/ч, distance — метры, t — epoch ms.
// Копия раздела «Контракт с velo-game» из velo-node/src/types.ts —
// источник истины там, описания держим синхронными.
// ────────────────────────────────────────────────────────────────────────────

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

// ────────────────────────────────────────────────────────────────────────────
// Транспорт: WebSocket-клиент (src/net/telemetryClient.ts).
// ────────────────────────────────────────────────────────────────────────────

type ConnectionStatus = 'offline' | 'connecting' | 'online'

type LogLevel = 'info' | 'warn' | 'error'

/** Клиент ничего не решает сам — обо всём сообщает стору через эти обработчики. */
type TelemetryHandlers = {
  onMessage: (message: ServerMessage) => void
  onStatus: (status: ConnectionStatus) => void
  onLog: (level: LogLevel, text: string) => void
}

// ────────────────────────────────────────────────────────────────────────────
// Состояние сессии (src/stores/session.ts).
// ────────────────────────────────────────────────────────────────────────────

type LogEntry = { id: number; at: number; level: LogLevel; text: string }

type SensorInfo = { sensorId: string; name: string }

/** Всё, что нужно знать про одного игрока на странице проверки. */
type PlayerCheck = {
  telemetry: PlayerTelemetry
  sensor: SensorInfo | null
  /** Датчик хоть раз передал обороты после подключения. */
  spinning: boolean
}

// ────────────────────────────────────────────────────────────────────────────
// Игра на PixiJS (src/game).
// ────────────────────────────────────────────────────────────────────────────

/**
 * Управление запущенной игрой. Тип импортирует Application «на месте»:
 * обычный import сделал бы этот файл модулем и лишил бы объявления глобальности.
 */
type Game = {
  app: import('pixi.js').Application
  /** Снимает канвас со страницы и освобождает ресурсы рендерера. */
  destroy: () => void
}
