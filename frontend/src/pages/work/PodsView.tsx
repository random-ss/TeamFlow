import { Avatar } from '../../components/ui/UserAvatar'
import { TaskCard } from './TaskCard'
import { UserX } from 'lucide-react'

export function PodsView({
  tasks,
  members,
  onUpdate,
  onDelete,
}: {
  tasks: any[]
  members: any[]
  onUpdate?: (u: any) => void
  onDelete?: (id: string) => void
}) {
  const byMember: Record<string, any[]> = {}
  const unassigned: any[] = []

  for (const task of tasks) {
    const assignees: string[] = task.task_assignees?.map((a: any) => a.user_id) || []
    if (task.assignee_id && !assignees.includes(task.assignee_id)) {
      assignees.push(task.assignee_id)
    }

    if (assignees.length > 0) {
      for (const uid of assignees) {
        if (!byMember[uid]) byMember[uid] = []
        byMember[uid].push(task)
      }
    } else {
      unassigned.push(task)
    }
  }

  const memberPods = members.map((m) => ({
    member: m,
    tasks: byMember[m.user_id] || [],
  }))

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {memberPods.map(({ member, tasks: memberTasks }) => (
        <div
          key={member.user_id}
          className="shrink-0 w-72 bg-muted/40 rounded-xl border border-border p-3 flex flex-col"
        >
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <Avatar name={member.profiles?.name} src={member.profiles?.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{member.profiles?.name}</p>
            </div>
            <span className="text-xs font-medium bg-muted text-muted-foreground rounded-full px-2 py-0.5">
              {memberTasks.length}
            </span>
          </div>

          <div className="space-y-2 flex-1">
            {memberTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                No tasks assigned
              </div>
            ) : (
              memberTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  compact
                />
              ))
            )}
          </div>
        </div>
      ))}

      {unassigned.length > 0 && (
        <div className="shrink-0 w-72 bg-muted/40 rounded-xl border border-dashed border-border p-3 flex flex-col">
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <UserX className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-muted-foreground">Unassigned</p>
            </div>
            <span className="text-xs font-medium bg-muted text-muted-foreground rounded-full px-2 py-0.5">
              {unassigned.length}
            </span>
          </div>
          <div className="space-y-2">
            {unassigned.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdate={onUpdate}
                onDelete={onDelete}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
