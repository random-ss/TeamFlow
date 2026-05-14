import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2, FolderOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { NewProjectModal } from './NewProjectModal'
import toast from 'react-hot-toast'

const STATUS_STYLES: Record<string, string> = {
  planning:  'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800',
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  on_hold:   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  completed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
}

const STATUS_LABELS: Record<string, string> = {
  planning:  'Planning',
  active:    'Active',
  on_hold:   'On Hold',
  completed: 'Completed',
}

export function ProjectCard({
  project,
  onUpdate,
  onDelete,
}: {
  project: any
  onUpdate: (p: any) => void
  onDelete: (id: string) => void
}) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this project? Tasks will not be deleted.')) return
    setDeleting(true)
    try {
      await api.deleteProject(project.id)
      onDelete(project.id)
      toast.success('Project deleted')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div
        className="card p-4 hover:shadow-md transition-shadow cursor-pointer group"
        onClick={() => navigate(`/projects/${project.id}`)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">{project.name}</h3>
              {project.description && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{project.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`badge border text-[11px] ${STATUS_STYLES[project.status] || STATUS_STYLES.active}`}>
              {STATUS_LABELS[project.status] || project.status}
            </span>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v) }}
                className="btn-icon w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false) }} />
                  <div className="absolute right-0 top-8 z-50 min-w-[140px] rounded-md border border-border bg-popover shadow-md overflow-hidden">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowEdit(true) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {project.creator && (
          <p className="mt-3 text-xs text-muted-foreground">
            Created by {project.creator.name}
          </p>
        )}
      </div>

      <NewProjectModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        project={project}
        onSaved={onUpdate}
      />
    </>
  )
}
