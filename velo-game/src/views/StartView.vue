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
  } catch {
    /* список игроков подтянется на следующем тике */
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
        <section class="section-1">
          <img class="mascot" src="@/assets/images/mascot.png" alt="" draggable="false" />

          <p class="bubble">
            <span>Давайте начнем</span>
            <span>гонку</span>
          </p>
        </section>

        <section class="section-2">
          <img
            class="logo"
            src="@/assets/images/partner_logo.png"
            alt="Логотип партнёра"
            draggable="false"
          />
          <h1 class="title">Начало гонки</h1>
          <p class="lead">
            У тебя 1 минута, чтобы проехать
            <br />
            как можно больше!
          </p>

          <div class="form">
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

              <div
                class="player"
                :class="{ 'is-off': playerCount !== 2 }"
                :aria-hidden="playerCount !== 2"
              >
                <span class="tag tag--2">Игрок №2</span>
                <label class="select">
                  <select v-model="p2" :disabled="playerCount !== 2">
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
          </div>

          <div class="foot">
            <button class="start" type="button" :disabled="!canStart" @click="startRace">
              Старт
            </button>
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
$text-dark: #1a2740;

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
  left: -15%;
  bottom: -24%;
  z-index: 3;
  width: 92%;
  height: 100%;
  object-fit: contain;
  object-position: left bottom;
  pointer-events: none;
  user-select: none;
}

.bubble {
  position: absolute;
  left: 30%;
  top: 4%;
  z-index: 4;
  box-sizing: border-box;
  width: clamp(240px, 26vw, 30vw);
  aspect-ratio: 668 / 200;
  margin: 0;
  padding: 6% 10% 12% 10%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #fff;
  font-size: clamp(22px, 2.4vw, 3vw);
  font-weight: 500;
  line-height: 1.25;
  text-align: center;
  background: url(/src/assets/images/bubble-black-2.png) center / 100% 100% no-repeat;
  pointer-events: none;

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
  padding: 40px 40px 84px 12px;
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

.lead {
  margin: 0 auto 0;
  color: #fff;
  font-size: clamp(16px, 1.2vw, 3vw);
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
}

.form {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  gap: clamp(18px, 2.2vh, 4vh);
  width: min(100%, 34vw);
  margin: 0 auto;
  min-height: 0;
}

.field {
  display: grid;
  gap: clamp(8px, 0.9vh, 18px);
  width: 100%;
}

.field__label {
  color: #fff;
  font-size: clamp(16px, 1.15vw, 2.4vw);
  font-weight: 500;
  text-align: center;
}

.mode {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(10px, 0.9vw, 1.2vw);
  width: min(100%, 24vw);
  margin: 0 auto;
}

.mode__btn {
  height: clamp(44px, 5.2vh, 8vh);
  color: #fff;
  font-size: clamp(16px, 1.1vw, 2.2vw);
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: clamp(2px, 0.12vw, 4px) solid #fff;
  border-radius: 999px;

  &.is-on {
    color: $text-dark;
    background: #fff;
  }
}

.players {
  display: grid;
  gap: clamp(12px, 1.6vh, 28px);
  width: 100%;
}

.player {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: clamp(10px, 0.8vw, 24px);
  align-items: center;
  min-width: 0;

  &.is-off {
    visibility: hidden;
    pointer-events: none;
  }
}

.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: clamp(110px, 8.4vw, 12vw);
  height: clamp(44px, 5.2vh, 8vh);
  padding: 0 clamp(1rem, 1.1vw, 2rem);
  color: #fff;
  font-size: clamp(16px, 1.05vw, 2.1vw);
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
    height: clamp(44px, 5.2vh, 8vh);
    padding: 0 clamp(2.8rem, 2.4vw, 4.2rem) 0 clamp(1.1rem, 1.2vw, 2rem);
    color: $text-dark;
    font-size: clamp(16px, 1.1vw, 2.2vw);
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
    right: clamp(1rem, 1.2vw, 1.8rem);
    width: 0;
    height: 0;
    border: clamp(6px, 0.4vw, 12px) solid transparent;
    border-top-color: $blue;
    border-bottom-width: 0;
    transform: translateY(-35%);
    pointer-events: none;
  }
}

.foot {
  display: flex;
  align-items: center;
  width: 100%;
  margin-top: auto;
  padding-top: clamp(18px, 2vh, 78px);
}

.start {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-width: clamp(210px, 16vw, 20vw);
  height: clamp(52px, 5.5vh, 8vh);
  margin: 0 auto;
  padding: 0 clamp(1.4rem, 1.2vw, 2.5rem);
  color: #fff;
  font-size: clamp(20px, 1.25vw, 2.4vw);
  font-weight: 500;
  cursor: pointer;
  background: #ff2b42;
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
</style>
