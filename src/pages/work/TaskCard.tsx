import { useEffect, useMemo, useState } from 'react'
import { differenceInCalendarDays, format, isPast, isToday, parseISO } from 'date-fns'
import { Calendar, Check, ChevronDown, GripVertical, MessageSquare, Pencil, Send, SmilePlus, Trash2, User, X, XCircle } from 'lucide-react'
import { Avatar } from '../../components/ui/UserAvatar'
import { TASK_PRIORITIES, TASK_STATUSES } from '../../lib/constants'
import { ASSIGNEE_STATUS_OPTIONS, getTaskStatusOptions, resolveTaskStatusChange } from '../../lib/taskStatusRules'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { useAuth } from '../../contexts/AuthContext'
import { NewTaskModal } from './NewTaskModal'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

function extractBlockedText(content: string): string {
  if (content.startsWith('[blocked]:')) return content.replace('[blocked]:', '').trim()
  if (content.startsWith("❌ Couldn't do:")) return content.replace("❌ Couldn't do:", '').trim()
  return content
}

function isBlockedComment(content: string): boolean {
  return content?.startsWith('[blocked]:') || content?.startsWith("❌ Couldn't do:")
}

function sortComments(comments: any[]) {
  return [...(comments || [])].sort((l, r) => new Date(l.created_at).getTime() - new Date(r.created_at).getTime())
}

function getStatusInfo(status: string) {
  return TASK_STATUSES.find((e: any) => e.id === status)
}

function AssigneeStack({ assignments }: { assignments: any[] }) {
  return (
    <div className="flex items-center -space-x-2">
      {assignments.slice(0, 3).map((a) => (
        <Avatar key={a.id} name={a.assignee?.name} src={a.assignee?.avatar_url} size="xs" className="ring-2 ring-background" />
      ))}
    </div>
  )
}

