import { useState, useEffect } from 'react'
import { Modal } from '../../components/ui/Modal'
import { TASK_PRIORITIES } from '../../lib/constants'
import { CREATOR_STATUS_OPTIONS } from '../../lib/taskStatusRules'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import toast from 'react-hot-toast'

function useProjects(teamId: string | undefined) {
  const [projects, setProjects] = useState<any[]>([])
  useEffect(() => {
    if (!teamId) return
    api.getProjects(teamId).then(({ projects: p }: any) => setProjects(p || [])).catch(() => {})
  }, [teamId])
  return projects
}

const DRAFT_KEY = 'draft_new_task'
const DEFAULT_CREATOR_STATUS = 'todo'

function normalizeStatus(status: string) {
  return CREATOR_STATUS_OPTIONS.some((option) => option.status === status)
    ? status
    : DEFAULT_CREATOR_STATUS
}

function buildForm(task: any, defaultStatus: string) {
  const multiAssigneeIds = task?.task_assignees?.map((a: any) => a.user_id) || []
  return {
    title: task?.title || '',
    description: task?.description || '',
    assignee_id: task?.assignee_id || '',
    assignee_ids: multiAssigneeIds as string[],
    use_multi_assignees: multiAssigneeIds.length > 0,
    priority: task?.priority || 'medium',
    status: normalizeStatus(task?.status || defaultStatus),
    due_date: task?.due_date || '',
    visibility: task?.visibility || 'team',
    project_id: task?.project_id || '',
    reopen_note: '',
  }
}

