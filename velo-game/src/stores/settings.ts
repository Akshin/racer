/**
 * Настройки заезда, которые оператор крутит на странице проверки.
 * Живут в localStorage: в зале их подбирают один раз и не теряют после F5.
 */

import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  RACE_DISTANCE_M,
  RACE_DISTANCES_M,
  SPEED_SCALE,
  SPEED_SCALE_MAX,
  SPEED_SCALE_MIN,
  SPEED_SCALE_STEP,
} from '@/game/config'

const ALLOW_ONE_KEY = 'velo:allow-one'
const SPEED_SCALE_KEY = 'velo:speed-scale'
const RACE_DISTANCE_KEY = 'velo:race-distance'

function readFlag(key: string): boolean {
  return window.localStorage.getItem(key) === '1'
}

function readNumber(key: string, fallback: number): number {
  const raw = window.localStorage.getItem(key)
  if (raw === null) return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

/** Шаг слайдера 0.25: без округления range отдаёт 1.2500000002. */
function snapScale(value: number): number {
  const snapped = Math.round(value / SPEED_SCALE_STEP) * SPEED_SCALE_STEP
  return Math.min(SPEED_SCALE_MAX, Math.max(SPEED_SCALE_MIN, snapped))
}

function snapDistance(value: number): number {
  return (RACE_DISTANCES_M as readonly number[]).includes(value) ? value : RACE_DISTANCE_M
}

export const useSettingsStore = defineStore('settings', () => {
  const allowOneTrainer = ref(readFlag(ALLOW_ONE_KEY))
  const speedScale = ref(snapScale(readNumber(SPEED_SCALE_KEY, SPEED_SCALE)))
  const raceDistanceM = ref(snapDistance(readNumber(RACE_DISTANCE_KEY, RACE_DISTANCE_M)))

  watch(allowOneTrainer, (value) => {
    window.localStorage.setItem(ALLOW_ONE_KEY, value ? '1' : '0')
  })
  watch(speedScale, (value) => {
    const snapped = snapScale(value)
    if (snapped !== value) {
      speedScale.value = snapped
      return
    }
    window.localStorage.setItem(SPEED_SCALE_KEY, String(snapped))
  })
  watch(raceDistanceM, (value) => {
    window.localStorage.setItem(RACE_DISTANCE_KEY, String(value))
  })

  return { allowOneTrainer, speedScale, raceDistanceM }
})
