<script setup lang="ts">
/**
 * Финальная плашка половины экрана: километры заезда и место в таблице.
 */
import { computed } from 'vue'

const props = defineProps<{
  index: number
  nick: string | null
  meters: number
  place: number | null
}>()

const km = computed(() =>
  (props.meters / 1000).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
)

const name = computed(() => props.nick || `Игрок ${props.index + 1}`)
</script>

<template>
  <section class="finish" :class="`finish--player-${index + 1}`">
    <p class="finish__who">{{ name }}</p>
    <h2 class="finish__title">Это было круто</h2>
    <p class="finish__line">
      вы проехали <span>{{ km }} км</span>
    </p>
    <p class="finish__line">
      ваше место
      <span class="finish__place">{{ place ?? '…' }}</span>
    </p>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/theme' as t;

.finish {
  --player: #{t.$player-1};

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35em;
  height: 100%;
  padding: 8vh 1.25rem 18vh;
  color: #fff;
  font-family: t.$font-stack;
  text-align: center;
  text-shadow:
    0 2px 0 rgb(0 0 0 / 35%),
    0 12px 40px rgb(0 0 0 / 55%);
  background: radial-gradient(ellipse at 50% 42%, rgb(0 0 0 / 62%) 0%, rgb(0 0 0 / 22%) 55%, transparent 78%);

  &--player-2 {
    --player: #{t.$player-2};
  }
}

.finish__who {
  color: var(--player);
  font-size: clamp(1rem, 2.4vh, 1.6rem);
  font-weight: 700;
  letter-spacing: 0.28em;
  text-transform: uppercase;
}

.finish__title {
  margin: 0.15em 0 0.2em;
  font-size: clamp(2.4rem, 8vh, 5.6rem);
  font-weight: 800;
  line-height: 0.92;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.finish__line {
  font-size: clamp(1.15rem, 3.4vh, 2.15rem);
  font-weight: 600;
  letter-spacing: 0.04em;

  span {
    color: var(--player);
    font-weight: 800;
  }
}

.finish__place {
  margin-left: 0.2em;
  font-size: 1.35em;
  font-variant-numeric: tabular-nums;
}
</style>
