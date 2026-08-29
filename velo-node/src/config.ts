/** Конфигурация из переменных окружения (см. .env.example). */

import { PLAYER_IDS, type Config, type DeviceInfo, type PlayerId, type SourceKind } from './types.ts';

const SOURCE_KINDS: readonly SourceKind[] = ['ble', 'ant', 'mock'];

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} должен быть числом, получено: ${raw}`);
  return value;
}

function str(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

/** Приводит идентификатор датчика к виду, пригодному для сравнения (без разделителей и регистра). */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s:-]/g, '');
}

/** Совпадает ли датчик с ключом из конфига. Сравниваем по id, адресу и имени. */
export function sensorMatches(device: DeviceInfo, key: string): boolean {
  if (key === '') return false;
  return [device.sensorId, device.address, device.name].filter(Boolean).map(normalize).includes(key);
}

export function loadConfig(): Config {
  const source = str('SOURCE', 'ble') as SourceKind;
  if (!SOURCE_KINDS.includes(source)) {
    throw new Error(`SOURCE должен быть одним из ${SOURCE_KINDS.join(' | ')}, получено: ${source}`);
  }

  const sensors = Object.fromEntries(
    PLAYER_IDS.map((id) => [id, normalize(str(`${id.toUpperCase()}_SENSOR`, ''))]),
  ) as Record<PlayerId, string>;

  return {
    host: str('WS_HOST', '0.0.0.0'),
    port: num('WS_PORT', 8080),
    tickHz: num('TICK_HZ', 20),
    source,
    sensors,
    wheelCircumferenceM: num('WHEEL_CIRCUMFERENCE_M', 2.096),
    gearRatio: num('GEAR_RATIO', 3),
    sensorTimeoutMs: num('SENSOR_TIMEOUT_MS', 2000),
    smoothingTauMs: num('SMOOTHING_TAU_MS', 350),
  };
}
