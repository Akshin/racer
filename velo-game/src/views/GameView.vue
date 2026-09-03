<script setup lang="ts">
/**
 * Экран гонки: канвас PixiJS с дорогами и HTML-оверлей с показателями.
 * Отрисовка сцены живёт в src/game, показатели — в компоненте RaceHud.
 */
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import FinishCard from '@/components/FinishCard.vue'
import RaceHud from '@/components/RaceHud.vue'
import { createGame } from '@/game'
import { RACE_DURATION_MS } from '@/game/config'
import { getUsers, placeForMeters, setUserMeters } from '@/net/usersApi'
import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'

/** Шаг часов заезда: чаще секунды не нужно, но и не ждём целую секунду после входа. */
const CLOCK_STEP_MS = 250
/** Надпись выходит, когда дорога уже заметно выкатилась. */
const FINISH_REVEAL_MS = 1200
/** Сколько держим «это было круто» перед возвратом на лидерборд. */
const FINISH_HOLD_MS = 4000

type LaneFinish = {
  index: number
  nick: string | null
  meters: number
  place: number | null
}

const session = useSessionStore()
const settings = useSettingsStore()
const router = useRouter()
const host = useTemplateRef<HTMLDivElement>('host')

const elapsedMs = ref(0)
const coasting = ref(false)
const showFinish = ref(false)
const finishes = ref<LaneFinish[]>([])
const frozenTelemetry = ref<PlayerTelemetry[] | null>(null)

const remainingMs = computed(() => Math.max(0, RACE_DURATION_MS - elapsedMs.value))

const timerLabel = computed(() => {
  const seconds = Math.floor(remainingMs.value / 1000)
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
})

const lanes = computed<LaneHud[]>(() =>
  session.playerChecks.map((check, index) => ({
    index,
    telemetry: frozenTelemetry.value?.[index] ?? check.telemetry,
    sensor: check.sensor,
    elapsedMs: elapsedMs.value,
    nick: session.racers[index]?.nick ?? null,
  })),
)

let game: Game | null = null
/** Инициализация асинхронная — компонент могли закрыть, не дождавшись её. */
let closed = false
let clock: number | undefined
let reveal: number | undefined
let leave: number | undefined
let finished = false

async function finish(): Promise<void> {
  frozenTelemetry.value = session.playerChecks.map((check) => ({ ...check.telemetry }))
  coasting.value = true

  const snapshots: LaneFinish[] = session.playerChecks.map((check, index) => ({
    index,
    nick: session.racers[index]?.nick ?? null,
    meters: check.telemetry.distance,
    place: null,
  }))
  finishes.value = snapshots

  const saves = snapshots.flatMap((snapshot, index) => {
    const racer = session.racers[index]
    if (racer == null) return []
    return [setUserMeters(racer.id, snapshot.meters)]
  })
  await Promise.allSettled(saves)

  try {
    const board = await getUsers()
    finishes.value = snapshots.map((snapshot, index) => ({
      ...snapshot,
      place: placeForMeters(snapshot.meters, board, session.racers[index]?.id),
    }))
  } catch {
    // Надпись всё равно покажем — без места, с километрами.
  }

  if (closed) return
  reveal = window.setTimeout(() => {
    if (closed) return
    showFinish.value = true
    leave = window.setTimeout(() => {
      if (!closed) void router.push({ name: 'leaderboard' })
    }, FINISH_HOLD_MS)
  }, FINISH_REVEAL_MS)
}

onMounted(async () => {
  // Вход на экран гонки — это старт заезда: обнуляем накопленную адаптером дистанцию.
  session.resetRace()

  const startedAt = Date.now()
  clock = window.setInterval(() => {
    elapsedMs.value = Date.now() - startedAt
    if (elapsedMs.value < RACE_DURATION_MS || finished) return
    elapsedMs.value = RACE_DURATION_MS
    finished = true
    window.clearInterval(clock)
    void finish()
  }, CLOCK_STEP_MS)

  if (host.value === null) return

  const started = await createGame(
    host.value,
    () => session.playerChecks.map((check) => check.telemetry),
    () => settings.speedScale,
    () => settings.raceDistanceM,
    () => coasting.value,
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
  window.clearTimeout(reveal)
  window.clearTimeout(leave)
  game?.destroy()
  game = null
})
</script>

<template>
  <div class="stage">
    <div ref="host" class="stage__canvas"></div>

    <div class="stage__overlay">
      <div class="stage__split"></div>
      <div v-if="!showFinish" class="stage__timer">{{ timerLabel }}</div>
      <div class="stage__lanes" :class="{ 'stage__lanes--dim': showFinish }">
        <RaceHud v-for="lane in lanes" :key="lane.telemetry.id" v-bind="lane" />
      </div>
      <div v-if="showFinish" class="stage__finish">
        <FinishCard v-for="card in finishes" :key="card.index" v-bind="card" />
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
  // Оверлей только показывает: клики и жесты уходят на канвас под ним.
  pointer-events: none;
}

.stage__split {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  z-index: 1;
  width: 2px;
  background: #fff;
  box-shadow:
    0 0 4px 1px rgb(122 240 255 / 90%),
    0 0 12px 3px rgb(80 220 255 / 45%);
  transform: translateX(-50%);
}

.stage__timer {
  position: absolute;
  top: 0.55rem;
  left: 50%;
  z-index: 2;
  padding: 0.2em 0.75em 0.15em;
  color: #7af0ff;
  font-family: 'Roboto Condensed', sans-serif;
  font-size: clamp(1.35rem, 3.4vh, 2.5rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.14em;
  background: rgb(8 10 14 / 72%);
  border: 1px solid rgb(80 220 255 / 40%);
  border-radius: 6px;
  box-shadow: 0 0 12px rgb(80 220 255 / 18%);
  text-shadow: 0 0 10px rgb(80 220 255 / 85%);
  transform: translateX(-50%);
}

.stage__lanes {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  height: 100%;
  min-height: 0;
  transition: opacity 0.7s ease;

  &--dim {
    opacity: 0.18;
  }
}

.stage__finish {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  animation: finish-rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes finish-rise {
  from {
    opacity: 0;
    transform: translateY(22px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
