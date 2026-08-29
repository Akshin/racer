/**
 * Все типы адаптера в одном файле: контракт с фронтом, конфигурация,
 * порт источника каденса и доменные структуры.
 */

// ─── Контракт с velo-game ────────────────────────────────────────────────────
// Единицы: cadence — об/мин, speed — км/ч, distance — метры, t — epoch ms.
// Этот раздел продублирован во фронте (velo-game/src/net/protocol.ts).

export const PROTOCOL_VERSION = 1;

export type PlayerId = 'p1' | 'p2';

export const PLAYER_IDS: readonly PlayerId[] = ['p1', 'p2'];

export type PlayerTelemetry = {
  id: PlayerId;
  /** Датчик привязан и на связи. */
  connected: boolean;
  cadence: number;
  speed: number;
  distance: number;
};

/** Какой датчик закреплён за игроком и на связи ли он. */
export type SensorState = {
  player: PlayerId;
  sensorId: string;
  name: string;
  connected: boolean;
};

/** Первое сообщение новому клиенту: параметры сессии, состояние игроков и датчиков. */
export type HelloMessage = {
  type: 'hello';
  protocol: number;
  tickHz: number;
  /** Метры «проезда» за один оборот педалей — модель виртуальной передачи. */
  metersPerCrankRev: number;
  players: PlayerTelemetry[];
  /** Иначе клиент, подключившийся после привязки датчиков, не узнал бы их имён. */
  sensors: SensorState[];
};

/** Периодический снапшот, отправляется tickHz раз в секунду. */
export type TelemetryMessage = {
  type: 'telemetry';
  t: number;
  players: PlayerTelemetry[];
};

/** Изменение статуса датчика: привязался/отвалился. */
export type SensorMessage = { type: 'sensor' } & SensorState;

export type ServerMessage = HelloMessage | TelemetryMessage | SensorMessage;

/** Сброс накопленной дистанции — вызывается фронтом при старте новой гонки. */
export type ClientMessage = { type: 'reset' };

// ─── Конфигурация ───────────────────────────────────────────────────────────

/** Откуда берём каденс: BLE-датчики, ANT+ через USB-свисток или симулятор. */
export type SourceKind = 'ble' | 'ant' | 'mock';

export type Config = {
  host: string;
  port: number;
  /** Частота отправки телеметрии на фронт. */
  tickHz: number;
  source: SourceKind;
  /** Привязка датчика к игроку: BLE id / MAC-адрес / имя / ANT+ Device ID. Пусто = автопривязка. */
  sensors: Record<PlayerId, string>;
  /** Окружность колеса, м (700x25c ≈ 2.096). */
  wheelCircumferenceM: number;
  /** Передаточное число: зубья спереди / зубья сзади. */
  gearRatio: number;
  /** Нет новых оборотов дольше этого времени — считаем, что педали стоят. */
  sensorTimeoutMs: number;
  /** Постоянная времени сглаживания каденса, мс. Больше — плавнее и инертнее. */
  smoothingTauMs: number;
};

// ─── Порт источника каденса ─────────────────────────────────────────────────

export type DeviceInfo = {
  /** Идентификатор датчика: BLE id (на macOS — UUID) или ANT+ Device ID. */
  sensorId: string;
  /** MAC-адрес, если транспорт его знает (у ANT+ и на macOS пусто). */
  address: string;
  name: string;
};

export type SourceEvent =
  | { kind: 'connected'; device: DeviceInfo }
  | { kind: 'disconnected'; sensorId: string }
  /** Новый оборот педалей: каденс уже посчитан источником. */
  | { kind: 'cadence'; sensorId: string; rpm: number; at: number };

export type SourceListener = (event: SourceEvent) => void;

export type CadenceSource = {
  start(listener: SourceListener): Promise<void>;
  stop(): Promise<void>;
};

// ─── Домен ──────────────────────────────────────────────────────────────────

/** Отсчёт датчика: накопительные обороты и время последнего оборота в тиках 1/1024 с. */
export type CrankSample = {
  revs: number;
  eventTime: number;
};

export type RideOptions = {
  /** Метры за один оборот педалей = окружность колеса × передаточное число. */
  metersPerCrankRev: number;
  smoothingTauMs: number;
  sensorTimeoutMs: number;
};

export type RideState = {
  cadence: number;
  speed: number;
  distance: number;
};
