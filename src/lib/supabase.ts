import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
) as string

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[TeamFlow] Missing Supabase env vars.\n' +
    'Make sure frontend/.env contains:\n' +
    '  VITE_SUPABASE_URL=https://xxxx.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=eyJ...'
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '')
