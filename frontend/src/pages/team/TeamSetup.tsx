import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTeam } from '../../contexts/TeamContext'
import { useAuth } from '../../contexts/AuthContext'
import { Users, Plus, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TeamSetup() {
  const { createTeam, joinTeam } = useTeam()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('create')

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Team name required')
    setLoading(true)
    try {
      await createTeam(name.trim())
      toast.success('Team created!')
      navigate('/posts')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return toast.error('Invite code required')
    setLoading(true)
    try {
      await joinTeam(code.trim().toUpperCase())
      toast.success('Joined team!')
      navigate('/posts')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <button
        onClick={handleSignOut}
        className="absolute top-4 right-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        Sign out
      </button>
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/25">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Set up your workspace</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Create a new team or join an existing one</p>
        </div>

        <div className="card overflow-hidden">
          <div className="flex border-b border-border">
            {['create', 'join'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-medium transition-all duration-150 ${
                  tab === t
                    ? 'text-primary border-b-2 border-primary -mb-px'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'create' ? 'Create a Team' : 'Join a Team'}
              </button>
            ))}
          </div>

          <div className="p-7">
            {tab === 'create' ? (
              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Team name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Acme Marketing Team"
                    className="input"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                  <Plus className="w-4 h-4" />
                  {loading ? 'Creating…' : 'Create Team'}
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  An invite code will be generated automatically for sharing with teammates
                </p>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Invite code</label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AB12CD"
                    maxLength={6}
                    className="input font-mono text-center text-lg tracking-widest uppercase"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                  {loading ? 'Joining…' : 'Join Team'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
