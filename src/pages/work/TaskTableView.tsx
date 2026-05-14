import { useState, useEffect, useMemo } from 'react'
import {
  Circle, Timer, Clock, CheckCircle2, CircleOff, AlertCircle,
  ArrowUp, ArrowRight, ArrowDown, Calendar, User,
  MoreHorizontal, Pencil, Trash2, Send, Check, X, XCircle,
  CircleArrowUp, ArrowUpDown, ChevronDown, GripVertical,
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Modifier } from '@dnd-kit/core'

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
})
import { format, isPast, parseISO } from 'date-fns'
import { Avatar } from '../../components/ui/UserAvatar'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Separator } from '../../components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { TASK_PRIORITIES, TASK_STATUSES } from '../../lib/constants'
import { ASSIGNEE_STATUS_OPTIONS, getTaskStatusOptions, resolveTaskStatusChange } from '../../lib/taskStatusRules'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { useAuth } from '../../contexts/AuthContext'
import { NewTaskModal } from './NewTaskModal'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

/* ── Icon maps ─────────────────────────────────────────────────── */
const STATUS_ICON: Record<string, React.ElementType> = {
  todo:        Circle,
  in_progress: Timer,
  in_review:   Clock,
  done:        CheckCircle2,
  rejected:    CircleOff,
  couldnt_do:  AlertCircle,
}

const PRIORITY_ICON: Record<string, React.ElementType> = {
  high:   ArrowUp,
  medium: ArrowRight,
  low:    ArrowDown,
}

