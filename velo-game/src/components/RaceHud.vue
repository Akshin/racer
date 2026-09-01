<script setup lang="ts">
/**
 * Показатели одного велосипедиста поверх канваса. Сделан в HTML/CSS, а не в PixiJS:
 * оформление ещё будет меняться, а вёрстку править дешевле, чем сцену.
 */
import { computed } from 'vue'

/** Верх большой шкалы каденса, как на референсе. */
const CADENCE_MAX = 80
/** С этой отметки дуга шкалы становится красной. */
const REDLINE = 55
/** Малая дуга: 0–10, игла = каденс / 8, чтобы совпадать с большой. */
const SMALL_MAX = 10
/** 0° = 12 часов, дальше по часовой. Старт тахометра — около 7:30. */
const DIAL_START_DEG = 225
const DIAL_SWEEP_DEG = 270
const SMALL_START_DEG = 200
const SMALL_SWEEP_DEG = 130

const props = defineProps<LaneHud>()

const names = ['Игрок 1', 'Игрок 2'] as const

function polar(cx: number, cy: number, radius: number, degFrom12: number): { x: number; y: number } {
  const rad = (degFrom12 * Math.PI) / 180
  return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) }
}

function arcPath(cx: number, cy: number, radius: number, startDeg: number, sweepDeg: number): string {
  const start = polar(cx, cy, radius, startDeg)
  const end = polar(cx, cy, radius, startDeg + sweepDeg)
  const large = sweepDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`
}

function needlePoints(cx: number, cy: number, radius: number, degFrom12: number): string {
  const tip = polar(cx, cy, radius, degFrom12)
  const left = polar(cx, cy, 2.2, degFrom12 - 90)
  const right = polar(cx, cy, 2.2, degFrom12 + 90)
  return `${left.x},${left.y} ${tip.x},${tip.y} ${right.x},${right.y}`
}

const clock = computed(() => {
  const total = Math.floor(props.elapsedMs / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
})

const displayName = computed(() => names[props.index] ?? `Игрок ${props.index + 1}`)

const rows = computed(() => [
  { label: 'Скорость', value: props.telemetry.speed.toFixed(1), unit: 'км/ч' },
  { label: 'Каденс', value: props.telemetry.cadence.toFixed(0), unit: 'вк/мин' },
  { label: 'Расст.', value: (props.telemetry.distance / 1000).toFixed(1), unit: 'км' },
  { label: 'Время', value: clock.value, unit: '' },
  { label: 'Мощность', value: '—', unit: 'Вт' },
])

const cadence = computed(() => Math.min(Math.max(props.telemetry.cadence, 0), CADENCE_MAX))

const mainNeedleDeg = computed(() => DIAL_START_DEG + (cadence.value / CADENCE_MAX) * DIAL_SWEEP_DEG)

const smallNeedleDeg = computed(
  () => SMALL_START_DEG + (Math.min(cadence.value / 8, SMALL_MAX) / SMALL_MAX) * SMALL_SWEEP_DEG,
)

const redlineDeg = DIAL_START_DEG + (REDLINE / CADENCE_MAX) * DIAL_SWEEP_DEG
const mainSafeArc = arcPath(50, 50, 44, DIAL_START_DEG, redlineDeg - DIAL_START_DEG)
const mainRedArc = arcPath(50, 50, 44, redlineDeg, DIAL_START_DEG + DIAL_SWEEP_DEG - redlineDeg)
const smallArc = arcPath(40, 42, 32, SMALL_START_DEG, SMALL_SWEEP_DEG)

const mainTicks = Array.from({ length: 17 }, (_, step) => {
  const value = step * 5
  const deg = DIAL_START_DEG + (value / CADENCE_MAX) * DIAL_SWEEP_DEG
  const major = value % 10 === 0
  const inner = polar(50, 50, major ? 38 : 40, deg)
  const outer = polar(50, 50, 43, deg)
  const label = major ? polar(50, 50, 32, deg) : null
  return { value, major, inner, outer, label }
})

const smallTicks = Array.from({ length: 11 }, (_, value) => {
  const deg = SMALL_START_DEG + (value / SMALL_MAX) * SMALL_SWEEP_DEG
  const major = value === 5
  const inner = polar(40, 42, major ? 26 : 28, deg)
  const outer = polar(40, 42, 31, deg)
  const label = major ? polar(40, 42, 20, deg) : null
  return { value, major, inner, outer, label }
})
</script>

<template>
  <section
    class="hud"
    :class="[`hud--player-${index + 1}`, { 'hud--offline': !telemetry.connected }]"
  >
    <footer class="hud__bottom">
      <dl class="panel">
        <div class="panel__row panel__row--name">
          <dt>Имя:</dt>
          <span class="panel__rule"></span>
          <dd class="panel__name">{{ displayName }}</dd>
        </div>
        <div v-for="row in rows" :key="row.label" class="panel__row">
          <dt>{{ row.label }}:</dt>
          <dd>
            {{ row.value }}<span v-if="row.unit" class="panel__unit">{{ row.unit }}</span>
          </dd>
        </div>
      </dl>

      <div class="dials">
        <svg class="dials__small" viewBox="0 0 80 80" aria-hidden="true">
          <path class="dials__arc" :d="smallArc" />
          <line
            v-for="tick in smallTicks"
            :key="tick.value"
            :x1="tick.inner.x"
            :y1="tick.inner.y"
            :x2="tick.outer.x"
            :y2="tick.outer.y"
            class="dials__tick"
            :class="{ 'dials__tick--major': tick.major }"
          />
          <text
            v-for="tick in smallTicks"
            v-show="tick.label !== null"
            :key="`s${tick.value}`"
            :x="tick.label?.x"
            :y="tick.label?.y"
            class="dials__num dials__num--small"
          >
            {{ tick.value }}
          </text>
          <polygon class="dials__needle" :points="needlePoints(40, 42, 28, smallNeedleDeg)" />
          <circle class="dials__hub" cx="40" cy="42" r="2.4" />
          <text class="dials__caption" x="40" y="72">RPM</text>
        </svg>

        <svg class="dials__main" viewBox="0 0 100 100" aria-hidden="true">
          <path class="dials__arc" :d="mainSafeArc" />
          <path class="dials__arc dials__arc--red" :d="mainRedArc" />
          <line
            v-for="tick in mainTicks"
            :key="tick.value"
            :x1="tick.inner.x"
            :y1="tick.inner.y"
            :x2="tick.outer.x"
            :y2="tick.outer.y"
            class="dials__tick"
            :class="{ 'dials__tick--major': tick.major }"
          />
          <text
            v-for="tick in mainTicks"
            v-show="tick.label !== null"
            :key="`m${tick.value}`"
            :x="tick.label?.x"
            :y="tick.label?.y"
            class="dials__num"
          >
            {{ tick.value }}
          </text>
          <polygon class="dials__needle" :points="needlePoints(50, 50, 36, mainNeedleDeg)" />
          <circle class="dials__hub" cx="50" cy="50" r="3" />
          <text class="dials__caption" x="50" y="78">RPM</text>
        </svg>
      </div>
    </footer>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/theme' as t;

.hud {
  --player: #{t.$player-1};

  display: grid;
  grid-template-rows: 1fr auto;
  height: 100%;
  padding: clamp(0.75rem, 2vh, 2rem);
  color: #fff;
  font-family: 'Roboto Condensed', t.$font-stack;
  font-size: clamp(0.85rem, 2vh, 1.55rem);
  text-shadow: 0 1px 2px rgb(0 0 0 / 60%);

  &--player-2 {
    --player: #{t.$player-2};
  }

  &--offline {
    .panel,
    .dials {
      opacity: 0.45;
    }
  }
}

.hud__bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1em;
}

.panel {
  min-width: 14em;
  padding: 0.15em 0.85em 0.25em;
  background: rgb(12 14 18 / 62%);
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 8px;

  &__row {
    display: flex;
    align-items: baseline;
    gap: 0.45em;
    padding: 0.38em 0;
    border-bottom: 1px solid rgb(255 255 255 / 16%);

    &:last-child {
      border-bottom: none;
    }
  }

  &__row--name {
    border-bottom: 2px solid var(--player);
  }

  &__rule {
    flex: 1;
    height: 1px;
    background: rgb(255 255 255 / 22%);
  }

  dt {
    color: #fff;
    font-weight: 400;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  dd {
    margin-left: auto;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
  }

  &__name {
    color: var(--player);
    font-weight: 600;
  }

  &__unit {
    margin-left: 0.28em;
    font-weight: 400;
    font-size: 0.82em;
  }
}

.dials {
  display: flex;
  align-items: flex-end;
  padding: 0.35em 0.45em 0.2em 0.15em;
  background: rgb(12 14 18 / 62%);
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 10px;
}

.dials__small {
  width: clamp(4.6rem, 11vh, 8rem);
  margin-right: -1.1em;
}

.dials__main {
  width: clamp(7.2rem, 17vh, 12.5rem);
}

.dials__arc {
  fill: none;
  stroke: var(--player);
  stroke-width: 3.2;
  stroke-linecap: butt;
  filter: drop-shadow(0 0 2px var(--player));
}

.dials__arc--red {
  stroke: #{t.$error};
  filter: drop-shadow(0 0 2px #{t.$error});
}

.dials__tick {
  stroke: #8a6a4a;
  stroke-width: 0.7;

  &--major {
    stroke-width: 1.1;
  }
}

.dials__num {
  fill: #fff;
  font-size: 7px;
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: middle;
}

.dials__num--small {
  font-size: 8px;
}

.dials__needle {
  fill: var(--player);
  filter: drop-shadow(0 0 2.5px var(--player));
}

.dials__hub {
  fill: #d8d8d8;
}

.dials__caption {
  fill: #fff;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-anchor: middle;
}
</style>
