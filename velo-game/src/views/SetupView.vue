<script setup lang="ts">
/**
 * Корневая утилитарная страница: подключение к адаптеру, проверка датчиков
 * и журнал событий. В гонку пускает, когда нужные тренажёры реально крутятся.
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { SPEED_SCALE_MAX, SPEED_SCALE_MIN, SPEED_SCALE_STEP } from '@/game/config'
import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'

const session = useSessionStore()
const settings = useSettingsStore()
const router = useRouter()
const onlyErrors = ref(false)

const statusLabel = computed(() => {
  if (session.status === 'connecting') return 'Подключаюсь…'
  if (session.status === 'offline') return 'Нет соединения'
  return session.dataFlowing ? 'Данные идут' : 'Связь есть, данных нет'
})

const statusTone = computed(() => {
  if (session.status === 'offline') return 'error'
  if (session.status === 'connecting' || !session.dataFlowing) return 'warn'
  return 'ok'
})

const visibleLogs = computed(() =>
  onlyErrors.value ? session.logs.filter((entry) => entry.level === 'error') : session.logs,
)

function time(at: number): string {
  return new Date(at).toLocaleTimeString('ru-RU')
}
</script>

<template>
  <main class="page">
    <header>
      <h1>Проверка перед заездом</h1>
      <p class="muted">
        Подключитесь к адаптеру и покрутите педали. Для заезда в одиночку достаточно первого
        тренажёра — на экране старта выберите «Один игрок». Для двоих нужны оба датчика, либо
        включите «достаточно одного тренажёра».
      </p>
      <p>
        <RouterLink to="/leaderboard">Лидерборд</RouterLink>
      </p>
    </header>

    <section class="card">
      <div class="row">
        <input v-model="session.url" :disabled="session.status !== 'offline'" spellcheck="false" />
        <button v-if="session.status === 'offline'" class="primary" @click="session.connect()">
          Подключиться
        </button>
        <button v-else @click="session.disconnect()">Отключиться</button>
      </div>
      <div class="row">
        <span class="dot" :class="statusTone"></span>
        <strong>{{ statusLabel }}</strong>
        <span v-if="session.tickHz" class="muted">
          {{ session.tickHz }} Гц · {{ session.metersPerCrankRev.toFixed(2) }} м за оборот педалей
        </span>
      </div>
    </section>

    <section class="players">
      <article
        v-for="(check, index) in session.playerChecks"
        :key="check.telemetry.id"
        class="card"
      >
        <div class="row">
          <span class="dot" :class="check.telemetry.connected ? 'ok' : 'error'"></span>
          <strong>Тренажёр {{ index + 1 }}</strong>
          <span class="muted">{{
            check.sensor?.name || check.sensor?.sensorId || 'датчик не найден'
          }}</span>
        </div>
        <div class="metrics">
          <div>
            <span class="value">{{ check.telemetry.speed.toFixed(1) }}</span>
            <span class="muted">км/ч</span>
          </div>
          <div>
            <span class="value">{{ check.telemetry.cadence.toFixed(0) }}</span>
            <span class="muted">об/мин</span>
          </div>
          <div>
            <span class="value">{{ check.telemetry.distance.toFixed(0) }}</span>
            <span class="muted">м</span>
          </div>
        </div>
        <p class="check" :class="check.spinning ? 'ok' : 'muted'">
          {{ check.spinning ? '✓ обороты зафиксированы' : 'ожидаю первый оборот педалей' }}
        </p>
      </article>
    </section>

    <section class="card">
      <strong>Заезд</strong>
      <label class="option">
        <input v-model="settings.allowOneTrainer" type="checkbox" />
        достаточно одного тренажёра
      </label>
      <p class="muted">
        Множитель дороги не меняет км/ч в панели — только как быстро набегает разметка.
      </p>
      <label class="scale">
        <span>Скорость дороги ×{{ settings.speedScale.toFixed(2) }}</span>
        <input
          v-model.number="settings.speedScale"
          type="range"
          :min="SPEED_SCALE_MIN"
          :max="SPEED_SCALE_MAX"
          :step="SPEED_SCALE_STEP"
        />
        <span class="muted">{{ SPEED_SCALE_MIN }}× … {{ SPEED_SCALE_MAX }}×</span>
      </label>
    </section>

    <section class="card">
      <button class="primary wide" :disabled="!session.canRace" @click="router.push('/leaderboard')">
        Перейти к лидерборду
      </button>
      <ul v-if="session.blockers.length" class="blockers">
        <li v-for="blocker in session.blockers" :key="blocker">{{ blocker }}</li>
      </ul>
    </section>

    <section class="card">
      <div class="row">
        <strong>Журнал</strong>
        <label class="muted"><input v-model="onlyErrors" type="checkbox" /> только ошибки</label>
        <button @click="session.clearLogs()">Очистить</button>
      </div>
      <ol class="log">
        <li v-for="entry in visibleLogs" :key="entry.id" :class="entry.level">
          <span class="muted">{{ time(entry.at) }}</span> {{ entry.text }}
        </li>
        <li v-if="!visibleLogs.length" class="muted">пусто</li>
      </ol>
    </section>
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

input {
  @include t.field;
}

.page {
  display: grid;
  gap: 1rem;
  max-width: 860px;
  margin: 0 auto;
  padding: 2rem 1rem 3rem;
}

header {
  h1 {
    font-size: 1.5rem;
  }

  p {
    margin-top: 0.25rem;
  }

  a {
    color: t.$accent;
  }
}

.muted {
  color: t.$muted;
}

.card {
  @include t.card;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;

  // Поле адреса растягивается на всю строку, чекбокс «только ошибки» — нет.
  input:not([type='checkbox']) {
    flex: 1;
    min-width: 12rem;
  }
}

.players {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
  gap: 1rem;
}

.dot {
  width: 0.6rem;
  height: 0.6rem;
  background: t.$muted;
  border-radius: 50%;

  &.ok {
    background: t.$ok;
  }

  &.warn {
    background: t.$warn;
  }

  &.error {
    background: t.$error;
  }
}

.metrics {
  display: flex;
  gap: 1.5rem;

  .value {
    margin-right: 0.35rem;
    font-size: 1.75rem;
    font-variant-numeric: tabular-nums;
  }
}

.check {
  font-size: 0.9rem;

  &.ok {
    color: t.$ok;
  }
}

.option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.scale {
  display: grid;
  gap: 0.35rem;

  input[type='range'] {
    width: 100%;
    padding: 0;
    accent-color: t.$accent;
    background: transparent;
    border: none;
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

.log {
  display: grid;
  gap: 0.2rem;
  max-height: 16rem;
  overflow-y: auto;
  font-family: t.$font-mono;
  font-size: 0.82rem;
  list-style: none;

  .warn {
    color: t.$warn;
  }

  .error {
    color: t.$error;
  }
}
</style>
