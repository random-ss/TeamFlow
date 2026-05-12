import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  user: any
  profile: any
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<{ data: any; error: any }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: Record<string, any>) => Promise<{ data: any; error: any }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id, session.user)
        } else {
          setLoading(false)
        }
      })
      .catch(() => {
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string, authUser: any) {
    try {
      let { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!data) {
        const name =
          authUser?.user_metadata?.full_name ||
          authUser?.user_metadata?.name ||
          authUser?.email?.split('@')[0] ||
          'User'
        const avatar_url = authUser?.user_metadata?.avatar_url || null
        const { data: created } = await supabase
          .from('profiles')
          .upsert({ id: userId, name, avatar_url }, { onConflict: 'id' })
          .select()
          .single()
        data = created
      }

      setProfile(data)
    } catch (err: any) {
      console.error('[TeamFlow] fetchProfile error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (error) return { data: null, error }
    return { data, error: null }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { data: null, error }
    return { data, error: null }
  }

  async function signOut() {
    localStorage.removeItem('activeTeamId')
    await supabase.auth.signOut()
  }

  async function updateProfile(updates: Record<string, any>) {
    if (!user) return { data: null, error: new Error('Not authenticated') }
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (!error) setProfile(data)
    return { data, error }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signUp, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
