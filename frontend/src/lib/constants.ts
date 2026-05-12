export const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
  { id: 'instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'twitter', label: 'Twitter/X', color: '#000000' },
  { id: 'facebook', label: 'Facebook', color: '#1877F2' },
  { id: 'reddit', label: 'Reddit', color: '#FF4500' },
  { id: 'youtube', label: 'YouTube', color: '#FF0000' },
  { id: 'threads', label: 'Threads', color: '#000000' },
]

export const POST_STATUSES = [
  { id: 'draft', label: 'Draft', color: 'bg-zinc-100 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300' },
  { id: 'pending_review', label: 'Pending Review', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  { id: 'approved', label: 'Approved', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  { id: 'posted', label: 'Posted', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
]

export const TASK_STATUSES = [
  { id: 'todo', label: 'To Do', color: 'bg-zinc-100 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  { id: 'in_review', label: 'In Review', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  { id: 'done', label: 'Done', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
  { id: 'couldnt_do', label: "Couldn't Do", color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
]

export const TASK_PRIORITIES = [
  { id: 'high', label: 'High', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  { id: 'medium', label: 'Medium', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
  { id: 'low', label: 'Low', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', dot: 'bg-green-500' },
]

export const PROJECT_STATUSES = [
  { id: 'planning', label: 'Planning', color: 'bg-zinc-100 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300' },
  { id: 'active', label: 'Active', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  { id: 'on_hold', label: 'On Hold', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  { id: 'completed', label: 'Completed', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
]

export const INFO_TYPE_ICONS: Record<string, string> = {
  text: 'FileText',
  api_key: 'Key',
  number: 'Hash',
  prompt: 'MessageSquare',
  claude_skill: 'Bot',
  photo: 'Image',
  video: 'Video',
  document: 'File',
}

export const INFO_TYPES = [
  { id: 'text', label: 'Text Note', icon: 'FileText', desc: 'Free text, links, notes' },
  { id: 'api_key', label: 'API Key', icon: 'Key', desc: 'Store provider API keys' },
  { id: 'number', label: 'Number', icon: 'Hash', desc: 'Metrics, counts, values' },
  { id: 'prompt', label: 'Prompt', icon: 'MessageSquare', desc: 'AI prompts and templates' },
  { id: 'claude_skill', label: 'Claude Skill', icon: 'Bot', desc: 'Claude instructions / skills' },
  { id: 'photo', label: 'Photo / Asset', icon: 'Image', desc: 'Brand assets, images' },
  { id: 'video', label: 'Video', icon: 'Video', desc: 'Team videos, demos' },
  { id: 'document', label: 'Document', icon: 'File', desc: 'PDFs, files, docs' },
]

export const API_PROVIDERS = [
  { id: 'groq', label: 'Groq', color: '#f55036', url: 'console.groq.com' },
  { id: 'gemini', label: 'Google Gemini', color: '#4285F4', url: 'aistudio.google.com' },
  { id: 'chatgpt', label: 'OpenAI / ChatGPT', color: '#10a37f', url: 'platform.openai.com' },
  { id: 'ollama', label: 'Ollama (local)', color: '#7c3aed', url: 'ollama.ai' },
  { id: 'anthropic', label: 'Anthropic / Claude', color: '#cc785c', url: 'console.anthropic.com' },
]
