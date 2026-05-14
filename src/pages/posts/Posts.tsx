import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, X, LayoutGrid } from 'lucide-react'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { useRealtime } from '../../hooks/useRealtime'
import { PostCard } from './PostCard'
import { NewPostModal } from './NewPostModal'
import { EmptyState } from '../../components/ui/EmptyState'
import { FacetedFilter } from '../../components/ui/FacetedFilter'
import { PLATFORMS, POST_STATUSES } from '../../lib/constants'

export default function Posts() {
  const { team, members } = useTeam()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState({ platform: [] as string[], status: [] as string[], author_id: [] as string[] })

  const loadPosts = useCallback(async () => {
    if (!team) return
    setLoading(true)
    try {
      const { posts: data } = await api.getPosts(team.id, {})
      setPosts(data || [])
    } finally {
      setLoading(false)
    }
  }, [team?.id])

  useEffect(() => { loadPosts() }, [loadPosts])
  useRealtime('posts', team ? { filter: `team_id=eq.${team.id}` } : null, () => loadPosts())

  function handleCreated(post: any) {
    if (post.visibility !== 'private') {
      setPosts((prev) => [{ ...post, post_images: [], post_reactions: [], comments: [] }, ...prev])
    }
  }

  function handleUpdate(updatedPost: any) {
    if (updatedPost) {
      setPosts((prev) => prev.map((p) => p.id === updatedPost.id ? { ...p, ...updatedPost } : p))
    } else {
      loadPosts()
    }
  }

  function handleDelete(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  const activeFilters = filters.platform.length > 0 || filters.status.length > 0 || filters.author_id.length > 0

  const platformCounts = useMemo(() =>
    posts.reduce((acc, p) => { acc[p.platform] = (acc[p.platform] || 0) + 1; return acc }, {} as Record<string, number>)
  , [posts])

  const statusCounts = useMemo(() =>
    posts.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc }, {} as Record<string, number>)
  , [posts])

  const authorCounts = useMemo(() =>
    posts.reduce((acc, p) => { acc[p.author_id] = (acc[p.author_id] || 0) + 1; return acc }, {} as Record<string, number>)
  , [posts])

  const displayedPosts = useMemo(() => {
    let result = [...posts].sort((a, b) => {
      const aPosted = a.status === 'posted'
      const bPosted = b.status === 'posted'
      if (aPosted !== bPosted) return aPosted ? 1 : -1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    if (filters.platform.length > 0) result = result.filter((p) => filters.platform.includes(p.platform))
    if (filters.status.length > 0) result = result.filter((p) => filters.status.includes(p.status))
    if (filters.author_id.length > 0) result = result.filter((p) => filters.author_id.includes(p.author_id))
    return result
  }, [posts, filters])

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">Team Feed</h2>
          <p className="section-subtitle mt-0.5">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <FacetedFilter
          title="Platform"
          values={filters.platform}
          onChange={(v) => setFilters((f) => ({ ...f, platform: v }))}
          options={PLATFORMS.map((p: any) => ({ label: p.label, value: p.id, count: platformCounts[p.id] }))}
        />
        <FacetedFilter
          title="Status"
          values={filters.status}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          options={POST_STATUSES.map((s: any) => ({ label: s.label, value: s.id, count: statusCounts[s.id] }))}
        />
        <FacetedFilter
          title="Author"
          values={filters.author_id}
          onChange={(v) => setFilters((f) => ({ ...f, author_id: v }))}
          options={members.map((m: any) => ({ label: m.profiles?.name || 'Unknown', value: m.user_id, count: authorCounts[m.user_id] }))}
        />
        {activeFilters && (
          <button
            onClick={() => setFilters({ platform: [], status: [], author_id: [] })}
            className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Reset
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {!loading && posts.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No posts yet"
          description="Create your first post to get the team's content pipeline moving."
          action={
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Create first post
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {displayedPosts.map((post, i) => (
            <div key={post.id} className="animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
              <PostCard post={post} onUpdate={handleUpdate} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}

      <NewPostModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
