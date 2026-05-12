import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Eye, EyeOff, Copy, Check, Trash2, Link, Pin, PinOff, GripVertical,
  BookOpen, FileText, Loader2, Upload, Download, Pencil,
  Key, Hash, MessageSquare, Bot, Image, Video, File,
  type LucideIcon,
} from 'lucide-react'
import { api } from '../../lib/api'
import { uploadToCloudinary, uploadFileToCloudinary } from '../../lib/cloudinary'
import { useTeam } from '../../contexts/TeamContext'
import { useRealtime } from '../../hooks/useRealtime'
import { INFO_TYPES, API_PROVIDERS } from '../../lib/constants'

const INFO_ICON_MAP: Record<string, LucideIcon> = {
  FileText, Key, Hash, MessageSquare, Bot, Image, Video, File,
}

function InfoTypeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = INFO_ICON_MAP[name] ?? FileText
  return <Icon className={className ?? 'w-4 h-4'} />
}
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { Avatar } from '../../components/ui/UserAvatar'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

function InfoCardContent({
  item,
  onPin,
  onDelete,
  onEdit,
  dragHandle = null,
}: {
  item: any
  onPin: (updated: any) => void
  onDelete: (id: string) => void
  onEdit?: (item: any) => void
  dragHandle?: ReactNode
}) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const typeInfo = INFO_TYPES.find((t) => t.id === item.type)
  const providerInfo = API_PROVIDERS.find((p) => p.id === item.provider)

  async function copyContent() {
    await navigator.clipboard.writeText(item.content || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied!')
  }

  async function handleDelete() {
    if (!confirm('Delete this info box?')) return
    try {
      await api.deleteInfoItem(item.id)
      onDelete(item.id)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handlePin() {
    try {
      const { item: updated } = await api.pinInfoItem(item.id, !item.pinned)
      onPin(updated)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const renderContent = () => {
    switch (item.type) {
      case 'photo':
        return item.content ? (
          <img src={item.content} alt={item.title} className="w-full h-40 object-cover rounded-lg mt-2" />
        ) : <p className="text-xs text-zinc-400 mt-2">No image</p>

      case 'video':
        return item.content ? (
          <video
            src={item.content}
            controls
            className="w-full rounded-lg mt-2 max-h-48 bg-black"
          />
        ) : <p className="text-xs text-zinc-400 mt-2">No video</p>

      case 'document': {
        const fileName = item.content ? decodeURIComponent(item.content.split('/').pop().split('?')[0]) : null
        return item.content ? (
          <a
            href={item.content}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="mt-2 flex items-center gap-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-primary hover:bg-primary/10 transition-colors"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{item.title}</p>
              {fileName && fileName !== item.title && <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{fileName}</p>}
            </div>
            <Download className="w-3.5 h-3.5 shrink-0" />
          </a>
        ) : <p className="text-xs text-zinc-400 mt-2">No file uploaded</p>
      }

      case 'api_key':
        return (
          <div className="mt-2 space-y-2">
            {providerInfo && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: providerInfo.color }} />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{providerInfo.label}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
              <code className="flex-1 text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate">
                {visible ? item.content : '•'.repeat(Math.min(item.content?.length || 8, 32))}
              </code>
              <button onClick={() => setVisible((v) => !v)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0">
                {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button onClick={copyContent} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )

      case 'number':
        return <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{item.content}</p>

      case 'prompt':
      case 'claude_skill':
        return (
          <div className="mt-2 relative">
            <pre className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 font-mono line-clamp-6">
              {item.content}
            </pre>
            <button
              onClick={copyContent}
              className="absolute top-2 right-2 p-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-400 hover:text-zinc-600"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )

      default:
        return <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap line-clamp-4">{item.content}</p>
    }
  }

  return (
    <div className={cn('card p-4 hover:shadow-md transition-shadow relative', item.pinned && 'ring-1 ring-primary/20')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {typeInfo && <InfoTypeIcon name={typeInfo.icon} className="w-4 h-4 shrink-0 text-zinc-500 dark:text-zinc-400" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{item.title}</h3>
              {item.pinned && <Pin className="w-3 h-3 shrink-0 text-primary/60 fill-current" />}
            </div>
            <p className="text-xs text-zinc-400">{typeInfo?.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {dragHandle}
          <button
            onClick={handlePin}
            className={cn(
              'p-1 rounded transition-colors',
              item.pinned
                ? 'text-primary hover:text-primary/70'
                : 'text-zinc-300 dark:text-zinc-600 hover:text-primary'
            )}
            title={item.pinned ? 'Unpin' : 'Pin to top'}
          >
            {item.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(item)}
              className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-primary transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {renderContent()}

      {item.note && (
        <div className="mt-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Note</p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{item.note}</p>
        </div>
      )}

      {item.tasks && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-primary">
          <Link className="w-3 h-3" />
          <span>{item.tasks.title}</span>
        </div>
      )}

      {item.creator && (
        <div className="mt-3 flex items-center gap-1.5">
          <Avatar name={item.creator?.name} src={item.creator?.avatar_url} size="xs" />
          <span className="text-xs text-zinc-400">{item.creator?.name}</span>
        </div>
      )}
    </div>
  )
}

function SortableInfoCard({
  item,
  onPin,
  onDelete,
  onEdit,
}: {
  item: any
  onPin: (updated: any) => void
  onDelete: (id: string) => void
  onEdit: (item: any) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : ('auto' as const),
  }

  return (
    <div ref={setNodeRef} style={style}>
      <InfoCardContent
        item={item}
        onPin={onPin}
        onDelete={onDelete}
        onEdit={onEdit}
        dragHandle={(
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-300 cursor-grab active:cursor-grabbing transition-colors touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}
      />
    </div>
  )
}

function UploadZone({
  accept,
  onUpload,
  uploading,
  preview,
  previewType,
  label,
}: {
  accept: string
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  uploading: boolean
  preview: string
  previewType: 'image' | 'video' | 'document'
  label: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer',
          uploading
            ? 'border-primary/30 bg-primary/5 cursor-not-allowed'
            : 'border-zinc-200 dark:border-zinc-700 hover:border-primary/40 hover:bg-primary/5'
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-1.5">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <p className="text-xs text-primary font-medium">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <Upload className="w-5 h-5 text-zinc-400" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onUpload} />
      {preview && previewType === 'video' && (
        <video src={preview} controls className="mt-2 w-full rounded-lg max-h-36 bg-black" />
      )}
      {preview && previewType === 'document' && (
        <a href={preview} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 text-xs text-primary hover:underline">
          <FileText className="w-3.5 h-3.5" /> Preview / Download
        </a>
      )}
      {preview && previewType === 'image' && (
        <img src={preview} alt="" className="mt-2 h-24 rounded-lg object-cover" />
      )}
    </div>
  )
}

function CreateInfoModal({
  open,
  onClose,
  onCreated,
  tasks,
}: {
  open: boolean
  onClose: () => void
  onCreated: (item: any) => void
  tasks: any[]
}) {
  const { team } = useTeam()
  const [type, setType] = useState('text')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [note, setNote] = useState('')
  const [provider, setProvider] = useState('')
  const [taskId, setTaskId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  function reset() {
    setType('text'); setTitle(''); setContent(''); setNote(''); setProvider(''); setTaskId('')
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadToCloudinary(file, 'teamflow/info')
      setContent(url)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadFileToCloudinary(file, 'teamflow/info')
      setContent(result.url)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return toast.error('Title required')
    setSaving(true)
    try {
      const { item } = await api.createInfoItem(team.id, {
        title: title.trim(),
        type,
        content: content.trim() || null,
        note: note.trim() || null,
        provider: provider || null,
        task_id: taskId || null,
      })
      onCreated(item)
      toast.success('Info box created!')
      reset()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const renderContentField = () => {
    switch (type) {
      case 'photo':
        return (
          <UploadZone
            accept="image/*"
            onUpload={handleImageUpload}
            uploading={uploading}
            preview={content}
            previewType="image"
            label="Click to upload image (PNG, JPG, GIF…)"
          />
        )

      case 'video':
        return (
          <UploadZone
            accept="video/*"
            onUpload={handleFileUpload}
            uploading={uploading}
            preview={content}
            previewType="video"
            label="Click to upload video (MP4, MOV, WebM…)"
          />
        )

      case 'document':
        return (
          <UploadZone
            accept="*"
            onUpload={handleFileUpload}
            uploading={uploading}
            preview={content}
            previewType="document"
            label="Click to upload any file — PDF, Word, ZIP, video, or anything else"
          />
        )

      case 'api_key':
        return (
          <>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Provider</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="input">
                <option value="">Select provider…</option>
                {API_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">API Key</label>
              <input type="password" value={content} onChange={(e) => setContent(e.target.value)} placeholder="sk-…" className="input font-mono" />
            </div>
          </>
        )

      case 'number':
        return (
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Value</label>
            <input type="number" value={content} onChange={(e) => setContent(e.target.value)} placeholder="0" className="input" />
          </div>
        )

      case 'prompt':
      case 'claude_skill':
        return (
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
              {type === 'claude_skill' ? 'Instructions / Skill' : 'Prompt'}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={type === 'claude_skill' ? 'You are a helpful assistant…' : 'Write a compelling post about…'}
              rows={5}
              className="input resize-none font-mono text-xs"
            />
          </div>
        )

      default:
        return (
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Notes, links, any text…"
              rows={4}
              className="input resize-none"
            />
          </div>
        )
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="New Info Box">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2 uppercase tracking-wide">Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {INFO_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setType(t.id); setContent(''); setProvider('') }}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all',
                  type === t.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-500'
                )}
              >
                <InfoTypeIcon name={t.icon} className="w-4 h-4" />
                <span className="text-[10px] font-medium leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Groq API Key" className="input" required />
        </div>

        {renderContentField()}

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Note</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note…" rows={2} className="input resize-none" />
        </div>

        {tasks.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Link to task (optional)</label>
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="input">
              <option value="">No task</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => { reset(); onClose() }} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving || uploading} className="btn-primary">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function EditInfoModal({
  open,
  onClose,
  onSaved,
  item,
  tasks,
}: {
  open: boolean
  onClose: () => void
  onSaved: (updated: any) => void
  item: any
  tasks: any[]
}) {
  const [type, setType] = useState(item?.type || 'text')
  const [title, setTitle] = useState(item?.title || '')
  const [content, setContent] = useState(item?.content || '')
  const [note, setNote] = useState(item?.note || '')
  const [provider, setProvider] = useState(item?.provider || '')
  const [taskId, setTaskId] = useState(item?.task_id || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && item) {
      setType(item.type || 'text')
      setTitle(item.title || '')
      setContent(item.content || '')
      setNote(item.note || '')
      setProvider(item.provider || '')
      setTaskId(item.task_id || '')
    }
  }, [open, item])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadToCloudinary(file, 'teamflow/info')
      setContent(url)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadFileToCloudinary(file, 'teamflow/info')
      setContent(result.url)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return toast.error('Title required')
    setSaving(true)
    try {
      const { item: updated } = await api.updateInfoItem(item.id, {
        title: title.trim(),
        content: content.trim() || null,
        note: note.trim() || null,
        provider: provider || null,
        task_id: taskId || null,
      })
      onSaved(updated)
      toast.success('Updated!')
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const renderContentField = () => {
    switch (type) {
      case 'photo':
        return (
          <UploadZone
            accept="image/*"
            onUpload={handleImageUpload}
            uploading={uploading}
            preview={content}
            previewType="image"
            label="Click to replace image"
          />
        )
      case 'video':
        return (
          <UploadZone
            accept="video/*"
            onUpload={handleFileUpload}
            uploading={uploading}
            preview={content}
            previewType="video"
            label="Click to replace video"
          />
        )
      case 'document':
        return (
          <UploadZone
            accept="*"
            onUpload={handleFileUpload}
            uploading={uploading}
            preview={content}
            previewType="document"
            label="Click to replace — any file type"
          />
        )
      case 'api_key':
        return (
          <>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Provider</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="input">
                <option value="">Select provider…</option>
                {API_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">API Key</label>
              <input type="password" value={content} onChange={(e) => setContent(e.target.value)} placeholder="sk-…" className="input font-mono" />
            </div>
          </>
        )
      case 'number':
        return (
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Value</label>
            <input type="number" value={content} onChange={(e) => setContent(e.target.value)} placeholder="0" className="input" />
          </div>
        )
      case 'prompt':
      case 'claude_skill':
        return (
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
              {type === 'claude_skill' ? 'Instructions / Skill' : 'Prompt'}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="input resize-none font-mono text-xs"
            />
          </div>
        )
      default:
        return (
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="input resize-none"
            />
          </div>
        )
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Info Box">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" required />
        </div>

        {renderContentField()}

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Note</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="input resize-none" />
        </div>

        {tasks.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Link to task (optional)</label>
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="input">
              <option value="">No task</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving || uploading} className="btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function InfoPage() {
  const { team } = useTeam()
  const [items, setItems] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [filter, setFilter] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const loadItems = useCallback(async () => {
    if (!team) return
    setLoading(true)
    try {
      const { items: data } = await api.getInfoItems(team.id)
      setItems(data || [])
    } finally {
      setLoading(false)
    }
  }, [team?.id])

  useEffect(() => { loadItems() }, [loadItems])

  useEffect(() => {
    if (!team) return
    api.getTasks(team.id).then(({ tasks }) => setTasks(tasks || [])).catch(() => {})
  }, [team?.id])

  useRealtime('info_items', team ? { filter: `team_id=eq.${team.id}` } : null, loadItems)

  function handleCreated(item: any) { setItems((prev) => [item, ...prev]) }
  function handleDelete(id: string) { setItems((prev) => prev.filter((i) => i.id !== id)) }
  function handlePin(updated: any) {
    setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i))
  }
  function handleSaved(updated: any) {
    setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i))
    setEditItem(null)
  }

  const allDisplayed = filter ? items.filter((i) => i.type === filter) : items
  const pinned = allDisplayed.filter((i) => i.pinned)
  const unpinned = allDisplayed.filter((i) => !i.pinned)
  const displayed = [...pinned, ...unpinned]
  const activeItem = items.find((i) => i.id === activeId)

  function handleDragEnd({ active, over }: any) {
    setActiveId(null)
    if (!over || active.id === over.id) return
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id)
      const newIndex = prev.findIndex((i) => i.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(oldIndex, 1)
      next.splice(newIndex, 0, moved)
      api.reorderInfoItems(next.map((i) => i.id)).catch(() => {})
      return next
    })
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h2 className="section-title">Info</h2>
          <p className="section-subtitle">Team knowledge base — API keys, prompts, docs and media</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Box
        </button>
      </div>

      <div className="flex gap-1 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setFilter('')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0',
            filter === '' ? 'bg-primary text-primary-foreground' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          )}
        >
          All ({items.length})
        </button>
        {INFO_TYPES.map((t) => {
          const count = items.filter((i) => i.type === t.id).length
          if (count === 0) return null
          return (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 shrink-0',
                filter === t.id ? 'bg-primary text-primary-foreground' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              )}
            >
              <InfoTypeIcon name={t.icon} className="w-3 h-3" /> {t.label} ({count})
            </button>
          )
        })}
      </div>

      {!loading && displayed.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No info boxes yet"
          description="Store API keys, prompts, notes, and other team knowledge here."
          action={
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Create first box
            </button>
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveId(active.id as string)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={displayed.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayed.map((item) => (
                <SortableInfoCard key={item.id} item={item} onPin={handlePin} onDelete={handleDelete} onEdit={setEditItem} />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeItem ? (
              <div className="opacity-90 rotate-1 shadow-2xl">
                <InfoCardContent item={activeItem} onPin={() => {}} onDelete={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <CreateInfoModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
        tasks={tasks}
      />

      {editItem && (
        <EditInfoModal
          open={Boolean(editItem)}
          onClose={() => setEditItem(null)}
          onSaved={handleSaved}
          item={editItem}
          tasks={tasks}
        />
      )}
    </div>
  )
}
