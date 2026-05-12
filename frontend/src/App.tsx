import { lazy, Suspense, Component, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { TeamProvider, useTeam } from './contexts/TeamContext'
import { Layout } from './components/layout/Layout'

const Login = lazy(() => import('./pages/auth/Login'))
const Signup = lazy(() => import('./pages/auth/Signup'))
const TeamSetup = lazy(() => import('./pages/team/TeamSetup'))
const Posts = lazy(() => import('./pages/posts/Posts'))
const Work = lazy(() => import('./pages/work/Work'))
const Projects = lazy(() => import('./pages/projects/Projects'))
const ProjectDetail = lazy(() => import('./pages/projects/ProjectDetail'))
const Settings = lazy(() => import('./pages/settings/Settings'))
const InfoPage = lazy(() => import('./pages/info/InfoPage'))
const Chat = lazy(() => import('./pages/chat/Chat'))
const WikiPage = lazy(() => import('./pages/wiki/WikiPage'))

interface ErrorBoundaryState { error: Error | null }

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full bg-card rounded-2xl border border-destructive/30 p-6 shadow-lg">
            <h1 className="text-base font-semibold text-destructive mb-1">Something went wrong</h1>
            <p className="text-xs text-muted-foreground mb-3">
              Check the browser console for details, or reload the page.
            </p>
            <pre className="text-xs text-muted-foreground bg-muted rounded-lg p-3 overflow-auto whitespace-pre-wrap mb-4 max-h-40">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function Spinner() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-primary/15" />
        <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-xs text-muted-foreground">Loading…</p>
    </div>
  )
}

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[360px] gap-3">
      <div className="relative w-9 h-9">
        <div className="absolute inset-0 rounded-full border-2 border-primary/15" />
        <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-xs text-muted-foreground">Loading…</p>
    </div>
  )
}

function ProtectedRoutes() {
  const { user, loading: authLoading } = useAuth()
  const { team, loading: teamLoading } = useTeam()

  if (authLoading || teamLoading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (!team) return <Navigate to="/team-setup" replace />

  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/posts" element={<Posts />} />
          <Route path="/work" element={<Work />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
          <Route path="/info" element={<InfoPage />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/wiki" element={<WikiPage />} />
          <Route path="/settings/*" element={<Settings />} />
          <Route path="*" element={<Navigate to="/posts" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

function GuestRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (user) return <Navigate to="/posts" replace />
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <TeamProvider>
            <Suspense fallback={<Spinner />}>
              <Routes>
                <Route path="/login" element={<><GuestRoutes /><Login /></>} />
                <Route path="/signup" element={<><GuestRoutes /><Signup /></>} />
                <Route path="/team-setup" element={<TeamSetup />} />
                <Route path="/*" element={<ProtectedRoutes />} />
              </Routes>
            </Suspense>
          </TeamProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
