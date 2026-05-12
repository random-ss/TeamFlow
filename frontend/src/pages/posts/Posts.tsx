import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Filter, X, LayoutGrid } from 'lucide-react'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { useRealtime } from '../../hooks/useRealtime'
import { PostCard } from './PostCard'
import { NewPostModal } from './NewPostModal'
import { EmptyState } from '../../components/ui/EmptyState'
import { PLATFORMS, POST_STATUSES } from '../../lib/constants'

export default function Posts() {
  const { team, members } = useTeam()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState({ platform: '', status: '', author_id: '' })

  const loadPosts = useCallback(async () => {
    if (!team) return
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filters.platform) params.platform = filters.platform
      if (filters.status) params.status = filters.status
      if (filters.author_id) params.author_id = filters.author_id
      const { posts: data } = await api.getPosts(team.id, params)
      setPosts(data || [])
    } finally {
      setLoading(false)
    }
  }, [team?.id, filters.platform, filters.status, filters.author_id])

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

  const activeFilters = filters.platform || filters.status || filters.author_id

  const displayedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      const aPosted = a.status === 'posted'
      const bPosted = b.status === 'posted'
      if (aPosted !== bPosted) return aPosted ? 1 : -1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [posts])

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
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Filter className="w-3.5 h-3.5" />
          Filter
        </span>
        <select
          value={filters.platform}
          onChange={(e) => setFilters((f) => ({ ...f, platform: e.target.value }))}
          className="filter-select"
        >
          <option value="">All platforms</option>
          {PLATFORMS.map((p: any) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="filter-select"
        >
          <option value="">All statuses</option>
          {POST_STATUSES.map((s: any) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select
          value={filters.author_id}
          onChange={(e) => setFilters((f) => ({ ...f, author_id: e.target.value }))}
          className="filter-select"
        >
          <option value="">All members</option>
          {members.map((m: any) => (
            <option key={m.user_id} value={m.user_id}>{m.profiles?.name}</option>
          ))}
        </select>
        {activeFilters && (
          <button
            onClick={() => setFilters({ platform: '', status: '', author_id: '' })}
            className="btn-ghost text-xs"
          >
            <X className="w-3 h-3" />
            Clear
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