export function TaskCard({
  task,
  onUpdate,
  onDelete,
  compact = false,
  dragHandleProps = null,
  reorderEnabled = false,
}: {
  task: any
  onUpdate?: (updated: any) => void
  onDelete?: (id: string) => void
  compact?: boolean
  dragHandleProps?: any
  reorderEnabled?: boolean
}) {
  const { team } = useTeam()
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [showReasonBox, setShowReasonBox] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [reason, setReason] = useState('')
  const [chatMessage, setChatMessage] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [submittingReason, setSubmittingReason] = useState(false)
  const [submittingChat, setSubmittingChat] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [taskReactions, setTaskReactions] = useState<Record<string, { count: number; isOwn: boolean }>>({})
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const priorityInfo = TASK_PRIORITIES.find((e: any) => e.id === task.priority)
  const statusInfo = getStatusInfo(task.status)
  const taskAssignments = task.task_assignees || []
  const currentAssignment = taskAssignments.find((a: any) => a.user_id === user?.id)
  const isMultiAssigned = taskAssignments.length > 0
  const isOverdue = task.due_date && !['done', 'rejected', 'couldnt_do'].includes(task.status) && (() => {
    try { return isPast(parseISO(task.due_date)) } catch { return false }
  })()
  const dueDaysLabel = task.due_date && !['done', 'rejected', 'couldnt_do'].includes(task.status)
    ? (() => {
        try {
          const d = parseISO(task.due_date)
          if (isToday(d)) return 'Due today'
          const diff = differenceInCalendarDays(d, new Date())
          return diff > 0 ? `${diff}d left` : `${Math.abs(diff)}d overdue`
        } catch { return null }
      })()
    : null

  const isCreator = task.creator?.id === user?.id
  const isSingleAssignee = task.profiles?.id === user?.id
  const isLockedForAssignee =
    (!isCreator && task.status === 'couldnt_do' && isSingleAssignee) ||
    (!isCreator && currentAssignment?.status === 'couldnt_do')
  const statusOptions = currentAssignment && !isCreator
    ? ASSIGNEE_STATUS_OPTIONS
    : getTaskStatusOptions(task, user?.id)
  const currentStatus = currentAssignment && !isCreator ? currentAssignment.status : task.status
  const currentStatusInfo = getStatusInfo(currentStatus)
  const selectedStatusValue =
    statusOptions.find((o: any) => o.status === currentStatus || o.value === currentStatus)?.value ?? currentStatus
  const visibleStatusOptions = statusOptions.some((o: any) => o.value === selectedStatusValue)
    ? statusOptions
    : [{ value: currentStatus, status: currentStatus, label: currentStatusInfo?.label || currentStatus }, ...statusOptions]
  const canChangeStatus = statusOptions.length > 0 && !isLockedForAssignee
  const comments = useMemo(() => sortComments(task.task_comments), [task.task_comments])
  const latestCouldntDoComment = [...comments].reverse().find((c) => isBlockedComment(c.content))

  async function updateStatus(status: string) {
    try {
      const { task: updated } = await api.updateTask(team.id, task.id, { status })
      onUpdate?.(updated)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleStatusChange(nextValue: string) {
    if (currentAssignment && !isCreator) {
      const opt = ASSIGNEE_STATUS_OPTIONS.find((o: any) => o.value === nextValue)
      if (!opt) return
      if (opt.value === 'couldnt_do') { setShowReasonBox(true); return }
      try {
        const { task: updated } = await api.updateAssigneeStatus(task.id, user.id, opt.value === 'done' ? 'done' : opt.value)
        onUpdate?.(updated)
        if (opt.value === 'done') toast.success('Marked as done and sent for creator review.')
      } catch (err: any) { toast.error(err.message) }
      return
    }
    const resolved = resolveTaskStatusChange(task, user?.id, nextValue)
    if (!resolved.allowed) return
    if (resolved.status === 'couldnt_do') { setShowReasonBox(true); return }
    // When creator is also a multi-assignee, sync their individual assignee status
    if (currentAssignment) {
      try { await api.updateAssigneeStatus(task.id, user.id, resolved.status) } catch {}
    }
    await updateStatus(resolved.status)
    if (resolved.message) toast.success(resolved.message)
  }

  async function submitReason(e: React.FormEvent) {
    e.preventDefault()
    setSubmittingReason(true)
    try {
      const detail = reason.trim()
      if (detail) await api.addTaskComment(task.id, `[blocked]: ${detail}`)
      if (currentAssignment && !isCreator) {
        const { task: updated } = await api.updateAssigneeStatus(task.id, user.id, 'couldnt_do')
        onUpdate?.(updated)
      } else {
        if (currentAssignment) {
          try { await api.updateAssigneeStatus(task.id, user.id, 'couldnt_do') } catch {}
        }
        await updateStatus('couldnt_do')
      }
      setShowReasonBox(false)
      setReason('')
      setExpanded(true)
    } catch (err: any) { toast.error(err.message) }
    finally { setSubmittingReason(false) }
  }

  async function submitChat(e: React.FormEvent) {
    e.preventDefault()
    const message = chatMessage.trim()
    if (!message) return
    setSubmittingChat(true)
    try {
      const { task: updated } = await api.addTaskComment(task.id, message)
      onUpdate?.(updated)
      setChatMessage('')
      setChatOpen(true)
      setExpanded(true)
    } catch (err: any) { toast.error(err.message) }
    finally { setSubmittingChat(false) }
  }

  useEffect(() => {
    if (!user) return
    api.getTaskReactions(task.id).then(({ reactions }) => {
      const grouped: Record<string, { count: number; isOwn: boolean }> = {}
      for (const r of reactions) {
        if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, isOwn: false }
        grouped[r.emoji].count++
        if (r.user_id === user.id) grouped[r.emoji].isOwn = true
      }
      setTaskReactions(grouped)
    }).catch(() => {})
  }, [task.id, user?.id])

  async function handleTaskReact(emoji: string) {
    const isOwn = taskReactions[emoji]?.isOwn ?? false
    setShowEmojiPicker(false)
    setTaskReactions((prev) => {
      const cur = prev[emoji] ?? { count: 0, isOwn: false }
      const next = { ...prev }
      if (!isOwn) {
        next[emoji] = { count: cur.count + 1, isOwn: true }
      } else {
        const newCount = cur.count - 1
        if (newCount <= 0) { delete next[emoji] } else { next[emoji] = { count: newCount, isOwn: false } }
      }
      return next
    })
    try {
      await api.toggleTaskReaction(task.id, team.id, emoji)
    } catch (err: any) {
      toast.error(err.message)
      api.getTaskReactions(task.id).then(({ reactions }) => {
        const grouped: Record<string, { count: number; isOwn: boolean }> = {}
        for (const r of reactions) {
          if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, isOwn: false }
          grouped[r.emoji].count++
          if (r.user_id === user?.id) grouped[r.emoji].isOwn = true
        }
        setTaskReactions(grouped)
      }).catch(() => {})
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this task?')) return
    try {
      await api.deleteTask(team.id, task.id)
      onDelete?.(task.id)
    } catch (err: any) { toast.error(err.message) }
  }

  function handleSave(updated: any) {
    onUpdate?.(updated)
    setShowEditModal(false)
    setExpanded(true)
  }

  function openChat() { setExpanded(true); setChatOpen(true) }
  function startEditComment(comment: any) { setEditingCommentId(comment.id); setEditingContent(comment.content) }
  function cancelEditComment() { setEditingCommentId(null); setEditingContent('') }

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

  async function deleteComment(commentId: string) {
    if (!confirm('Delete this message?')) return
    try {
      const { task: updated } = await api.deleteTaskComment(task.id, commentId)
      onUpdate?.(updated)
    } catch (err: any) { toast.error(err.message) }
  }

  /* ── Compact card (Kanban) ────────────────────────────────────── */
  if (compact) {
    return (
      <div className="card p-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{task.title}</p>
          <button onClick={handleDelete} className="p-0.5 text-muted-foreground/40 hover:text-destructive transition-colors shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {latestCouldntDoComment && (
          <p className="mb-2 flex items-start gap-1 text-[11px] text-amber-600 dark:text-amber-400 line-clamp-2">
            <XCircle className="w-3 h-3 mt-px shrink-0" />
            {extractBlockedText(latestCouldntDoComment.content)}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${priorityInfo?.dot || 'bg-muted-foreground'}`} />
            {task.due_date && (
              <span className={`text-xs ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                {format(parseISO(task.due_date), 'MMM d')}
                {dueDaysLabel && <span className="ml-1 opacity-75">· {dueDaysLabel}</span>}
              </span>
            )}
          </div>
          {isMultiAssigned ? (
            <AssigneeStack assignments={taskAssignments} />
          ) : task.profiles ? (
            <Avatar name={task.profiles.name} src={task.profiles.avatar_url} size="xs" />
          ) : null}
        </div>
      </div>
    )
  }

  /* ── Full card ────────────────────────────────────────────────── */
  return (
    <>
      <div
        className={cn(
          'card cursor-pointer p-4 transition-all duration-200 hover:shadow-md',
          expanded && 'ring-1 ring-primary/20 border-primary/30'
        )}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1.5">
              <span className={`mt-[5px] w-2 h-2 rounded-full shrink-0 ${priorityInfo?.dot || 'bg-muted-foreground'}`} />
              <div className="min-w-0">
                <p className={`text-sm font-semibold text-foreground leading-snug ${expanded ? '' : 'line-clamp-1'}`}>{task.title}</p>
                {!expanded && task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap pl-4">
              <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', statusInfo?.color || 'bg-muted text-muted-foreground')}>{statusInfo?.label}</span>
              <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', priorityInfo?.color || 'bg-muted text-muted-foreground')}>{priorityInfo?.label}</span>
              {task.due_date && (
                <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                  <Calendar className="w-3 h-3" />
                  {format(parseISO(task.due_date), 'MMM d, yyyy')}
                  {dueDaysLabel && <span className="opacity-75">· {dueDaysLabel}</span>}
                </span>
              )}
              {isMultiAssigned && (
                <span className="text-xs text-muted-foreground">{taskAssignments.length} assignees</span>
              )}
            </div>

            {!expanded && latestCouldntDoComment && (
              <p className="mt-1.5 pl-4 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 line-clamp-1">
                <XCircle className="w-3 h-3 shrink-0" />
                {extractBlockedText(latestCouldntDoComment.content)}
              </p>
            )}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px] sm:items-end" onClick={(e) => e.stopPropagation()}>
            <div className="flex min-w-0 items-start justify-between gap-3 sm:w-full sm:justify-end">
              <div className="min-w-0 text-left sm:text-right">
                {task.creator && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:justify-end">
                    <User className="w-3 h-3 shrink-0" />
                    <span className="truncate">by {task.creator.name}</span>
                  </div>
                )}
                {isMultiAssigned ? (
                  <div className="mt-1 flex items-center gap-2 sm:justify-end">
                    <AssigneeStack assignments={taskAssignments} />
                    <span className="text-xs text-muted-foreground">{taskAssignments.length}</span>
                  </div>
                ) : task.profiles ? (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground sm:justify-end">
                    <span className="truncate">{task.profiles.name}</span>
                    <Avatar name={task.profiles.name} src={task.profiles.avatar_url} size="xs" />
                  </div>
                ) : null}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
                className="p-0.5 rounded hover:bg-muted transition-colors shrink-0"
                title={expanded ? 'Collapse' : 'Expand'}
              >
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:max-w-[280px]">
              {reorderEnabled && dragHandleProps && (
                <button
                  type="button"
                  {...dragHandleProps}
                  onClick={(e) => e.stopPropagation()}
                  className="order-4 cursor-grab touch-none p-1 text-muted-foreground/40 transition-colors active:cursor-grabbing hover:text-muted-foreground sm:order-none"
                  title="Drag to reorder"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={openChat}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-all duration-150 hover:border-primary/40 hover:text-primary"
                title="Team chat"
              >
                <MessageSquare className="w-3 h-3" />
                <span>{comments.length}</span>
              </button>
              {canChangeStatus && (
                <select
                  value={selectedStatusValue}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="filter-select min-h-[38px] min-w-[132px] flex-1 sm:flex-initial"
                >
                  {visibleStatusOptions.map((o: any) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 text-muted-foreground/40 transition-colors hover:text-primary"
                title="Edit ticket"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-muted-foreground/40 transition-colors hover:text-destructive"
                title="Delete ticket"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-border pt-4" onClick={(e) => e.stopPropagation()}>
            {task.description && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Description</p>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{task.description}</p>
              </div>
            )}

            {isMultiAssigned && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Assignees</p>
                <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {taskAssignments.map((a: any) => {
                    const aStatusInfo = getStatusInfo(a.status)
                    const statusColor = aStatusInfo ? TASK_STATUSES.find(s => s.id === a.status)?.color : undefined
                    return (
                      <div key={a.id} className="flex items-center gap-3 bg-muted/20 px-3 py-2">
                        <Avatar name={a.assignee?.name} src={a.assignee?.avatar_url} size="xs" className="shrink-0" />
                        <span className="text-sm text-foreground flex-1 truncate">{a.assignee?.name}</span>
                        <span className={cn('shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', statusColor || 'bg-muted text-muted-foreground')}>
                          {aStatusInfo?.label || a.status}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Team Chat</p>
                <span className="text-[11px] text-muted-foreground">
                  {comments.length} {comments.length === 1 ? 'message' : 'messages'}
                </span>
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
                  autoFocus={chatOpen}
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

              {comments.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No messages yet.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {comments.map((comment: any) => {
                    const isCouldntDo = isBlockedComment(comment.content)
                    const isReopen = comment.content?.startsWith('↩ Reopened:')
                    const isEditingThis = editingCommentId === comment.id
                    return (
                      <div
                        key={comment.id}
                        className={cn(
                          'rounded-lg border px-3 py-2.5',
                          isCouldntDo
                            ? 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10'
                            : isReopen
                              ? 'border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/10'
                              : 'border-border bg-muted/40'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
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
                                <button
                                  onClick={() => startEditComment(comment)}
                                  className="p-1 text-muted-foreground/40 hover:text-primary transition-colors rounded"
                                  title="Edit message"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => deleteComment(comment.id)}
                                  className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors rounded"
                                  title="Delete message"
                                >
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
                                if (e.key === 'Escape') cancelEditComment()
                              }}
                              className="flex-1 bg-background border border-primary/40 rounded-lg px-2.5 py-1.5 text-sm text-foreground outline-none"
                              disabled={savingEdit}
                            />
                            <button
                              onClick={() => saveEditComment(comment)}
                              disabled={savingEdit || !editingContent.trim()}
                              className="p-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-40 hover:bg-primary/90 transition-colors"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={cancelEditComment} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
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

            {/* Task Reactions */}
            <div className="flex items-center gap-1.5 flex-wrap relative">
              {showEmojiPicker && (
                <>
                  <div className="fixed inset-0 z-[9]" onClick={() => setShowEmojiPicker(false)} />
                  <div className="absolute bottom-full left-0 mb-1 flex gap-0.5 p-1.5 rounded-lg border border-border bg-background shadow-lg z-10">
                    {['👍','❤️','😂','😮','🔥','✅','🎉','💯'].map((e) => (
                      <button
                        key={e}
                        onClick={() => handleTaskReact(e)}
                        className="text-base hover:scale-125 transition-transform w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {Object.entries(taskReactions).map(([emoji, { count, isOwn: mine }]) => (
                <button
                  key={emoji}
                  onClick={() => handleTaskReact(emoji)}
                  className={cn(
                    'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-xs transition-all',
                    mine ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-background border-border text-foreground hover:border-primary/30'
                  )}
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  {count > 1 && <span className="font-medium text-[10px] ml-0.5">{count}</span>}
                </button>
              ))}
              <button
                onClick={() => setShowEmojiPicker((v) => !v)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                title="Add reaction"
              >
                <SmilePlus className="w-3.5 h-3.5" />
              </button>
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
                <button type="button" onClick={() => setShowReasonBox(false)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
                <button type="submit" disabled={submittingReason || !reason.trim()} className="p-1.5 bg-destructive text-destructive-foreground rounded-lg disabled:opacity-40 hover:bg-destructive/90 transition-colors">
                  <Send className="w-3 h-3" />
                </button>
              </form>
            )}

            {isLockedForAssignee && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                This ticket is locked for you until the creator reopens or reassigns it.
              </p>
            )}
          </div>
        )}
      </div>

      <NewTaskModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSaved={handleSave}
        task={task}
        title="Edit Ticket"
      />
    </>
  )
}
