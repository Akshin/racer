<script setup lang="ts">
/**
 * Финишный оверлей: сначала результаты (соло или двое),
 * через 5 секунд всегда экран «Отличный результат!».
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export type FinishPlayer = {
  index: number
  nick: string | null
  meters: number
  place: number | null
}

type FinishRow = FinishPlayer & {
  name: string
  raceRank: 1 | 2
  distance: string
  speed: string
  board: string
}

/** Результаты на экране, потом всегда финальный попап. */
const SHOW_OVER_MS = 5000

const props = defineProps<{
  players: FinishPlayer[]
}>()

const emit = defineEmits<{
  over: []
}>()

const over = ref(false)
const duo = computed(() => props.players.length > 1)
const title = 'Финиш!'

let toOver: number | undefined

function formatMeters(meters: number): string {
  return `${Math.round(meters).toLocaleString('ru-RU')} м`
}

/** Заезд длится минуту: км/ч = километры × 60. */
function formatSpeed(meters: number): string {
  return `${Math.round((meters / 1000) * 60).toLocaleString('ru-RU')} км/ч`
}

const rows = computed<FinishRow[]>(() => {
  const ranked = [...props.players].sort((a, b) => b.meters - a.meters || a.index - b.index)
  return props.players.map((player) => {
    const raceRank = ranked.findIndex((row) => row.index === player.index) === 0 ? 1 : 2
    return {
      ...player,
      name: player.nick || `Игрок ${player.index + 1}`,
      raceRank,
      distance: formatMeters(player.meters),
      speed: formatSpeed(player.meters),
      board: player.place == null ? '—' : String(player.place),
    }
  })
})

const solo = computed(() => rows.value[0] ?? null)

const confetti = Array.from({ length: 42 }, (_, i) => ({
  id: i,
  left: `${(i * 19 + 7) % 100}%`,
  top: `${(i * 27 + 3) % 92}%`,
  size: 7 + (i % 6),
  color: ['#ff4d8d', '#5ec8ff', '#c9a0ff'][i % 3] ?? '#fff',
  rotate: (i * 41) % 360,
  delay: `${(i % 8) * 0.14}s`,
}))

onMounted(() => {
  toOver = window.setTimeout(() => {
    over.value = true
    emit('over')
  }, SHOW_OVER_MS)
})

onBeforeUnmount(() => {
  window.clearTimeout(toOver)
})
</script>

<template>
  <div class="popup">
    <span
      v-for="piece in confetti"
      v-show="over || duo"
      :key="piece.id"
      class="confetti"
      :style="{
        left: piece.left,
        top: piece.top,
        width: `${piece.size}px`,
        height: `${piece.size}px`,
        background: piece.color,
        transform: `rotate(${piece.rotate}deg)`,
        animationDelay: piece.delay,
      }"
    >
    </span>
    <div class="glow" aria-hidden="true">
      <span class="glow__spot glow__spot--top" />
      <span class="glow__spot glow__spot--mid" />
      <span class="glow__spot glow__spot--bot" />
    </div>

    <div class="frame frame--red">
      <div class="frame frame--blue">
        <img class="logo" src="@/assets/images/vk_logo.png" alt="VK Видео" draggable="false" />
        <h2>{{ title }}</h2>
        <div class="black-panel-wrapper">
          <div v-if="over" class="over-wrapper">
            <img class="mascot" src="@/assets/images/mascot-flag.png" alt="" draggable="false" />
            <div class="hold-wrapper">
              <p class="hold__title">Отличный результат!</p>
              <p class="hold__text">
                Забери свой подарок
                <br />
                от VK Video
              </p>
            </div>
            <div class="end" aria-hidden="true">
              <span class="end__line" />
              <img
                class="end__bike"
                src="@/assets/images/white_biker.png"
                alt=""
                draggable="false"
              />
            </div>
          </div>

          <div v-else-if="!duo && solo" class="solo-wrapper">
            <div class="info">
              <span class="tag tag--1">Игрок №{{ solo.index + 1 }}</span>
              <p class="name">{{ solo.name }}</p>
              <div class="stats">
                <p class="stat">
                  <span>Расстояние:</span>
                  <b>{{ solo.distance }}</b>
                </p>
                <p class="stat">
                  <span>Ср. скорость:</span>
                  <b>{{ solo.speed }}</b>
                </p>
              </div>
            </div>
            <div class="board">
              <p class="board__label">Место в турнирной таблице</p>
              <p class="board__value">
                <strong>{{ solo.board }}</strong>
                <span>место</span>
              </p>
            </div>
          </div>

          <div v-else class="duo-wrapper">
            <article v-for="row in rows" :key="row.index" class="racer">
              <span class="medal" :class="`medal--${row.raceRank}`">
                {{ row.raceRank === 1 ? 'I Место' : 'II Место' }}
              </span>
              <div class="info">
                <span class="tag" :class="`tag--${row.index + 1}`">Игрок №{{ row.index + 1 }}</span>
                <p class="name">{{ row.name }}</p>
                <div class="stats">
                  <p class="stat">
                    <span>Расстояние:</span>
                    <b>{{ row.distance }}</b>
                  </p>
                  <p class="stat">
                    <span>Ср. скорость:</span>
                    <b>{{ row.speed }}</b>
                  </p>
                </div>
              </div>
              <div class="board">
                <p class="board__label">Место в турнирной таблице</p>
                <p class="board__value">
                  <strong>{{ row.board }}</strong>
                  <span>место</span>
                </p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
