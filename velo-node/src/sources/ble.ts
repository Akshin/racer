/**
 * BLE-источник: находит датчики с сервисом CSC (Wahoo RPM), подписывается
 * на нотификации и переподключается после разрыва связи.
 */

import type { Peripheral } from '@stoprocent/noble';
import { sensorMatches } from '../config.ts';
import { CadenceTracker, parseCscMeasurement } from '../domain/cadence.ts';
import type { CadenceSource, DeviceInfo, SourceListener } from '../types.ts';

/** Cycling Speed and Cadence service / CSC Measurement characteristic. */
const CSC_SERVICE_UUID = '1816';
const CSC_MEASUREMENT_UUID = '2a5b';

type Noble = typeof import('@stoprocent/noble').default;

export type BleSourceOptions = {
  /** Разрешённые датчики. Пустой список — принимаем любые CSC-устройства. */
  allow: string[];
  /** Сколько датчиков подключаем максимум (число игроков). */
  maxDevices: number;
};

export class BleCadenceSource implements CadenceSource {
  #options: BleSourceOptions;
  #noble: Noble | null = null;
  #listener: SourceListener | null = null;
  #connected = new Set<string>();
  #reported = new Set<string>();
  #stopped = false;

  constructor(options: BleSourceOptions) {
    this.#options = options;
  }

  async start(listener: SourceListener): Promise<void> {
    this.#listener = listener;
    // Динамический импорт: нативный модуль BLE не загружается, если источник не используется.
    const { default: noble } = await import('@stoprocent/noble');
    this.#noble = noble;

    noble.on('discover', (peripheral) => void this.#onDiscover(peripheral));
    await noble.waitForPoweredOnAsync();
    await this.#scan();
  }

  async stop(): Promise<void> {
    this.#stopped = true;
    await this.#noble?.stopScanningAsync();
  }

  /** Сканируем, пока не заняты все слоты игроков. */
  async #scan(): Promise<void> {
    if (this.#noble === null) return;
    if (this.#stopped || this.#connected.size >= this.#options.maxDevices) {
      await this.#noble.stopScanningAsync();
      return;
    }
    await this.#noble.startScanningAsync([CSC_SERVICE_UUID], false);
  }

  async #onDiscover(peripheral: Peripheral): Promise<void> {
    const device: DeviceInfo = {
      sensorId: peripheral.id,
      address: peripheral.address ?? '',
      name: peripheral.advertisement?.localName ?? '',
    };
    if (this.#connected.has(device.sensorId)) return;

    const { allow } = this.#options;
    if (allow.length > 0 && !allow.some((key) => sensorMatches(device, key))) {
      // Печатаем один раз, чтобы можно было скопировать id в .env.
      if (!this.#reported.has(device.sensorId)) {
        this.#reported.add(device.sensorId);
        console.log(`[ble] пропущен датчик: id=${device.sensorId} name="${device.name}" address=${device.address}`);
      }
      return;
    }

    try {
      // На время подключения скан нужно остановить.
      await this.#noble?.stopScanningAsync();
      await this.#attach(peripheral, device);
    } catch (error) {
      console.error(`[ble] не удалось подключить ${device.sensorId}:`, error);
    }
    await this.#scan();
  }

  async #attach(peripheral: Peripheral, device: DeviceInfo): Promise<void> {
    await peripheral.connectAsync();
    const { characteristics } = await peripheral.discoverSomeServicesAndCharacteristicsAsync(
      [CSC_SERVICE_UUID],
      [CSC_MEASUREMENT_UUID],
    );
    const measurement = characteristics[0];
    if (measurement === undefined) {
      await peripheral.disconnectAsync();
      throw new Error('характеристика CSC Measurement не найдена');
    }

    const tracker = new CadenceTracker();
    measurement.on('data', (payload: Buffer) => {
      const sample = parseCscMeasurement(payload);
      const rpm = sample === null ? null : tracker.update(sample);
      if (rpm !== null) {
        this.#listener?.({ kind: 'cadence', sensorId: device.sensorId, rpm, at: Date.now() });
      }
    });
    await measurement.subscribeAsync();

    peripheral.once('disconnect', () => {
      this.#connected.delete(device.sensorId);
      this.#listener?.({ kind: 'disconnected', sensorId: device.sensorId });
      void this.#scan();
    });

    this.#connected.add(device.sensorId);
    this.#listener?.({ kind: 'connected', device });
  }
}