export function NewTaskModal({
  open,
  onClose,
  onCreated,
  onSaved,
  defaultStatus = 'todo',
  task = null,
  title = null,
}: {
  open: boolean
  onClose: () => void
  onCreated?: (task: any) => void
  onSaved?: (task: any) => void
  defaultStatus?: string
  task?: any
  title?: string | null
}) {
  const { team, members } = useTeam()
  const [form, setForm] = useState(buildForm(task, defaultStatus))
  const [saving, setSaving] = useState(false)
  const projects = useProjects(team?.id)

  const isEditing = Boolean(task)

  useEffect(() => {
    if (!open) return
    if (task) {
      setForm(buildForm(task, defaultStatus))
    } else {
      try {
        const saved = localStorage.getItem(DRAFT_KEY)
        if (saved) setForm({ ...buildForm(null, defaultStatus), ...JSON.parse(saved) })
        else setForm(buildForm(null, defaultStatus))
      } catch {
        setForm(buildForm(null, defaultStatus))
      }
    }
  }, [task, defaultStatus, open])

  useEffect(() => {
    if (!open || isEditing) return
    const draftable: any = { ...form }
    delete draftable.reopen_note
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftable))
  }, [form, open, isEditing])

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const wasCouldntDo = task?.status === 'couldnt_do'
  const assigneeChanged = isEditing && (task.assignee_id || '') !== (form.assignee_id || '')
  const multiAssigneesChanged = isEditing &&
    JSON.stringify(task?.task_assignees?.map((a: any) => a.user_id) || []) !== JSON.stringify(form.assignee_ids)
  const statusChanged = isEditing && task.status !== form.status
  const reopenedFromCouldntDo = wasCouldntDo && (assigneeChanged || multiAssigneesChanged || statusChanged)

  function toggleMultiAssign(enabled: boolean) {
    setForm((c) => ({
      ...c,
      use_multi_assignees: enabled,
      assignee_ids: enabled
        ? Array.from(new Set([...(c.assignee_ids || []), ...(c.assignee_id ? [c.assignee_id] : [])]))
        : [],
      assignee_id: enabled ? '' : c.assignee_id,
    }))
  }

  function toggleAssignee(userId: string) {
    setForm((c) => ({
      ...c,
      assignee_ids: c.assignee_ids.includes(userId)
        ? c.assignee_ids.filter((id) => id !== userId)
        : [...c.assignee_ids, userId],
      assignee_id: '',
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Task title required')
    if (reopenedFromCouldntDo && !form.reopen_note.trim()) {
      return toast.error('Add a reopen reason before reassigning or reopening this ticket')
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        assignee_id: form.use_multi_assignees ? null : form.assignee_id || null,
        priority: form.priority,
        status:
          wasCouldntDo && assigneeChanged && form.status === 'couldnt_do'
            ? 'todo'
            : form.status,
        due_date: form.due_date || null,
        visibility: form.visibility,
        project_id: form.project_id || null,
      }

      let savedTask: any
      if (isEditing) {
        const { task: updated } = await api.updateTask(team.id, task.id, payload)
        savedTask = updated
      } else {
        const { task: created } = await api.createTask(team.id, payload)
        savedTask = created
      }

      if (form.use_multi_assignees) {
        const { task: t } = await api.setTaskAssignees(savedTask.id, form.assignee_ids)
        savedTask = t
      } else if (task?.task_assignees?.length) {
        const { task: t } = await api.setTaskAssignees(savedTask.id, [])
        savedTask = t
      }

      if (isEditing && reopenedFromCouldntDo) {
        await api.addTaskComment(
          task.id,
          `↩ Reopened by ${members.find((m) => m.user_id === savedTask.created_by)?.profiles?.name || 'creator'}: ${form.reopen_note.trim()}`
        )
        const { task: refreshed } = await api.updateTask(team.id, task.id, {})
        savedTask = refreshed
      }

      if (isEditing) {
        onSaved?.(savedTask)
        toast.success('Ticket updated!')
      } else {
        onCreated?.(savedTask)
        localStorage.removeItem(DRAFT_KEY)
        toast.success('Task created!')
      }

      onClose()
      setForm(buildForm(null, defaultStatus))
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title || (isEditing ? 'Edit Ticket' : 'New Task')}>
      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className="form-label">Task name *</label>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Write LinkedIn post copy"
            className="input"
            required
          />
        </div>

        <div>
          <label className="form-label">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Optional details…"
            rows={3}
            className="input resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Assign to</label>
            {!form.use_multi_assignees ? (
              <select
                value={form.assignee_id}
                onChange={(e) => set('assignee_id', e.target.value)}
                className="input"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.profiles?.name}</option>
                ))}
              </select>
            ) : (
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 max-h-44 overflow-y-auto">
                {members.map((m) => {
                  const checked = form.assignee_ids.includes(m.user_id)
                  return (
                    <label key={m.user_id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAssignee(m.user_id)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">{m.profiles?.name}</span>
                    </label>
                  )
                })}
              </div>
            )}
            <button
              type="button"
              onClick={() => toggleMultiAssign(!form.use_multi_assignees)}
              className="mt-1.5 text-xs text-primary hover:underline"
            >
              {form.use_multi_assignees ? 'Use single assignee' : 'Assign to multiple people'}
            </button>
          </div>

          <div>
            <label className="form-label">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => set('priority', e.target.value)}
              className="input"
            >
              {TASK_PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="input"
            >
              {CREATOR_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.status}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Due date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => set('due_date', e.target.value)}
              className="input"
            />
          </div>
        </div>

        {reopenedFromCouldntDo && (
          <div>
            <label className="form-label">Reopen reason *</label>
            <textarea
              value={form.reopen_note}
              onChange={(e) => set('reopen_note', e.target.value)}
              placeholder="Why are you reopening or reassigning this ticket?"
              rows={3}
              className="input resize-none"
              required
            />
          </div>
        )}

        <div>
          <label className="form-label">Visibility</label>
          <div className="flex gap-2">
            {[{ id: 'team', label: 'Team' }, { id: 'private', label: 'Only me' }].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => set('visibility', v.id)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                  form.visibility === v.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-border/80'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {projects.length > 0 && (
          <div>
            <label className="form-label">Link to project</label>
            <select
              value={form.project_id}
              onChange={(e) => set('project_id', e.target.value)}
              className="input"
            >
              <option value="">No project</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1 border-t border-border">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (isEditing ? 'Saving…' : 'Creating…') : (isEditing ? 'Save Ticket' : 'Create Task')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
