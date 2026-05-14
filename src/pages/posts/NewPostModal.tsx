import { useState, useRef, useEffect } from 'react'
import { Modal } from '../../components/ui/Modal'
import { PLATFORMS, POST_STATUSES } from '../../lib/constants'
import { PLATFORM_ICONS } from '../../components/icons/PlatformIcons'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { Image, X, Calendar, Lock, Users, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const DRAFT_KEY = 'draft_new_post'

function buildDefaultForm(post: any) {
  if (!post) return { caption: '', platforms: [] as string[], visibility: 'team', status: 'draft', scheduled_at: '' }
  return {
    caption: post.caption || '',
    platforms: post.platforms || [],
    visibility: post.visibility || 'team',
    status: post.status || 'draft',
    scheduled_at: post.scheduled_at || '',
  }
}

export function NewPostModal({ open, onClose, onCreated, onSaved, post = null }: {
  open: boolean
  onClose: () => void
  onCreated?: (post: any) => void
  onSaved?: (post: any) => void
  post?: any
}) {
  const { team } = useTeam()
  const fileRef = useRef<HTMLInputElement>(null)
  const isEditing = Boolean(post)
  const [form, setForm] = useState(buildDefaultForm(post))
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (isEditing) {
      setForm(buildDefaultForm(post))
      setImages([])
    } else {
      try {
        const saved = localStorage.getItem(DRAFT_KEY)
        if (saved) {
          const draft = JSON.parse(saved)
          setForm(draft.form ?? buildDefaultForm(null))
          setImages(draft.images ?? [])
        } else {
          setForm(buildDefaultForm(null))
          setImages([])
        }
      } catch {
        setForm(buildDefaultForm(null))
        setImages([])
      }
    }
  }, [open, post])

  useEffect(() => {
    if (!open || isEditing) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, images }))
  }, [form, images, open, isEditing])

  function togglePlatform(id: string) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(id) ? f.platforms.filter((p: string) => p !== id) : [...f.platforms, id],
    }))
  }

  async function handleFiles(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (!imageFiles.length) return toast.error('Please select image files only')
    setUploading(true)
    const uploaded: string[] = []
    for (const file of imageFiles) {
      try {
        const { url } = await uploadToCloudinary(file)
        uploaded.push(url)
      } catch (err: any) {
        toast.error(`Upload failed: ${err.message}`)
      }
    }
    setImages((prev) => [...prev, ...uploaded])
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.caption.trim() && !images.length && !isEditing) {
      return toast.error('Add a caption or image')
    }
    setSaving(true)
    try {
      if (isEditing) {
        const { post: updated } = await api.updatePost(team.id, post.id, {
          caption: form.caption,
          platforms: form.platforms,
          visibility: form.visibility,
          status: form.status,
          scheduled_at: form.scheduled_at || null,
        })
        onSaved?.(updated)
        toast.success('Post updated!')
      } else {
        const { post: created } = await api.createPost(team.id, {
          ...form,
          scheduled_at: form.scheduled_at || null,
          image_urls: images,
        })
        onCreated?.(created)
        toast.success('Post created!')
        localStorage.removeItem(DRAFT_KEY)
      }
      onClose()
      if (!isEditing) {
        setForm(buildDefaultForm(null))
        setImages([])
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Post' : 'New Post'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p: any) => {
              const Icon = PLATFORM_ICONS[p.id]
              const active = form.platforms.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? 'border-transparent text-white shadow-sm'
                      : 'border-border bg-card text-muted-foreground hover:border-border/80'
                  }`}
                  style={active ? { backgroundColor: p.color } : {}}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Caption</label>
          <textarea
            value={form.caption}
            onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
            placeholder="Write your post caption…"
            rows={4}
            className="input resize-none"
          />
        </div>

        {!isEditing && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Images</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (!uploading) handleFiles([...e.dataTransfer.files]) }}
              onClick={() => !uploading && fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
                uploading
                  ? 'border-primary/30 bg-primary/5 cursor-not-allowed'
                  : 'border-border hover:border-primary/40 hover:bg-primary/5'
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 text-primary mx-auto mb-1 animate-spin" />
                  <p className="text-xs text-primary font-medium">Uploading…</p>
                </>
              ) : (
                <>
                  <Image className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Drag & drop or click to upload</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles([...e.target.files!])}
            />

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {images.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} className="w-16 h-16 object-cover rounded-lg border border-border" alt="" />
                    <button
                      type="button"
                      onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Visibility</label>
            <div className="flex rounded-xl border border-border overflow-hidden">
              {[{ v: 'private', icon: Lock, label: 'Only Me' }, { v: 'team', icon: Users, label: 'Team' }].map(({ v, icon: Icon, label }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, visibility: v }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                    form.visibility === v
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="input"
            >
              {POST_STATUSES.map((s: any) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
            <Calendar className="inline w-3.5 h-3.5 mr-1 mb-0.5" />
            Schedule for (optional)
          </label>
          <input
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
            className="input"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving || uploading} className="btn-primary">
            {saving ? (isEditing ? 'Saving…' : 'Creating…') : (isEditing ? 'Save Post' : 'Create Post')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
