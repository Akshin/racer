<script setup lang="ts">
/**
 * Результаты заезда: для двоих — «I / II Место», для одного — карточка игрока.
 * Дальше всегда идёт попап «Гонка закончена!».
 */
import { computed } from 'vue'
import { RACE_DURATION_MS } from '@/game/config'

type FinishPlayer = {
  index: number
  nick: string | null
  meters: number
  place: number | null
}

type FinishRow = FinishPlayer & {
  name: string
  raceRank: 1 | 2
  km: string
  kmh: string
  board: string
}

const HOURS = RACE_DURATION_MS / 3_600_000

const props = defineProps<{
  players: FinishPlayer[]
}>()

const duo = computed(() => props.players.length > 1)

const rows = computed<FinishRow[]>(() => {
  const ranked = [...props.players].sort((a, b) => b.meters - a.meters || a.index - b.index)
  return props.players.map((player) => {
    const raceRank = ranked.findIndex((row) => row.index === player.index) === 0 ? 1 : 2
    return {
      ...player,
      name: player.nick || `Игрок ${player.index + 1}`,
      raceRank,
      km: `${(player.meters / 1000).toFixed(2)} км`,
      kmh: `${Math.round(player.meters / 1000 / HOURS)} км/ч`,
      board: player.place == null ? '—' : String(player.place),
    }
  })
})

const confetti = Array.from({ length: 42 }, (_, i) => ({
  id: i,
  left: `${(i * 19 + 7) % 100}%`,
  top: `${(i * 27 + 3) % 92}%`,
  size: 7 + (i % 6),
  color: ['#ff4d8d', '#5ec8ff', '#ffffff'][i % 3] ?? '#fff',
  rotate: (i * 41) % 360,
  delay: `${(i % 8) * 0.14}s`,
}))
</script>

<template>
  <div class="popup">
    <span
      v-for="piece in confetti"
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
    />

    <div class="frame frame--red">
      <div class="frame frame--blue">
        <img class="mascot" src="@/assets/images/mascot-flag.png" alt="" draggable="false" />

        <div class="panel">
          <img class="logo" src="@/assets/images/vk_logo.png" alt="VK Видео" draggable="false" />
          <h2>Финиш!</h2>

          <div class="card" :class="{ 'card--duo': duo }">
            <article v-for="row in rows" :key="row.index" class="racer">
              <span class="tag" :class="`tag--${row.index + 1}`">Игрок №{{ row.index + 1 }}</span>

              <div class="racer__row">
                <span v-if="duo" class="medal" :class="`medal--${row.raceRank}`">
                  {{ row.raceRank === 1 ? 'I Место' : 'II Место' }}
                </span>

                <div class="info">
                  <p class="name">{{ row.name }}</p>
                  <div class="stats">
                    <p class="stat">
                      <span>Расстояние:</span>
                      <b>{{ row.km }}</b>
                    </p>
                    <span class="stats__rule" aria-hidden="true" />
                    <p class="stat">
                      <span>Ср. скорость:</span>
                      <b>{{ row.kmh }}</b>
                    </p>
                  </div>
                </div>

                <div v-if="duo" class="board">
                  <p class="board__label">Место на турнирной таблице</p>
                  <p class="board__value">
                    <strong>{{ row.board }}</strong>
                    <span>место</span>
                  </p>
                </div>
              </div>
            </article>

            <div v-if="!duo && rows[0]" class="bar">
              <span class="bar__label">Место на турнирной таблице</span>
              <p class="bar__pill">
                <strong>{{ rows[0].board }}</strong>
                <span>место</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
$red: #ff2b42;
$blue: #0077ff;

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

.frame {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: visible;
  border-radius: clamp(16px, 2.4vw, 28px);

  &--red {
    padding: clamp(8px, 1.5vh, 20px);
    border: clamp(4px, 0.75vw, 8px) solid $red;
    box-shadow: 0 0 22px rgb(255 43 66 / 35%);
  }

  &--blue {
    position: relative;
    overflow: visible;
    border: clamp(3px, 0.55vw, 7px) solid $blue;
    box-shadow: 0 0 18px rgb(0 119 255 / 35%);
  }
}

