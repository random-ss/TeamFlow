import { useState, useEffect } from 'react'
import { Modal } from '../../components/ui/Modal'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { id: 'planning',  label: 'Planning' },
  { id: 'active',    label: 'Active' },
  { id: 'on_hold',   label: 'On Hold' },
  { id: 'completed', label: 'Completed' },
]

function buildForm(project: any) {
  return {
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'planning',
  }
}

export function NewProjectModal({
  open,
  onClose,
  onCreated,
  onSaved,
  project = null,
}: {
  open: boolean
  onClose: () => void
  onCreated?: (project: any) => void
  onSaved?: (project: any) => void
  project?: any
}) {
  const { team } = useTeam()
  const [form, setForm] = useState(buildForm(project))
  const [saving, setSaving] = useState(false)
  const isEditing = Boolean(project)

  useEffect(() => {
    if (open) setForm(buildForm(project))
  }, [project, open])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Project name is required')
    setSaving(true)
    try {
      if (isEditing) {
        const { project: updated } = await api.updateProject(team.id, project.id, {
          name: form.name.trim(),
          description: form.description || null,
          status: form.status,
        })
        onSaved?.(updated)
        toast.success('Project updated!')
      } else {
        const { project: created } = await api.createProject(team.id, {
          name: form.name.trim(),
          description: form.description || null,
          status: form.status,
        })
        onCreated?.(created)
        toast.success('Project created!')
      }
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Project' : 'New Project'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Project name *</label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Q3 Marketing Campaign"
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

        <div>
          <label className="form-label">Status</label>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className="input"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-1 border-t border-border">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (isEditing ? 'Saving…' : 'Creating…') : (isEditing ? 'Save Project' : 'Create Project')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
