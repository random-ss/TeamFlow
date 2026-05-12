import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

interface TeamContextValue {
  team: any
  members: any[]
  loading: boolean
  isAdmin: boolean
  currentMember: any
  createTeam: (name: string) => Promise<any>
  joinTeam: (invite_code: string) => Promise<any>
  switchTeam: (teamId: string) => Promise<void>
  loadAllTeams: () => Promise<any[]>
  updateTeamLocally: (updates: Record<string, any>) => void
  reloadMembers: () => Promise<void>
}

const TeamContext = createContext<TeamContextValue | null>(null)

const ACTIVE_TEAM_KEY = 'activeTeamId'

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [team, setTeam] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setTeam(null)
      setMembers([])
      setLoading(false)
      return
    }
    loadTeam()
  }, [user?.id])

  useEffect(() => {
    if (!team || !user) return
    loadMembers(team.id)

    const channel = supabase
      .channel(`team-presence:${team.id}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setMembers((prev) =>
          prev.map((m) => ({
            ...m,
            online: Object.values(state).some((presences: any) =>
              presences.some((p: any) => p.user_id === m.user_id)
            ),
          }))
        )
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id })
        }
      })

    return () => supabase.removeChannel(channel)
  }, [team?.id])

  async function loadTeam() {
    setLoading(true)
    try {
      const savedId = localStorage.getItem(ACTIVE_TEAM_KEY)

      if (savedId) {
        const { data: saved } = await supabase
          .from('team_members')
          .select('*, teams(*)')
          .eq('user_id', user.id)
          .eq('team_id', savedId)
          .maybeSingle()

        if (saved?.teams) {
          setTeam(saved.teams)
          setLoading(false)
          return
        }
        localStorage.removeItem(ACTIVE_TEAM_KEY)
      }

      const { data } = await supabase
        .from('team_members')
        .select('*, teams(*)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data?.teams) {
        setTeam(data.teams)
        localStorage.setItem(ACTIVE_TEAM_KEY, data.teams.id)
      } else {
        setTeam(null)
      }
    } catch {
      setTeam(null)
    } finally {
      setLoading(false)
    }
  }

  async function loadMembers(teamId?: string) {
    const id = teamId ?? team?.id
    if (!id) return
    try {
      const { members: data } = await api.getTeamMembers(id)
      setMembers(data || [])
    } catch {}
  }

  async function createTeam(name: string) {
    const { team: newTeam } = await api.createTeam(name)
    localStorage.setItem(ACTIVE_TEAM_KEY, newTeam.id)
    setTeam(newTeam)
    await loadMembers(newTeam.id)
    return newTeam
  }

  async function joinTeam(invite_code: string) {
    const { team: joinedTeam } = await api.joinTeam(invite_code)
    localStorage.setItem(ACTIVE_TEAM_KEY, joinedTeam.id)
    setTeam(joinedTeam)
    await loadMembers(joinedTeam.id)
    return joinedTeam
  }

  async function switchTeam(teamId: string) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*, teams(*)')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .maybeSingle()

      if (error) throw error

      if (data?.teams) {
        localStorage.setItem(ACTIVE_TEAM_KEY, teamId)
        setTeam(data.teams)
        await loadMembers(data.teams.id)
      } else {
        toast.error('Could not switch team — membership not found.')
      }
    } catch (err: any) {
      console.error('[TeamFlow] switchTeam error:', err.message)
      toast.error('Failed to switch team.')
    }
  }

  async function loadAllTeams() {
    try {
      const { data } = await supabase
        .from('team_members')
        .select('*, teams(*)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
      return (data || []).map((row: any) => row.teams).filter(Boolean)
    } catch {
      return []
    }
  }

  function updateTeamLocally(updates: Record<string, any>) {
    setTeam((prev: any) => prev ? { ...prev, ...updates } : prev)
  }

  const currentMember = members.find((m) => m.user_id === user?.id)
  const isAdmin = currentMember?.role === 'admin'

  return (
    <TeamContext.Provider value={{
      team,
      members,
      loading,
      isAdmin,
      currentMember,
      createTeam,
      joinTeam,
      switchTeam,
      loadAllTeams,
      updateTeamLocally,
      reloadMembers: () => loadMembers(),
    }}>
      {children}
    </TeamContext.Provider>
  )
}

export const useTeam = () => {
  const ctx = useContext(TeamContext)
  if (!ctx) throw new Error('useTeam must be inside TeamProvider')
  return ctx
}
