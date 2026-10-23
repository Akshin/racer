<script setup lang="ts">
/**
 * Турнирная таблица зала в киосковой рамке.
 * Слева — ролики витрины и маскот; справа — таблица и кнопка старта.
 */
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import promoPlaceholder from '@/assets/video/promo-placeholder.mp4'
import { getUsers, sortUsersByMeters, type VeloUser } from '@/net/usersApi'

const POLL_MS = 2000
/** Ролики витрины крутятся по кругу. В репозитории — заглушка вместо промо партнёра. */
const CLIPS = [promoPlaceholder] as const

const users = ref<VeloUser[]>([])
const loadError = ref('')
const clipIndex = ref(0)
const player = useTemplateRef<HTMLVideoElement>('player')

let inflight = false
let poll: number | undefined
let closed = false

const leaders = computed(() => sortUsersByMeters(users.value))
const clipSrc = computed(() => CLIPS[clipIndex.value] ?? promoPlaceholder)

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

function formatDistance(meters: number | null): string {
  if (meters === null) return '—'
  return `${Math.round(meters)} м`
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
        <section class="section-1">
          <img class="mascot" src="@/assets/images/mascot.png" alt="" draggable="false" />

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

          <p class="bubble">
            <span>Смотри спорт</span>
            <span>вместе с партнёром</span>
          </p>
        </section>

        <section class="section-2">
          <img
            class="logo"
            src="@/assets/images/partner_logo.png"
            alt="Логотип партнёра"
            draggable="false"
          />
          <h1 class="title">Турнирная таблица</h1>

          <p v-if="loadError" class="banner" role="alert">{{ loadError }}</p>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th class="rank">Позиция</th>
                  <th class="nick">Никнейм</th>
                  <th class="num">Макс. Расстояние</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(user, index) in leaders" :key="user.id">
                  <td class="rank">{{ formatRank(index) }}</td>
                  <td class="nick">{{ user.nick }}</td>
                  <td class="num">{{ formatDistance(user.meters) }}</td>
                </tr>
                <tr v-if="leaders.length === 0">
                  <td colspan="3" class="empty">Пока никого нет</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="foot">
            <!-- <div class="rail" aria-hidden="true">
              <span class="rail__line" />
              <img
                class="rail__bike"
                src="@/assets/images/white_biker.png"
                alt=""
                draggable="false"
              />
            </div> -->
            <RouterLink class="start" to="/start">Начать игру</RouterLink>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
$red: #ff2b42;
$blue: #0077ff;
$glow: #0040ff;

.page {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100dvh;
  padding: clamp(12px, 2.4vh, 32px);
  overflow: hidden;
  background: #000;
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
  border-radius: clamp(16px, 2.2vw, 25px);

  &--red {
    padding: clamp(8px, 1.6vh, 36px);
    border: clamp(8px, 0.45vw, 18px) solid $red;
    box-shadow: 0 0 24px rgba($red, 0.35);
  }

  &--blue {
    overflow: visible;
    border: clamp(6px, 0.35vw, 14px) solid $blue;
    box-shadow: 0 0 18px rgba($blue, 0.28);
    display: flex;
    position: relative;
  }
}

.section-1 {
  width: 48%;
  position: relative;
  min-width: 0;
  min-height: 0;
}

.mascot {
  position: absolute;
  left: -8%;
  bottom: -10%;
  z-index: 3;
  width: 60%;
  height: 100%;
  object-fit: contain;
  object-position: left bottom;
  pointer-events: none;
  user-select: none;
}

.reel {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  width: 90%;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  background: #111;
  border: 12px solid #ff2b42;
  border-radius: 12px;
  margin: 72px auto;

  video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.bubble {
  position: absolute;
  left: 45%;
  bottom: 9%;
  z-index: 4;
  box-sizing: border-box;
  width: clamp(220px, 18vw, 520px);
  margin: 0;
  padding: clamp(26px, 2.2vw, 56px) clamp(28px, 2.4vw, 60px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #fff;
  font-size: clamp(22px, 1.35vw, 48px);
  font-weight: 500;
  line-height: 1.4;
  text-align: center;
  background: #000;
  border-radius: clamp(18px, 1.2vw, 36px);
  pointer-events: none;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: clamp(18px, 1.1vw, 36px);
    height: clamp(22px, 1.4vw, 44px);
    background: #000;
    clip-path: polygon(100% 0, 0 50%, 100% 100%);
    transform: translate(-92%, -50%);
  }

  span {
    display: block;
    white-space: nowrap;
  }
}

.section-2 {
  display: flex;
  flex-direction: column;
  width: 52%;
  height: 100%;
  align-items: stretch;
  padding: 40px 40px 28px 12px;
  min-width: 0;
  min-height: 0;
  z-index: 4;
}

.logo {
  display: block;
  width: 33%;
  margin: 3% auto 3%;
  pointer-events: none;
  user-select: none;
}

.title {
  margin: 0 0 18px;
  color: #fff;
  font-size: clamp(1rem, 4vw, 9rem);
  font-weight: 500;
  line-height: 1.1;
  text-align: center;
  margin-bottom: 4%;
}

.banner {
  width: 100%;
  margin: 0 0 12px;
  padding: 0.5rem 0.8rem;
  color: #ffd0d5;
  background: rgba($red, 0.18);
  border-radius: 12px;
}

.table-wrap {
  width: 100%;
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
  color: #fff;
  font-size: clamp(28px, 1.4vw, 54px);
  line-height: 1.15;
}

th,
td {
  box-sizing: border-box;
  height: clamp(56px, 3.6vh, 96px);
  padding: 0 0.75em;
  vertical-align: middle;
  white-space: nowrap;
  border: 0;
  font-weight: 500;
  border-bottom: clamp(2px, 0.1vw, 4px) solid rgba(255, 255, 255, 0.75);
}

th + th,
td + td {
  border-left: clamp(2px, 0.1vw, 4px) solid rgba(255, 255, 255, 0.75);
}

th {
  font-weight: 700;
  border-bottom-width: clamp(2px, 0.12vw, 5px);
}

tbody tr:nth-child(even) td {
  background: rgba(2, 119, 255, 0.22);
}

.rank {
  width: 22%;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.nick {
  text-align: left;
  font-weight: 600;
}

.num {
  width: 30%;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.55);
}

.foot {
  display: flex;
  align-items: center;
  gap: clamp(20px, 1.4vw, 48px);
  width: 100%;
  margin-top: auto;
  padding-top: clamp(18px, 2vh, 78px);
}

.rail {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  height: clamp(40px, 4.5vh, 96px);
}

.rail__line {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: clamp(2px, 0.15vw, 6px);
  background: linear-gradient(90deg, #fff 0%, #fff 62%, rgb(255 255 255 / 28%) 62%);
  transform: translateY(-50%);
}

.rail__bike {
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

.start {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-width: clamp(210px, 24vw, 703px);
  height: clamp(60px, 5.5vh, 120px);
  padding: 0 clamp(1.4rem, 1.2vw, 2.5rem);
  color: #fff;
  font-size: clamp(20px, 1.2vw, 44px);
  font-weight: 500;
  text-decoration: none;
  background: #ff2b42;
  border-radius: 999px;
  margin: 0 auto;

  &:active {
    filter: brightness(0.92);
  }
}
</style>
