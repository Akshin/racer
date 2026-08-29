/** WebSocket-сервер: рассылает снапшоты всем подключённым клиентам игры. */

import { WebSocketServer, type WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from '../types.ts';

export type TelemetryServerOptions = {
  host: string;
  port: number;
  /** Сообщение, которое получает только что подключившийся клиент. */
  greet: () => ServerMessage;
  onCommand: (message: ClientMessage) => void;
};

export class TelemetryServer {
  #wss: WebSocketServer;

  constructor(options: TelemetryServerOptions) {
    this.#wss = new WebSocketServer({ host: options.host, port: options.port });

    this.#wss.on('connection', (socket: WebSocket) => {
      send(socket, options.greet());
      socket.on('message', (raw) => {
        const command = parseCommand(raw.toString());
        if (command !== null) options.onCommand(command);
      });
      socket.on('error', (error) => console.error('[ws] ошибка соединения:', error));
    });

    this.#wss.on('listening', () => console.log(`[ws] слушаю ws://${options.host}:${options.port}`));

    // Например, порт уже занят: без обработчика ws бросает необработанное событие.
    this.#wss.on('error', (error) => {
      console.error('[ws] сервер не запущен:', error.message);
      process.exit(1);
    });
  }

  broadcast(message: ServerMessage): void {
    const payload = JSON.stringify(message);
    for (const client of this.#wss.clients) {
      if (client.readyState === client.OPEN) client.send(payload);
    }
  }

  close(): Promise<void> {
    return new Promise((resolve) => this.#wss.close(() => resolve()));
  }
}

function send(socket: WebSocket, message: ServerMessage): void {
  socket.send(JSON.stringify(message));
}

/** Разбор команды от клиента; неизвестные и некорректные сообщения игнорируются. */
function parseCommand(raw: string): ClientMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && (parsed as { type?: unknown }).type === 'reset') {
      return { type: 'reset' };
    }
  } catch {
    // не JSON — молча игнорируем
  }
  return null;
}