$red: #ff2b42;
$blue: #0077ff;
$glow: #0040ff;

.popup {
  position: absolute;
  inset: 0;
  display: grid;
  padding: clamp(10px, 2vh, 24px);
  overflow: hidden;
  background: rgb(10 48 150 / 42%);
  backdrop-filter: blur(8px);
}

.confetti {
  position: absolute;
  z-index: 1;
  border-radius: 1px;
  pointer-events: none;
  animation: confetti-fall 4.5s linear infinite;
}

.glow {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.glow__spot {
  position: absolute;
  border-radius: 50%;
  background: $glow;
  opacity: 0.9;

  &--top {
    width: 58%;
    height: 70%;
    left: 6%;
    top: -28%;
    filter: blur(180px);
  }

  &--mid {
    width: 46%;
    height: 52%;
    left: 18%;
    top: 18%;
    opacity: 0.55;
    filter: blur(160px);
  }

  &--bot {
    width: 42%;
    height: 38%;
    left: 8%;
    bottom: -18%;
    filter: blur(90px);
  }
}

.frame {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: visible;
  border-radius: clamp(16px, 2.2vw, 25px);

  &--red {
    padding: clamp(8px, 1.6vh, 36px);
    border: clamp(8px, 0.45vw, 18px) solid $red;
    box-shadow: 0 0 24px rgba($red, 0.35);
  }

  &--blue {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: visible;
    padding: clamp(16px, 3.2vh, 66px) clamp(20px, 3.4vw, 82px);
    border: clamp(6px, 0.35vw, 14px) solid $blue;
    box-shadow: 0 0 18px rgba($blue, 0.28);
    position: relative;
  }
}

.logo {
  display: block;
  flex: 0 0 auto;
  width: 18%;
  margin: 1% auto 2%;
  pointer-events: none;
  user-select: none;
}

h2 {
  flex: 0 0 auto;
  margin-bottom: 3%;
  color: #fff;
  font-size: clamp(2.2rem, 7vw, 19rem);
  font-weight: 500;
  line-height: 1;
  text-align: center;
}

.black-panel-wrapper {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  width: 100%;
  min-height: 0;
  padding: clamp(18px, 2.6vh, 48px) clamp(22px, 3vw, 64px);
  overflow: visible;
  background: rgb(4 8 20 / 58%);
  border-radius: 160px;
}

.solo-wrapper,
.duo-wrapper,
.over-wrapper {
  width: 100%;
}

.solo-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(24px, 4vw, 80px);
}

.duo-wrapper {
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 1.8vh, 28px);
}

.racer {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: clamp(14px, 2vw, 40px);
  align-items: center;
}

.info {
  min-width: 0;
}

.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: clamp(92px, 7.2vw, 220px);
  height: clamp(28px, 3.2vh, 56px);
  margin-bottom: clamp(8px, 1.2vh, 18px);
  padding: 0 clamp(12px, 1vw, 22px);
  color: #fff;
  font-size: clamp(12px, 0.95vw, 28px);
  font-weight: 700;
  border-radius: 999px;

  &--1 {
    background: $blue;
  }

  &--2 {
    background: $red;
  }
}

