interface StatusOption {
  value: string
  status: string
  label: string
}

export const CREATOR_STATUS_OPTIONS: StatusOption[] = [
  { value: 'todo', status: 'todo', label: 'To Do' },
  { value: 'in_review', status: 'in_review', label: 'In Review' },
  { value: 'rejected', status: 'rejected', label: 'Rejected' },
  { value: 'done', status: 'done', label: 'Done' },
]

export const ASSIGNEE_STATUS_OPTIONS: StatusOption[] = [
  { value: 'in_progress', status: 'in_progress', label: 'In Progress' },
  { value: 'couldnt_do', status: 'couldnt_do', label: "Couldn't Do" },
  { value: 'done', status: 'in_review', label: 'Done' },
]

export function getTaskStatusOptions(task: any, userId: string | undefined): StatusOption[] {
  const isAssignee =
    task?.profiles?.id === userId ||
    task?.task_assignees?.some((a: any) => a.user_id === userId)
  const isCreator = task?.creator?.id === userId

  if (task?.status === 'couldnt_do' && isAssignee && !isCreator) {
    return []
  }

  if (isAssignee && isCreator) {
    return [
      { value: 'todo', status: 'todo', label: 'To Do' },
      { value: 'in_progress', status: 'in_progress', label: 'In Progress' },
      { value: 'in_review', status: 'in_review', label: 'In Review' },
      { value: 'couldnt_do', status: 'couldnt_do', label: "Couldn't Do" },
      { value: 'rejected', status: 'rejected', label: 'Rejected' },
      { value: 'done', status: 'done', label: 'Done' },
    ]
  }

  if (isCreator) return CREATOR_STATUS_OPTIONS
  if (isAssignee) return ASSIGNEE_STATUS_OPTIONS
  return []
}

export function resolveTaskStatusChange(
  task: any,
  userId: string | undefined,
  nextValue: string
): { allowed: boolean; status: string | null; message: string | null } {
  const options = getTaskStatusOptions(task, userId)
  const match = options.find((option) => option.value === nextValue)

  if (!match) return { allowed: false, status: null, message: null }

  if (match.value === 'done' && match.status === 'in_review') {
    return {
      allowed: true,
      status: 'in_review',
      message: 'Marked as done and sent for creator review.',
    }
  }

  return { allowed: true, status: match.status, message: null }
}
