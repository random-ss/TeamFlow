import { useState, useEffect, useCallback } from 'react'
import { Plus, FolderKanban } from 'lucide-react'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { useRealtime } from '../../hooks/useRealtime'
import { ProjectCard } from './ProjectCard'
import { NewProjectModal } from './NewProjectModal'
import { EmptyState } from '../../components/ui/EmptyState'

const STATUS_FILTERS = [
  { id: '',          label: 'All' },
  { id: 'planning',  label: 'Planning' },
  { id: 'active',    label: 'Active' },
  { id: 'on_hold',   label: 'On Hold' },
  { id: 'completed', label: 'Completed' },
]

export default function Projects() {
  const { team } = useTeam()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const loadProjects = useCallback(async () => {
    if (!team) return
    setLoading(true)
    try {
      const { projects: data } = await api.getProjects(team.id)
      setProjects(data || [])
    } finally {
      setLoading(false)
    }
  }, [team?.id])

  useEffect(() => { loadProjects() }, [loadProjects])

  useRealtime('projects', team ? { filter: `team_id=eq.${team.id}` } : null, () => loadProjects())

  function handleCreated(project: any) { setProjects((prev) => [project, ...prev]) }
  function handleUpdate(updated: any) {
    setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p))
  }
  function handleDelete(id: string) { setProjects((prev) => prev.filter((p) => p.id !== id)) }

  const displayed = statusFilter
    ? projects.filter((p) => p.status === statusFilter)
    : projects

  return (
    <div className="page-container-mobile">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="section-title">Projects</h2>
          <p className="section-subtitle mt-0.5">{projects.length} {projects.length === 1 ? 'project' : 'projects'}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      <div className="tab-bar mb-5 mobile-scroll-row">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id)}
            className={`tab-item ${statusFilter === f.id ? 'tab-item-active' : 'tab-item-inactive'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!loading && displayed.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={statusFilter ? 'No projects with this status' : 'No projects yet'}
          description={
            statusFilter
              ? 'Try a different filter to see projects.'
              : 'Create your first project to organise tasks.'
          }
          action={
            statusFilter ? (
              <button onClick={() => setStatusFilter('')} className="btn-secondary">
                Clear filter
              </button>
            ) : (
              <button onClick={() => setShowModal(true)} className="btn-primary">
                <Plus className="w-4 h-4" />
                Create project
              </button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <NewProjectModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
