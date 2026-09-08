<script setup lang="ts">
/**
 * Турнирная таблица зала в киосковой рамке.
 * Скорость считаем из лучшего заезда за минуту: метры / время.
 * Слева — ролики витрины: четыре файла по кругу, старт при входе на страницу.
 */
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import clip1 from '@/assets/video/1.mp4'
import clip2 from '@/assets/video/2.mp4'
import clip3 from '@/assets/video/3.mp4'
import clip4 from '@/assets/video/4.mp4'
import { RACE_DURATION_MS } from '@/game/config'
import { getUsers, sortUsersByMeters, type VeloUser } from '@/net/usersApi'

const POLL_MS = 2000
const HOURS = RACE_DURATION_MS / 3_600_000
const CLIPS = [clip1, clip2, clip3, clip4] as const

const users = ref<VeloUser[]>([])
const loadError = ref('')
const clipIndex = ref(0)
const player = useTemplateRef<HTMLVideoElement>('player')

let inflight = false
let poll: number | undefined
let closed = false

const leaders = computed(() => sortUsersByMeters(users.value))
const clipSrc = computed(() => CLIPS[clipIndex.value] ?? clip1)

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
  return String(index + 1).padStart(4, '0')
}

function formatSpeed(meters: number | null): string {
  if (meters === null) return '—'
  return `${Math.round(meters / 1000 / HOURS)} км/ч`
}

function formatDistance(meters: number | null): string {
  if (meters === null) return '—'
  return `${(meters / 1000).toFixed(2)} км`
}

async function tryPlay(): Promise<void> {
  const el = player.value
  if (el === null || closed) return
  el.muted = true
  await el.play().catch(() => undefined)
}

function onClipEnded(): void {
  if (closed) return
  clipIndex.value = (clipIndex.value + 1) % CLIPS.length
}

onMounted(() => {
  void refresh()
  poll = window.setInterval(() => void refresh(), POLL_MS)
  void tryPlay()
})

onBeforeUnmount(() => {
  closed = true
  window.clearInterval(poll)
  const el = player.value
  if (el === null) return
  el.pause()
  el.removeAttribute('src')
  el.load()
})
</script>

<template>
  <main class="page">
    <div class="glow" aria-hidden="true">
      <span class="glow__spot glow__spot--top" />
      <span class="glow__spot glow__spot--mid" />
      <span class="glow__spot glow__spot--bot" />
    </div>

    <div class="frame frame--red">
      <div class="frame frame--blue">
        <div class="stage">
          <div class="hero">
            <img class="logo" src="@/assets/images/vk_logo.png" alt="VK Видео" draggable="false" />
            <div class="reel">
              <video
                ref="player"
                :src="clipSrc"
                muted
                autoplay
                playsinline
                preload="auto"
                @ended="onClipEnded"
                @loadeddata="tryPlay"
              />
            </div>
          </div>

          <section class="board">
            <p v-if="loadError" class="banner" role="alert">{{ loadError }}</p>

            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th class="rank">Позиция</th>
                    <th class="nick">Никнейм</th>
                    <th class="num">Средняя скорость</th>
                    <th class="num">Макс. Расстояние</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(user, index) in leaders" :key="user.id">
                    <td class="rank">{{ formatRank(index) }}</td>
                    <td class="nick">{{ user.nick }}</td>
                    <td class="num">{{ formatSpeed(user.meters) }}</td>
                    <td class="num">{{ formatDistance(user.meters) }}</td>
                  </tr>
                  <tr v-if="leaders.length === 0">
                    <td colspan="4" class="empty">Пока никого нет</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="foot">
              <div class="rail" aria-hidden="true">
                <span class="rail__line" />
                <img
                  class="rail__bike"
                  src="@/assets/images/white_biker.png"
                  alt=""
                  draggable="false"
                />
              </div>
              <RouterLink class="start" to="/start">Начать игру</RouterLink>
            </div>
          </section>
        </div>
      </div>
    </div>

    <img class="mascot" src="@/assets/images/MASCOT_FULL.png" alt="" draggable="false" />
  </main>
</template>

<style scoped lang="scss">
$red: #ff2b42;
$blue: #0077ff;
$glow: #0040ff;
$line: rgba(255, 255, 255, 0.35);

.page {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100dvh;
  padding: clamp(10px, 2.2vh, 28px);
  overflow: hidden;
  background: #0e1a50;
  -webkit-tap-highlight-color: transparent;
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
  grid-template-columns: minmax(0, 0.58fr) minmax(0, 1fr);
  gap: clamp(12px, 2vw, 32px);
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.hero {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 2vh, 22px);
  min-width: 0;
  min-height: 0;
}

.logo {
  position: relative;
  z-index: 2;
  width: min(100%, clamp(140px, 16vw, 210px));
  height: auto;
  pointer-events: none;
  user-select: none;
}

.reel {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: none;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  background: #d9d9d9;
  border-radius: 12px;

  video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.mascot {
  position: absolute;
  left: -23px;
  bottom: 0;
  z-index: 3;
  width: auto;
  max-width: 34%;
  height: min(58%, 50vh);
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
  z-index: 4;
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
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 20px;
}

th,
td {
  box-sizing: border-box;
  height: 38px;
  padding: 0 0.9rem;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
  border: 0;
  border-bottom: 1px solid #fff;
}

th {
  position: sticky;
  top: 0;
  z-index: 1;
  color: #fff;
  font-weight: 600;
  background: none;
  border-bottom: 2px solid rgba(255, 255, 255, 0.85);
}

th + th,
td + td {
  border-left: 1px solid $line;
}

tbody tr:nth-child(even) td {
  background: #0277ff33;
}

.rank {
  width: 7.5rem;
  font-variant-numeric: tabular-nums;
}

.num {
  font-variant-numeric: tabular-nums;
}

.nick {
  text-align: left;
  font-weight: 600;
}

.empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.55);
}

.foot {
  display: flex;
  align-items: center;
  gap: clamp(12px, 2vw, 24px);
}

.rail {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  height: 36px;
}

.rail__line {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 2px;
  background: linear-gradient(90deg, #fff 0%, #fff 62%, rgb(255 255 255 / 28%) 62%);
  transform: translateY(-50%);
}

.rail__bike {
  position: absolute;
  top: 50%;
  left: 62%;
  width: auto;
  height: 28px;
  mix-blend-mode: screen;
  filter: drop-shadow(-14px 0 8px rgb(255 255 255 / 55%));
  transform: translate(-100px, -30px);
  pointer-events: none;
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
    grid-template-rows: auto minmax(0, 1fr);
  }

  .reel {
    max-width: 100%;
    max-height: 22vh;
  }

  .mascot {
    max-width: 72%;
    height: min(42vh, 360px);
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
  }
}
</style>
