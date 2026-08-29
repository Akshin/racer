<script setup lang="ts">
/**
 * Экран гонки: канвас PixiJS с дорогами и HTML-оверлей с показателями.
 * Отрисовка сцены живёт в src/game, показатели — в компоненте RaceHud.
 */
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import RaceHud from '@/components/RaceHud.vue'
import { createGame } from '@/game'
import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'

/** Шаг часов заезда: чаще секунды не нужно, но и не ждём целую секунду после входа. */
const CLOCK_STEP_MS = 250

const session = useSessionStore()
const settings = useSettingsStore()
const host = useTemplateRef<HTMLDivElement>('host')

const raceKm = computed(() => settings.raceDistanceM / 1000)
const elapsedMs = ref(0)

const lanes = computed<LaneHud[]>(() => {
  const checks = session.playerChecks
  const ranked = [...checks].sort((a, b) => b.telemetry.distance - a.telemetry.distance)
  const share = (meters: number): number => Math.min(meters / settings.raceDistanceM, 1)

  return checks.map((check, index) => ({
    index,
    telemetry: check.telemetry,
    sensor: check.sensor,
    place: ranked.indexOf(check) + 1,
    progress: share(check.telemetry.distance),
    rivalProgress: share(
      Math.max(
        0,
        ...checks.filter((other) => other !== check).map((other) => other.telemetry.distance),
      ),
    ),
    elapsedMs: elapsedMs.value,
  }))
})

let game: Game | null = null
/** Инициализация асинхронная — компонент могли закрыть, не дождавшись её. */
let closed = false
let clock: number | undefined

onMounted(async () => {
  // Вход на экран гонки — это старт заезда: обнуляем накопленную адаптером дистанцию,
  // иначе шкала прогресса считалась бы от всего, что накрутили до этого.
  session.resetRace()

  const startedAt = Date.now()
  clock = window.setInterval(() => (elapsedMs.value = Date.now() - startedAt), CLOCK_STEP_MS)

  if (host.value === null) return

  const started = await createGame(
    host.value,
    () => session.playerChecks.map((check) => check.telemetry),
    () => settings.speedScale,
  )
  if (closed) {
    started.destroy()
    return
  }
  game = started
})

onBeforeUnmount(() => {
  closed = true
  window.clearInterval(clock)
  game?.destroy()
  game = null
})
</script>

<template>
  <div class="stage">
    <div ref="host" class="stage__canvas"></div>

    <div class="stage__overlay">
      <h1 class="stage__title">Velo Duel · заезд {{ raceKm }} км</h1>
      <div class="stage__lanes">
        <RaceHud v-for="lane in lanes" :key="lane.telemetry.id" v-bind="lane" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.stage {
  position: relative;
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
}

.stage__canvas {
  position: absolute;
  inset: 0;
}

.stage__overlay {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr;
  // Оверлей только показывает: клики и жесты уходят на канвас под ним.
  pointer-events: none;
}

.stage__title {
  padding: 0.6rem;
  color: #fff;
  font-size: clamp(1rem, 2.2vh, 1.6rem);
  letter-spacing: 0.08em;
  text-align: center;
  text-transform: uppercase;
  text-shadow: 0 1px 3px rgb(0 0 0 / 80%);
}

.stage__lanes {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  min-height: 0;
}
</style>
