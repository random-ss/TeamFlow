import { useState, useRef } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  UserCog, Wrench, Palette, Bell, Users, Crown, Shield,
  Copy, Check, Camera, Loader2, Trash2, Moon, Sun,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTeam } from '../../contexts/TeamContext'
import { Avatar } from '../../components/ui/UserAvatar'
import { api } from '../../lib/api'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { Button } from '../../components/ui/button'
import { Separator } from '../../components/ui/separator'
import { Switch } from '../../components/ui/switch'
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

const sidebarNavItems = [
  { title: 'Profile',       href: '/settings',              icon: UserCog },
  { title: 'Account',       href: '/settings/account',      icon: Wrench },
  { title: 'Appearance',    href: '/settings/appearance',   icon: Palette },
  { title: 'Notifications', href: '/settings/notifications', icon: Bell },
  { title: 'Members',       href: '/settings/members',      icon: Users },
]

function SidebarNav({ items }: { items: typeof sidebarNavItems }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <>
      <div className='p-1 md:hidden'>
        <Select value={pathname} onValueChange={(v) => navigate(v)}>
          <SelectTrigger className='h-12 w-full'>
            <SelectValue placeholder='Select section' />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.href} value={item.href}>
                <div className='flex items-center gap-3 px-2 py-1'>
                  <item.icon className='size-4' />
                  <span>{item.title}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav className='hidden md:flex md:flex-col md:space-y-1'>
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className='size-4 shrink-0' />
              {item.title}
            </Link>
          )
        })}
      </nav>
    </>
  )
}

function ContentSection({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className='flex flex-1 flex-col min-w-0'>
      <div>
        <h3 className='text-lg font-medium'>{title}</h3>
        <p className='text-sm text-muted-foreground'>{desc}</p>
      </div>
      <Separator className='my-4' />
      <div className='max-w-xl space-y-6'>{children}</div>
    </div>
  )
}

function ProfileSection() {
  const { profile, updateProfile } = useAuth()
  const { currentMember } = useTeam()
  const [name, setName] = useState(profile?.name || '')
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const { url } = await uploadToCloudinary(file, 'teamflow/avatars')
      await updateProfile({ avatar_url: url })
      toast.success('Profile photo updated!')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { error } = await updateProfile({ name: name.trim() })
    setSaving(false)
    if (error) toast.error(error.message)
    else toast.success('Profile updated!')
  }

  return (
    <ContentSection title='Profile' desc='This is how others will see you on the site.'>
      <form onSubmit={handleSave} className='space-y-6'>
        <div className='flex items-center gap-5'>
          <button
            type='button'
            onClick={() => fileInputRef.current?.click()}
            className='relative group shrink-0'
          >
            <Avatar name={profile?.name} src={profile?.avatar_url} size='xl' />
            <div className='absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'>
              {uploadingPhoto
                ? <Loader2 className='w-5 h-5 text-white animate-spin' />
                : <Camera className='w-4 h-4 text-white' />
              }
            </div>
          </button>
          <input ref={fileInputRef} type='file' accept='image/*' className='hidden' onChange={handlePhotoUpload} />
          <div>
            <p className='text-sm font-semibold'>{profile?.name}</p>
            <p className='text-xs text-muted-foreground mt-0.5'>Click avatar to change photo</p>
            {currentMember?.role === 'admin' && (
              <span className='mt-1 inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full font-medium'>
                <Crown className='w-3 h-3' /> Admin
              </span>
            )}
          </div>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='name'>Display name</Label>
          <input
            id='name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='input'
            required
          />
          <p className='text-xs text-muted-foreground'>This is your public display name.</p>
        </div>

        <Button type='submit' disabled={saving}>
          {saving ? 'Saving…' : 'Update profile'}
        </Button>
      </form>
    </ContentSection>
  )
}

