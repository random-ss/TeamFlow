import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtime(
  table: string,
  filter: Record<string, any> | null,
  callback: (payload: any) => void
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!filter) return

    const channel = supabase
      .channel(`realtime:${table}:${JSON.stringify(filter)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...filter },
        (payload) => callbackRef.current(payload)
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [table, JSON.stringify(filter)])
}