/* ── Helpers ───────────────────────────────────────────────────── */
function isBlockedComment(content: string) {
  return content?.startsWith('[blocked]:') || content?.startsWith("❌ Couldn't do:")
}
function extractBlockedText(content: string) {
  if (content.startsWith('[blocked]:')) return content.replace('[blocked]:', '').trim()
  if (content.startsWith("❌ Couldn't do:")) return content.replace("❌ Couldn't do:", '').trim()
  return content
}
function sortComments(comments: any[]) {
  return [...(comments || [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

/* ── Bulk actions bar ───────────────────────────────────────────── */
function BulkActionsBar({
  selected, total, onClear, onBulkDelete, onBulkStatus, onBulkPriority,
}: {
  selected: Set<string>
  total: number
  onClear: () => void
  onBulkDelete: () => void
  onBulkStatus: (status: string) => void
  onBulkPriority: (priority: string) => void
}) {
  const count = selected.size
  if (count === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl transition-all delay-100 duration-300 ease-out hover:scale-105">
      <div className="flex items-center gap-x-2 rounded-xl border bg-background/95 backdrop-blur-lg p-2 shadow-xl">
        <button
          onClick={onClear}
          className="flex size-6 items-center justify-center rounded-full border hover:bg-muted transition-colors"
          title="Clear selection (Escape)"
        >
          <X className="size-3" />
        </button>

        <Separator orientation="vertical" className="h-5" />

        <div className="flex items-center gap-x-1 text-sm">
          <Badge variant="default" className="min-w-8 rounded-lg">{count}</Badge>
          <span className="hidden sm:inline">task{count > 1 ? 's' : ''}</span>{' '}
          selected
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="size-8" title="Update status">
              <CircleArrowUp className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={14}>
            {TASK_STATUSES.map((s) => {
              const Icon = STATUS_ICON[s.id] || Circle
              return (
                <DropdownMenuItem key={s.id} onClick={() => onBulkStatus(s.id)}>
                  <Icon className="size-4 text-muted-foreground" />
                  {s.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="size-8" title="Update priority">
              <ArrowUpDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={14}>
            {TASK_PRIORITIES.map((p) => {
              const Icon = PRIORITY_ICON[p.id] || ArrowRight
              return (
                <DropdownMenuItem key={p.id} onClick={() => onBulkPriority(p.id)}>
                  <Icon className="size-4 text-muted-foreground" />
                  {p.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Delete */}
        <Button variant="destructive" size="icon" className="size-8" onClick={onBulkDelete} title="Delete selected">
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}

/* ── Expanded task detail ───────────────────────────────────────── */
function TaskDetail({
  task, onUpdate,
}: {
  task: any
  onUpdate?: (t: any) => void
}) {
  const { team } = useTeam()
  const { user } = useAuth()
  const [chatMessage, setChatMessage] = useState('')
  const [submittingChat, setSubmittingChat] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [showReasonBox, setShowReasonBox] = useState(false)
  const [reason, setReason] = useState('')
  const [submittingReason, setSubmittingReason] = useState(false)

  const taskAssignments = task.task_assignees || []
  const currentAssignment = taskAssignments.find((a: any) => a.user_id === user?.id)
  const isCreator = task.creator?.id === user?.id
  const isLockedForAssignee =
    (!isCreator && task.status === 'couldnt_do' && task.profiles?.id === user?.id) ||
    (!isCreator && currentAssignment?.status === 'couldnt_do')

  const statusOptions = currentAssignment && !isCreator
    ? ASSIGNEE_STATUS_OPTIONS
    : getTaskStatusOptions(task, user?.id)
  const currentStatus = currentAssignment && !isCreator ? currentAssignment.status : task.status
  const selectedStatusValue = statusOptions.find((o: any) => o.status === currentStatus || o.value === currentStatus)?.value ?? currentStatus
  const visibleStatusOptions = statusOptions.some((o: any) => o.value === selectedStatusValue)
    ? statusOptions
    : [{ value: currentStatus, status: currentStatus, label: TASK_STATUSES.find(s => s.id === currentStatus)?.label || currentStatus }, ...statusOptions]
  const canChangeStatus = statusOptions.length > 0 && !isLockedForAssignee

  const comments = useMemo(() => sortComments(task.task_comments), [task.task_comments])
  const latestBlockedComment = [...comments].reverse().find((c) => isBlockedComment(c.content))

  async function handleStatusChange(nextValue: string) {
    if (currentAssignment && !isCreator) {
      const opt = ASSIGNEE_STATUS_OPTIONS.find((o: any) => o.value === nextValue)
      if (!opt) return
      if (opt.value === 'couldnt_do') { setShowReasonBox(true); return }
      try {
        const { task: updated } = await api.updateAssigneeStatus(task.id, user!.id, opt.value)
        onUpdate?.(updated)
        if (opt.value === 'done') toast.success('Marked as done and sent for creator review.')
      } catch (err: any) { toast.error(err.message) }
      return
    }
    const resolved = resolveTaskStatusChange(task, user?.id, nextValue)
    if (!resolved.allowed) return
    if (resolved.status === 'couldnt_do') { setShowReasonBox(true); return }
    if (currentAssignment) {
      try { await api.updateAssigneeStatus(task.id, user!.id, resolved.status) } catch {}
    }
    try {
      const { task: updated } = await api.updateTask(team.id, task.id, { status: resolved.status })
      onUpdate?.(updated)
      if (resolved.message) toast.success(resolved.message)
    } catch (err: any) { toast.error(err.message) }
  }

  async function submitReason(e: React.FormEvent) {
    e.preventDefault()
    setSubmittingReason(true)
    try {
      if (reason.trim()) await api.addTaskComment(task.id, `[blocked]: ${reason.trim()}`)
      if (currentAssignment && !isCreator) {
        const { task: updated } = await api.updateAssigneeStatus(task.id, user!.id, 'couldnt_do')
        onUpdate?.(updated)
      } else {
        if (currentAssignment) try { await api.updateAssigneeStatus(task.id, user!.id, 'couldnt_do') } catch {}
        const { task: updated } = await api.updateTask(team.id, task.id, { status: 'couldnt_do' })
        onUpdate?.(updated)
      }
      setShowReasonBox(false)
      setReason('')
    } catch (err: any) { toast.error(err.message) }
    finally { setSubmittingReason(false) }
  }

  async function submitChat(e: React.FormEvent) {
    e.preventDefault()
    const msg = chatMessage.trim()
    if (!msg) return
    setSubmittingChat(true)
    try {
      const { task: updated } = await api.addTaskComment(task.id, msg)
      onUpdate?.(updated)
      setChatMessage('')
    } catch (err: any) { toast.error(err.message) }
    finally { setSubmittingChat(false) }
  }

  async function deleteComment(commentId: string) {
    if (!confirm('Delete this message?')) return
    try {
      const { task: updated } = await api.deleteTaskComment(task.id, commentId)
      onUpdate?.(updated)
    } catch (err: any) { toast.error(err.message) }
  }

  async function saveEditComment(comment: any) {
    const content = editingContent.trim()
    if (!content) return
    setSavingEdit(true)
    try {
      const { task: updated } = await api.updateTaskComment(task.id, comment.id, content)
      onUpdate?.(updated)
      setEditingCommentId(null)
      setEditingContent('')
    } catch (err: any) { toast.error(err.message) }
    finally { setSavingEdit(false) }
  }

  return (
    <div className="px-4 pb-4 pt-3 space-y-4 border-t border-border bg-muted/20">
      {task.description && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Description</p>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{task.description}</p>
        </div>
      )}

      {latestBlockedComment && (
        <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          {extractBlockedText(latestBlockedComment.content)}
        </p>
      )}

      {taskAssignments.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Assignees</p>
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {taskAssignments.map((a: any) => {
              const sInfo = TASK_STATUSES.find(s => s.id === a.status)
              return (
                <div key={a.id} className="flex items-center gap-3 bg-muted/20 px-3 py-2">
                  <Avatar name={a.assignee?.name} src={a.assignee?.avatar_url} size="xs" className="shrink-0" />
                  <span className="text-sm text-foreground flex-1 truncate">{a.assignee?.name}</span>
                  <span className={cn('shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', sInfo?.color || 'bg-muted text-muted-foreground')}>
                    {sInfo?.label || a.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-end gap-4 flex-wrap">
        {canChangeStatus && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Status</p>
            <select
              value={selectedStatusValue}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="filter-select"
            >
              {visibleStatusOptions.map((o: any) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Priority</p>
          <select
            value={task.priority || 'medium'}
            onChange={async (e) => {
              try {
                const { task: updated } = await api.updateTask(team.id, task.id, { priority: e.target.value })
                onUpdate?.(updated)
              } catch (err: any) { toast.error(err.message) }
            }}
            className="filter-select"
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {showReasonBox && (
        <form onSubmit={submitReason} className="flex gap-2 items-center bg-destructive/5 border border-destructive/30 rounded-lg p-2.5">
          <input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why couldn't you do this?"
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button type="button" onClick={() => setShowReasonBox(false)} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
          <button type="submit" disabled={submittingReason || !reason.trim()} className="p-1.5 bg-destructive text-destructive-foreground rounded-lg disabled:opacity-40">
            <Send className="w-3 h-3" />
          </button>
        </form>
      )}

      {/* Team Chat */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Team Chat</p>
          <span className="text-[11px] text-muted-foreground">{comments.length} {comments.length === 1 ? 'message' : 'messages'}</span>
        </div>

        <form
          onSubmit={submitChat}
          className={cn(
            'flex gap-2 items-center rounded-lg border p-2.5',
            isLockedForAssignee
              ? 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10'
              : 'border-border bg-muted/40'
          )}
        >
          <input
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            disabled={isLockedForAssignee || submittingChat}
            placeholder={isLockedForAssignee ? 'Ticket locked until creator reopens it.' : 'Comment on this ticket...'}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLockedForAssignee || submittingChat || !chatMessage.trim()}
            className="p-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>

        {comments.length > 0 && (
          <div className="mt-3 space-y-2">
            {comments.map((comment: any) => {
              const isCouldntDo = isBlockedComment(comment.content)
              const isReopen = comment.content?.startsWith('↩ Reopened:')
              const isEditingThis = editingCommentId === comment.id
              return (
                <div
                  key={comment.id}
                  className={cn(
                    'rounded-lg border px-3 py-2',
                    isCouldntDo
                      ? 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10'
                      : isReopen
                        ? 'border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/10'
                        : 'border-border bg-muted/40'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={comment.profiles?.name} src={comment.profiles?.avatar_url} size="xs" />
                      <span className="text-xs font-semibold text-foreground truncate">{comment.profiles?.name || 'User'}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                      </span>
                      {!isEditingThis && (
                        <>
                          <button onClick={() => { setEditingCommentId(comment.id); setEditingContent(comment.content) }} className="p-1 text-muted-foreground/40 hover:text-primary rounded">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => deleteComment(comment.id)} className="p-1 text-muted-foreground/40 hover:text-destructive rounded">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {isEditingThis ? (
                    <div className="flex gap-2 items-center mt-1">
                      <input
                        autoFocus
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEditComment(comment) }
                          if (e.key === 'Escape') { setEditingCommentId(null); setEditingContent('') }
                        }}
                        className="flex-1 bg-background border border-primary/40 rounded-lg px-2.5 py-1.5 text-sm text-foreground outline-none"
                        disabled={savingEdit}
                      />
                      <button onClick={() => saveEditComment(comment)} disabled={savingEdit || !editingContent.trim()} className="p-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-40">
                        <Check className="w-3 h-3" />
                      </button>
                      <button onClick={() => { setEditingCommentId(null); setEditingContent('') }} className="p-1.5 text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <p className="flex items-start gap-1.5 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {isCouldntDo && <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />}
                      {isCouldntDo ? extractBlockedText(comment.content) : comment.content}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Sortable task row wrapper ─────────────────────────────────── */
function SortableTaskRow({
  task, selected, onToggleSelect, onUpdate, onDelete, draggable,
}: {
  task: any
  selected: boolean
  onToggleSelect: () => void
  onUpdate?: (t: any) => void
  onDelete?: (id: string) => void
  draggable?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <TaskRow
      task={task}
      selected={selected}
      onToggleSelect={onToggleSelect}
      onUpdate={onUpdate}
      onDelete={onDelete}
      rowRef={setNodeRef}
      rowStyle={style}
      dragHandleProps={draggable ? { ...attributes, ...listeners } : undefined}
    />
  )
}

/* ── Task row ───────────────────────────────────────────────────── */
function TaskRow({
  task, selected, onToggleSelect, onUpdate, onDelete, rowRef, rowStyle, dragHandleProps,
}: {
  task: any
  selected: boolean
  onToggleSelect: () => void
  onUpdate?: (t: any) => void
  onDelete?: (id: string) => void
  rowRef?: (el: HTMLElement | null) => void
  rowStyle?: React.CSSProperties
  dragHandleProps?: Record<string, any>
}) {
  const { team } = useTeam()
  const [expanded, setExpanded] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const priorityInfo = TASK_PRIORITIES.find(p => p.id === task.priority)
  const statusInfo = TASK_STATUSES.find(s => s.id === task.status)
  const StatusIcon = STATUS_ICON[task.status] || Circle
  const PriorityIcon = PRIORITY_ICON[task.priority] || ArrowRight
  const taskAssignments = task.task_assignees || []
  const isMultiAssigned = taskAssignments.length > 0

  const isOverdue = task.due_date && !['done', 'rejected', 'couldnt_do'].includes(task.status) && (() => {
    try { return isPast(parseISO(task.due_date)) } catch { return false }
  })()

  async function handleDelete() {
    if (!confirm('Delete this task?')) return
    try {
      await api.deleteTask(team.id, task.id)
      onDelete?.(task.id)
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <>
      <tr
        ref={rowRef as any}
        style={rowStyle}
        className={cn(
          'border-b border-border transition-colors cursor-pointer',
          selected ? 'bg-primary/5' : 'hover:bg-muted/50',
          expanded && 'bg-muted/30'
        )}
      >
        {/* Drag handle */}
        <td className="w-8 px-1 py-3" onClick={(e) => e.stopPropagation()}>
          {dragHandleProps ? (
            <button
              {...dragHandleProps}
              className="p-1 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none transition-colors"
              title="Drag to reorder"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="w-5" />
          )}
        </td>
        {/* Checkbox */}
        <td className="w-10 px-3 py-3" onClick={(e) => { e.stopPropagation(); onToggleSelect() }}>
          <div className={cn(
            'w-4 h-4 rounded flex items-center justify-center border transition-colors',
            selected
              ? 'bg-primary border-primary'
              : 'border-muted-foreground/40 hover:border-primary'
          )}>
            {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
          </div>
        </td>

        {/* Title */}
        <td
          className="py-3 px-2 max-w-0 w-full"
          onClick={() => setExpanded(v => !v)}
        >
          <div className="flex items-center gap-2 min-w-0">
            <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-150', expanded && 'rotate-180')} />
            <span className="text-sm font-medium text-foreground truncate">{task.title}</span>
            {isMultiAssigned && (
              <span className="shrink-0 text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                {taskAssignments.length} assignees
              </span>
            )}
            {!isMultiAssigned && task.profiles && (
              <Avatar name={task.profiles.name} src={task.profiles.avatar_url} size="xs" className="shrink-0" />
            )}
          </div>
        </td>

        {/* Status */}
        <td className="py-3 px-3 w-36" onClick={() => setExpanded(v => !v)}>
          <div className="flex items-center gap-2 min-w-0">
            <StatusIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
            <span className="text-sm text-foreground truncate">{statusInfo?.label || task.status}</span>
          </div>
        </td>

        {/* Priority */}
        <td className="py-3 px-3 w-32" onClick={() => setExpanded(v => !v)}>
          <div className="flex items-center gap-2">
            <PriorityIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
            <span className="text-sm text-foreground">{priorityInfo?.label || task.priority}</span>
          </div>
        </td>

        {/* Due date */}
        <td className="py-3 px-3 w-28 hidden md:table-cell" onClick={() => setExpanded(v => !v)}>
          {task.due_date ? (
            <span className={cn('text-sm', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
              {format(parseISO(task.due_date), 'MMM d')}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground/40">—</span>
          )}
        </td>

        {/* Creator */}
        <td className="py-3 px-3 w-28 hidden lg:table-cell" onClick={() => setExpanded(v => !v)}>
          {task.creator && (
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-muted-foreground/60 shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{task.creator.name}</span>
            </div>
          )}
        </td>

        {/* Actions */}
        <td className="py-3 px-3 w-10" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                <Pencil className="w-4 h-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr>
          <td colSpan={8} className="p-0">
            <TaskDetail task={task} onUpdate={onUpdate} />
          </td>
        </tr>
      )}

      <NewTaskModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSaved={(updated) => { onUpdate?.(updated); setShowEditModal(false) }}
        task={task}
        title="Edit Ticket"
      />
    </>
  )
}

/* ── Main export ────────────────────────────────────────────────── */
export function TaskTableView({
  tasks, onUpdate, onDelete, draggable = false,
}: {
  tasks: any[]
  onUpdate?: (t: any) => void
  onDelete?: (id: string) => void
  draggable?: boolean
}) {
  const { team } = useTeam()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [localTasks, setLocalTasks] = useState(tasks)

  // Sync localTasks when tasks prop changes from outside
  useEffect(() => { setLocalTasks(tasks) }, [tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd({ active, over }: any) {
    if (!over || active.id === over.id) return
    setLocalTasks((prev) => {
      const oldIndex = prev.findIndex(t => t.id === active.id)
      const newIndex = prev.findIndex(t => t.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      const next = arrayMove(prev, oldIndex, newIndex)
      const projectId = next[0]?.project_id ?? null
      api.reorderTasks(team.id, projectId, next.map(t => t.id)).catch(() => {})
      return next
    })
  }

  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === tasks.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(tasks.map(t => t.id)))
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} task${selected.size > 1 ? 's' : ''}?`)) return
    const ids = Array.from(selected)
    for (const id of ids) {
      try {
        await api.deleteTask(team.id, id)
        onDelete?.(id)
      } catch {}
    }
    setSelected(new Set())
  }

  async function handleBulkStatus(status: string) {
    const ids = Array.from(selected)
    for (const id of ids) {
      try {
        const { task: updated } = await api.updateTask(team.id, id, { status })
        onUpdate?.(updated)
      } catch {}
    }
    setSelected(new Set())
    toast.success(`Updated ${ids.length} task${ids.length > 1 ? 's' : ''}`)
  }

  async function handleBulkPriority(priority: string) {
    const ids = Array.from(selected)
    for (const id of ids) {
      try {
        const { task: updated } = await api.updateTask(team.id, id, { priority })
        onUpdate?.(updated)
      } catch {}
    }
    setSelected(new Set())
    toast.success(`Updated ${ids.length} task${ids.length > 1 ? 's' : ''}`)
  }

  const allSelected = tasks.length > 0 && selected.size === tasks.length
  const someSelected = selected.size > 0 && selected.size < tasks.length

  if (tasks.length === 0) return null

  const tableContent = (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="w-8 px-1" />
            <th className="w-10 px-3 py-3 text-left">
              <div
                onClick={toggleAll}
                className={cn(
                  'w-4 h-4 rounded flex items-center justify-center border cursor-pointer transition-colors',
                  allSelected
                    ? 'bg-primary border-primary'
                    : someSelected
                      ? 'bg-primary/50 border-primary/50'
                      : 'border-muted-foreground/40 hover:border-primary'
                )}
              >
                {(allSelected || someSelected) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
              </div>
            </th>
            <th className="py-3 px-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</th>
            <th className="py-3 px-3 w-36 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="py-3 px-3 w-32 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</th>
            <th className="py-3 px-3 w-28 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Due</th>
            <th className="py-3 px-3 w-28 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Creator</th>
            <th className="w-10 px-3" />
          </tr>
        </thead>
        <tbody>
          {localTasks.map((task) => (
            <SortableTaskRow
              key={task.id}
              task={task}
              selected={selected.has(task.id)}
              onToggleSelect={() => toggleRow(task.id)}
              onUpdate={onUpdate}
              onDelete={onDelete}
              draggable={draggable}
            />
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      {draggable ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={localTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tableContent}
          </SortableContext>
        </DndContext>
      ) : tableContent}

      <BulkActionsBar
        selected={selected}
        total={tasks.length}
        onClear={() => setSelected(new Set())}
        onBulkDelete={handleBulkDelete}
        onBulkStatus={handleBulkStatus}
        onBulkPriority={handleBulkPriority}
      />
    </>
  )
}

