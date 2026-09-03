/**
 * Клиент Supabase для бэкенда игры (HOFF).
 * URL и anon key — из Vite env; service role сюда не кладём.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (client !== null) return client

  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (typeof url !== 'string' || url === '' || typeof anonKey !== 'string' || anonKey === '') {
    throw new Error('Задай VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env')
  }

  client = createClient(url, anonKey)
  return client
}
