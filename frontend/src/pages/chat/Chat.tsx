import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { useTeam } from '../../contexts/TeamContext'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { uploadFileToCloudinary } from '../../lib/cloudinary'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/ui/UserAvatar'
import { Separator } from '../../components/ui/separator'
import { cn } from '../../lib/utils'
import {
  Send, Paperclip, Hash, Download, X, Loader2, Trash2,
  MessagesSquare, Edit, Search,
  MoreVertical, ArrowLeft,
} from 'lucide-react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

function formatMsgTime(ts: string) {
  const d = parseISO(ts)
  if (isToday(d)) return format(d, 'h:mm a')
  if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`
  return format(d, 'MMM d, h:mm a')
}

function FileAttachment({ attachment, isOwn }: { attachment: any; isOwn: boolean }) {
  const isImage = attachment?.type === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attachment?.url || '')
  if (!attachment) return null
  return (
    <div className="mb-1.5">
      {isImage ? (
        <a href={attachment.url} target="_blank" rel="noopener noreferrer">
          <img
            src={attachment.url}
            alt={attachment.name}
            className="max-w-full max-h-48 rounded-xl object-contain cursor-zoom-in"
          />
        </a>
      ) : (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors',
            isOwn
              ? 'bg-white/15 hover:bg-white/25 text-white'
              : 'bg-muted hover:bg-muted/80 text-foreground'
          )}
        >
          <Paperclip className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[180px] font-medium">{attachment.name}</span>
          <Download className="w-3 h-3 shrink-0 ml-auto opacity-60" />
        </a>
      )}
    </div>
  )
}

export default function Chat() {
  const { team, members } = useTeam()
  const { user } = useAuth()
  const [activeConv, setActiveConv] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingFile, setPendingFile] = useState<any>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const otherMembers = members.filter((m: any) => m.user_id !== user?.id)
  const activePartner = activeConv && activeConv !== 'team'
    ? members.find((m: any) => m.user_id === activeConv)
    : null

  const filteredMembers = search.trim()
    ? otherMembers.filter((m: any) =>
        m.profiles?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : otherMembers

  const loadMessages = useCallback(async () => {
    if (!team || !activeConv) return
    setLoadingMsgs(true)
    try {
      if (activeConv === 'team') {
        const { messages: data } = await api.getTeamMessages(team.id)
        setMessages(data)
      } else {
        const { messages: data } = await api.getDMs(team.id, activeConv)
        setMessages(data)
        await api.markDMsRead(team.id, activeConv)
        setUnreadCounts((prev) => ({ ...prev, [activeConv]: 0 }))
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoadingMsgs(false)
    }
  }, [team?.id, activeConv])

  useEffect(() => { loadMessages() }, [loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!team) return
    api.getDMUnreadCounts(team.id)
      .then(({ counts }: any) => setUnreadCounts(counts))
      .catch(() => {})
  }, [team?.id])

  useEffect(() => {
    if (!team) return
    const teamCh = supabase
      .channel(`team_msgs_${team.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'team_messages',
        filter: `team_id=eq.${team.id}`,
      }, (payload: any) => {
        supabase
          .from('team_messages')
          .select('*, sender:profiles!sender_id(id, name, avatar_url)')
          .eq('id', payload.new.id)
          .single()
          .then(({ data }: any) => {
            if (!data) return
            if (activeConv === 'team') setMessages((prev) => [...prev, data])
          })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'team_messages' }, (payload: any) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(teamCh) }
  }, [team?.id, activeConv])

  useEffect(() => {
    if (!team || !user) return
    const dmCh = supabase
      .channel(`dms_${team.id}_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
        filter: `team_id=eq.${team.id}`,
      }, (payload: any) => {
        const { sender_id, receiver_id } = payload.new
        if (receiver_id !== user.id && sender_id !== user.id) return
        const isCurrentConv = activeConv !== 'team' && activeConv !== null && (
          (sender_id === activeConv && receiver_id === user.id) ||
          (sender_id === user.id && receiver_id === activeConv)
        )
        supabase
          .from('direct_messages')
          .select('*, sender:profiles!sender_id(id, name, avatar_url)')
          .eq('id', payload.new.id)
          .single()
          .then(({ data }: any) => {
            if (!data) return
            if (isCurrentConv) {
              setMessages((prev) => [...prev, data])
              if (receiver_id === user.id) api.markDMsRead(team.id, sender_id).catch(() => {})
            } else if (receiver_id === user.id) {
              setUnreadCounts((prev) => ({ ...prev, [sender_id]: (prev[sender_id] || 0) + 1 }))
            }
          })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'direct_messages' }, (payload: any) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(dmCh) }
  }, [team?.id, user?.id, activeConv])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const result = await uploadFileToCloudinary(file, 'teamflow/chat')
      setPendingFile(result)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploadingFile(false)
      e.target.value = ''
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() && !pendingFile) return
    setSending(true)
    try {
      if (activeConv === 'team') {
        await api.sendTeamMessage(team.id, text.trim() || null, pendingFile)
      } else {
        await api.sendDM(team.id, activeConv!, text.trim() || null, pendingFile)
      }
      setText('')
      setPendingFile(null)
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(msgId: string) {
    try {
      if (activeConv === 'team') {
        await api.deleteTeamMessage(msgId)
      } else {
        await api.deleteDM(msgId)
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  function selectConv(convId: string) {
    setActiveConv(convId)
    setMobileOpen(true)
    setText('')
    setPendingFile(null)
  }

  return (
    <section className="flex h-full gap-6 overflow-hidden p-4 sm:p-6">
      {/* ── Left Panel ── */}
      <div className="flex w-full flex-col gap-2 sm:w-56 lg:w-72 2xl:w-80 shrink-0">
        <div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Inbox</h1>
              <MessagesSquare size={20} />
            </div>
            <button
              className="rounded-lg p-2 hover:bg-muted transition-colors"
              title="Compose"
              onClick={() => {
                const first = otherMembers[0]
                if (first) selectConv(first.user_id)
              }}
            >
              <Edit size={20} className="text-muted-foreground" />
            </button>
          </div>

          <label className={cn(
            'focus-within:ring-1 focus-within:ring-ring',
            'flex h-10 w-full items-center rounded-md border border-border ps-2'
          )}>
            <Search size={15} className="me-2 text-slate-500 shrink-0" />
            <span className="sr-only">Search</span>
            <input
              type="text"
              className="w-full flex-1 bg-inherit text-sm focus-visible:outline-none"
              placeholder="Search chat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Team Chat */}
          {(!search.trim() || 'team chat'.includes(search.toLowerCase())) && (
            <Fragment>
              <button
                type="button"
                onClick={() => selectConv('team')}
                className={cn(
                  'group flex w-full rounded-md px-2 py-2 text-start text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  activeConv === 'team' && 'sm:bg-muted'
                )}
              >
                <div className="flex gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shrink-0">
                    <Hash className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <span className="block font-medium">Team Chat</span>
                    <span className="block text-sm text-muted-foreground group-hover:text-accent-foreground/90 truncate">
                      {members.length} members
                    </span>
                  </div>
                </div>
              </button>
              <Separator className="my-1" />
            </Fragment>
          )}

          {/* DMs */}
          {filteredMembers.map((m: any) => {
            const unread = unreadCounts[m.user_id] || 0
            return (
              <Fragment key={m.user_id}>
                <button
                  type="button"
                  onClick={() => selectConv(m.user_id)}
                  className={cn(
                    'group flex w-full rounded-md px-2 py-2 text-start text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    activeConv === m.user_id && 'sm:bg-muted'
                  )}
                >
                  <div className="flex gap-2">
                    <div className="relative shrink-0">
                      <Avatar name={m.profiles?.name} src={m.profiles?.avatar_url} size="sm" />
                      {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className={cn('block font-medium truncate', unread > 0 && 'font-semibold')}>
                        {m.profiles?.name}
                      </span>
                      <span className="block text-sm text-muted-foreground group-hover:text-accent-foreground/90 truncate">
                        Direct message
                      </span>
                    </div>
                  </div>
                </button>
                <Separator className="my-1" />
              </Fragment>
            )
          })}
        </div>
      </div>

      {/* ── Right Panel ── */}
      {activeConv ? (
        <div className={cn(
          'absolute inset-0 start-full z-50 hidden w-full flex-1 flex-col border bg-background shadow-xs',
          'sm:static sm:z-auto sm:flex sm:rounded-md',
          mobileOpen && 'inset-s-0 flex'
        )}>
          {/* Header */}
          <div className="mb-1 flex flex-none justify-between bg-card p-4 shadow-lg sm:rounded-t-md">
            <div className="flex gap-3">
              <button
                className="-ms-2 flex h-full items-center justify-center p-2 sm:hidden hover:bg-muted rounded-md"
                onClick={() => setMobileOpen(false)}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 lg:gap-4">
                {activeConv === 'team' ? (
                  <div className="w-9 h-9 lg:w-11 lg:h-11 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shrink-0">
                    <Hash className="w-4 h-4 lg:w-5 lg:w-5 text-primary-foreground" />
                  </div>
                ) : (
                  <Avatar name={activePartner?.profiles?.name} src={activePartner?.profiles?.avatar_url} size="sm" className="lg:w-11 lg:h-11" />
                )}
                <div>
                  <span className="block text-sm font-medium lg:text-base">
                    {activeConv === 'team' ? 'Team Chat' : activePartner?.profiles?.name}
                  </span>
                  <span className="block text-xs text-muted-foreground truncate max-w-32 lg:max-w-none lg:text-sm">
                    {activeConv === 'team' ? `${members.length} members` : 'Direct message'}
                  </span>
                </div>
              </div>
            </div>

            <div className="-me-1 flex items-center gap-1">
              <button className="flex h-10 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors">
                <MoreVertical className="text-muted-foreground size-5" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex flex-1 flex-col gap-2 rounded-md px-4 pt-0 pb-4 overflow-hidden">
            <div className="flex size-full flex-1">
              <div className="relative flex flex-1 flex-col overflow-y-hidden -me-4">
                <div className="flex h-40 w-full grow flex-col-reverse justify-start gap-4 overflow-y-auto py-2 pe-4 pb-4">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {activeConv === 'team' ? 'Team Chat' : activePartner?.profiles?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activeConv === 'team'
                          ? 'Send a message to your whole team.'
                          : `Start a conversation with ${activePartner?.profiles?.name}.`}
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.sender_id === user?.id
                      return (
                        <div key={msg.id} className={cn('group flex gap-2.5', isOwn && 'flex-row-reverse')}>
                          {!isOwn && (
                            <Avatar name={msg.sender?.name} src={msg.sender?.avatar_url} size="xs" className="mt-1 shrink-0" />
                          )}
                          <div className={cn('max-w-72', isOwn && 'flex flex-col items-end')}>
                            {!isOwn && (
                              <p className="text-[11px] text-muted-foreground mb-1 pl-1">{msg.sender?.name}</p>
                            )}
                            <div className={cn(
                              'px-3 py-2 shadow-lg wrap-break-word',
                              isOwn
                                ? 'rounded-[16px_16px_0_16px] bg-primary/90 text-primary-foreground/75 self-end'
                                : 'rounded-[16px_16px_16px_0] bg-muted self-start'
                            )}>
                              {msg.attachment && <FileAttachment attachment={msg.attachment} isOwn={isOwn} />}
                              {msg.content && <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>}
                              <span className={cn(
                                'mt-1 block text-xs font-light italic text-foreground/75',
                                isOwn && 'text-end text-primary-foreground/85'
                              )}>
                                {formatMsgTime(msg.created_at)}
                              </span>
                            </div>
                          </div>
                          {isOwn && (
                            <button
                              onClick={() => handleDelete(msg.id)}
                              className="self-start mt-1 p-1 text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>

            {/* Input bar */}
            <form onSubmit={handleSend} className="flex w-full flex-none gap-2">
              {pendingFile && (
                <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 mb-2">
                  <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs text-foreground truncate flex-1">{pendingFile.name}</span>
                  <button type="button" onClick={() => setPendingFile(null)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex flex-1 items-center gap-2 rounded-md border border-input bg-card px-2 py-1 focus-within:ring-1 focus-within:ring-ring lg:gap-4">
                <button
                  type="button"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors shrink-0"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingFile}
                  title="Attach file"
                >
                  {uploadingFile
                    ? <Loader2 size={18} className="text-muted-foreground animate-spin" />
                    : <Paperclip size={18} className="text-muted-foreground" />
                  }
                </button>
                <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />
                <label className="flex-1">
                  <span className="sr-only">Chat Text Box</span>
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend(e as any)
                      }
                    }}
                    placeholder={activeConv === 'team'
                      ? 'Type your messages...'
                      : `Message ${activePartner?.profiles?.name}...`
                    }
                    rows={1}
                    className="h-8 w-full resize-none bg-inherit text-sm focus-visible:outline-none leading-8"
                  />
                </label>
                <button
                  type="submit"
                  disabled={sending || (!text.trim() && !pendingFile)}
                  className="hidden sm:inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors disabled:opacity-40"
                >
                  {sending
                    ? <Loader2 size={20} className="animate-spin" />
                    : <Send size={20} />
                  }
                </button>
              </div>
              <button
                type="submit"
                disabled={sending || (!text.trim() && !pendingFile)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md sm:hidden disabled:opacity-40"
              >
                <Send size={18} /> Send
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ── Empty state ── */
        <div className={cn(
          'absolute inset-0 start-full z-50 hidden w-full flex-1 flex-col justify-center rounded-md border bg-card shadow-xs',
          'sm:static sm:z-auto sm:flex'
        )}>
          <div className="flex flex-col items-center space-y-6">
            <div className="flex size-16 items-center justify-center rounded-full border-2 border-border">
              <MessagesSquare className="size-8" />
            </div>
            <div className="space-y-2 text-center">
              <h1 className="text-xl font-semibold">Your messages</h1>
              <p className="text-sm text-muted-foreground">Send a message to start a chat.</p>
            </div>
            <button
              onClick={() => {
                if (otherMembers.length > 0) selectConv(otherMembers[0].user_id)
                else selectConv('team')
              }}
              className="btn-primary"
            >
              Send message
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
