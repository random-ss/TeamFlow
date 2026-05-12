import { useLocation } from 'react-router-dom'
import { AppSidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { SidebarInset, SidebarProvider } from '../ui/sidebar'
import { type ReactNode } from 'react'

const TITLES: Record<string, string> = {
  '/posts':    'Posts',
  '/work':     'Work',
  '/projects': 'Projects',
  '/info':     'Files & Info',
  '/chat':     'Chat',
  '/wiki':     'Wiki',
  '/settings': 'Settings',
  '/settings/account':       'Settings · Account',
  '/settings/appearance':    'Settings · Appearance',
  '/settings/notifications': 'Settings · Notifications',
  '/settings/members':       'Settings · Members',
}

function getDefaultOpen() {
  try {
    const cookie = document.cookie.split('; ').find((r) => r.startsWith('sidebar_state='))
    return cookie ? cookie.split('=')[1] !== 'false' : true
  } catch {
    return true
  }
}

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation()
  const title = TITLES[pathname]
    ?? Object.entries(TITLES).find(([k]) => pathname.startsWith(k))?.[1]
    ?? 'TeamFlow'

  return (
    <SidebarProvider defaultOpen={getDefaultOpen()}>
      <AppSidebar />
      <SidebarInset>
        <TopBar title={title} />
        <main
          className={`flex-1 min-h-0 ${
            pathname === '/chat' ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain'
          }`}
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