.mascot {
  position: absolute;
  left: calc(-1 * clamp(20px, 3.6vw, 48px));
  bottom: 0;
  z-index: 3;
  width: auto;
  height: min(96%, 88vh);
  max-width: 44%;
  object-fit: contain;
  object-position: left bottom;
  pointer-events: none;
  user-select: none;
}

.panel {
  position: relative;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 1.6vh, 18px);
  width: min(58%, 42rem);
  height: 100%;
  margin-left: auto;
  padding: clamp(12px, 2vh, 24px) clamp(16px, 2vw, 28px);
  color: #fff;
  text-align: center;
}

.logo {
  width: min(100%, 210px);
  height: auto;
  pointer-events: none;
  user-select: none;
}

h2 {
  margin: 0;
  font-size: clamp(2.6rem, 6vw, 4.6rem);
  font-weight: 700;
  line-height: 0.95;
}

.card {
  width: 100%;
  overflow: hidden;
  text-align: left;
  background: rgb(6 12 28 / 58%);
  border-radius: 28px;

  &--duo .racer + .racer {
    border-top: 1px solid rgb(255 255 255 / 35%);
  }
}

.racer {
  position: relative;
  padding: 1.15rem 1.1rem 1.05rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 6.4rem;
  height: 1.7rem;
  margin-bottom: 0.75rem;
  padding: 0 0.85rem;
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
  border-radius: 999px;

  &--1 {
    background: $blue;
  }

  &--2 {
    background: $red;
  }
}

.racer__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.85rem;
  align-items: center;
}

.card:not(.card--duo) .racer__row {
  grid-template-columns: minmax(0, 1fr);
}

.medal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 5.6rem;
  height: 2.35rem;
  padding: 0 0.85rem;
  font-size: 0.92rem;
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

.info {
  min-width: 0;
}

.name {
  margin: 0 0 0.45rem;
  font-size: clamp(1.35rem, 2.4vw, 1.85rem);
  font-weight: 700;
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats {
  display: flex;
  align-items: stretch;
  gap: 0.85rem;
}

.stat {
  display: grid;
  gap: 0.1rem;
  margin: 0;
  font-size: 0.92rem;

  span {
    color: rgb(255 255 255 / 78%);
    font-weight: 500;
  }

  b {
    font-weight: 700;
  }
}

.stats__rule {
  width: 1px;
  background: rgb(255 255 255 / 55%);
}

.board {
  flex: 0 0 auto;
  width: 7.4rem;
  padding: 0.55rem 0.5rem 0.5rem;
  text-align: center;
  background: $blue;
  border-radius: 16px;
}

.board__label {
  margin: 0 0 0.4rem;
  font-size: 0.62rem;
  font-weight: 500;
  line-height: 1.2;
}

.board__value {
  margin: 0;
  padding: 0.28rem 0.2rem 0.2rem;
  color: $blue;
  background: #fff;
  border-radius: 10px;

  strong {
    display: block;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1;
  }

  span {
    font-size: 0.68rem;
    font-weight: 500;
  }
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.55rem 0.7rem 0.55rem 1.15rem;
  background: $blue;
}

.bar__label {
  font-size: clamp(0.92rem, 1.4vw, 1.1rem);
  font-weight: 500;
}

.bar__pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 5.4rem;
  margin: 0;
  padding: 0.2rem 0.95rem 0.15rem;
  color: $blue;
  background: #fff;
  border-radius: 999px;

  strong {
    font-size: 1.35rem;
    font-weight: 700;
    line-height: 1;
  }

  span {
    font-size: 0.7rem;
    font-weight: 500;
  }
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

@media (max-width: 900px) {
  .panel {
    width: min(92%, 42rem);
    margin: 0 auto;
    padding-top: 8%;
  }

  .mascot {
    max-width: 58%;
    height: min(52%, 46vh);
  }

  .racer__row {
    grid-template-columns: minmax(0, 1fr);
  }

  .board {
    width: 100%;
  }
}
</style>
