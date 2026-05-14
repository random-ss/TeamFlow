import { supabase } from './supabase'

const TASK_SELECT = `
  *,
  profiles!assignee_id(id, name, avatar_url),
  creator:profiles!created_by(id, name, avatar_url),
  projects(id, name),
  task_comments(*, profiles!author_id(*)),
  task_assignees(*, assignee:profiles!user_id(id, name, avatar_url))
`

const POST_SELECT = `
  *,
  profiles(*),
  post_images(*),
  post_reactions(*),
  comments(*, profiles(*))
`

const MESSAGE_SELECT = `
  *,
  sender:profiles!sender_id(id, name, avatar_url)
`

function randomInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id
}

async function logActivity(teamId: string, eventType: string, description: string) {
  const userId = await currentUserId()
  supabase.from('activity_events').insert({
    team_id: teamId,
    actor_id: userId,
    event_type: eventType,
    description,
  }).then(() => {})
}

async function fetchTaskById(taskId: string) {
  const { data: task, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('id', taskId)
    .single()
  if (error) throw new Error(error.message)
  return task
}

async function fetchPostById(postId: string) {
  const { data: post, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('id', postId)
    .single()
  if (error) throw new Error(error.message)
  return post
}

function sortTasksByOrder(tasks: any[]) {
  return [...(tasks || [])].sort((left, right) => {
    const leftOrder = left.sort_order ?? Number.MAX_SAFE_INTEGER
    const rightOrder = right.sort_order ?? Number.MAX_SAFE_INTEGER
    if (leftOrder !== rightOrder) return leftOrder - rightOrder
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  })
}

export const api = {
  // ── Teams ──────────────────────────────────────────────────────
  createTeam: async (name: string) => {
    const userId = await currentUserId()
    const invite_code = randomInviteCode()
    const { data: team, error } = await supabase
      .from('teams')
      .insert({ name, invite_code, created_by: userId })
      .select()
      .single()
    if (error) throw new Error(error.message)
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: userId, role: 'admin' })
    if (memberError) throw new Error(memberError.message)
    return { team }
  },

  joinTeam: async (invite_code: string) => {
    const userId = await currentUserId()
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('invite_code', invite_code)
      .single()
    if (teamError || !team) throw new Error('Invalid invite code')
    const { error } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: userId, role: 'member' })
    if (error) throw new Error(error.code === '23505' ? 'You are already a member of this team' : error.message)
    return { team }
  },

  deleteTeam: async (teamId: string) => {
    const { error } = await supabase.from('teams').delete().eq('id', teamId)
    if (error) throw new Error(error.message)
    return {}
  },

  updateTeam: async (teamId: string, data: Record<string, any>) => {
    const { data: team, error } = await supabase
      .from('teams')
      .update(data)
      .eq('id', teamId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return { team }
  },

  getTeamMembers: async (teamId: string) => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*, profiles(*)')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true })
    if (error) throw new Error(error.message)
    return { members: data }
  },

  updateMemberRole: async (teamId: string, userId: string, role: string) => {
    const { error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return {}
  },

  removeMember: async (teamId: string, userId: string) => {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return {}
  },

  // ── Posts ──────────────────────────────────────────────────────
  getPosts: async (teamId: string, params: Record<string, any> = {}) => {
    let query = supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (params.platform) query = query.contains('platforms', [params.platform])
    if (params.status) query = query.eq('status', params.status)
    if (params.author_id) query = query.eq('author_id', params.author_id)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return { posts: data }
  },

  createPost: async (teamId: string, data: Record<string, any>) => {
    const { image_urls = [], ...postData } = data
    const { data: createdPost, error } = await supabase.rpc('create_post', {
      p_team_id: teamId,
      p_caption: postData.caption ?? null,
      p_platforms: postData.platforms ?? [],
      p_visibility: postData.visibility ?? 'team',
      p_status: postData.status ?? 'draft',
      p_scheduled_at: postData.scheduled_at ?? null,
    })
    if (error) throw new Error(error.message)

    if (image_urls.length > 0) {
      const { error: imageError } = await supabase
        .from('post_images')
        .insert(image_urls.map((url: string) => ({ post_id: createdPost.id, url })))
      if (imageError) throw new Error(imageError.message)
    }

    const post = await fetchPostById(createdPost.id)
    logActivity(teamId, 'post_created', `created a new post`)
    return { post }
  },

  updatePost: async (teamId: string, postId: string, data: Record<string, any>) => {
    const { data: post, error } = await supabase
      .from('posts')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', postId)
      .select(POST_SELECT)
      .single()
    if (error) throw new Error(error.message)
    return { post }
  },

  deletePost: async (teamId: string, postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) throw new Error(error.message)
    return {}
  },

  reactToPost: async (postId: string, type: string) => {
    const userId = await currentUserId()
    const { data: existing } = await supabase
      .from('post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('type', type)
      .maybeSingle()
    if (existing) {
      await supabase.from('post_reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('post_reactions').insert({ post_id: postId, user_id: userId, type })
    }
    return {}
  },

  addComment: async (postId: string, content: string) => {
    const userId = await currentUserId()
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: userId, content })
      .select('*, profiles(*)')
      .single()
    if (error) throw new Error(error.message)
    return { comment }
  },

  // ── Tasks ──────────────────────────────────────────────────────
  getTasks: async (teamId: string, params: Record<string, any> = {}) => {
    const userId = await currentUserId()
    let query = supabase
      .from('tasks')
      .select(TASK_SELECT)
      .eq('team_id', teamId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (params.mode === 'my_tasks') {
      const { data: assigneeRows } = await supabase
        .from('task_assignees')
        .select('task_id')
        .eq('user_id', userId)
      const multiTaskIds = assigneeRows?.map((r: any) => r.task_id) || []
      if (multiTaskIds.length > 0) {
        query = query.or(`assignee_id.eq.${userId},id.in.(${multiTaskIds.join(',')})`)
      } else {
        query = query.eq('assignee_id', userId)
      }
    } else if (params.mode === 'i_assigned') {
      query = query.eq('created_by', userId)
    }

    if (params.assignee_id) query = query.eq('assignee_id', params.assignee_id)
    if (params.priority) query = query.eq('priority', params.priority)
    if (params.status) query = query.eq('status', params.status)
    if (params.project_id) query = query.eq('project_id', params.project_id)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return { tasks: sortTasksByOrder(data) }
  },

  createTask: async (teamId: string, data: Record<string, any>) => {
    const { data: createdTask, error: createError } = await supabase.rpc('create_task', {
      p_team_id: teamId,
      p_title: data.title,
      p_description: data.description ?? null,
      p_assignee_id: data.assignee_id ?? null,
      p_priority: data.priority ?? 'medium',
      p_status: data.status ?? 'todo',
      p_visibility: data.visibility ?? 'team',
      p_due_date: data.due_date ?? null,
      p_project_id: data.project_id ?? null,
    })
    if (createError) throw new Error(createError.message)

    const task = await fetchTaskById(createdTask.id)
    logActivity(teamId, 'task_created', `created task "${task.title}"`)
    return { task }
  },

  updateTask: async (teamId: string, taskId: string, data: Record<string, any>) => {
    const { error } = await supabase
      .from('tasks')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', taskId)
    if (error) throw new Error(error.message)
    const task = await fetchTaskById(taskId)
    if (data.status === 'done') {
      logActivity(teamId, 'task_completed', `completed task "${task.title}"`)
    } else if (data.status) {
      logActivity(teamId, 'task_updated', `updated task "${task.title}" to ${data.status}`)
    }
    return { task }
  },

  deleteTask: async (teamId: string, taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) throw new Error(error.message)
    return {}
  },

  setTaskAssignees: async (taskId: string, userIds: string[]) => {
    const { error } = await supabase.rpc('set_task_assignees', {
      p_task_id: taskId,
      p_user_ids: userIds,
    })
    if (error) throw new Error(error.message)
    const task = await fetchTaskById(taskId)
    return { task }
  },

  updateAssigneeStatus: async (taskId: string, userId: string, status: string) => {
    const { error } = await supabase.rpc('update_task_assignee_status', {
      p_task_id: taskId,
      p_user_id: userId,
      p_status: status,
    })
    if (error) throw new Error(error.message)
    const task = await fetchTaskById(taskId)
    return { task }
  },

  reorderTasks: async (teamId: string, projectId: string | null, orderedIds: string[]) => {
    const { error } = await supabase.rpc('reorder_tasks', {
      p_team_id: teamId,
      p_project_id: projectId ?? null,
      p_task_ids: orderedIds,
    })
    if (error) throw new Error(error.message)
    return {}
  },

  addTaskComment: async (taskId: string, content: string) => {
    const { data: comment, error } = await supabase.rpc('create_task_comment', {
      p_task_id: taskId,
      p_content: content,
    })
    if (error) throw new Error(error.message)
    const task = await fetchTaskById(taskId)
    return { comment, task }
  },

  updateTaskComment: async (taskId: string, commentId: string, content: string) => {
    const { error } = await supabase
      .from('task_comments')
      .update({ content })
      .eq('id', commentId)
    if (error) throw new Error(error.message)
    const task = await fetchTaskById(taskId)
    return { task }
  },

  deleteTaskComment: async (taskId: string, commentId: string) => {
    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', commentId)
    if (error) throw new Error(error.message)
    const task = await fetchTaskById(taskId)
    return { task }
  },

  // ── Projects ───────────────────────────────────────────────────
  getProjects: async (teamId: string) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*, creator:profiles!created_by(id, name, avatar_url)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return { projects: data }
  },

  getProject: async (projectId: string) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*, creator:profiles!created_by(id, name, avatar_url)')
      .eq('id', projectId)
      .single()
    if (error) throw new Error(error.message)
    return { project: data }
  },

  createProject: async (teamId: string, data: Record<string, any>) => {
    const { data: project, error } = await supabase.rpc('create_project', {
      p_team_id: teamId,
      p_name: data.name,
      p_description: data.description ?? null,
      p_status: data.status ?? 'planning',
    })
    if (error) throw new Error(error.message)
    return { project }
  },

  updateProject: async (teamId: string, projectId: string, data: Record<string, any>) => {
    const { data: project, error } = await supabase.rpc('update_project', {
      p_project_id: projectId,
      p_team_id: teamId,
      p_name: data.name ?? null,
      p_description: data.description ?? null,
      p_status: data.status ?? null,
    })
    if (error) throw new Error(error.message)
    return { project }
  },

  deleteProject: async (projectId: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    if (error) throw new Error(error.message)
    return {}
  },

  // ── Info Items ─────────────────────────────────────────────────
  getInfoItems: async (teamId: string) => {
    const { data, error } = await supabase
      .from('info_items')
      .select('*, creator:profiles!created_by(id, name, avatar_url), tasks(id, title)')
      .eq('team_id', teamId)
      .order('pinned', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return { items: data }
  },

  createInfoItem: async (teamId: string, data: Record<string, any>) => {
    const userId = await currentUserId()
    const { data: item, error } = await supabase
      .from('info_items')
      .insert({ ...data, team_id: teamId, created_by: userId })
      .select('*, creator:profiles!created_by(id, name, avatar_url), tasks(id, title)')
      .single()
    if (error) throw new Error(error.message)
    return { item }
  },

  updateInfoItem: async (itemId: string, data: Record<string, any>) => {
    const { data: item, error } = await supabase
      .from('info_items')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select('*, creator:profiles!created_by(id, name, avatar_url), tasks(id, title)')
      .single()
    if (error) throw new Error(error.message)
    return { item }
  },

  deleteInfoItem: async (itemId: string) => {
    const { error } = await supabase.from('info_items').delete().eq('id', itemId)
    if (error) throw new Error(error.message)
    return {}
  },

  pinInfoItem: async (itemId: string, pinned: boolean) => {
    const { data: item, error } = await supabase
      .from('info_items')
      .update({ pinned, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select('*, creator:profiles!created_by(id, name, avatar_url), tasks(id, title)')
      .single()
    if (error) throw new Error(error.message)
    return { item }
  },

  reorderInfoItems: async (orderedIds: string[]) => {
    const updates = orderedIds.map((id, index) =>
      supabase.from('info_items').update({ sort_order: index }).eq('id', id)
    )
    await Promise.all(updates)
    return {}
  },

  // ── Team Messages ──────────────────────────────────────────────
  getTeamMessages: async (teamId: string, limit = 60) => {
    const { data, error } = await supabase
      .from('team_messages')
      .select(MESSAGE_SELECT)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return { messages: (data || []).reverse() }
  },

  sendTeamMessage: async (teamId: string, content: string, attachment: any = null) => {
    const userId = await currentUserId()
    const { data: message, error } = await supabase
      .from('team_messages')
      .insert({ team_id: teamId, sender_id: userId, content, attachment })
      .select(MESSAGE_SELECT)
      .single()
    if (error) throw new Error(error.message)
    return { message }
  },

  deleteTeamMessage: async (messageId: string) => {
    const { error } = await supabase.from('team_messages').delete().eq('id', messageId)
    if (error) throw new Error(error.message)
    return {}
  },

  // ── Direct Messages ────────────────────────────────────────────
  getDMs: async (teamId: string, otherUserId: string, limit = 60) => {
    const userId = await currentUserId()
    const { data, error } = await supabase
      .from('direct_messages')
      .select(MESSAGE_SELECT)
      .eq('team_id', teamId)
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return { messages: (data || []).reverse() }
  },

  sendDM: async (teamId: string, receiverId: string, content: string, attachment: any = null) => {
    const userId = await currentUserId()
    const { data: message, error } = await supabase
      .from('direct_messages')
      .insert({ team_id: teamId, sender_id: userId, receiver_id: receiverId, content, attachment })
      .select(MESSAGE_SELECT)
      .single()
    if (error) throw new Error(error.message)
    return { message }
  },

  deleteDM: async (messageId: string) => {
    const { error } = await supabase.from('direct_messages').delete().eq('id', messageId)
    if (error) throw new Error(error.message)
    return {}
  },

  markDMsRead: async (teamId: string, otherUserId: string) => {
    const userId = await currentUserId()
    await supabase
      .from('direct_messages')
      .update({ read: true })
      .eq('team_id', teamId)
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .eq('read', false)
    return {}
  },

  getDMUnreadCounts: async (teamId: string) => {
    const userId = await currentUserId()
    const { data, error } = await supabase
      .from('direct_messages')
      .select('sender_id')
      .eq('team_id', teamId)
      .eq('receiver_id', userId)
      .eq('read', false)
    if (error) throw new Error(error.message)
    const counts: Record<string, number> = {}
    for (const row of data || []) {
      counts[row.sender_id] = (counts[row.sender_id] || 0) + 1
    }
    return { counts }
  },

  // ── Notifications ──────────────────────────────────────────────
  getNotifications: async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)
    return { notifications: data }
  },

  markAllRead: async () => {
    const userId = await currentUserId()
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    return {}
  },

  markRead: async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    return {}
  },

  // ── Project Goals ───────────────────────────────────────────────
  getProjectGoals: async (projectId: string) => {
    const { data, error } = await supabase
      .from('project_goals')
      .select('*, creator:profiles!created_by(id, name, avatar_url)')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw new Error(error.message)
    return { goals: data || [] }
  },

  createProjectGoal: async (projectId: string, teamId: string, data: Record<string, any>) => {
    const userId = await currentUserId()
    const { data: goal, error } = await supabase
      .from('project_goals')
      .insert({ ...data, project_id: projectId, team_id: teamId, created_by: userId })
      .select('*, creator:profiles!created_by(id, name, avatar_url)')
      .single()
    if (error) throw new Error(error.message)
    return { goal }
  },

  updateProjectGoal: async (goalId: string, data: Record<string, any>) => {
    const { data: goal, error } = await supabase
      .from('project_goals')
      .update(data)
      .eq('id', goalId)
      .select('*, creator:profiles!created_by(id, name, avatar_url)')
      .single()
    if (error) throw new Error(error.message)
    return { goal }
  },

  deleteProjectGoal: async (goalId: string) => {
    const { error } = await supabase.from('project_goals').delete().eq('id', goalId)
    if (error) throw new Error(error.message)
    return {}
  },

  // ── Message Edit ───────────────────────────────────────────────
  editTeamMessage: async (messageId: string, content: string) => {
    const { data, error } = await supabase
      .from('team_messages')
      .update({ content })
      .eq('id', messageId)
      .select(MESSAGE_SELECT)
      .single()
    if (error) throw new Error(error.message)
    return { message: data }
  },

  editDM: async (messageId: string, content: string) => {
    const { data, error } = await supabase
      .from('direct_messages')
      .update({ content })
      .eq('id', messageId)
      .select(MESSAGE_SELECT)
      .single()
    if (error) throw new Error(error.message)
    return { message: data }
  },

  // ── Message Reactions ──────────────────────────────────────────
  getMessageReactions: async (messageId: string, tableName: 'team_messages' | 'direct_messages') => {
    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId)
      .eq('table_name', tableName)
    if (error) throw new Error(error.message)
    return { reactions: data || [] }
  },

  toggleMessageReaction: async (messageId: string, tableName: 'team_messages' | 'direct_messages', emoji: string) => {
    const userId = await currentUserId()
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('table_name', tableName)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle()
    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id)
      return { added: false }
    } else {
      await supabase.from('message_reactions').insert({ message_id: messageId, table_name: tableName, user_id: userId, emoji })
      return { added: true }
    }
  },

  // ── Info Reactions ─────────────────────────────────────────────
  getInfoReactions: async (teamId: string) => {
    const { data, error } = await supabase
      .from('info_reactions')
      .select('*, item:info_items!item_id(team_id)')
      .eq('item.team_id', teamId)
    if (error) throw new Error(error.message)
    return { reactions: data || [] }
  },

  toggleInfoReaction: async (itemId: string, emoji: string) => {
    const userId = await currentUserId()
    const { data: existing } = await supabase
      .from('info_reactions')
      .select('id')
      .eq('item_id', itemId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle()
    if (existing) {
      await supabase.from('info_reactions').delete().eq('id', existing.id)
      return { added: false }
    } else {
      await supabase.from('info_reactions').insert({ item_id: itemId, user_id: userId, emoji })
      return { added: true }
    }
  },

  getInfoItemReactions: async (itemId: string) => {
    const { data, error } = await supabase
      .from('info_reactions')
      .select('*')
      .eq('item_id', itemId)
    if (error) throw new Error(error.message)
    return { reactions: data || [] }
  },

  // ── Goal reordering ────────────────────────────────────────────
  reorderProjectGoals: async (orderedIds: string[]) => {
    const updates = orderedIds.map((id, index) =>
      supabase.from('project_goals').update({ sort_order: index }).eq('id', id)
    )
    await Promise.all(updates)
    return {}
  },

  // ── Task Reactions ─────────────────────────────────────────────
  getTaskReactions: async (taskId: string) => {
    const { data, error } = await supabase
      .from('task_reactions')
      .select('*')
      .eq('task_id', taskId)
    if (error) throw new Error(error.message)
    return { reactions: data || [] }
  },

  toggleTaskReaction: async (taskId: string, teamId: string, emoji: string) => {
    const userId = await currentUserId()
    const { data: existing } = await supabase
      .from('task_reactions')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle()
    if (existing) {
      await supabase.from('task_reactions').delete().eq('id', existing.id)
      return { added: false }
    } else {
      await supabase.from('task_reactions').insert({ task_id: taskId, team_id: teamId, user_id: userId, emoji })
      return { added: true }
    }
  },
}
