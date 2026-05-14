import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, CheckSquare } from 'lucide-react'
import { arrayMove } from '@dnd-kit/sortable'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { SortableTaskList } from '../work/SortableTaskList'
import { NewProjectModal } from './NewProjectModal'
import { NewTaskModal } from '../work/NewTaskModal'
import { ProjectGoals } from './ProjectGoals'
import toast from 'react-hot-toast'

const STATUS_STYLES: Record<string, string> = {
  planning:  'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800',
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  on_hold:   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  completed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
}

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planning', active: 'Active', on_hold: 'On Hold', completed: 'Completed',
}

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { team } = useTeam()
  const [project, setProject] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditProject, setShowEditProject] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)

  const load = useCallback(async () => {
    if (!projectId || !team) return
    setLoading(true)
    try {
      const [{ project: p }, { tasks: t }] = await Promise.all([
        api.getProject(projectId),
        api.getTasks(team.id, { project_id: projectId }),
      ])
      setProject(p)
      setTasks(t || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId, team?.id])

  useEffect(() => { load() }, [load])

  function handleTaskUpdate(updated: any) {
    setTasks((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t))
  }
  function handleTaskDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }
  function handleTaskCreated(task: any) {
    setTasks((prev) => [task, ...prev])
  }

  async function handleReorder(activeId: string, overId: string) {
    if (!team) return
    const oldIndex = tasks.findIndex((t) => t.id === activeId)
    const newIndex = tasks.findIndex((t) => t.id === overId)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(tasks, oldIndex, newIndex)
    setTasks(reordered)
    try {
      await api.reorderTasks(team.id, projectId!, reordered.map((t) => t.id))
    } catch (err: any) {
      toast.error(err.message)
      setTasks(tasks)
    }
  }

  if (loading) {
    return (
      <div className="page-container-mobile">
        <div className="skeleton h-6 w-48 mb-2 rounded" />
        <div className="skeleton h-4 w-64 rounded" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="page-container-mobile">
        <p className="text-muted-foreground text-sm">Project not found.</p>
      </div>
    )
  }

  return (
    <div className="page-container-mobile">
      <div className="mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Projects
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="section-title">{project.name}</h2>
              <span className={`badge border text-[11px] ${STATUS_STYLES[project.status] || STATUS_STYLES.active}`}>
                {STATUS_LABELS[project.status] || project.status}
              </span>
            </div>
            {project.description && (
              <p className="section-subtitle mt-1">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowEditProject(true)} className="btn-secondary">
              <Pencil className="w-4 h-4" />
              Edit
            </button>
            <button onClick={() => setShowNewTask(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <CheckSquare className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No tasks yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Create the first task for this project.</p>
          <button onClick={() => setShowNewTask(true)} className="btn-primary mt-4">
            <Plus className="w-4 h-4" />
            Create task
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="section-subtitle">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} · drag to reorder</p>
          <SortableTaskList tasks={tasks} onUpdate={handleTaskUpdate} onDelete={handleTaskDelete} onReorder={handleReorder} />
        </div>
      )}

      {project && <ProjectGoals projectId={project.id} teamId={project.team_id} />}

      <NewProjectModal
        open={showEditProject}
        onClose={() => setShowEditProject(false)}
        project={project}
        onSaved={(updated) => setProject(updated)}
      />

      <NewTaskModal
        open={showNewTask}
        onClose={() => setShowNewTask(false)}
        onCreated={handleTaskCreated}
        defaultStatus="todo"
      />
    </div>
  )
}
