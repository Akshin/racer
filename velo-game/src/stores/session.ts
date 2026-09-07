/**
 * Состояние сессии: соединение с адаптером, телеметрия игроков, журнал событий
 * и проверка готовности к заезду.
 */

import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { racerSheetAlias } from '@/game/racerAlias'
import { PLAYER_IDS, PROTOCOL_VERSION } from '@/net/protocol'
import { TelemetryClient } from '@/net/telemetryClient'
import { useSettingsStore } from '@/stores/settings'

/** Телеметрия не приходит дольше этого времени — связь есть, а данных нет. */
const STALE_MS = 1500
const LOG_LIMIT = 200
const URL_STORAGE_KEY = 'velo:ws-url'
/** Оператор нажимал «Подключиться» — после перезагрузки страницы поднимаемся сами. */
const CONNECT_STORAGE_KEY = 'velo:connect'
/** Проверка датчиков пройдена. Живёт до закрытия вкладки, чтобы F5 не выбивал из гонки. */
const VERIFIED_STORAGE_KEY = 'velo:verified'
/** Гонщики и атласы с экрана старта — чтобы спрайт не терялся при переходе на /game. */
const RACERS_STORAGE_KEY = 'velo:racers'

type StoredRacers = {
  racers: [RaceRacer, RaceRacer]
  sheets: [string, string]
}

function readStoredRacers(): StoredRacers | null {
  try {
    const raw = window.sessionStorage.getItem(RACERS_STORAGE_KEY)
    if (raw == null) return null
    const parsed = JSON.parse(raw) as Partial<StoredRacers>
    if (!Array.isArray(parsed.racers) || parsed.racers.length !== 2) return null
    if (!Array.isArray(parsed.sheets) || parsed.sheets.length !== 2) return null
    return { racers: parsed.racers as [RaceRacer, RaceRacer], sheets: parsed.sheets as [string, string] }
  } catch {
    return null
  }
}

function emptyChecks(): Record<PlayerId, PlayerCheck> {
  const entries = PLAYER_IDS.map((id) => [
    id,
    {
      telemetry: { id, connected: false, cadence: 0, speed: 0, distance: 0 },
      sensor: null,
      spinning: false,
    },
  ])
  return Object.fromEntries(entries) as Record<PlayerId, PlayerCheck>
}

function defaultUrl(): string {
  const configured = import.meta.env.VITE_WS_URL
  if (typeof configured === 'string' && configured !== '') return configured
  // Адаптер обычно запущен на той же машине, что и браузер.
  return `ws://${window.location.hostname}:8080`
}

