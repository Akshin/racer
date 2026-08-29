/**
 * Расчёт каденса из отсчётов датчика и разбор BLE-характеристики CSC Measurement.
 *
 * BLE (профиль Cycling Speed and Cadence) и ANT+ (профиль Bike Cadence) передают
 * одно и то же: накопительные обороты педалей и время последнего оборота в тиках
 * 1/1024 с, оба поля — uint16. Поэтому расчёт общий для обоих транспортов.
 */

import type { CrankSample } from '../types.ts';

/** Разрешение таймера событий: и в BLE CSC, и в ANT+. */
const EVENT_TIME_HZ = 1024;
/** Обороты и таймер передаются в uint16 и переполняются. */
const UINT16_RANGE = 0x1_00_00;

const FLAG_WHEEL_PRESENT = 0x01;
const FLAG_CRANK_PRESENT = 0x02;
/** Wheel-блок: uint32 обороты + uint16 время события. */
const WHEEL_BLOCK_BYTES = 6;
const CRANK_BLOCK_BYTES = 4;

/**
 * Разбирает пакет BLE-характеристики CSC Measurement (0x2A5B).
 * Возвращает null, если данных о педалях в пакете нет или он повреждён.
 * Wahoo RPM отдаёт только crank-блок, но wheel-блок учитывается в смещении —
 * его передают комбинированные датчики скорости и каденса.
 */
export function parseCscMeasurement(payload: Buffer): CrankSample | null {
  if (payload.length < 1) return null;

  const flags = payload.readUInt8(0);
  if ((flags & FLAG_CRANK_PRESENT) === 0) return null;

  const offset = 1 + ((flags & FLAG_WHEEL_PRESENT) !== 0 ? WHEEL_BLOCK_BYTES : 0);
  if (payload.length < offset + CRANK_BLOCK_BYTES) return null;

  return { revs: payload.readUInt16LE(offset), eventTime: payload.readUInt16LE(offset + 2) };
}

/**
 * Переводит поток отсчётов одного датчика в каденс (об/мин).
 * Состояние своё на каждый датчик, потому что считаем по дельте с прошлым отсчётом.
 */
export class CadenceTracker {
  #previous: CrankSample | null = null;

  /** null — новых оборотов не было (первый отсчёт или датчик повторил прошлый). */
  update(sample: CrankSample): number | null {
    const previous = this.#previous;
    this.#previous = sample;
    if (previous === null) return null;

    const deltaTicks = (sample.eventTime - previous.eventTime + UINT16_RANGE) % UINT16_RANGE;
    if (deltaTicks === 0) return null;

    const deltaRevs = (sample.revs - previous.revs + UINT16_RANGE) % UINT16_RANGE;
    return (deltaRevs * 60 * EVENT_TIME_HZ) / deltaTicks;
  }
}
