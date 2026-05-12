import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, format } from 'date-fns'
import { ThumbsUp, MessageSquare, PenLine, CheckCircle, Calendar, ChevronDown, ChevronUp, Trash2, Send, Download, Pencil } from 'lucide-react'
import { Avatar } from '../../components/ui/UserAvatar'
import { Badge } from '../../components/ui/badge'
import { GlowingCard } from '../../components/aceternity/GlowingCard'
import { NewPostModal } from './NewPostModal'
import { PLATFORMS, POST_STATUSES } from '../../lib/constants'
import { PLATFORM_ICONS } from '../../components/icons/PlatformIcons'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { useTeam } from '../../contexts/TeamContext'
import toast from 'react-hot-toast'

export function PostCard({ post, onUpdate, onDelete }: {
  post: any
  onUpdate?: (updated?: any) => void
  onDelete?: (id: string) => void
}) {
  const { user } = useAuth()
  const { isAdmin, team } = useTeam()
  const [showComments, setShowComments] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [comments, setComments] = useState(post.comments || [])
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [showSuggestBox, setShowSuggestBox] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [sendingSuggestion, setSendingSuggestion] = useState(false)
  const suggestInputRef = useRef<HTMLInputElement>(null)

  const isOwner = post.author_id === user?.id
  const statusInfo = POST_STATUSES.find((s: any) => s.id === post.status)

  async function react(type: string) {
    try { await api.reactToPost(post.id, type); onUpdate?.() } catch {}
  }

  async function handleSuggestEdit() {
    if (showSuggestBox) {
      setShowSuggestBox(false)
      setSuggestion('')
      return
    }
    setShowSuggestBox(true)
    setTimeout(() => suggestInputRef.current?.focus(), 50)
  }

  async function submitSuggestion(e: React.FormEvent) {
    e.preventDefault()
    if (!suggestion.trim()) return
    setSendingSuggestion(true)
    try {
      const { comment } = await api.addComment(post.id, `[suggestion]: ${suggestion.trim()}`)
      setComments((c: any[]) => [...c, comment])
      await api.reactToPost(post.id, 'suggest_edit')
      onUpdate?.()
      setSuggestion('')
      setShowSuggestBox(false)
      setShowComments(true)
      toast.success('Suggestion sent!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSendingSuggestion(false)
    }
  }

  async function markPosted() {
    try {
      const { post: updated } = await api.updatePost(team.id, post.id, { status: 'posted' })
      onUpdate?.(updated)
      toast.success('Marked as posted!')
    } catch (err: any) { toast.error(err.message) }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return
    try {
      const { comment } = await api.addComment(post.id, newComment)
      setComments((c: any[]) => [...c, comment])
      setNewComment('')
    } catch (err: any) { toast.error(err.message) }
  }

  async function handleDelete() {
    if (!confirm('Delete this post?')) return
    try {
      await api.deletePost(team.id, post.id)
      onDelete?.(post.id)
    } catch (err: any) { toast.error(err.message) }
  }

  const looksGood = post.post_reactions?.filter((r: any) => r.type === 'looks_good').length || 0
  const suggestEdit = post.post_reactions?.filter((r: any) => r.type === 'suggest_edit').length || 0
  const images = post.post_images || []

  return (
    <>
      <GlowingCard className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5">
            <Avatar name={post.profiles?.name} src={post.profiles?.avatar_url} size="sm" />
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{post.profiles?.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color={statusInfo?.color}>{statusInfo?.label}</Badge>
            <button onClick={() => setShowEditModal(true)} className="p-1 text-muted-foreground/40 hover:text-primary transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleDelete} className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {post.platforms?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.platforms.map((pid: string) => {
              const plat = PLATFORMS.find((p: any) => p.id === pid)
              const Icon = PLATFORM_ICONS[pid]
              return plat && Icon ? (
                <span key={pid} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs text-white font-medium" style={{ backgroundColor: plat.color }}>
                  <Icon className="w-3 h-3" />
                  {plat.label}
                </span>
              ) : null
            })}
          </div>
        )}

        {post.caption && (
          <p className="text-sm text-foreground/80 mb-3.5 whitespace-pre-wrap leading-relaxed">{post.caption}</p>
        )}

        {images.length > 0 && (
          <>
            <div className={`grid gap-2 mb-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {images.slice(0, 4).map((img: any, i: number) => (
                <div key={img.id} className="relative group cursor-pointer rounded-lg overflow-hidden" onClick={() => setLightbox(img.url)}>
                  <img src={img.url} alt="" className="w-full h-36 object-cover hover:scale-[1.02] transition-transform duration-300" />
                  {i === 3 && images.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-lg">+{images.length - 4}</div>
                  )}
                  <a
                    href={img.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Download image"
                  >
                    <Download className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3.5">
              {images.map((img: any, i: number) => (
                <a
                  key={img.id}
                  href={img.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary bg-muted border border-border rounded-lg px-2.5 py-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  {images.length > 1 ? `Image ${i + 1}` : 'Download image'}
                </a>
              ))}
            </div>
          </>
        )}

        {post.scheduled_at && (
          <div className="flex items-center gap-1.5 text-xs text-primary mb-3">
            <Calendar className="w-3.5 h-3.5" />
            Scheduled for {format(new Date(post.scheduled_at), 'MMM d, yyyy h:mm a')}
          </div>
        )}

        <div className="flex items-center gap-1 pt-3 border-t border-border flex-wrap">
          <button onClick={() => react('looks_good')} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
            <ThumbsUp className="w-3.5 h-3.5" />
            {looksGood > 0 && <span className="font-semibold">{looksGood}</span>}
            <span>Looks Good</span>
          </button>

          <button
            onClick={handleSuggestEdit}
            className={`flex items-center gap-1.5 text-xs transition-colors px-2 py-1.5 rounded-lg ${
              showSuggestBox
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
            }`}
          >
            <PenLine className="w-3.5 h-3.5" />
            {suggestEdit > 0 && <span className="font-semibold">{suggestEdit}</span>}
            <span>Suggest Edit</span>
          </button>

          <div className="flex-1" />

          <button
            onClick={() => setShowComments((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-primary/10"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {comments.length > 0 && <span className="font-semibold">{comments.length}</span>}
            {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {isOwner && post.status !== 'posted' && (
            <button onClick={markPosted} className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors px-2 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
              <CheckCircle className="w-3.5 h-3.5" />
              Mark Posted
            </button>
          )}
        </div>

        <AnimatePresence>
          {showSuggestBox && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="overflow-hidden"
            >
              <form onSubmit={submitSuggestion} className="mt-3 flex gap-2 items-center bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 rounded-xl p-2.5">
                <PenLine className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <input
                  ref={suggestInputRef}
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder="What would you change? Press Enter to send…"
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                  onKeyDown={(e) => e.key === 'Escape' && handleSuggestEdit()}
                />
                <button
                  type="submit"
                  disabled={sendingSuggestion || !suggestion.trim()}
                  className="p-1.5 bg-amber-500 text-white rounded-lg disabled:opacity-40 hover:bg-amber-600 transition-colors"
                >
                  <Send className="w-3 h-3" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2.5">
                {comments.map((c: any) => {
                  const isSuggestion = c.content.startsWith('[suggestion]:') || c.content.startsWith('✏️')
                  const displayContent = c.content.startsWith('[suggestion]:')
                    ? c.content.replace('[suggestion]:', '').trim()
                    : c.content.startsWith('✏️ Suggestion:')
                    ? c.content.replace('✏️ Suggestion:', '').trim()
                    : c.content
                  return (
                    <div key={c.id} className="flex items-start gap-2">
                      <Avatar name={c.profiles?.name} size="xs" />
                      <div className={`flex-1 rounded-xl px-3 py-2 ${isSuggestion ? 'bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/40' : 'bg-muted'}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-foreground">{c.profiles?.name}</span>
                          {isSuggestion && <PenLine className="w-3 h-3 text-amber-500 shrink-0" />}
                        </div>
                        <span className="text-xs text-muted-foreground">{displayContent}</span>
                      </div>
                    </div>
                  )
                })}
                <form onSubmit={submitComment} className="flex gap-2 mt-1">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment…"
                    className="input text-xs py-1.5"
                  />
                  <button type="submit" className="btn-primary text-xs px-3 py-1.5">Post</button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlowingCard>

      <NewPostModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        post={post}
        onSaved={(updated: any) => { onUpdate?.(updated); setShowEditModal(false) }}
      />

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setLightbox(null)}
          >
            <motion.img
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.18 }}
              src={lightbox}
              alt=""
              className="max-w-full max-h-full rounded-xl shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
