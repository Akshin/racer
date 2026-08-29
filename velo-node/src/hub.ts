/**
 * Ядро адаптера: привязывает датчики к игрокам, считает состояние заездов
 * и с фиксированной частотой отдаёт снапшоты наружу.
 */

import { sensorMatches } from './config.ts';
import { Ride } from './domain/ride.ts';
import {
  PLAYER_IDS,
  PROTOCOL_VERSION,
  type CadenceSource,
  type Config,
  type DeviceInfo,
  type HelloMessage,
  type PlayerId,
  type PlayerTelemetry,
  type SensorState,
  type ServerMessage,
  type SourceEvent,
} from './types.ts';

type Slot = {
  id: PlayerId;
  ride: Ride;
  sensorId: string | null;
  sensorName: string;
  connected: boolean;
};

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sensorState(slot: Slot): SensorState {
  return {
    player: slot.id,
    sensorId: slot.sensorId ?? '',
    name: slot.sensorName,
    connected: slot.connected,
  };
}

export class Hub {
  #config: Config;
  #source: CadenceSource;
  #publish: (message: ServerMessage) => void = () => {};
  #slots: Slot[];
  #timer: NodeJS.Timeout | null = null;

  constructor(config: Config, source: CadenceSource) {
    this.#config = config;
    this.#source = source;
    this.#slots = PLAYER_IDS.map((id) => ({
      id,
      ride: new Ride({
        metersPerCrankRev: this.metersPerCrankRev,
        smoothingTauMs: config.smoothingTauMs,
        sensorTimeoutMs: config.sensorTimeoutMs,
      }),
      sensorId: null,
      sensorName: '',
      connected: false,
    }));
  }

  /** Метры «проезда» за один оборот педалей — модель виртуальной передачи. */
  get metersPerCrankRev(): number {
    return this.#config.wheelCircumferenceM * this.#config.gearRatio;
  }

  /** Куда отправлять снапшоты и статусы датчиков. */
  onMessage(publish: (message: ServerMessage) => void): void {
    this.#publish = publish;
  }

  async start(): Promise<void> {
    await this.#source.start((event) => this.#handle(event));
    this.#timer = setInterval(() => this.#tick(), 1000 / this.#config.tickHz);
  }

  async stop(): Promise<void> {
    if (this.#timer !== null) clearInterval(this.#timer);
    this.#timer = null;
    await this.#source.stop();
  }

  /** Обнулить обороты и дистанцию — новая гонка. */
  reset(): void {
    for (const slot of this.#slots) slot.ride.reset();
  }

  /** Приветствие нового клиента. */
  hello(): HelloMessage {
    return {
      type: 'hello',
      protocol: PROTOCOL_VERSION,
      tickHz: this.#config.tickHz,
      metersPerCrankRev: this.metersPerCrankRev,
      players: this.#snapshot(),
      sensors: this.#slots.map(sensorState),
    };
  }

  #tick(): void {
    const now = Date.now();
    for (const slot of this.#slots) slot.ride.tick(now);
    this.#publish({ type: 'telemetry', t: now, players: this.#snapshot() });
  }

  #snapshot(): PlayerTelemetry[] {
    return this.#slots.map((slot) => {
      const { cadence, speed, distance } = slot.ride.state;
      return {
        id: slot.id,
        connected: slot.connected,
        cadence: round(cadence, 1),
        speed: round(speed, 2),
        distance: round(distance, 2),
      };
    });
  }

  #handle(event: SourceEvent): void {
    if (event.kind === 'cadence') {
      const slot = this.#find(event.sensorId);
      slot?.ride.push(event.rpm, event.at);
      return;
    }

    if (event.kind === 'disconnected') {
      const slot = this.#find(event.sensorId);
      if (slot === undefined) return;
      slot.connected = false;
      // Дистанцию не сбрасываем: заезд продолжается, скорость сама уйдёт в ноль по таймауту.
      this.#publishSensor(slot);
      return;
    }

    const slot = this.#assign(event.device);
    if (slot === null) {
      console.log(`[hub] нет свободного слота для датчика ${event.device.sensorId}`);
      return;
    }
    slot.sensorId = event.device.sensorId;
    slot.sensorName = event.device.name;
    slot.connected = true;
    this.#publishSensor(slot);
  }

  #find(sensorId: string): Slot | undefined {
    return this.#slots.find((slot) => slot.sensorId === sensorId);
  }

  /**
   * Приоритет привязки: уже занятый этим датчиком слот → явное совпадение с конфигом →
   * первый свободный слот, за которым не закреплён другой датчик.
   */
  #assign(device: DeviceInfo): Slot | null {
    return (
      this.#find(device.sensorId) ??
      this.#slots.find((slot) => sensorMatches(device, this.#config.sensors[slot.id])) ??
      this.#slots.find((slot) => slot.sensorId === null && this.#config.sensors[slot.id] === '') ??
      null
    );
  }

  #publishSensor(slot: Slot): void {
    console.log(`[hub] ${slot.id}: датчик ${slot.sensorId} ${slot.connected ? 'привязан' : 'потерян'}`);
    this.#publish({ type: 'sensor', ...sensorState(slot) });
  }
}
