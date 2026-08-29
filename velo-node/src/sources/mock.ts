/**
 * Синтетический источник: несколько виртуальных датчиков с плавно меняющимся
 * каденсом. Нужен, чтобы разрабатывать фронт без велотренажёров.
 */

import type { CadenceSource, SourceListener } from '../types.ts';

const EMIT_INTERVAL_MS = 250;
const BASE_CADENCE_RPM = 65;
const CADENCE_AMPLITUDE_RPM = 25;
/** Период колебания каденса у первого датчика; у остальных длиннее, чтобы гонка не была симметричной. */
const BASE_PERIOD_SEC = 20;
const PERIOD_STEP_SEC = 7;

export class MockCadenceSource implements CadenceSource {
  #count: number;
  #timer: NodeJS.Timeout | null = null;

  constructor(count: number) {
    this.#count = count;
  }

  async start(listener: SourceListener): Promise<void> {
    for (let index = 0; index < this.#count; index++) {
      const sensorId = `mock-${index + 1}`;
      listener({ kind: 'connected', device: { sensorId, address: '', name: `Mock RPM ${index + 1}` } });
    }

    this.#timer = setInterval(() => {
      const now = Date.now();
      for (let index = 0; index < this.#count; index++) {
        const period = BASE_PERIOD_SEC + index * PERIOD_STEP_SEC;
        const phase = (now / 1000) * ((2 * Math.PI) / period);
        const rpm = BASE_CADENCE_RPM + CADENCE_AMPLITUDE_RPM * Math.sin(phase);
        listener({ kind: 'cadence', sensorId: `mock-${index + 1}`, rpm, at: now });
      }
    }, EMIT_INTERVAL_MS);
  }

  async stop(): Promise<void> {
    if (this.#timer !== null) clearInterval(this.#timer);
    this.#timer = null;
  }
}
