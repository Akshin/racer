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
/** Один такт отсчёта: появление и уход цифры / «поехали». */
const COUNTDOWN_BEAT_MS = 950
const COUNTDOWN_STEPS = ['Готовы?', '3', '2', '1', 'Поехали'] as const

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
const racing = ref(false)
const coasting = ref(false)
const countdownText = ref<string | null>(null)
const showFinish = ref(false)
const finishes = ref<LaneFinish[]>([])
const frozenTelemetry = ref<PlayerTelemetry[] | null>(null)

const remainingMs = computed(() => Math.max(0, RACE_DURATION_MS - elapsedMs.value))

const timerLabel = computed(() =>
  String(Math.floor(remainingMs.value / 1000)).padStart(2, '0'),
)

const lanes = computed<LaneHud[]>(() =>
  session.playerChecks.map((check, index) => {
    const live = frozenTelemetry.value?.[index] ?? check.telemetry
    return {
      index,
      telemetry: racing.value || showFinish.value ? live : { ...live, speed: 0, distance: 0 },
      sensor: check.sensor,
      elapsedMs: elapsedMs.value,
      nick: session.racers[index]?.nick ?? null,
    }
  }),
)

let game: Game | null = null
/** Инициализация асинхронная — компонент могли закрыть, не дождавшись её. */
let closed = false
let clock: number | undefined
let reveal: number | undefined
let leave: number | undefined
let countdownBeat: number | undefined
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

function startClock(): void {
  const startedAt = Date.now()
  clock = window.setInterval(() => {
    elapsedMs.value = Date.now() - startedAt
    if (elapsedMs.value < RACE_DURATION_MS || finished) return
    elapsedMs.value = RACE_DURATION_MS
    finished = true
    racing.value = false
    window.clearInterval(clock)
    // void finish()
  }, CLOCK_STEP_MS)
}

function startRace(): void {
  if (closed || racing.value || finished) return
  session.resetRace()
  game?.beginRace()
  racing.value = true
  startClock()
}

function playCountdown(step = 0): void {
  const label = COUNTDOWN_STEPS[step]
  if (label === undefined) {
    countdownText.value = null
    return
  }
  countdownText.value = label
  if (step === COUNTDOWN_STEPS.length - 1) startRace()
  countdownBeat = window.setTimeout(() => playCountdown(step + 1), COUNTDOWN_BEAT_MS)
}

onMounted(async () => {
  session.resetRace()
  playCountdown()

  if (host.value === null) return

  const started = await createGame(
    host.value,
    () => session.playerChecks.map((check) => check.telemetry),
    () => settings.speedScale,
    () => settings.raceDistanceM,
    () => racing.value,
    () => coasting.value,
  )
  if (closed) {
    started.destroy()
    return
  }
  game = started
  if (racing.value) game.beginRace()
})

onBeforeUnmount(() => {
  closed = true
  window.clearInterval(clock)
  window.clearTimeout(reveal)
  window.clearTimeout(leave)
  window.clearTimeout(countdownBeat)
  game?.destroy()
  game = null
})
</script>

<template>
  <div class="stage">
    <div ref="host" class="stage__canvas"></div>

    <div class="stage__overlay">
      <div class="stage__split"></div>
      <div v-if="racing && !showFinish" class="stage__timer">{{ timerLabel }}</div>
      <div class="stage__lanes" :class="{ 'stage__lanes--dim': showFinish }">
        <RaceHud v-for="lane in lanes" :key="lane.telemetry.id" v-bind="lane" />
      </div>
      <div v-if="countdownText !== null" class="stage__countdown">
        <div
          v-for="lane in lanes"
          :key="lane.index"
          class="stage__countdown-lane"
          :class="`stage__countdown-lane--${lane.index + 1}`"
        >
          <p
            :key="countdownText"
            class="stage__countdown-text"
            :class="{ 'stage__countdown-text--go': countdownText.length > 1 }"
            :style="{ animationDuration: `${COUNTDOWN_BEAT_MS}ms` }"
          >
            {{ countdownText }}
          </p>
        </div>
      </div>
      <div v-if="showFinish" class="stage__finish">
        <FinishCard v-for="card in finishes" :key="card.index" v-bind="card" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/theme' as t;

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
  z-index: 5;
  min-width: 2.35em;
  padding: 0.32em 0.38em 0.4em;
  color: #fff;
  font-family: t.$font-digital;
  font-size: clamp(2.8rem, 7.4vh, 4.8rem);
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0.04em;
  text-align: center;
  background: rgb(8 10 14 / 78%);
  border-radius: 22px;
  box-shadow: 0 4px 18px rgb(0 0 0 / 40%);
  transform: translateX(-50%);

  &::after {
    content: '';
    position: absolute;
    right: 22%;
    bottom: 0.28em;
    left: 22%;
    height: 3px;
    border-radius: 2px;
    pointer-events: none;
    background: linear-gradient(
      90deg,
      t.$player-1 0 50%,
      t.$player-2 50% 100%
    );
  }
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

.stage__countdown {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
}

.stage__countdown-lane {
  --player: #{t.$player-1};

  display: grid;
  place-items: center;
  padding: 0 1rem;

  &--2 {
    --player: #{t.$player-2};
  }
}

.stage__countdown-text {
  margin: 0;
  color: var(--player);
  font-family: t.$font-stack;
  font-size: clamp(5.5rem, 22vh, 12rem);
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-shadow:
    0 2px 0 rgb(0 0 0 / 40%),
    0 18px 50px rgb(0 0 0 / 55%),
    0 0 36px var(--player);
  animation: countdown-beat ease-in-out both;

  &--go {
    font-size: clamp(2.2rem, 8vh, 5.4rem);
    letter-spacing: 0.12em;
  }
}

@keyframes countdown-beat {
  0% {
    opacity: 0;
    transform: scale(0.62);
  }

  16% {
    opacity: 1;
    transform: scale(1);
  }

  72% {
    opacity: 1;
    transform: scale(1);
  }

  100% {
    opacity: 0;
    transform: scale(1.18);
  }
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
