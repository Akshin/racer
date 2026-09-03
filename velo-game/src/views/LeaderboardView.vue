<script setup lang="ts">
/**
 * Лидерборд зала: таблица рекордов и выбор двух гонщиков перед стартом.
 * Список юзеров опрашивается каждые 2 с. Новый зарегистрированный
 * сразу попадает в свободный селект и становится выбранным.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getUsers, sortUsersByCreatedAt, sortUsersByMeters, type VeloUser } from '@/net/usersApi'
import { useSessionStore } from '@/stores/session'

const POLL_MS = 2000

const session = useSessionStore()
const router = useRouter()

const users = ref<VeloUser[]>([])
const p1 = ref('')
const p2 = ref('')
const loadError = ref('')

const seenIds = new Set<string>()
let hydrated = false
let inflight = false
let poll: number | undefined

const leaders = computed(() => sortUsersByMeters(users.value))
const selectUsers = computed(() => sortUsersByCreatedAt(users.value))

function pickRacer(id: string): RaceRacer {
  if (id === '') return null
  const user = users.value.find((entry) => entry.id === id)
  return user === undefined ? null : { id: user.id, nick: user.nick }
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
    else if (p2.value === '' && p1.value !== user.id) p2.value = user.id
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

function formatMeters(meters: number | null): string {
  return meters === null ? '—' : `${Math.round(meters)}`
}

function startRace(): void {
  session.setRacers(pickRacer(p1.value), pickRacer(p2.value))
  void router.push({ name: 'game' })
}

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
    <header class="head">
      <div>
        <h1>Лидерборд</h1>
        <p class="muted">Кто проехал больше метров за минуту.</p>
      </div>
      <RouterLink class="ghost" to="/">Проверка датчиков</RouterLink>
    </header>

    <p v-if="loadError" class="error">{{ loadError }}</p>

    <div class="layout">
      <section class="card board">
        <table>
          <thead>
            <tr>
              <th class="rank">#</th>
              <th>Ник</th>
              <th class="num">Метры</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(user, index) in leaders" :key="user.id">
              <td class="rank">{{ index + 1 }}</td>
              <td class="nick">{{ user.nick }}</td>
              <td class="num">{{ formatMeters(user.meters) }}</td>
            </tr>
            <tr v-if="leaders.length === 0">
              <td colspan="3" class="muted empty">Пока никого нет</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="card start">
        <strong>Новый заезд</strong>
        <p class="muted">
          Пустые селекты — анонимные гонщики, результат в таблицу не пишется. Новый
          зарегистрированный сам встаёт в свободный слот.
        </p>

        <label>
          Тренажёр 1
          <select v-model="p1">
            <option value="">Аноним</option>
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

        <label>
          Тренажёр 2
          <select v-model="p2">
            <option value="">Аноним</option>
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

        <button class="primary wide" :disabled="!session.canRace" @click="startRace">
          Начать заезд
        </button>
        <ul v-if="session.blockers.length" class="blockers">
          <li v-for="blocker in session.blockers" :key="blocker">{{ blocker }}</li>
        </ul>
      </section>
    </div>
  </main>
</template>

<style scoped lang="scss">
@use '@/assets/styles/theme' as t;

button {
  @include t.button;

  &.primary {
    @include t.button-primary;
  }
}

select {
  @include t.field;
  width: 100%;
}

.page {
  display: grid;
  gap: 1.25rem;
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1rem 3rem;
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;

  h1 {
    font-size: 1.75rem;
  }
}

.muted {
  color: t.$muted;
}

.error {
  color: t.$error;
}

.ghost {
  @include t.button;
  text-decoration: none;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(18rem, 0.9fr);
  gap: 1rem;
  align-items: start;

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
}

.card {
  @include t.card;
}

.board {
  padding: 0;
  overflow: auto;
  max-height: calc(100dvh - 10rem);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1.15rem;
}

th,
td {
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid t.$border;
  text-align: left;
}

th {
  position: sticky;
  top: 0;
  color: t.$muted;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: t.$surface;
}

.rank {
  width: 3.5rem;
  color: t.$muted;
  font-variant-numeric: tabular-nums;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.nick {
  font-size: 1.25rem;
  font-weight: 600;
}

.empty {
  text-align: center;
}

.start {
  label {
    display: grid;
    gap: 0.35rem;
  }
}

.wide {
  width: 100%;
  padding: 0.75rem;
}

.blockers {
  padding-left: 1.25rem;
  color: t.$warn;
  font-size: 0.9rem;
}
</style>
