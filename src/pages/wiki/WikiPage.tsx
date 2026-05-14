import { useState, useEffect } from 'react'
import { BookText, Plus, Search, Pencil, Trash2, Save, X, FileText } from 'lucide-react'
import { useTeam } from '../../contexts/TeamContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

interface WikiPage {
  id: string
  title: string
  content: string | null
  created_at: string
  updated_at: string | null
  author_id: string
  profiles?: { name: string } | null
}

function WikiEditor({ page, onSave, onCancel }: {
  page: WikiPage | null
  onSave: (data: { title: string; content: string }) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(page?.title || '')
  const [content, setContent] = useState(page?.content || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    onSave({ title: title.trim(), content })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Page title…"
          className="flex-1 text-lg font-semibold bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
        />
        <button onClick={onCancel} className="btn-ghost text-xs">
          <X className="w-4 h-4" /> Cancel
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your wiki page content here… (Markdown supported)"
        className="flex-1 p-4 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground resize-none font-mono"
      />
    </div>
  )
}

function WikiContent({ page }: { page: WikiPage | null }) {
  if (!page) return (
    <div className="empty-state">
      <BookText className="w-12 h-12 text-muted-foreground/40 mb-3" />
      <p className="section-title mb-1">No page selected</p>
      <p className="section-subtitle">Select a page from the sidebar or create a new one.</p>
    </div>
  )

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-2">{page.title}</h1>
      <p className="text-xs text-muted-foreground mb-6">
        Last updated {formatDistanceToNow(new Date(page.updated_at || page.created_at), { addSuffix: true })}
      </p>
      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 whitespace-pre-wrap leading-relaxed">
        {page.content || <span className="text-muted-foreground italic">This page has no content yet.</span>}
      </div>
    </div>
  )
}

export default function WikiPage() {
  const { team } = useTeam()
  const { user } = useAuth()
  const [pages, setPages] = useState<WikiPage[]>([])
  const [selected, setSelected] = useState<WikiPage | null>(null)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (team) loadPages()
  }, [team?.id])

  async function loadPages() {
    setLoading(true)
    const { data } = await supabase
      .from('wiki_pages')
      .select('id, title, content, created_at, updated_at, author_id')
      .eq('team_id', team.id)
      .order('updated_at', { ascending: false })
    setPages(data || [])
    if (data?.length > 0 && !selected) setSelected(data[0])
    setLoading(false)
  }

  async function handleSave({ title, content }: { title: string; content: string }) {
    try {
      if (creating) {
        const { data, error } = await supabase.from('wiki_pages').insert({
          team_id: team.id, author_id: user.id, title, content, updated_at: new Date().toISOString()
        }).select('id, title, content, created_at, updated_at, author_id').single()
        if (error) throw error
        setPages((p) => [data, ...p])
        setSelected(data)
      } else {
        const { data, error } = await supabase.from('wiki_pages').update({
          title, content, updated_at: new Date().toISOString()
        }).eq('id', selected!.id)
          .select('id, title, content, created_at, updated_at, author_id').single()
        if (error) throw error
        setPages((p) => p.map((pg) => pg.id === data.id ? data : pg))
        setSelected(data)
      }
      toast.success('Page saved!')
      setEditing(false)
      setCreating(false)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(page: WikiPage) {
    if (!confirm(`Delete "${page.title}"?`)) return
    const { error } = await supabase.from('wiki_pages').delete().eq('id', page.id)
    if (error) { toast.error(error.message); return }
    setPages((p) => p.filter((pg) => pg.id !== page.id))
    if (selected?.id === page.id) setSelected(pages.find((pg) => pg.id !== page.id) || null)
    toast.success('Page deleted')
  }

  const filtered = pages.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-56 shrink-0 flex flex-col border-r border-border bg-muted/30">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2.5">
            <p className="text-xs font-semibold text-muted-foreground flex-1">Wiki</p>
            <button
              onClick={() => { setCreating(true); setEditing(true); setSelected(null) }}
              className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="New page"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background border border-border">
            <Search className="w-3 h-3 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages…"
              className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {!loading && filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 px-3">No pages yet</p>
          ) : filtered.map((page) => (
            <button
              key={page.id}
              onClick={() => { setSelected(page); setEditing(false); setCreating(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors group ${
                selected?.id === page.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" />
              <span className="text-xs truncate flex-1">{page.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(page) }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        {editing ? (
          <WikiEditor
            page={creating ? null : selected}
            onSave={handleSave}
            onCancel={() => { setEditing(false); setCreating(false) }}
          />
        ) : (
          <>
            {selected && (
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setEditing(true)}
                  className="btn-secondary text-xs"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
            )}
            <WikiContent page={selected} />
          </>
        )}
      </div>
    </div>
  )
}
