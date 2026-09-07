<script setup lang="ts">
/**
 * Турнирная таблица зала в киосковой рамке.
 * Скорость считаем из лучшего заезда за минуту: метры / время.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RACE_DURATION_MS } from '@/game/config'
import { getUsers, sortUsersByMeters, type VeloUser } from '@/net/usersApi'

const POLL_MS = 2000
const PAGE_SIZE = 10
const HOURS = RACE_DURATION_MS / 3_600_000

const users = ref<VeloUser[]>([])
const loadError = ref('')
const page = ref(1)

let inflight = false
let poll: number | undefined

const leaders = computed(() => sortUsersByMeters(users.value))
const pageCount = computed(() => Math.max(1, Math.ceil(leaders.value.length / PAGE_SIZE)))
const pageRows = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return leaders.value.slice(start, start + PAGE_SIZE)
})
const bikeLeft = computed(() => {
  if (pageCount.value <= 1) return '12%'
  return `${((page.value - 1) / (pageCount.value - 1)) * 100}%`
})

async function refresh(): Promise<void> {
  if (inflight) return
  inflight = true
  try {
    users.value = await getUsers()
    loadError.value = ''
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error)
  } finally {
    inflight = false
  }
}

function formatRank(index: number): string {
  return String((page.value - 1) * PAGE_SIZE + index + 1).padStart(4, '0')
}

function formatSpeed(meters: number | null): string {
  if (meters === null) return '—'
  return `${Math.round(meters / 1000 / HOURS)} км/ч`
}

function formatDistance(meters: number | null): string {
  if (meters === null) return '—'
  return `${(meters / 1000).toFixed(2)} км`
}

function goPage(next: number): void {
  page.value = Math.min(pageCount.value, Math.max(1, next))
}

function onSliderClick(event: MouseEvent): void {
  const track = event.currentTarget as HTMLElement
  const x = event.clientX - track.getBoundingClientRect().left
  const ratio = track.clientWidth <= 0 ? 0 : Math.min(1, Math.max(0, x / track.clientWidth))
  goPage(Math.round(ratio * (pageCount.value - 1)) + 1)
}

watch(pageCount, (count) => {
  if (page.value > count) page.value = count
})

onMounted(() => {
  void refresh()
  poll = window.setInterval(() => void refresh(), POLL_MS)
})

onBeforeUnmount(() => {
  window.clearInterval(poll)
})
</script>

<template>
  <main class="page">
    <div class="frame frame--red">
      <div class="frame frame--blue">
        <div class="stage">
          <div class="hero">
            <img class="logo" src="@/assets/images/vk_logo.png" alt="VK Видео" draggable="false" />
            <p class="bubble">Наша турнирная таблица</p>
            <img class="mascot" src="@/assets/images/MASCOT_WHITE.png" alt="" draggable="false" />
          </div>

          <section class="board">
            <p v-if="loadError" class="banner" role="alert">{{ loadError }}</p>

            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th class="rank">Позиция</th>
                    <th>Никнейм</th>
                    <th class="num">Средняя скорость</th>
                    <th class="num">Макс. Расстояние</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(user, index) in pageRows" :key="user.id">
                    <td class="rank">{{ formatRank(index) }}</td>
                    <td class="nick">{{ user.nick }}</td>
                    <td class="num">{{ formatSpeed(user.meters) }}</td>
                    <td class="num">{{ formatDistance(user.meters) }}</td>
                  </tr>
                  <tr v-if="pageRows.length === 0">
                    <td colspan="4" class="empty">Пока никого нет</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="foot">
              <button
                class="slider"
                type="button"
                :disabled="pageCount <= 1"
                @click="onSliderClick"
              >
                <span class="slider__line" />
                <img
                  class="slider__bike"
                  src="@/assets/images/white_biker.png"
                  alt=""
                  draggable="false"
                  :style="{ left: bikeLeft }"
                />
              </button>
              <div class="foot__meta">
                <RouterLink class="start" to="/start">Начать игру</RouterLink>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
$red: #ff2b42;
$blue: #0077ff;
$navy: #07101c;
$grid: rgba(90, 170, 255, 0.45);

.page {
  box-sizing: border-box;
  width: 100%;
  height: 100dvh;
  padding: clamp(10px, 2.2vh, 28px);
  overflow: hidden;
  background: $navy;
  box-shadow: 0 0 182px 0 #0040ff inset;
  -webkit-tap-highlight-color: transparent;
}

.frame {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  border-radius: clamp(14px, 2.2vw, 25px);

  &--red {
    padding: clamp(8px, 1.6vh, 22px);
    border: clamp(4px, 0.8vw, 9px) solid $red;
    box-shadow: 0 0 24px rgba($red, 0.35);
  }

  &--blue {
    overflow: visible;
    padding: clamp(10px, 2vh, 28px) clamp(14px, 2.2vw, 32px) clamp(10px, 1.6vh, 20px);
    border: clamp(3px, 0.6vw, 7px) solid $blue;
    box-shadow: 0 0 18px rgba($blue, 0.28);
  }
}

.stage {
  display: grid;
  grid-template-columns: minmax(0, 0.38fr) minmax(0, 1fr);
  gap: clamp(8px, 1.6vw, 24px);
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.hero {
  position: relative;
  z-index: 1;
  min-width: 0;
  min-height: 0;
}

.logo {
  position: relative;
  z-index: 2;
  width: min(100%, clamp(140px, 16vw, 210px));
  height: auto;
}

.bubble {
  position: relative;
  z-index: 2;
  max-width: min(100%, 16rem);
  margin: clamp(10px, 2vh, 22px) 0 0 0;
  padding: clamp(12px, 1.8vh, 18px) clamp(14px, 1.6vw, 22px);
  color: #fff;
  font-size: clamp(0.95rem, 1.4vw, 1.25rem);
  font-weight: 700;
  line-height: 1.3;
  border-radius: 20px;
  background: linear-gradient(135deg, #003180 0%, #4c9ef8 50%, #9cbefb 100%);

  &::after {
    content: '';
    position: absolute;
    left: 22%;
    bottom: -12px;
    border: 9px solid transparent;
    border-top-color: #6aa9f4;
    border-bottom-width: 0;
  }
}

.mascot {
  position: absolute;
  left: calc(-1 * clamp(18px, 3.2vw, 40px));
  bottom: calc(-1 * clamp(8px, 1.8vh, 22px));
  z-index: 2;
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: 86%;
  object-fit: contain;
  object-position: left bottom;
  pointer-events: none;
  user-select: none;
}

.board {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.6vh, 18px);
  min-width: 0;
  min-height: 0;
  z-index: 3;
}

.banner {
  margin: 0;
  padding: 0.5rem 0.8rem;
  color: #ffd0d5;
  background: rgba($red, 0.18);
  border-radius: 12px;
}

.table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: clamp(0.82rem, 1.15vw, 1.05rem);
}

th,
td {
  padding: clamp(0.45rem, 1.1vh, 0.75rem) clamp(0.5rem, 1.1vw, 0.9rem);
  border: 1px solid $grid;
  text-align: left;
  white-space: nowrap;
}

th {
  color: #fff;
  font-weight: 600;
}

.rank {
  width: 7.5rem;
  font-variant-numeric: tabular-nums;
}

.num {
  font-variant-numeric: tabular-nums;
}

.nick {
  font-weight: 600;
}

.empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.55);
}

.foot {
  display: grid;
  gap: 0.7rem;
}

.slider {
  position: relative;
  width: 100%;
  height: 36px;
  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;

  &:disabled {
    cursor: default;
  }
}

.slider__line {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.92);
  transform: translateY(-50%);
}

.slider__bike {
  position: absolute;
  top: 50%;
  width: auto;
  height: 28px;
  mix-blend-mode: screen;
  transform: translate(-20%, -50%);
  pointer-events: none;
}

.foot__meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.start {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: clamp(10.5rem, 18vw, 14rem);
  height: clamp(44px, 6vh, 54px);
  padding: 0 1.4rem;
  color: #fff;
  font-size: clamp(1rem, 1.4vw, 1.2rem);
  font-weight: 700;
  text-decoration: none;
  background: $red;
  border-radius: 999px;
  box-shadow: 0 0 18px rgba($red, 0.45);

  &:active {
    filter: brightness(0.92);
  }
}

@media (orientation: portrait) {
  .stage {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(160px, 28vh) minmax(0, 1fr);
  }

  .mascot {
    left: -12px;
    max-width: 70%;
    max-height: 92%;
  }
}
</style>
