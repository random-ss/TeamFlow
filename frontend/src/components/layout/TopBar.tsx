import { useState, useRef, useEffect } from 'react'
import { Bell, Sun, Moon, Search, X, FileText, CheckSquare, FolderKanban } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { Avatar } from '../ui/UserAvatar'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { SidebarTrigger } from '../ui/sidebar'
import { cn } from '../../lib/utils'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

interface TopBarProps {
  title: string
}

export function TopBar({ title }: TopBarProps) {
  const { dark, toggleDark } = useTheme()
  const { profile } = useAuth()
  const { team } = useTeam()
  const navigate = useNavigate()

  const [showNotifs, setShowNotifs] = useState(false)
  const [notifs, setNotifs] = useState<any[]>([])
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    api.getNotifications()
      .then(({ notifications }) => setUnread((notifications || []).filter((n: any) => !n.read).length))
      .catch(() => {})
  }, [])

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const notifsRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 280)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchResults(null)
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!debouncedQuery.trim() || !team) { setSearchResults(null); return }
    runSearch(debouncedQuery.trim())
  }, [debouncedQuery, team?.id])

  async function runSearch(q: string) {
    setSearching(true)
    const pattern = `%${q}%`
    const [postsRes, tasksRes, projectsRes] = await Promise.all([
      supabase.from('posts').select('id, caption, status').eq('team_id', team.id).ilike('caption', pattern).limit(5),
      supabase.from('tasks').select('id, title, status, priority').eq('team_id', team.id).ilike('title', pattern).limit(5),
      supabase.from('projects').select('id, name, status').eq('team_id', team.id).ilike('name', pattern).limit(5),
    ])
    setSearchResults({
      posts: postsRes.data || [],
      tasks: tasksRes.data || [],
      projects: projectsRes.data || [],
    })
    setSearching(false)
  }

  function handleResultClick(type: string) {
    setQuery('')
    setSearchResults(null)
    if (type === 'post') navigate('/posts')
    else if (type === 'task') navigate('/work')
    else if (type === 'project') navigate('/projects')
  }

  async function openNotifs() {
    if (!showNotifs) {
      const { notifications } = await api.getNotifications()
      setNotifs(notifications || [])
      setUnread(notifications?.filter((n: any) => !n.read).length || 0)
    }
    setShowNotifs((v) => !v)
  }

  async function markAllRead() {
    await api.markAllRead()
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnread(0)
  }

  const hasResults = searchResults &&
    (searchResults.posts.length + searchResults.tasks.length + (searchResults.projects?.length ?? 0)) > 0

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-4 sticky top-0 z-30">
      <SidebarTrigger className="-ml-1 text-foreground" />

      <div className="h-4 w-px bg-border" />

      <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-foreground">
        {title}
      </h1>

      {/* Search */}
      <div ref={searchRef} className="relative hidden w-52 sm:block lg:w-64">
        <div className={cn(
          'flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm',
          'transition-[color,box-shadow] duration-150',
          'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50'
        )}>
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSearchResults(null) }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {query && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md animate-fade-up">
            {searching ? (
              <div className="px-4 py-3 text-center text-sm text-muted-foreground">Searching…</div>
            ) : hasResults ? (
              <div className="max-h-72 overflow-y-auto">
                {searchResults.posts.length > 0 && (
                  <div>
                    <div className="bg-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Posts</div>
                    {searchResults.posts.map((p: any) => (
                      <button key={p.id} onClick={() => handleResultClick('post')} className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate text-sm">{p.caption || '(no caption)'}</span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{p.status}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.tasks.length > 0 && (
                  <div>
                    <div className="bg-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tasks</div>
                    {searchResults.tasks.map((t: any) => (
                      <button key={t.id} onClick={() => handleResultClick('task')} className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground">
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate text-sm">{t.title}</span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{t.status}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.projects?.length > 0 && (
                  <div>
                    <div className="bg-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Projects</div>
                    {searchResults.projects.map((p: any) => (
                      <button key={p.id} onClick={() => handleResultClick('project')} className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground">
                        <FolderKanban className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate text-sm">{p.name}</span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{p.status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 py-3 text-center text-sm text-muted-foreground">No results for "{query}"</div>
            )}
          </div>
        )}
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={toggleDark}
        className="btn-icon text-muted-foreground hover:text-foreground"
        aria-label="Toggle theme"
      >
        {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Notifications */}
      <div className="relative" ref={notifsRef}>
        <button onClick={openNotifs} className="btn-icon relative text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 h-[7px] w-[7px] rounded-full bg-destructive ring-2 ring-background" />
          )}
        </button>

        {showNotifs && (
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md animate-fade-up">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No notifications</p>
              ) : (
                notifs.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'flex items-start gap-3 border-b border-border px-4 py-3 last:border-0',
                      !n.read && 'bg-accent/40'
                    )}
                  >
                    {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    <div className={!n.read ? '' : 'ml-[18px]'}>
                      <p className="text-sm">{n.content}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Profile */}
      <button
        onClick={() => navigate('/settings')}
        className="shrink-0 rounded-full ring-2 ring-transparent hover:ring-border transition-all duration-150"
      >
        <Avatar name={profile?.name} src={profile?.avatar_url} size="sm" />
      </button>
    </header>
  )
}
