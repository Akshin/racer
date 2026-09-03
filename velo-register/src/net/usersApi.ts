/**
 * Регистрация велосипедиста в ту же таблицу users, что читает velo-game.
 */

import { getSupabase } from '@/net/supabase'

export type VeloUser = {
  id: string
  nick: string
  email: string | null
  phone: string | null
  meters: number | null
  created_at: string
}

export type CreateUserInput = {
  nick: string
  email?: string | null
  phone?: string | null
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

/** Сохранить нового велосипедиста — сразу появится на лидерборде зала. */
export async function createUser(input: CreateUserInput): Promise<VeloUser> {
  const nick = requireNick(input.nick)
  const { data, error } = await getSupabase()
    .from('users')
    .insert({
      nick,
      email: trimOrNull(input.email),
      phone: trimOrNull(input.phone),
    })
    .select()
    .single()

  if (error !== null) throw new Error(error.message)
  return data as VeloUser
}
