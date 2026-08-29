/**
 * ANT+ источник: слушает broadcast датчиков каденса через USB-свисток.
 *
 * В отличие от BLE, ANT+ не создаёт соединения — датчик просто вещает в эфир,
 * а один канал сканера принимает сразу все датчики каденса поблизости.
 * Поэтому «потерян» здесь определяется по тишине в эфире.
 */

import type { CadenceSensorState, USBDriverBase } from 'ant-plus-next';
import { sensorMatches } from '../config.ts';
import { CadenceTracker } from '../domain/cadence.ts';
import type { CadenceSource, DeviceInfo, SourceListener } from '../types.ts';

/** Нет новых оборотов дольше этого времени — считаем датчик потерянным. */
const SILENCE_TIMEOUT_MS = 10_000;
const WATCHDOG_INTERVAL_MS = 1_000;

export type AntSourceOptions = {
  /** Разрешённые датчики (ANT+ Device ID). Пустой список — принимаем любые. */
  allow: string[];
  /** Сколько датчиков слушаем максимум (число игроков). */
  maxDevices: number;
};

type TrackedDevice = {
  device: DeviceInfo;
  tracker: CadenceTracker;
  seenAt: number;
};

export class AntCadenceSource implements CadenceSource {
  #options: AntSourceOptions;
  #listener: SourceListener | null = null;
  #stick: USBDriverBase | null = null;
  #devices = new Map<string, TrackedDevice>();
  #reported = new Set<string>();
  #watchdog: NodeJS.Timeout | null = null;

  constructor(options: AntSourceOptions) {
    this.#options = options;
  }

  async start(listener: SourceListener): Promise<void> {
    this.#listener = listener;
    // Динамический импорт: нативный USB-модуль не загружается, если источник не используется.
    const { CadenceScanner, GarminStick2, GarminStick3 } = await import('ant-plus-next');

    // Современные свистки (ANT USB-m) — Stick3, старые Garmin USB2 — Stick2.
    for (const [label, create] of [
      ['ANT USB-m', () => new GarminStick3()],
      ['Garmin USB2', () => new GarminStick2()],
    ] as const) {
      const stick = create();
      const scanner = new CadenceScanner(stick);
      scanner.on('cadenceData', (state: CadenceSensorState) => this.#onData(state));
      // Сканер можно запускать только после события startup.
      stick.on('startup', () => void scanner.scan());

      if (await stick.open()) {
        console.log(`[ant] свисток найден: ${label}`);
        this.#stick = stick;
        break;
      }
    }

    if (this.#stick === null) {
      throw new Error('ANT+ свисток не найден: вставьте USB-приёмник или используйте SOURCE=ble');
    }

    this.#watchdog = setInterval(() => this.#dropSilent(), WATCHDOG_INTERVAL_MS);
  }

  async stop(): Promise<void> {
    if (this.#watchdog !== null) clearInterval(this.#watchdog);
    this.#watchdog = null;
    await this.#stick?.close();
  }

  #onData(state: CadenceSensorState): void {
    const { CadenceEventTime: eventTime, CumulativeCadenceRevolutionCount: revs } = state;
    if (eventTime === undefined || revs === undefined) return;

    const sensorId = String(state.DeviceId);
    const tracked = this.#devices.get(sensorId) ?? this.#track(sensorId);
    if (tracked === null) return;

    tracked.seenAt = Date.now();
    // Собственный расчёт вместо state.CalculatedCadence: он одинаков для BLE и ANT+
    // и корректно отбрасывает первый отсчёт, для которого дельты ещё нет.
    const rpm = tracked.tracker.update({ revs, eventTime });
    if (rpm !== null) {
      this.#listener?.({ kind: 'cadence', sensorId, rpm, at: tracked.seenAt });
    }
  }

  /** Регистрирует новый датчик или возвращает null, если он не нужен. */
  #track(sensorId: string): TrackedDevice | null {
    const device: DeviceInfo = { sensorId, address: '', name: `ANT+ ${sensorId}` };
    const { allow, maxDevices } = this.#options;

    if ((allow.length > 0 && !allow.some((key) => sensorMatches(device, key))) || this.#devices.size >= maxDevices) {
      // Печатаем один раз, чтобы можно было скопировать Device ID в .env.
      if (!this.#reported.has(sensorId)) {
        this.#reported.add(sensorId);
        console.log(`[ant] пропущен датчик: Device ID ${sensorId}`);
      }
      return null;
    }

    const tracked: TrackedDevice = { device, tracker: new CadenceTracker(), seenAt: Date.now() };
    this.#devices.set(sensorId, tracked);
    this.#listener?.({ kind: 'connected', device });
    return tracked;
  }

  /** Датчик, замолчавший надолго, освобождает слот и подхватится заново по первому же обороту. */
  #dropSilent(): void {
    const now = Date.now();
    for (const [sensorId, tracked] of this.#devices) {
      if (now - tracked.seenAt < SILENCE_TIMEOUT_MS) continue;
      this.#devices.delete(sensorId);
      this.#listener?.({ kind: 'disconnected', sensorId });
    }
  }
}
