import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './TaskCard'
import { TASK_STATUSES } from '../../lib/constants'
import { resolveTaskStatusChange } from '../../lib/taskStatusRules'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { useAuth } from '../../contexts/AuthContext'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'

function SortableTask({ task, onUpdate, onDelete }: { task: any; onUpdate?: (u: any) => void; onDelete?: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onUpdate={onUpdate} onDelete={onDelete} compact />
    </div>
  )
}

export function KanbanView({
  tasks,
  onUpdate,
  onDelete,
  onAddTask,
}: {
  tasks: any[]
  onUpdate: (u: any) => void
  onDelete: (id: string) => void
  onAddTask: (status: string) => void
}) {
  const { team } = useTeam()
  const { user } = useAuth()
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const activeTask = tasks.find((t) => t.id === activeId)

  async function handleDragEnd({ active, over }: any) {
    setActiveId(null)
    if (!over || active.id === over.id) return

    const overTask = tasks.find((t) => t.id === over.id)
    const overColumn = TASK_STATUSES.find((s) => s.id === over.id)
    const newStatus = overColumn?.id || overTask?.status
    const draggedTask = tasks.find((t) => t.id === active.id)

    if (newStatus && newStatus !== draggedTask?.status) {
      const resolved = resolveTaskStatusChange(draggedTask, user?.id, newStatus)
      if (!resolved.allowed) return
      if (resolved.status === draggedTask?.status) {
        if (resolved.message) toast.success(resolved.message)
        return
      }
      try {
        const { task: updated } = await api.updateTask(team.id, active.id, { status: resolved.status })
        onUpdate(updated)
        if (resolved.message) toast.success(resolved.message)
      } catch {}
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveId(active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {TASK_STATUSES.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id)
          return (
            <div key={col.id} className="flex-shrink-0 w-[272px]">
              <div className="flex items-center justify-between mb-3 px-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground tracking-tight">{col.label}</span>
                  <span className="text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md font-medium">{colTasks.length}</span>
                </div>
                <button
                  onClick={() => onAddTask(col.id)}
                  className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                id={col.id}
                className="bg-muted/40 rounded-xl p-2 min-h-[200px] space-y-2 border border-border"
              >
                <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {colTasks.map((task) => (
                    <SortableTask key={task.id} task={task} onUpdate={onUpdate} onDelete={onDelete} />
                  ))}
                </SortableContext>
                {colTasks.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No tasks</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} compact /> : null}
      </DragOverlay>
    </DndContext>
  )
}
