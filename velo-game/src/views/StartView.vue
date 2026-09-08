<script setup lang="ts">
/**
 * Экран старта заезда: сколько игроков, кто едет, какой пол.
 * Сюда попадаем с лидерборда; в гонку — только отсюда.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getUsers, sortUsersByCreatedAt, updateUser, type VeloUser } from '@/net/usersApi'
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

async function setGender(slot: 1 | 2, gender: Gender): Promise<void> {
  if (slot === 1) gender1.value = gender
  else gender2.value = gender

  const id = slot === 1 ? p1.value : p2.value
  if (id === '') return

  try {
    await updateUser(id, { gender })
    const user = users.value.find((entry) => entry.id === id)
    if (user !== undefined) user.gender = gender
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error)
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
    <div class="frame frame--red">
      <div class="frame frame--blue">
        <div class="stage">
          <div class="hero">
            <p class="bubble">Давайте начнем гонку!</p>
            <img class="mascot" src="@/assets/images/MASCOT_WHITE.png" alt="" draggable="false" />
          </div>

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

            <div class="players" :class="{ 'players--one': playerCount === 1 }">
              <div class="player">
                <span class="field__label">Игрок №1</span>
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
                <div class="gender" role="radiogroup" aria-label="Пол игрока 1">
                  <button
                    type="button"
                    class="choice"
                    role="radio"
                    :aria-checked="gender1 === 'male'"
                    :class="{ 'is-on': gender1 === 'male' }"
                    @click="setGender(1, 'male')"
                  >
                    <span class="tick" aria-hidden="true" />
                    Мужской
                  </button>
                  <button
                    type="button"
                    class="choice"
                    role="radio"
                    :aria-checked="gender1 === 'female'"
                    :class="{ 'is-on': gender1 === 'female' }"
                    @click="setGender(1, 'female')"
                  >
                    <span class="tick" aria-hidden="true" />
                    Женский
                  </button>
                </div>
              </div>

              <div v-if="playerCount === 2" class="player">
                <span class="field__label">Игрок №2</span>
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
                <div class="gender" role="radiogroup" aria-label="Пол игрока 2">
                  <button
                    type="button"
                    class="choice"
                    role="radio"
                    :aria-checked="gender2 === 'male'"
                    :class="{ 'is-on': gender2 === 'male' }"
                    @click="setGender(2, 'male')"
                  >
                    <span class="tick" aria-hidden="true" />
                    Мужской
                  </button>
                  <button
                    type="button"
                    class="choice"
                    role="radio"
                    :aria-checked="gender2 === 'female'"
                    :class="{ 'is-on': gender2 === 'female' }"
                    @click="setGender(2, 'female')"
                  >
                    <span class="tick" aria-hidden="true" />
                    Женский
                  </button>
                </div>
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
  </main>
</template>

<style scoped lang="scss">
$red: #ff2b42;
$blue: #0077ff;
$navy: #07101c;
$text-dark: #1a2740;

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
  overflow: hidden;
  border-radius: clamp(14px, 2.2vw, 25px);

  &--red {
    padding: clamp(8px, 1.6vh, 22px);
    border: clamp(4px, 0.8vw, 9px) solid $red;
    box-shadow: 0 0 24px rgba($red, 0.35);
  }

  &--blue {
    overflow: hidden;
    padding: clamp(10px, 2vh, 28px) clamp(14px, 2.2vw, 32px);
    border: clamp(3px, 0.6vw, 7px) solid $blue;
    box-shadow: 0 0 18px rgba($blue, 0.28);
  }
}

.stage {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 34rem);
  gap: clamp(12px, 2vw, 32px);
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.hero {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.bubble {
  position: relative;
  z-index: 2;
  max-width: min(100%, 22rem);
  margin: clamp(4px, 1.5vh, 20px) 0 0 clamp(8px, 2vw, 36px);
  padding: clamp(14px, 2vh, 22px) clamp(16px, 1.8vw, 26px);
  color: #fff;
  font-size: clamp(1.05rem, 1.8vw, 1.5rem);
  font-weight: 700;
  line-height: 1.3;
  border-radius: 22px;
  background: linear-gradient(135deg, #003180 0%, #4c9ef8 50%, #9cbefb 100%);

  &::after {
    content: '';
    position: absolute;
    left: 18%;
    bottom: -14px;
    border: 10px solid transparent;
    border-top-color: #6aa9f4;
    border-bottom-width: 0;
  }
}

.mascot {
  position: absolute;
  left: 0;
  bottom: 0;
  z-index: 1;
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: 82%;
  object-fit: contain;
  object-position: left bottom;
  pointer-events: none;
  user-select: none;
}

.panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(10px, 1.6vh, 18px);
  min-width: 0;
  min-height: 0;
  overflow: auto;
  z-index: 2;
}

.logo {
  width: min(100%, 220px);
  height: auto;
  margin: 0 auto;
}

h1 {
  margin: 0;
  color: #fff;
  font-size: clamp(1.5rem, 2.6vw, 2.35rem);
  font-weight: 700;
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
  gap: 0.45rem;
}

.field__label {
  color: #fff;
  font-size: clamp(0.95rem, 1.2vw, 1.15rem);
  font-weight: 500;
}

.mode {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.mode__btn {
  height: clamp(44px, 5.8vh, 52px);
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
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
  grid-template-columns: 1fr 1fr;
  gap: clamp(12px, 2vw, 20px);

  &--one {
    grid-template-columns: 1fr;
  }
}

.player {
  display: grid;
  gap: 0.55rem;
  min-width: 0;
}

.select {
  position: relative;
  display: block;

  select {
    width: 100%;
    height: clamp(48px, 6vh, 56px);
    padding: 0 2.6rem 0 1.2rem;
    color: $text-dark;
    font-size: max(16px, 1.05rem);
    background: #fff;
    border: 0;
    border-radius: 999px;
    outline: none;
    appearance: none;

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

.gender {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.choice {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-height: clamp(42px, 5.4vh, 50px);
  padding: 0 0.7rem;
  color: #fff;
  font-size: 0.92rem;
  font-weight: 500;
  text-align: left;
  background: rgba(18, 26, 40, 0.78);
  border: 1.5px solid rgba(255, 255, 255, 0.55);
  border-radius: 14px;

  &.is-on {
    border-color: $red;
  }
}

.tick {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 2px solid #fff;
  border-radius: 50%;

  &::after {
    content: '';
    width: 4px;
    height: 8px;
    margin-top: -1px;
    border-right: 2px solid #fff;
    border-bottom: 2px solid #fff;
    opacity: 0;
    transform: rotate(45deg);
  }
}

.choice.is-on .tick {
  background: $red;
  border-color: $red;

  &::after {
    opacity: 1;
  }
}

.submit {
  width: 100%;
  height: clamp(52px, 7vh, 64px);
  margin-top: 0.25rem;
  color: #fff;
  font-size: clamp(1.1rem, 1.7vw, 1.4rem);
  font-weight: 700;
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
    min-height: 28vh;
  }

  .mascot {
    max-height: 92%;
  }

  .players {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .players {
    grid-template-columns: 1fr;
  }
}
</style>
