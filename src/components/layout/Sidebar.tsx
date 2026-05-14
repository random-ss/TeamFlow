import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutGrid, CheckSquare, Settings, LogOut,
  BookText, MessageSquare, ChevronRight, Plus, Info,
  ChevronsUpDown, Users, FolderKanban,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTeam } from '../../contexts/TeamContext'
import { Avatar } from '../ui/UserAvatar'
import { cn } from '../../lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '../ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible'

interface NavChild {
  to: string
  label: string
}

interface NavItem {
  label: string
  icon?: any
  to?: string
  children?: NavChild[]
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Collaborate',
    items: [
      { to: '/posts', icon: LayoutGrid,    label: 'Posts' },
      { to: '/chat',  icon: MessageSquare, label: 'Chat' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/work',     icon: CheckSquare,  label: 'Work' },
      { to: '/projects', icon: FolderKanban, label: 'Projects' },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { to: '/wiki', icon: BookText, label: 'Wiki' },
      { to: '/info', icon: Info,     label: 'Files & Info' },
    ],
  },
  {
    label: 'Other',
    items: [
      {
        label: 'Settings',
        icon: Settings,
        children: [
          { to: '/settings',              label: 'Profile' },
          { to: '/settings/account',      label: 'Account' },
          { to: '/settings/appearance',   label: 'Appearance' },
          { to: '/settings/notifications', label: 'Notifications' },
          { to: '/settings/members',      label: 'Members' },
        ],
      },
    ],
  },
]

function TeamSwitcherMenu({ onClose }: { onClose?: () => void }) {
  const { team, switchTeam, loadAllTeams } = useTeam()
  const navigate = useNavigate()
  const { isMobile } = useSidebar()
  const [teams, setTeams] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    loadAllTeams().then(setTeams).catch(() => {})
  }, [open, loadAllTeams])

  async function handleSwitch(t: any) {
    if (t.id === team?.id) { setOpen(false); return }
    await switchTeam(t.id)
    setOpen(false)
    onClose?.()
    window.location.href = '/posts'
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              tooltip={team?.name}
            >
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-[11px] font-bold shrink-0 overflow-hidden'>
                {team?.logo_url
                  ? <img src={team.logo_url} alt={team.name} className='w-full h-full object-cover' />
                  : team?.name?.[0]?.toUpperCase() || 'T'
                }
              </div>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>{team?.name || 'TeamFlow'}</span>
                <span className='truncate text-xs text-sidebar-foreground/60'>Workspace</span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-56 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className='text-xs text-muted-foreground'>Teams</DropdownMenuLabel>
            {teams.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => handleSwitch(t)}
                className='gap-2 p-2'
              >
                <div className='flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-[10px] font-bold overflow-hidden'>
                  {t.logo_url
                    ? <img src={t.logo_url} alt={t.name} className='w-full h-full object-cover' />
                    : t.name?.[0]?.toUpperCase()
                  }
                </div>
                <span className='truncate'>{t.name}</span>
                {t.id === team?.id && (
                  <span className='ml-auto text-[10px] text-muted-foreground'>Active</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { setOpen(false); navigate('/team-setup'); onClose?.() }}
              className='gap-2 p-2'
            >
              <div className='flex size-6 items-center justify-center rounded-md border bg-background'>
                <Plus className='size-4' />
              </div>
              <span className='font-medium text-muted-foreground'>Create or join team</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function NavUser({ onClose }: { onClose?: () => void }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { isMobile } = useSidebar()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              tooltip={profile?.name}
            >
              <Avatar name={profile?.name} src={profile?.avatar_url} size='sm' className='rounded-lg shrink-0' />
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>{profile?.name}</span>
                <span className='truncate text-xs text-sidebar-foreground/60'>My Account</span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                <Avatar name={profile?.name} src={profile?.avatar_url} size='sm' className='rounded-lg shrink-0' />
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold'>{profile?.name}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { navigate('/settings'); onClose?.() }}>
              <Settings className='size-4' />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { navigate('/settings/members'); onClose?.() }}>
              <Users className='size-4' />
              Members
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant='destructive' onClick={handleSignOut}>
              <LogOut className='size-4' />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function NavGroupItem({ item, href, onClose }: { item: NavItem; href: string; onClose?: () => void }) {
  const { state, isMobile, setOpenMobile } = useSidebar()
  const collapsed = state === 'collapsed' && !isMobile

  function handleClick() {
    setOpenMobile(false)
    onClose?.()
  }

  if (item.children) {
    const isAnyChildActive = item.children.some(
      (c) => href === c.to || href.startsWith(c.to + '/')
    )

    if (collapsed) {
      return (
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                tooltip={item.label}
                isActive={isAnyChildActive}
              >
                {item.icon && <item.icon />}
                <span>{item.label}</span>
                <ChevronRight className='ml-auto size-3 transition-transform group-data-[state=open]:rotate-90' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side='right' align='start' sideOffset={4}>
              <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {item.children.map((sub) => (
                <DropdownMenuItem key={sub.to} asChild>
                  <NavLink to={sub.to} onClick={handleClick} className={({ isActive }) =>
                    isActive ? 'bg-secondary' : ''
                  }>
                    <span>{sub.label}</span>
                  </NavLink>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      )
    }

    return (
      <Collapsible
        asChild
        defaultOpen={isAnyChildActive}
        className='group/collapsible'
      >
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.label} isActive={isAnyChildActive}>
              {item.icon && <item.icon />}
              <span>{item.label}</span>
              <ChevronRight className='ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className='CollapsibleContent'>
            <SidebarMenuSub>
              {item.children.map((sub) => (
                <SidebarMenuSubItem key={sub.to}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={href === sub.to || href.startsWith(sub.to + '/')}
                  >
                    <NavLink to={sub.to} onClick={handleClick}>
                      <span>{sub.label}</span>
                    </NavLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={href === item.to || href.startsWith(item.to + '/')}
        tooltip={item.label}
      >
        <NavLink to={item.to!} onClick={handleClick}>
          {item.icon && <item.icon />}
          <span>{item.label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar({ onMobileClose }: { onMobileClose?: () => void }) {
  const { setOpenMobile } = useSidebar()
  const { pathname } = useLocation()

  function handleClose() {
    setOpenMobile(false)
    onMobileClose?.()
  }

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <TeamSwitcherMenu onClose={handleClose} />
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <NavGroupItem
                  key={item.label || item.to}
                  item={item}
                  href={pathname}
                  onClose={handleClose}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser onClose={handleClose} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
