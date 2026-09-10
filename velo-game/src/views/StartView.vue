<script setup lang="ts">
/**
 * Экран старта заезда: сколько игроков, кто едет, какой пол.
 * Сюда попадаем с лидерборда; в гонку — только отсюда.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getUsers, sortUsersByCreatedAt, type VeloUser } from '@/net/usersApi'
import { racerSheetAlias } from '@/game/racerAlias'
import { useSessionStore } from '@/stores/session'

const POLL_MS = 2000

type Gender = 'male' | 'female'

const session = useSessionStore()
const router = useRouter()

const users = ref<VeloUser[]>([])
const playerCount = computed({
  get: () => session.playerCount,
  set: (count) => session.setPlayerCount(count),
})
const p1 = ref(session.racers[0]?.id ?? '')
const p2 = ref(session.racers[1]?.id ?? '')
const gender1 = ref<Gender>(session.racers[0]?.gender ?? 'male')
const gender2 = ref<Gender>(session.racers[1]?.gender ?? 'male')
const loadError = ref('')

const seenIds = new Set<string>()
let hydrated = false
let inflight = false
let poll: number | undefined

const selectUsers = computed(() => sortUsersByCreatedAt(users.value))

const canStart = computed(() => session.canRace)

function genderOf(id: string): Gender {
  return users.value.find((user) => user.id === id)?.gender === 'female' ? 'female' : 'male'
}

function pickRacer(id: string, gender: Gender): RaceRacer {
  if (id === '') return null
  const user = users.value.find((entry) => entry.id === id)
  return user === undefined ? null : { id: user.id, nick: user.nick, gender }
}

function assignNewcomers(next: VeloUser[]): void {
  const newcomers = next
    .filter((user) => !seenIds.has(user.id))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))

  for (const user of next) seenIds.add(user.id)

  if (!hydrated) {
    hydrated = true
    return
  }

  for (const user of newcomers) {
    if (p1.value === '') p1.value = user.id
    else if (playerCount.value === 2 && p2.value === '' && p1.value !== user.id) p2.value = user.id
  }
}

async function refresh(): Promise<void> {
  if (inflight) return
  inflight = true
  try {
    const next = await getUsers()
    if (p1.value !== '' && !next.some((user) => user.id === p1.value)) p1.value = ''
    if (p2.value !== '' && !next.some((user) => user.id === p2.value)) p2.value = ''
    assignNewcomers(next)
    users.value = next
    loadError.value = ''
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error)
  } finally {
    inflight = false
  }
}

function startRace(): void {
  if (!canStart.value) return
  session.setRacers(
    pickRacer(p1.value, gender1.value),
    playerCount.value === 2 ? pickRacer(p2.value, gender2.value) : null,
    [
      racerSheetAlias(0, gender1.value),
      racerSheetAlias(1, playerCount.value === 2 ? gender2.value : undefined),
    ],
    playerCount.value,
  )
  void router.push({ name: 'game' })
}

watch(p1, (id) => {
  gender1.value = genderOf(id)
})

watch(p2, (id) => {
  gender2.value = genderOf(id)
})

watch(playerCount, (count) => {
  if (count === 1) p2.value = ''
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
    <div class="glow" aria-hidden="true">
      <span class="glow__spot glow__spot--top" />
      <span class="glow__spot glow__spot--mid" />
      <span class="glow__spot glow__spot--bot" />
    </div>

    <div class="frame frame--red">
      <div class="frame frame--blue">
        <div class="stage">
          <div class="hero" aria-hidden="true" />

          <section class="panel">
            <img class="logo" src="@/assets/images/vk_logo.png" alt="VK Видео" draggable="false" />
            <h1>Начало гонки</h1>

            <p v-if="loadError" class="banner" role="alert">{{ loadError }}</p>

            <div class="field">
              <span class="field__label">Кол-во игроков:</span>
              <div class="mode" role="radiogroup" aria-label="Количество игроков">
                <button
                  type="button"
                  class="mode__btn"
                  role="radio"
                  :aria-checked="playerCount === 1"
                  :class="{ 'is-on': playerCount === 1 }"
                  @click="playerCount = 1"
                >
                  Один игрок
                </button>
                <button
                  type="button"
                  class="mode__btn"
                  role="radio"
                  :aria-checked="playerCount === 2"
                  :class="{ 'is-on': playerCount === 2 }"
                  @click="playerCount = 2"
                >
                  Два игрока
                </button>
              </div>
            </div>

            <div class="players">
              <div class="player">
                <span class="tag tag--1">Игрок №1</span>
                <label class="select">
                  <select v-model="p1">
                    <option value="">Никнейм</option>
                    <option
                      v-for="user in selectUsers"
                      :key="user.id"
                      :value="user.id"
                      :disabled="user.id === p2"
                    >
                      {{ user.nick }}
                    </option>
                  </select>
                </label>
              </div>

              <div v-if="playerCount === 2" class="player">
                <span class="tag tag--2">Игрок №2</span>
                <label class="select">
                  <select v-model="p2">
                    <option value="">Никнейм</option>
                    <option
                      v-for="user in selectUsers"
                      :key="user.id"
                      :value="user.id"
                      :disabled="user.id === p1"
                    >
                      {{ user.nick }}
                    </option>
                  </select>
                </label>
              </div>
            </div>

            <button class="submit" type="button" :disabled="!canStart" @click="startRace">
              Старт
            </button>
            <ul v-if="session.blockers.length" class="blockers">
              <li v-for="blocker in session.blockers" :key="blocker">{{ blocker }}</li>
            </ul>
          </section>
        </div>
      </div>
    </div>

    <div class="character">
      <p class="bubble">
        Давайте <br />
        начнем гонку!
      </p>
      <img class="mascot" src="@/assets/images/mascot.png" alt="" draggable="false" />
    </div>
  </main>
</template>

<style scoped lang="scss">
$red: #ff2b42;
$blue: #0077ff;
$glow: #0040ff;
$text-dark: #1a2740;
$bubble-start: #2e54f1;
$bubble-end: #c5d2f8;
$bubble-bot: #8ea4f5;

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
    padding: clamp(10px, 2vh, 28px) clamp(18px, 2.6vw, 40px) clamp(16px, 2.4vh, 28px);
    border: clamp(3px, 0.6vw, 7px) solid $blue;
    box-shadow: 0 0 18px rgba($blue, 0.28);
  }
}

.stage {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(20rem, 1.15fr);
  gap: clamp(12px, 2vw, 40px);
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.hero {
  min-width: 0;
  min-height: 0;
}

.character {
  position: absolute;
  left: -23px;
  bottom: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  max-width: 38%;
  pointer-events: none;
}

.bubble {
  position: relative;
  z-index: 1;
  margin: 0 0 0 30%;
  padding: 40px 70px;
  color: #fff;
  font-size: clamp(1.15rem, 1.1rem + 0.7vw, 1.85rem);
  font-weight: 500;
  line-height: 1.2;
  text-align: center;
  border-radius: 28px;
  background: linear-gradient(315deg, $bubble-start 0%, $bubble-end 100%);

  &::after {
    content: '';
    position: absolute;
    left: 28%;
    bottom: -16px;
    border: 12px solid transparent;
    border-top-color: $bubble-bot;
    border-bottom-width: 0;
  }
}

.logo {
  display: block;
  width: min(100%, 210px);
  height: auto;
  margin: 0 auto;
  pointer-events: none;
  user-select: none;
}

.mascot {
  display: block;
  width: auto;
  max-width: 100%;
  height: min(52vh, 460px);
  object-fit: contain;
  object-position: left bottom;
  user-select: none;
}

.panel {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-self: center;
  gap: clamp(14px, 2.2vh, 22px);
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  justify-self: end;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

h1 {
  margin: 0;
  color: #fff;
  font-size: 70px;
  font-weight: 500;
  text-align: center;
}

.banner {
  margin: 0;
  padding: 0.65rem 0.9rem;
  color: #ffd0d5;
  background: rgba($red, 0.18);
  border-radius: 12px;
  font-size: 0.95rem;
}

.field {
  display: grid;
  gap: 0.55rem;
}

.field__label {
  color: #fff;
  font-size: clamp(1rem, 1.3vw, 1.2rem);
  font-weight: 500;
  text-align: center;
}

.mode {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
  width: 350px;
  margin: 0 auto 26px auto;
}

.mode__btn {
  height: clamp(46px, 6vh, 54px);
  color: #fff;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: 2px solid #fff;
  border-radius: 999px;

  &.is-on {
    color: $text-dark;
    background: #fff;
  }
}

.players {
  display: grid;
  gap: clamp(12px, 1.8vh, 18px);
  width: 500px;
  margin: 0 auto;
}

.player {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
  min-width: 0;
}

.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 7.2rem;
  height: clamp(46px, 6vh, 54px);
  padding: 0 1.15rem;
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  white-space: nowrap;
  border-radius: 999px;

  &--1 {
    background: $blue;
  }

  &--2 {
    background: $red;
  }
}

.select {
  position: relative;
  display: block;
  min-width: 0;

  select {
    width: 100%;
    height: clamp(46px, 6vh, 54px);
    padding: 0 2.6rem 0 1.2rem;
    color: $text-dark;
    font-size: max(16px, 1.05rem);
    background: #fff;
    border: 0;
    border-radius: 999px;
    outline: none;
    appearance: none;
    -webkit-appearance: none;

    &:focus {
      box-shadow: 0 0 0 2px rgba($blue, 0.55);
    }
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 1.15rem;
    width: 0;
    height: 0;
    border: 7px solid transparent;
    border-top-color: $blue;
    border-bottom-width: 0;
    transform: translateY(-35%);
    pointer-events: none;
  }
}

.submit {
  width: 340px;
  margin: 40px auto 0 auto;
  height: clamp(52px, 7vh, 64px);
  color: #fff;
  font-size: clamp(1.15rem, 1.8vw, 1.45rem);
  font-weight: 700;
  cursor: pointer;
  background: $red;
  border: 0;
  border-radius: 999px;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &:not(:disabled):active {
    filter: brightness(0.92);
  }
}

.blockers {
  margin: 0;
  padding-left: 1.2rem;
  color: #f0c674;
  font-size: 0.88rem;
}

@media (orientation: portrait) {
  .page {
    overflow: auto;
  }

  .stage {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .hero {
    min-height: 0;
  }

  .character {
    left: 50%;
    max-width: 72%;
    transform: translateX(-50%);
    align-items: center;
  }

  .bubble {
    margin-left: 0;
  }

  .mascot {
    height: min(36vh, 300px);
  }

  .panel {
    justify-self: stretch;
    width: 100%;
  }

  .player {
    grid-template-columns: 1fr;
  }
}
</style>
