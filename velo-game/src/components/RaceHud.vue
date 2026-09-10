<script setup lang="ts">
/**
 * Показатели одного велосипедиста поверх канваса. HTML/CSS, не PixiJS:
 * оформление править дешевле, чем сцену.
 */
import { computed } from 'vue'
import botLeftUrl from '@/assets/images/bot_left.png'
import botRightUrl from '@/assets/images/bot_right.png'

/** Верх шкалы спидометра, км/ч. */
const SPEED_MAX = 45
/** 0° = 12 часов, по часовой. 270° — девять часов (слева), дуга через верх до 90°. */
const DIAL_START_DEG = 270
const DIAL_SWEEP_DEG = 180
const CX = 110
const CY = 112
const TICK_OUTER = 94
const TICK_MAJOR_INNER = 81
const TICK_MINOR_INNER = 86
const NUM_R = 70
const NEEDLE_R = 78
const FILL_R = 76

const props = defineProps<LaneHud>()

function polar(radius: number, degFrom12: number): { x: number; y: number } {
  const rad = (degFrom12 * Math.PI) / 180
  return { x: CX + radius * Math.sin(rad), y: CY - radius * Math.cos(rad) }
}

function wedgePath(fromDeg: number, toDeg: number, radius: number): string {
  const start = polar(radius, fromDeg)
  const end = polar(radius, toDeg)
  const sweep = toDeg - fromDeg
  if (sweep <= 0.4) return ''
  const large = sweep > 180 ? 1 : 0
  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y} Z`
}

const displayName = computed(() => props.nick || `Игрок ${props.index + 1}`)
const speed = computed(() => Math.min(Math.max(props.telemetry.speed, 0), SPEED_MAX))
const speedLabel = computed(() => props.telemetry.speed.toFixed(1))
const distanceKm = computed(() => (props.telemetry.distance / 1000).toFixed(1))
const mascotUrl = computed(() => (props.index === 0 ? botLeftUrl : botRightUrl))
const glowId = computed(() => `hud-glow-${props.index}`)
const fillId = computed(() => `hud-fill-${props.index}`)
const needleDeg = computed(() => DIAL_START_DEG + (speed.value / SPEED_MAX) * DIAL_SWEEP_DEG)
const speedWedge = computed(() => wedgePath(DIAL_START_DEG, needleDeg.value, FILL_R))

const ticks = Array.from({ length: SPEED_MAX + 1 }, (_, value) => {
  const deg = DIAL_START_DEG + (value / SPEED_MAX) * DIAL_SWEEP_DEG
  const major = value % 5 === 0
  const inner = polar(major ? TICK_MAJOR_INNER : TICK_MINOR_INNER, deg)
  const outer = polar(TICK_OUTER, deg)
  const label = major ? polar(NUM_R, deg) : null
  return { value, major, inner, outer, label }
})
</script>

<template>
  <section
    class="hud"
    :class="[`hud--player-${index + 1}`, { 'hud--offline': !telemetry.connected, 'hud--solo': solo }]"
  >
    <div class="hud__bottom">
      <div class="gauge">
        <img class="gauge__bot" :src="mascotUrl" alt="" />
        <svg
          class="gauge__dial"
          viewBox="0 0 220 128"
          role="img"
          :aria-label="`${speedLabel} км/ч`"
        >
          <defs>
            <radialGradient :id="glowId" cx="50%" cy="100%" r="62%">
              <stop offset="0%" stop-color="var(--player)" stop-opacity="0.5" />
              <stop offset="62%" stop-color="var(--player)" stop-opacity="0.08" />
              <stop offset="100%" stop-color="var(--player)" stop-opacity="0" />
            </radialGradient>
            <linearGradient :id="fillId" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="var(--player)" stop-opacity="0.15" />
              <stop offset="100%" stop-color="var(--player)" stop-opacity="0.55" />
            </linearGradient>
          </defs>
          <ellipse cx="110" cy="120" rx="86" ry="40" :fill="`url(#${glowId})`" />
          <path v-if="speedWedge" class="gauge__fill" :d="speedWedge" :fill="`url(#${fillId})`" />
          <line
            v-for="tick in ticks"
            :key="tick.value"
            :x1="tick.inner.x"
            :y1="tick.inner.y"
            :x2="tick.outer.x"
            :y2="tick.outer.y"
            class="gauge__tick"
            :class="{ 'gauge__tick--major': tick.major }"
          />
          <text
            v-for="tick in ticks"
            v-show="tick.label !== null"
            :key="`n${tick.value}`"
            :x="tick.label?.x"
            :y="tick.label?.y"
            class="gauge__num"
          >
            {{ tick.value }}
          </text>
          <g class="gauge__needle" :transform="`rotate(${needleDeg} ${CX} ${CY})`">
            <line :x1="CX" :y1="CY" :x2="CX" :y2="CY - NEEDLE_R" />
            <circle :cx="CX" :cy="CY" r="4.4" class="gauge__hub" />
          </g>
          <text class="gauge__unit" :x="CX" :y="CY - 16">км/ч</text>
        </svg>
      </div>

      <div class="stats">
        <p class="stats__nick">
          <span class="stats__label">Никнейм:</span>
          <span class="stats__name">{{ displayName }}</span>
        </p>
        <p class="stats__row">
          Скорость: <span class="stats__num">{{ speedLabel }}</span> км/ч
          <span class="stats__sep" aria-hidden="true">|</span>
          Расстояние: <span class="stats__num stats__num--km">{{ distanceKm }}</span> км
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/theme' as t;

.hud {
  --player: #{t.$player-1};

  position: relative;
  height: 100%;
  padding: clamp(0.45rem, 1.2vh, 1rem) clamp(0.7rem, 1.5vw, 1.35rem);
  overflow: visible;
  color: #fff;
  font-family: t.$font-stack;
  font-weight: 700;
  pointer-events: none;

  &::before {
    content: '';
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 18%;
    pointer-events: none;
    background: linear-gradient(
      to top,
      color-mix(in srgb, var(--player) 58%, transparent) 0%,
      color-mix(in srgb, var(--player) 22%, transparent) 38%,
      transparent 100%
    );
  }

  &--player-1 {
    .stats__nick {
      justify-content: end;
    }
    .stats__row {
      text-align: right;
    }
  }

  &--player-2 {
    .stats__nick {
      justify-content: start;
    }
    --player: #{t.$player-2};

    .hud__bottom {
      flex-direction: row-reverse;
    }
  }

  &--offline {
    .gauge,
    .stats {
      opacity: 0.45;
    }
  }

  &--solo {
    .gauge {
      flex: 0 0 min(26rem, 22vw);
      width: min(26rem, 22vw);
    }

    .stats {
      flex: 0 1 auto;
      max-width: min(36rem, 42vw);
    }
  }
}

.hud__bottom {
  position: absolute;
  right: clamp(0.7rem, 1.5vw, 1.35rem);
  bottom: clamp(0.45rem, 1.2vh, 1rem);
  left: clamp(0.7rem, 1.5vw, 1.35rem);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  z-index: 1;
  gap: 0.35rem;
  padding-top: 7.4rem;
}

.gauge {
  position: relative;
  flex: 0 0 43%;
  width: 43%;
  padding: 0.08rem 0.55rem 0.05rem;
  background: rgb(8 10 14 / 80%);
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 25px;
  box-shadow: 0 0 18px rgb(0 0 0 / 35%);
}

.gauge__bot {
  position: absolute;
  z-index: 1;
  bottom: 100%;
  width: 34%;
  height: auto;
  filter: drop-shadow(0 4px 8px rgb(0 0 0 / 45%));
  pointer-events: none;
  transform: translateY(32%);

  .hud--player-1 & {
    left: 0;
    transform: translateY(24%);
  }

  .hud--player-2 & {
    right: 0;
  }
}

.gauge__dial {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.gauge__tick {
  stroke: rgb(255 255 255 / 52%);
  stroke-width: 0.85;
  stroke-linecap: round;

  &--major {
    stroke: #fff;
    stroke-width: 1.55;
  }
}

.gauge__num {
  fill: #fff;
  font-family: t.$font-stack;
  font-size: 8.6px;
  font-weight: 700;
  text-anchor: middle;
  dominant-baseline: middle;
}

.gauge__needle line {
  stroke: #fff;
  stroke-width: 1.65;
  stroke-linecap: round;
  filter: drop-shadow(0 0 3px var(--player));
}

.gauge__hub {
  fill: #ececec;
  stroke: var(--player);
  stroke-width: 1.1;
  filter: drop-shadow(0 0 3px var(--player));
}

.gauge__unit {
  fill: #fff;
  font-family: t.$font-stack;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-anchor: middle;
}

.stats {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  justify-content: flex-end;
  min-width: 0;
  min-height: 4.6rem;
  padding: 1.15rem 1.15rem 0.55rem 0.75rem;
  background: rgb(8 10 14 / 80%);
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 25px;
  box-shadow: 0 0 18px rgb(0 0 0 / 35%);
  clip-path: polygon(
    0% 42%,
    10% 42%,
    18% 38%,
    26% 26%,
    34% 12%,
    42% 3%,
    50% 0%,
    100% 0%,
    100% 100%,
    0% 100%
  );

  .hud--player-2 & {
    padding: 1.15rem 0.75rem 0.55rem 1.15rem;
    clip-path: polygon(
      0% 0%,
      50% 0%,
      58% 3%,
      66% 12%,
      74% 26%,
      82% 38%,
      90% 42%,
      100% 42%,
      100% 100%,
      0% 100%
    );
  }
}

.stats__nick,
.stats__row {
  margin: 0;
}

.stats__nick {
  display: flex;
  gap: 0.4em;
  align-items: baseline;
  padding-bottom: 0.32em;
  margin-bottom: 0.38em;
  border-bottom: 2px solid var(--player);
  font-size: clamp(0.9rem, 1.9vh, 1.15rem);
  display: flex;
}

.stats__label {
  color: #fff;
}

.stats__name {
  color: var(--player);
  font-weight: 700;
}

.stats__row {
  color: #fff;
  font-size: clamp(0.68rem, 1.35vw, 0.92rem);
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  white-space: nowrap;
}

.stats__num {
  display: inline-block;
  min-width: 4ch;
  text-align: right;

  &--km {
    min-width: 3.6ch;
  }
}

.stats__sep {
  margin: 0 0.28em;
  color: rgb(255 255 255 / 55%);
}

@media (min-width: 2560px) and (min-height: 1600px) {
  .hud {
    padding: 1.2rem 2rem;
  }

  .hud--solo {
    .gauge {
      flex: 0 0 28vw;
      width: 28vw;
    }

    .stats {
      flex: 0 0 34vw;
      width: 34vw;
      max-width: none;
    }
  }

  .hud__bottom {
    right: 2rem;
    bottom: 1.4rem;
    left: 2rem;
    gap: 1.4rem;
    padding-top: 12rem;
  }

  .gauge {
    flex-basis: 38%;
    width: 38%;
    padding: 0.4rem 1.1rem 0.25rem;
    border-radius: 36px;
  }

  .stats {
    min-height: 0;
    padding: 2.4rem 2.6rem 1.4rem 2rem;
    border-radius: 36px;
  }

  .hud--player-2 .stats {
    padding: 2.4rem 2rem 1.4rem 2.6rem;
  }

  .stats__nick {
    padding-bottom: 0.45em;
    margin-bottom: 0.5em;
    border-bottom-width: 4px;
    font-size: 1.35vw;
  }

  .stats__row {
    font-size: 1.05vw;
  }
}
</style>
