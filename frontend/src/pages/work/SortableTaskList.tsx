import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './TaskCard'

function SortableTaskCard({ task, onUpdate, onDelete }: { task: any; onUpdate?: (u: any) => void; onDelete?: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        onUpdate={onUpdate}
        onDelete={onDelete}
        reorderEnabled
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export function SortableTaskList({
  tasks,
  onUpdate,
  onDelete,
  onReorder,
}: {
  tasks: any[]
  onUpdate?: (u: any) => void
  onDelete?: (id: string) => void
  onReorder?: (activeId: string, overId: string) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd({ active, over }: any) {
    if (!over || active.id === over.id) return
    onReorder?.(active.id, over.id)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
