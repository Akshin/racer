/**
 * Транспорт: WebSocket-соединение с velo-node и автопереподключение.
 * Разбор данных и состояние сессии живут в сторе — здесь только связь.
 */

/** Пауза перед повторной попыткой удваивается от 0.5 до 5 секунд. */
const RECONNECT_MIN_MS = 500
const RECONNECT_MAX_MS = 5000

const MESSAGE_TYPES = ['hello', 'telemetry', 'sensor']

export class TelemetryClient {
  #handlers: TelemetryHandlers
  #socket: WebSocket | null = null
  #url = ''
  /** true — оператор нажал «Подключиться»: держим соединение и переподключаемся сами. */
  #wanted = false
  #retryMs = RECONNECT_MIN_MS
  #retryTimer: number | null = null

  constructor(handlers: TelemetryHandlers) {
    this.#handlers = handlers
  }

  connect(url: string): void {
    this.#url = url
    this.#wanted = true
    this.#retryMs = RECONNECT_MIN_MS
    this.#open()
  }

  disconnect(): void {
    this.#wanted = false
    this.#clearRetry()
    this.#socket?.close()
    this.#socket = null
    this.#handlers.onStatus('offline')
    this.#handlers.onLog('info', 'Отключено')
  }

  send(message: ClientMessage): void {
    if (this.#socket?.readyState !== WebSocket.OPEN) {
      this.#handlers.onLog('warn', 'Команда не отправлена: нет соединения')
      return
    }
    this.#socket.send(JSON.stringify(message))
  }

  #open(): void {
    this.#clearRetry()
    this.#handlers.onStatus('connecting')
    this.#handlers.onLog('info', `Подключаюсь к ${this.#url}`)

    let socket: WebSocket
    try {
      socket = new WebSocket(this.#url)
    } catch (error) {
      // Неверный адрес браузер отвергает сразу, не доходя до соединения.
      this.#handlers.onLog('error', `Некорректный адрес: ${String(error)}`)
      this.#handlers.onStatus('offline')
      this.#wanted = false
      return
    }
    this.#socket = socket

    socket.onopen = () => {
      this.#retryMs = RECONNECT_MIN_MS
      this.#handlers.onStatus('online')
      this.#handlers.onLog('info', 'Соединение установлено')
    }

    socket.onmessage = (event: MessageEvent<string>) => {
      const message = parseMessage(event.data)
      if (message === null) {
        this.#handlers.onLog('warn', 'Пришло сообщение неизвестного формата')
        return
      }
      this.#handlers.onMessage(message)
    }

    // Браузер не раскрывает причину ошибки WebSocket — подробности будут в onclose.
    socket.onerror = () => this.#handlers.onLog('error', 'Ошибка соединения')

    socket.onclose = (event) => {
      this.#socket = null
      if (!this.#wanted) return

      this.#handlers.onStatus('connecting')
      const seconds = (this.#retryMs / 1000).toFixed(1)
      const reason = event.reason || `код ${event.code}`
      this.#handlers.onLog('warn', `Соединение закрыто (${reason}). Повтор через ${seconds} с`)

      this.#retryTimer = window.setTimeout(() => this.#open(), this.#retryMs)
      this.#retryMs = Math.min(this.#retryMs * 2, RECONNECT_MAX_MS)
    }
  }

  #clearRetry(): void {
    if (this.#retryTimer !== null) window.clearTimeout(this.#retryTimer)
    this.#retryTimer = null
  }
}

/** Мягкая проверка: адаптер мог быть другой версии или вообще другим сервисом. */
function parseMessage(raw: string): ServerMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const type = (parsed as { type?: unknown }).type
    return typeof type === 'string' && MESSAGE_TYPES.includes(type)
      ? (parsed as ServerMessage)
      : null
  } catch {
    return null
  }
}
