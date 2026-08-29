<script setup lang="ts">
/**
 * Показатели одного велосипедиста поверх канваса. Сделан в HTML/CSS, а не в PixiJS:
 * оформление ещё будет меняться, а вёрстку править дешевле, чем сцену.
 */
import { computed } from 'vue'

/** Верх шкалы тахометра, об/мин. */
const CADENCE_MAX = 120
/** Угол дуги шкалы: круг с разрывом внизу, как на приборной панели. */
const GAUGE_SWEEP_DEG = 270

const props = defineProps<LaneHud>()

const clock = computed(() => {
  const seconds = Math.floor(props.elapsedMs / 1000)
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
})

const rows = computed(() => [
  { label: 'Датчик', value: props.sensor?.name ?? 'нет', unit: '' },
  { label: 'Скорость', value: props.telemetry.speed.toFixed(1), unit: 'км/ч' },
  { label: 'Каденс', value: props.telemetry.cadence.toFixed(0), unit: 'об/мин' },
  { label: 'Дистанция', value: (props.telemetry.distance / 1000).toFixed(2), unit: 'км' },
  { label: 'Время', value: clock.value, unit: '' },
  // Каденс-датчик не измеряет мощность — нужен либо силомер, либо расчётная модель.
  { label: 'Мощность', value: '—', unit: 'Вт' },
])

const gaugeFill = computed(
  () => Math.min(props.telemetry.cadence / CADENCE_MAX, 1) * GAUGE_SWEEP_DEG,
)
</script>

<template>
  <section
    class="hud"
    :class="[`hud--player-${index + 1}`, { 'hud--offline': !telemetry.connected }]"
  >
    <header class="hud__top">
      <span class="hud__badge">{{ index + 1 }}</span>
      <div class="progress">
        <span class="progress__fill" :style="{ width: `${progress * 100}%` }"></span>
        <span class="progress__mark" :style="{ left: `${rivalProgress * 100}%` }"></span>
        <span
          class="progress__mark progress__mark--me"
          :style="{ left: `${progress * 100}%` }"
        ></span>
      </div>
      <span class="hud__place">{{ place }}-й</span>
    </header>

    <footer class="hud__bottom">
      <dl class="panel">
        <div v-for="row in rows" :key="row.label" class="panel__row">
          <dt>{{ row.label }}</dt>
          <dd>
            {{ row.value }}
            <span v-if="row.unit">{{ row.unit }}</span>
          </dd>
        </div>
      </dl>

      <div class="gauge" :style="{ '--fill': `${gaugeFill}deg` }">
        <div class="gauge__face">
          <strong>{{ telemetry.cadence.toFixed(0) }}</strong>
          <small>об/мин</small>
        </div>
      </div>
    </footer>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/theme' as t;

.hud {
  --player: #{t.$player-1};

  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
  padding: clamp(0.75rem, 2vh, 2rem);
  color: #fff;
  // Размеры внутри HUD заданы в em от этого кегля: на 1080p и на ноутбуке
  // панель занимает одинаковую долю экрана. Кегль привязан к высоте, потому что
  // половина экрана вытянута вверх и её высота — более устойчивая мера.
  font-size: clamp(0.9rem, 2vh, 1.75rem);
  text-shadow: 0 1px 2px rgb(0 0 0 / 60%);

  &--player-2 {
    --player: #{t.$player-2};
  }

  &--offline {
    .panel,
    .gauge {
      opacity: 0.45;
    }
  }
}

.hud__top {
  display: flex;
  align-items: center;
  gap: 0.6em;
}

.hud__badge {
  display: grid;
  place-content: center;
  width: 1.8em;
  height: 1.8em;
  font-weight: 700;
  background: var(--player);
  border-radius: 50%;
}

.hud__place {
  min-width: 2.5em;
  color: var(--player);
  font-weight: 700;
  text-align: right;
}

.progress {
  position: relative;
  flex: 1;
  height: 0.5em;
  background: rgb(0 0 0 / 45%);
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 999px;

  &__fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: var(--player);
    border-radius: inherit;
    transition: width 0.2s linear;
  }

  &__mark {
    position: absolute;
    top: 50%;
    width: 0.9em;
    height: 0.9em;
    background: rgb(255 255 255 / 65%);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: left 0.2s linear;
  }

  &__mark--me {
    background: #fff;
    box-shadow: 0 0 0 2px var(--player);
  }
}

.hud__bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1em;
}

.panel {
  display: grid;
  gap: 0.2em;
  padding: 0.7em 0.9em;
  background: rgb(0 0 0 / 55%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: t.$radius;

  &__row {
    display: grid;
    grid-template-columns: 6.5em auto;
    align-items: baseline;
    gap: 0.5em;
  }

  dt {
    color: rgb(255 255 255 / 60%);
    font-size: 0.8em;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  dd {
    font-weight: 600;
    font-variant-numeric: tabular-nums;

    span {
      margin-left: 0.25em;
      color: rgb(255 255 255 / 60%);
      font-weight: 400;
      font-size: 0.8em;
    }
  }
}

.gauge {
  --fill: 0deg;

  position: relative;
  width: clamp(5rem, 14vh, 11rem);
  aspect-ratio: 1;
  border-radius: 50%;
  // Кольцо шкалы: залитый сектор до текущего каденса, дальше — тёмный остаток.
  background: conic-gradient(
    from 135deg,
    var(--player) 0 var(--fill),
    rgb(255 255 255 / 15%) var(--fill) 270deg,
    transparent 270deg
  );

  &__face {
    position: absolute;
    inset: 14%;
    display: grid;
    place-content: center;
    background: rgb(0 0 0 / 70%);
    border-radius: 50%;
    text-align: center;

    strong {
      display: block;
      font-size: 1.7em;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    small {
      color: rgb(255 255 255 / 60%);
      font-size: 0.7em;
    }
  }
}
</style>
