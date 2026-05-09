import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const appVersion = import.meta.env.VITE_APP_VERSION

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL nao configurada')
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY nao configurada')
}

if (!appVersion) {
  throw new Error('VITE_APP_VERSION nao configurada')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
  global: {
    headers: {
      'x-duocal-version': appVersion,
    },
  },
})
