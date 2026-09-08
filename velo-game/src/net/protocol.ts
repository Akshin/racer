/**
 * Значения времени выполнения из контракта с velo-node.
 * Сами типы сообщений описаны в src/types.d.ts.
 */

export const PROTOCOL_VERSION = 1

/** Адаптер всегда шлёт p1 и p2. Сколько полос рисовать — решает клиент. */
export const PLAYER_IDS: readonly PlayerId[] = ['p1', 'p2']
