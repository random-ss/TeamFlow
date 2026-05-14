import { useState, useEffect, useCallback } from 'react'
import { Plus, Target, Trash2, Pencil, X, ChevronUp, ChevronDown, Calendar, ArrowUp, ArrowDown, Check } from 'lucide-react'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active:    { label: 'Active',    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
  completed: { label: 'Completed', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  on_hold:   { label: 'On Hold',   className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  cancelled: { label: 'Cancelled', className: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700' },
}

function progressBarColor(p: number) {
  if (p >= 100) return 'bg-blue-500'
  if (p >= 60)  return 'bg-emerald-500'
  if (p >= 30)  return 'bg-amber-500'
  return 'bg-rose-400'
}

interface GoalForm {
  title: string
  description: string
  status: string
  progress: number
  deadline: string
}

const EMPTY: GoalForm = { title: '', description: '', status: 'active', progress: 0, deadline: '' }

function GoalCard({ goal, onUpdate, onDelete, onEdit, reorderMode, onMoveUp, onMoveDown, isFirst, isLast }: {
  goal: any
  onUpdate: (g: any) => void
  onDelete: (id: string) => void
  onEdit: (g: any) => void
  reorderMode?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
  isFirst?: boolean
  isLast?: boolean
}) {
  const [updating, setUpdating] = useState(false)
  const isOverdue = goal.deadline && new Date(goal.deadline) < new Date() && goal.status !== 'completed'
  const status = STATUS_CONFIG[goal.status] ?? STATUS_CONFIG.active
  const progress = goal.progress ?? 0

  async function adjustProgress(delta: number) {
    const next = Math.max(0, Math.min(100, progress + delta))
    const nextStatus = next >= 100 ? 'completed'
      : (goal.status === 'completed' && next < 100) ? 'active'
      : goal.status
    setUpdating(true)
    try {
      const { goal: updated } = await api.updateProjectGoal(goal.id, { progress: next, status: nextStatus })
      onUpdate(updated)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUpdating(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this goal?')) return
    try {
      await api.deleteProjectGoal(goal.id)
      onDelete(goal.id)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={cn('badge border text-[11px]', status.className)}>{status.label}</span>
            {goal.deadline && (
              <span className={cn('flex items-center gap-1 text-[11px]', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                <Calendar className="w-3 h-3" />
                {format(new Date(goal.deadline), 'MMM d, yyyy')}
              </span>
            )}
          </div>
          <p className={cn('text-sm font-medium leading-snug', goal.status === 'completed' && 'line-through text-muted-foreground')}>
            {goal.title}
          </p>
          {goal.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{goal.description}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {reorderMode ? (
            <>
              <button
                onClick={onMoveUp}
                disabled={isFirst}
                className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors disabled:opacity-30"
                title="Move up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onMoveDown}
                disabled={isLast}
                className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors disabled:opacity-30"
                title="Move down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onEdit(goal)}
                className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                title="Edit goal"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                title="Delete goal"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Progress</span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => adjustProgress(-10)}
              disabled={updating || progress <= 0}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
              title="-10%"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold w-9 text-center tabular-nums">{progress}%</span>
            <button
              onClick={() => adjustProgress(10)}
              disabled={updating || progress >= 100}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
              title="+10%"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', progressBarColor(progress))}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function ProjectGoals({ projectId, teamId }: { projectId: string; teamId: string }) {
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState<any>(null)
  const [form, setForm] = useState<GoalForm>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [reorderMode, setReorderMode] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)

  const loadGoals = useCallback(async () => {
    try {
      const { goals: data } = await api.getProjectGoals(projectId)
      setGoals(data)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadGoals() }, [loadGoals])

  function setField<K extends keyof GoalForm>(key: K, value: GoalForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function openCreate() {
    setEditGoal(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  function openEdit(goal: any) {
    setEditGoal(goal)
    setForm({
      title: goal.title || '',
      description: goal.description || '',
      status: goal.status || 'active',
      progress: goal.progress ?? 0,
      deadline: goal.deadline || '',
    })
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditGoal(null)
    setForm(EMPTY)
  }

  function moveGoal(index: number, direction: -1 | 1) {
    const next = [...goals]
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= next.length) return
    ;[next[index], next[newIndex]] = [next[newIndex], next[index]]
    setGoals(next)
  }

  async function saveOrder() {
    setSavingOrder(true)
    try {
      await api.reorderProjectGoals(goals.map((g) => g.id))
      setReorderMode(false)
      toast.success('Order saved')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingOrder(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        progress: form.progress,
        deadline: form.deadline || null,
      }
      if (editGoal) {
        const { goal } = await api.updateProjectGoal(editGoal.id, payload)
        setGoals((prev) => prev.map((g) => g.id === goal.id ? goal : g))
        toast.success('Goal updated')
      } else {
        const { goal } = await api.createProjectGoal(projectId, teamId, payload)
        setGoals((prev) => [...prev, goal])
        toast.success('Goal added')
      }
      cancelForm()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const activeCount = goals.filter((g) => g.status === 'active').length
  const completedCount = goals.filter((g) => g.status === 'completed').length

  if (loading) return null

  return (
    <div className="mt-8 pt-6 border-t border-border">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Goals</h3>
          {goals.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {activeCount} active{completedCount > 0 ? ` · ${completedCount} done` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {goals.length > 1 && (
            reorderMode ? (
              <button
                onClick={saveOrder}
                disabled={savingOrder}
                className="btn-secondary h-7 px-2.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
              >
                <Check className="w-3 h-3" />
                {savingOrder ? 'Saving…' : 'Done'}
              </button>
            ) : (
              <button onClick={() => setReorderMode(true)} className="btn-secondary h-7 px-2.5 text-xs">
                Reorder
              </button>
            )
          )}
          {!reorderMode && (
            <button onClick={openCreate} className="btn-secondary h-7 px-2.5 text-xs">
              <Plus className="w-3 h-3" />
              Add Goal
            </button>
          )}
        </div>
      </div>

      {/* Inline create/edit form */}
      {showForm && (
        <div className="mb-4 card p-4 border-primary/20 ring-1 ring-primary/10">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {editGoal ? 'Edit Goal' : 'New Goal'}
              </p>
              <button
                type="button"
                onClick={cancelForm}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              autoFocus
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Goal title…"
              className="input"
              required
            />

            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Description (optional)…"
              rows={2}
              className="input resize-none text-sm"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value)}
                  className="input text-sm"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Deadline</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setField('deadline', e.target.value)}
                  className="input text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">
                Progress — <span className="font-semibold text-foreground">{form.progress}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.progress}
                onChange={(e) => setField('progress', Number(e.target.value))}
                className="w-full accent-primary h-1.5"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={cancelForm} className="btn-secondary text-xs py-1.5 px-3">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary text-xs py-1.5 px-3">
                {saving ? (editGoal ? 'Saving…' : 'Adding…') : (editGoal ? 'Save Goal' : 'Add Goal')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No goals yet.</p>
          <button onClick={openCreate} className="mt-2 text-xs text-primary hover:underline">
            Add the first goal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal, idx) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onUpdate={(g) => setGoals((prev) => prev.map((x) => x.id === g.id ? g : x))}
              onDelete={(id) => setGoals((prev) => prev.filter((g) => g.id !== id))}
              onEdit={openEdit}
              reorderMode={reorderMode}
              onMoveUp={() => moveGoal(idx, -1)}
              onMoveDown={() => moveGoal(idx, 1)}
              isFirst={idx === 0}
              isLast={idx === goals.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