.name {
  margin: 0 0 clamp(8px, 1vh, 16px);
  color: #fff;
  font-size: clamp(1.6rem, 3.2vw, 5.4rem);
  font-weight: 700;
  line-height: 1.05;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.solo-wrapper .name {
  font-size: clamp(2.2rem, 4.2vw, 6.4rem);
}

.duo-wrapper .name {
  font-size: clamp(1.35rem, 2.4vw, 3.6rem);
}

.stats {
  display: flex;
  align-items: flex-start;
  gap: clamp(18px, 2.2vw, 48px);
}

.stat {
  display: grid;
  gap: 0.15em;
  margin: 0;
  color: #fff;
  font-size: clamp(14px, 1.15vw, 32px);

  span {
    color: rgb(255 255 255 / 72%);
    font-weight: 500;
  }

  b {
    font-weight: 700;
  }
}

.medal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: clamp(92px, 8vw, 220px);
  height: clamp(40px, 5vh, 88px);
  padding: 0 clamp(14px, 1.2vw, 28px);
  font-size: clamp(14px, 1.1vw, 32px);
  font-weight: 700;
  white-space: nowrap;
  border-radius: 999px;

  &--1 {
    color: #3d2a00;
    background: linear-gradient(180deg, #ffe9a3 0%, #e0b33a 52%, #c4921a 100%);
  }

  &--2 {
    color: #2c333d;
    background: linear-gradient(180deg, #f4f6f8 0%, #c5c9d0 52%, #9aa0aa 100%);
  }
}

.board {
  flex: 0 0 auto;
  box-sizing: border-box;
  width: clamp(148px, 16vw, 340px);
  padding: clamp(12px, 1.5vh, 22px) clamp(12px, 1.3vw, 22px) clamp(10px, 1.2vh, 16px);
  text-align: center;
  background: $blue;
  border-radius: clamp(18px, 1.6vw, 32px);
}

.duo-wrapper .board {
  width: clamp(120px, 12vw, 260px);
}

.board__label {
  margin: 0 0 clamp(8px, 1vh, 14px);
  color: #fff;
  font-size: clamp(13px, 1.05vw, 28px);
  font-weight: 500;
  line-height: 1.2;
}

.board__value {
  margin: 0;
  padding: clamp(10px, 1.3vh, 18px) 0.4em clamp(8px, 1vh, 14px);
  color: $blue;
  background: #fff;
  border-radius: clamp(12px, 1.1vw, 20px);

  strong {
    display: block;
    font-size: clamp(1.6rem, 2.6vw, 4.2rem);
    font-weight: 700;
    line-height: 1;
  }

  span {
    font-size: clamp(12px, 0.95vw, 24px);
    font-weight: 500;
  }
}

.over-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  width: 100%;
}

.mascot {
  position: relative;
  left: clamp(-256px, -33vw, 42px);
  bottom: clamp(172px, -4vh, -8px);
  z-index: 2;
  width: auto;
  height: 118%;
  max-width: 46%;
  object-fit: contain;
  object-position: left bottom;
  pointer-events: none;
  user-select: none;
}

.hold-wrapper {
  padding: 0 0 0 5%;
  .hold__title {
    position: relative;
    z-index: 3;
    margin: 0 0 clamp(8px, 1vh, 16px);
    color: #fff;
    font-size: clamp(1.6rem, 3vw, 14.8rem);
    font-weight: 700;
    line-height: 1.15;
  }
  .hold__text {
    position: relative;
    z-index: 3;
    margin: 0 0 clamp(28px, 4vh, 64px);
    color: #fff;
    font-size: clamp(1rem, 1.6vw, 6.6rem);
    font-weight: 400;
    line-height: 1.3;
  }
}

.end {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  width: 60%;
  height: clamp(40px, 4.5vh, 96px);
  margin: 0 auto;
}

.end__line {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: clamp(2px, 0.15vw, 6px);
  background: linear-gradient(90deg, #fff 0%, #fff 62%, rgb(255 255 255 / 28%) 62%);
  transform: translateY(-50%);
}

.end__bike {
  position: absolute;
  top: 50%;
  left: 62%;
  width: auto;
  height: clamp(32px, 3.2vh, 72px);
  mix-blend-mode: screen;
  filter: drop-shadow(clamp(-14px, -0.4vw, -28px) 0 clamp(8px, 0.3vw, 16px) rgb(255 255 255 / 55%));
  transform: translate(-55%, -70%);
  pointer-events: none;
}

@keyframes confetti-fall {
  0% {
    opacity: 0.85;
    translate: 0 -8px;
  }

  100% {
    opacity: 0.9;
    translate: 12px 18px;
  }
}
</style>
