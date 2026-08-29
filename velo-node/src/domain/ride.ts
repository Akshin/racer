/**
 * Модель заезда одного игрока: превращает дискретные измерения каденса
 * в непрерывные скорость и дистанцию, пригодные для анимации.
 */

import type { RideOptions, RideState } from '../types.ts';

export class Ride {
  #options: RideOptions;
  /** Последнее измерение датчика — цель, к которой тянется сглаженный каденс. */
  #measuredCadence = 0;
  #measuredAt = 0;
  #cadence = 0;
  #distance = 0;
  #tickedAt = 0;

  constructor(options: RideOptions) {
    this.#options = options;
  }

  /** Новое измерение от датчика. */
  push(cadence: number, now: number): void {
    this.#measuredCadence = Math.max(0, cadence);
    this.#measuredAt = now;
  }

  /**
   * Продвигает модель до момента `now`.
   * Каденс тянется к цели экспоненциально, поэтому старт и остановка выглядят плавно.
   */
  tick(now: number): void {
    const elapsedMs = this.#tickedAt === 0 ? 0 : now - this.#tickedAt;
    this.#tickedAt = now;

    const isStale = now - this.#measuredAt > this.#options.sensorTimeoutMs;
    const target = isStale ? 0 : this.#measuredCadence;
    const alpha = elapsedMs > 0 ? 1 - Math.exp(-elapsedMs / this.#options.smoothingTauMs) : 0;
    this.#cadence += (target - this.#cadence) * alpha;

    this.#distance += (this.#speed / 3.6) * (elapsedMs / 1000);
  }

  /** Сброс между гонками: обороты и дистанция с нуля, привязка датчика сохраняется. */
  reset(): void {
    this.#measuredCadence = 0;
    this.#measuredAt = 0;
    this.#cadence = 0;
    this.#distance = 0;
  }

  /** км/ч: об/мин × м/оборот → м/мин → км/ч. */
  get #speed(): number {
    return (this.#cadence * this.#options.metersPerCrankRev * 60) / 1000;
  }

  get state(): RideState {
    return { cadence: this.#cadence, speed: this.#speed, distance: this.#distance };
  }
}
