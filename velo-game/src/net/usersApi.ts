/**
 * API велосипедистов: регистрация, список, патч профиля, рекорд метров.
 * Метры через RPC set_user_meters — в БД пишется только лучший результат.
 * Сортировка списка — на фронте: sortUsersByCreatedAt / sortUsersByMeters.
 */

import { getSupabase } from '@/net/supabase'

export type VeloUser = {
  id: string
  nick: string
  phone: string | null
  gender: 'male' | 'female'
  meters: number | null
  created_at: string
}

export type CreateUserInput = {
  nick: string
  phone?: string | null
  gender?: 'male' | 'female'
}

export type UpdateUserInput = {
  nick?: string
  phone?: string | null
  gender?: 'male' | 'female'
}

function trimOrNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function requireNick(nick: string): string {
  const trimmed = nick.trim()
  if (trimmed === '') throw new Error('Ник обязателен')
  return trimmed
}

/** Все велосипедисты, без сортировки. */
export async function getUsers(): Promise<VeloUser[]> {
  const { data, error } = await getSupabase().from('users').select('*')

  if (error !== null) throw new Error(error.message)
  return (data ?? []) as VeloUser[]
}

/** Новые сверху. */
export function sortUsersByCreatedAt(users: readonly VeloUser[]): VeloUser[] {
  return [...users].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
}

/**
 * Место в таблице: сколько людей проехали строго больше + 1.
 * `meters` — актуальный лучший результат игрока (не метры одного заезда).
 * selfId не сравниваем с самим собой — иначе после записи рекорда место прыгнет.
 */
export function placeForMeters(
  meters: number,
  users: readonly VeloUser[],
  selfId?: string | null,
): number {
  const better = users.filter((user) => {
    if (selfId !== undefined && selfId !== null && user.id === selfId) return false
    return (user.meters ?? -1) > meters
  }).length
  return better + 1
}

/** Больше метров выше, без результата — в конце. */
export function sortUsersByMeters(users: readonly VeloUser[]): VeloUser[] {
  return [...users].sort((a, b) => {
    if (a.meters === null && b.meters === null) return 0
    if (a.meters === null) return 1
    if (b.meters === null) return -1
    return b.meters - a.meters
  })
}

/** Сохранить нового велосипедиста (регистрация перед заездом). */
export async function createUser(input: CreateUserInput): Promise<VeloUser> {
  const nick = requireNick(input.nick)
  const { data, error } = await getSupabase()
    .from('users')
    .insert({
      nick,
      phone: trimOrNull(input.phone),
      gender: input.gender === 'female' ? 'female' : 'male',
    })
    .select()
    .single()

  if (error !== null) throw new Error(error.message)
  return data as VeloUser
}

/** Патч профиля (ник / телефон / пол). Метры сюда не пишем. */
export async function updateUser(id: string, patch: UpdateUserInput): Promise<VeloUser> {
  const payload: Record<string, string | null> = {}
  if (patch.nick !== undefined) payload.nick = requireNick(patch.nick)
  if (patch.phone !== undefined) payload.phone = trimOrNull(patch.phone)
  if (patch.gender !== undefined) payload.gender = patch.gender === 'female' ? 'female' : 'male'

  if (Object.keys(payload).length === 0) {
    throw new Error('Нечего обновлять')
  }

  const { data, error } = await getSupabase()
    .from('users')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error !== null) throw new Error(error.message)
  return data as VeloUser
}

/**
 * Выставить метры заезду. Если у юзера уже есть результат и он больше —
 * БД оставляет старое значение и возвращает текущую строку.
 */
export async function setUserMeters(id: string, meters: number): Promise<VeloUser> {
  if (!Number.isFinite(meters) || meters < 0) {
    throw new Error('Метры должны быть неотрицательным числом')
  }

  const { data, error } = await getSupabase().rpc('set_user_meters', {
    p_user_id: id,
    p_meters: meters,
  })

  if (error !== null) throw new Error(error.message)
  return data as VeloUser
}
