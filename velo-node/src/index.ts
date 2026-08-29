/** Точка входа: собирает источник данных, ядро и WebSocket-сервер. */

import { loadConfig } from './config.ts';
import { Hub } from './hub.ts';
import { AntCadenceSource } from './sources/ant.ts';
import { BleCadenceSource } from './sources/ble.ts';
import { MockCadenceSource } from './sources/mock.ts';
import { TelemetryServer } from './transport/ws.ts';
import { PLAYER_IDS, type CadenceSource, type Config } from './types.ts';

function createSource(config: Config): CadenceSource {
  // Датчики, явно закреплённые за игроками; пустые значения означают автопривязку.
  const allow = PLAYER_IDS.map((id) => config.sensors[id]).filter(Boolean);
  const options = { allow, maxDevices: PLAYER_IDS.length };

  switch (config.source) {
    case 'ble':
      return new BleCadenceSource(options);
    case 'ant':
      return new AntCadenceSource(options);
    case 'mock':
      return new MockCadenceSource(PLAYER_IDS.length);
  }
}

const config = loadConfig();
const hub = new Hub(config, createSource(config));

const server = new TelemetryServer({
  host: config.host,
  port: config.port,
  greet: () => hub.hello(),
  onCommand: (message) => {
    if (message.type === 'reset') hub.reset();
  },
});
hub.onMessage((message) => server.broadcast(message));

try {
  await hub.start();
} catch (error) {
  // Типичный случай — нет ANT+ свистка или доступа к Bluetooth: стектрейс тут не нужен.
  console.error(`[app] источник ${config.source} не запустился:`, error instanceof Error ? error.message : error);
  process.exit(1);
}
console.log(`[app] источник: ${config.source}, ${hub.metersPerCrankRev.toFixed(2)} м за оборот педалей`);

async function shutdown(): Promise<void> {
  await hub.stop();
  await server.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