export const useSessionStore = defineStore('session', () => {
  const settings = useSettingsStore()
  const url = ref(window.localStorage.getItem(URL_STORAGE_KEY) ?? defaultUrl())
  const status = ref<ConnectionStatus>('offline')
  const checks = ref(emptyChecks())
  const logs = ref<LogEntry[]>([])
  const tickHz = ref(0)
  const metersPerCrankRev = ref(0)
  const lastTelemetryAt = ref(0)
  const storedRacers = readStoredRacers()
  /** Кто едет в текущем заезде. Задаётся на экране старта. */
  const racers = ref<[RaceRacer, RaceRacer]>(storedRacers?.racers ?? [null, null])
  /** Атласы велосипедистов: считаются по полу на старте, не из пустого слота. */
  const racerSheets = ref<[string, string]>(storedRacers?.sheets ?? ['racer1', 'racer2'])

  // Часы для проверки «данные ещё идут»: дают шкале обновляться без новых сообщений.
  const now = ref(Date.now())
  window.setInterval(() => (now.value = Date.now()), 250)

  function log(level: LogLevel, text: string): void {
    logs.value.unshift({ id: logs.value.length, at: Date.now(), level, text })
    if (logs.value.length > LOG_LIMIT) logs.value.pop()
  }

  function applyTelemetry(players: PlayerTelemetry[]): void {
    for (const telemetry of players) {
      const check = checks.value[telemetry.id]
      if (check === undefined) continue
      check.telemetry = telemetry
      if (telemetry.cadence > 0) check.spinning = true
    }
  }

  function applySensor(state: SensorState): void {
    const check = checks.value[state.player]
    check.sensor = state.connected ? { sensorId: state.sensorId, name: state.name } : null
  }

  function handle(message: ServerMessage): void {
    switch (message.type) {
      case 'hello':
        tickHz.value = message.tickHz
        metersPerCrankRev.value = message.metersPerCrankRev
        if (message.protocol !== PROTOCOL_VERSION) {
          log('error', `Протокол адаптера v${message.protocol}, фронт ждёт v${PROTOCOL_VERSION}`)
        }
        applyTelemetry(message.players)
        message.sensors.forEach(applySensor)
        break

      case 'telemetry':
        lastTelemetryAt.value = Date.now()
        applyTelemetry(message.players)
        break

      case 'sensor': {
        applySensor(message)
        const label = message.name || message.sensorId
        const state = message.connected ? 'привязан' : 'потерян'
        log(message.connected ? 'info' : 'error', `${message.player}: датчик ${label} ${state}`)
        break
      }
    }
  }

  const client = new TelemetryClient({
    onMessage: handle,
    onStatus: (next) => (status.value = next),
    onLog: log,
  })

  const playerChecks = computed(() => PLAYER_IDS.map((id) => checks.value[id]))

  /** Телеметрия приходит прямо сейчас. */
  const dataFlowing = computed(
    () => status.value === 'online' && now.value - lastTelemetryAt.value < STALE_MS,
  )

  /** Что мешает начать заезд. Пустой список означает готовность. */
  const blockers = computed(() => {
    const list: string[] = []
    if (status.value !== 'online') list.push('Нет соединения с адаптером')
    else if (!dataFlowing.value) list.push('Соединение есть, но телеметрия не приходит')

    if (settings.allowOneTrainer) {
      const anyReady = PLAYER_IDS.some((id) => {
        const check = checks.value[id]
        return check !== undefined && check.telemetry.connected && check.spinning
      })
      if (!anyReady) list.push('Покрутите педали хотя бы на одном тренажёре')
    } else {
      PLAYER_IDS.forEach((id, index) => {
        const check = checks.value[id]
        const label = `Тренажёр ${index + 1}`
        if (check === undefined || !check.telemetry.connected)
          list.push(`${label}: датчик не привязан`)
        else if (!check.spinning) list.push(`${label}: покрутите педали для проверки датчика`)
      })
    }
    return list
  })

  const ready = computed(() => blockers.value.length === 0)

  /**
   * Проверка пройдена хотя бы раз за эту вкладку. В отличие от `ready`, не гаснет
   * при потере датчика: иначе перезагрузка страницы или моргнувший датчик
   * выбрасывали бы гонку на страницу проверки.
   */
  const verified = ref(window.sessionStorage.getItem(VERIFIED_STORAGE_KEY) === '1')
  watch(ready, (value) => {
    if (!value || verified.value) return
    verified.value = true
    window.sessionStorage.setItem(VERIFIED_STORAGE_KEY, '1')
  })

  // Сняли «достаточно одного» — прежняя проверка одним датчиком больше не считается пройденной.
  watch(
    () => settings.allowOneTrainer,
    (allow) => {
      if (allow) return
      const allReady = PLAYER_IDS.every((id) => {
        const check = checks.value[id]
        return check !== undefined && check.telemetry.connected && check.spinning
      })
      if (allReady) return
      verified.value = false
      window.sessionStorage.removeItem(VERIFIED_STORAGE_KEY)
    },
  )

  function connect(): void {
    window.localStorage.setItem(URL_STORAGE_KEY, url.value)
    window.localStorage.setItem(CONNECT_STORAGE_KEY, '1')
    checks.value = emptyChecks()
    lastTelemetryAt.value = 0
    client.connect(url.value)
  }

  function disconnect(): void {
    window.localStorage.removeItem(CONNECT_STORAGE_KEY)
    window.sessionStorage.removeItem(VERIFIED_STORAGE_KEY)
    verified.value = false
    client.disconnect()
  }

  /** Пускать в гонку: либо всё зелёное сейчас, либо проверка уже пройдена в этой вкладке. */
  const canRace = computed(() => ready.value || verified.value)

  // Перезагрузка страницы не должна требовать повторного нажатия «Подключиться».
  if (window.localStorage.getItem(CONNECT_STORAGE_KEY) === '1') connect()

  /** Обнулить дистанцию на адаптере — новая гонка. */
  function resetRace(): void {
    client.send({ type: 'reset' })
    log('info', 'Отправлен сброс дистанции')
  }

  /** Назначить гонщиков перед входом на экран заезда. sheets — атласы с экрана старта. */
  function setRacers(p1: RaceRacer, p2: RaceRacer, sheets?: readonly string[]): void {
    racers.value = [p1, p2]
    racerSheets.value = [
      sheets?.[0] ?? racerSheetAlias(0, p1?.gender),
      sheets?.[1] ?? racerSheetAlias(1, p2?.gender),
    ]
    window.sessionStorage.setItem(
      RACERS_STORAGE_KEY,
      JSON.stringify({ racers: racers.value, sheets: racerSheets.value }),
    )
  }

  function clearLogs(): void {
    logs.value = []
  }

  return {
    url,
    status,
    logs,
    tickHz,
    metersPerCrankRev,
    playerChecks,
    dataFlowing,
    blockers,
    ready,
    canRace,
    racers,
    racerSheets,
    connect,
    disconnect,
    resetRace,
    setRacers,
    clearLogs,
  }
})