function AccountSection() {
  const { team, isAdmin, updateTeamLocally } = useTeam()
  const [teamName, setTeamName] = useState(team?.name || '')
  const [savingTeam, setSavingTeam] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deletingTeam, setDeletingTeam] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !isAdmin) return
    setUploadingLogo(true)
    try {
      const { url } = await uploadToCloudinary(file, 'teamflow/logos')
      await api.updateTeam(team.id, { logo_url: url })
      updateTeamLocally({ logo_url: url })
      toast.success('Team logo updated!')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  async function handleSaveTeamName(e: React.FormEvent) {
    e.preventDefault()
    if (!teamName.trim() || !isAdmin) return
    setSavingTeam(true)
    try {
      await api.updateTeam(team.id, { name: teamName.trim() })
      updateTeamLocally({ name: teamName.trim() })
      toast.success('Team name updated!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingTeam(false)
    }
  }

  async function copyInviteCode() {
    await navigator.clipboard.writeText(team?.invite_code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Invite code copied!')
  }

  async function handleDeleteTeam() {
    const confirmed = confirm(`Delete "${team.name}"? This will permanently remove the team and all its data.`)
    if (!confirmed) return
    const doubleConfirm = confirm('Are you absolutely sure? All tasks, posts, and projects will be deleted forever.')
    if (!doubleConfirm) return
    setDeletingTeam(true)
    try {
      await api.deleteTeam(team.id)
      toast.success('Team deleted.')
      navigate('/team-setup')
    } catch (err: any) {
      toast.error(err.message)
      setDeletingTeam(false)
    }
  }

  return (
    <ContentSection title='Account' desc='Manage your team workspace settings.'>
      <div className='space-y-6'>
        {/* Team Logo */}
        <div className='space-y-2'>
          <Label>Team logo</Label>
          <div className='flex items-center gap-4'>
            <button
              type='button'
              onClick={() => isAdmin && logoInputRef.current?.click()}
              className={`relative group shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 border-border flex items-center justify-center bg-muted ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {team?.logo_url ? (
                <img src={team.logo_url} alt={team.name} className='w-full h-full object-cover' />
              ) : (
                <span className='text-2xl font-bold text-muted-foreground'>{team?.name?.[0]?.toUpperCase() || 'T'}</span>
              )}
              {isAdmin && (
                <div className='absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'>
                  {uploadingLogo
                    ? <Loader2 className='w-5 h-5 text-white animate-spin' />
                    : <Camera className='w-4 h-4 text-white' />
                  }
                </div>
              )}
            </button>
            <input ref={logoInputRef} type='file' accept='image/*' className='hidden' onChange={handleLogoUpload} />
            <div>
              <p className='text-sm font-medium'>{team?.name}</p>
              {isAdmin ? (
                <p className='text-xs text-muted-foreground mt-0.5'>Click to change team logo</p>
              ) : (
                <p className='text-xs text-muted-foreground mt-0.5'>Only admins can change the logo</p>
              )}
            </div>
          </div>
        </div>

        {isAdmin ? (
          <form onSubmit={handleSaveTeamName} className='space-y-2'>
            <Label htmlFor='team-name'>Team name</Label>
            <div className='flex gap-2'>
              <input
                id='team-name'
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className='input flex-1'
                required
              />
              <Button type='submit' variant='outline' disabled={savingTeam}>
                {savingTeam ? 'Saving…' : 'Update'}
              </Button>
            </div>
          </form>
        ) : (
          <div className='space-y-2'>
            <Label>Team name</Label>
            <p className='text-sm font-medium'>{team?.name}</p>
          </div>
        )}

        {team && (
          <div className='space-y-2'>
            <Label>Invite code</Label>
            <div className='flex items-center gap-2'>
              <div className='flex-1 bg-muted border border-border rounded-lg px-4 py-3 font-mono text-xl font-bold tracking-[0.3em] text-center text-primary select-all'>
                {team.invite_code}
              </div>
              <Button type='button' variant='outline' onClick={copyInviteCode}>
                {copied ? <Check className='w-4 h-4 text-emerald-500' /> : <Copy className='w-4 h-4' />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <p className='text-xs text-muted-foreground'>
              Share this code with teammates to let them join your workspace.
            </p>
          </div>
        )}

        {isAdmin && (
          <div className='rounded-lg border border-destructive/30 p-4 space-y-3'>
            <div>
              <h4 className='text-sm font-medium text-destructive'>Danger Zone</h4>
              <p className='text-xs text-muted-foreground mt-0.5'>
                Permanently delete this team and all its content. This cannot be undone.
              </p>
            </div>
            <Button
              variant='destructive'
              size='sm'
              onClick={handleDeleteTeam}
              disabled={deletingTeam}
            >
              {deletingTeam ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <Trash2 className='w-3.5 h-3.5' />}
              {deletingTeam ? 'Deleting…' : 'Delete team'}
            </Button>
          </div>
        )}
      </div>
    </ContentSection>
  )
}

function AppearanceSection() {
  const { dark, toggleDark } = useTheme()

  return (
    <ContentSection title='Appearance' desc='Customize the look and feel of the interface.'>
      <div className='space-y-6'>
        <div className='space-y-3'>
          <Label>Theme</Label>
          <p className='text-sm text-muted-foreground'>Select the theme for the dashboard.</p>
          <RadioGroup
            value={dark ? 'dark' : 'light'}
            onValueChange={(v) => { if ((v === 'dark') !== dark) toggleDark() }}
            className='grid grid-cols-2 gap-6 max-w-sm pt-1'
          >
            <div>
              <Label className='[&:has([data-state=checked])>div]:border-primary cursor-pointer'>
                <RadioGroupItem value='light' className='sr-only' />
                <div className='rounded-md border-2 border-muted p-1 hover:border-accent transition-colors'>
                  <div className='space-y-2 rounded-sm bg-[#ecedef] p-2'>
                    <div className='space-y-2 rounded-md bg-white p-2 shadow-xs'>
                      <div className='h-2 w-20 rounded-lg bg-[#ecedef]' />
                      <div className='h-2 w-16 rounded-lg bg-[#ecedef]' />
                    </div>
                    <div className='flex items-center gap-2 rounded-md bg-white p-2 shadow-xs'>
                      <div className='h-4 w-4 rounded-full bg-[#ecedef]' />
                      <div className='h-2 w-16 rounded-lg bg-[#ecedef]' />
                    </div>
                  </div>
                </div>
                <span className='block w-full p-2 text-center text-sm font-normal'>Light</span>
              </Label>
            </div>
            <div>
              <Label className='[&:has([data-state=checked])>div]:border-primary cursor-pointer'>
                <RadioGroupItem value='dark' className='sr-only' />
                <div className='rounded-md border-2 border-muted bg-popover p-1 hover:bg-accent hover:text-accent-foreground transition-colors'>
                  <div className='space-y-2 rounded-sm bg-slate-950 p-2'>
                    <div className='space-y-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                      <div className='h-2 w-20 rounded-lg bg-slate-400' />
                      <div className='h-2 w-16 rounded-lg bg-slate-400' />
                    </div>
                    <div className='flex items-center gap-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                      <div className='h-4 w-4 rounded-full bg-slate-400' />
                      <div className='h-2 w-16 rounded-lg bg-slate-400' />
                    </div>
                  </div>
                </div>
                <span className='block w-full p-2 text-center text-sm font-normal'>Dark</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Button onClick={toggleDark}>
          {dark ? <Sun className='w-4 h-4' /> : <Moon className='w-4 h-4' />}
          Switch to {dark ? 'light' : 'dark'} mode
        </Button>
      </div>
    </ContentSection>
  )
}

function NotificationsSection() {
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [pushNotifs, setPushNotifs] = useState(false)
  const [taskUpdates, setTaskUpdates] = useState(true)
  const [mentions, setMentions] = useState(true)
  const [projectUpdates, setProjectUpdates] = useState(false)

  return (
    <ContentSection title='Notifications' desc='Configure how you receive notifications.'>
      <div className='space-y-4'>
        <h4 className='text-sm font-medium'>Email Notifications</h4>

        {[
          { label: 'Task updates', desc: 'Get notified when tasks are assigned or updated.', value: taskUpdates, onChange: setTaskUpdates },
          { label: 'Mentions', desc: 'Get notified when someone mentions you.', value: mentions, onChange: setMentions },
          { label: 'Project updates', desc: 'Get notified about project status changes.', value: projectUpdates, onChange: setProjectUpdates },
          { label: 'Email digest', desc: 'Receive a daily email summary.', value: emailNotifs, onChange: setEmailNotifs },
          { label: 'Push notifications', desc: 'Receive push notifications in your browser.', value: pushNotifs, onChange: setPushNotifs },
        ].map(({ label, desc, value, onChange }) => (
          <div key={label} className='flex items-center justify-between rounded-lg border p-4'>
            <div className='space-y-0.5'>
              <p className='text-sm font-medium'>{label}</p>
              <p className='text-xs text-muted-foreground'>{desc}</p>
            </div>
            <Switch checked={value} onCheckedChange={onChange} />
          </div>
        ))}

        <Button>Save preferences</Button>
      </div>
    </ContentSection>
  )
}

function MembersSection() {
  const { profile } = useAuth()
  const { team, members, isAdmin, reloadMembers } = useTeam()

  async function handleRemoveMember(userId: string) {
    if (!confirm('Remove this member from the team?')) return
    try {
      await api.removeMember(team.id, userId)
      await reloadMembers()
      toast.success('Member removed')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleChangeRole(userId: string, newRole: string) {
    try {
      await api.updateMemberRole(team.id, userId, newRole)
      await reloadMembers()
      toast.success(`Role updated to ${newRole}`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <ContentSection title='Team Members' desc={`Manage the ${members.length} members in your workspace.`}>
      <div className='space-y-1'>
        {members.map((m: any) => {
          const isMe = m.user_id === profile?.id
          const isThisAdmin = m.role === 'admin'
          return (
            <div key={m.id} className='flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors'>
              <Avatar name={m.profiles?.name} src={m.profiles?.avatar_url} size='sm' />
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <p className='text-sm font-medium truncate'>{m.profiles?.name}</p>
                  {isThisAdmin ? (
                    <span className='inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full font-medium'>
                      <Crown className='w-2.5 h-2.5' /> Admin
                    </span>
                  ) : (
                    <span className='inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-medium'>
                      <Shield className='w-2.5 h-2.5' /> Member
                    </span>
                  )}
                  {isMe && <span className='text-[10px] text-muted-foreground'>(you)</span>}
                </div>
              </div>
              {isAdmin && !isMe && (
                <div className='flex items-center gap-1 shrink-0'>
                  <button
                    onClick={() => handleChangeRole(m.user_id, isThisAdmin ? 'member' : 'admin')}
                    className='text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent'
                  >
                    {isThisAdmin ? 'Make member' : 'Make admin'}
                  </button>
                  <button
                    onClick={() => handleRemoveMember(m.user_id)}
                    className='text-xs text-destructive hover:text-destructive/80 transition-colors px-2 py-1 rounded-md hover:bg-destructive/10'
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ContentSection>
  )
}

export default function Settings() {
  return (
    <div className='p-4 sm:p-6 max-w-5xl mx-auto'>
      <div className='space-y-0.5'>
        <h1 className='text-2xl font-bold tracking-tight'>Settings</h1>
        <p className='text-muted-foreground'>Manage your account settings and preferences.</p>
      </div>
      <Separator className='my-6' />
      <div className='flex flex-col lg:flex-row lg:gap-12'>
        <aside className='lg:w-1/5 lg:sticky lg:top-0 mb-6 lg:mb-0'>
          <SidebarNav items={sidebarNavItems} />
        </aside>

        <div className='flex-1 min-w-0'>
          <Routes>
            <Route index element={<ProfileSection />} />
            <Route path='account' element={<AccountSection />} />
            <Route path='appearance' element={<AppearanceSection />} />
            <Route path='notifications' element={<NotificationsSection />} />
            <Route path='members' element={<MembersSection />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
