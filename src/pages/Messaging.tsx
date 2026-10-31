import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '../components/ui/button'
import Input from '../components/ui/input'
import { hasPermission } from '../lib/auth'
import { Conversation, Message, MessageActor, MessageReport, messagesApi, watchMessages } from '../api/messages'
const date = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
export default function Messaging() {
  const [tab, setTab] = useState('conversations'), [threads, setThreads] = useState<Conversation[]>([]), [page, setPage] = useState(0), [more, setMore] = useState(false)
  const [filter, setFilter] = useState('all'), [me, setMe] = useState<MessageActor>(), [thread, setThread] = useState<Conversation>(), [items, setItems] = useState<Message[]>([]), [before, setBefore] = useState<number>()
  const [text, setText] = useState(''), [quote, setQuote] = useState<Message>(), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [picker, setPicker] = useState(false), [query, setQuery] = useState(''), [users, setUsers] = useState<MessageActor[]>([]), [userPage, setUserPage] = useState(0), [userMore, setUserMore] = useState(false)
  const [title, setTitle] = useState(''), [body, setBody] = useState(''), [count, setCount] = useState(0), [preview, setPreview] = useState(false)
  const [reports, setReports] = useState<MessageReport[]>([]), [reportPage, setReportPage] = useState(0), [reportMore, setReportMore] = useState(false), [resolution, setResolution] = useState<Record<number, string>>({})
  const historyPane = useRef<HTMLDivElement>(null)
  const inboxVersion = useRef(0), pickerVersion = useRef(0)
  const selected = useRef<number>(), generation = useRef(0), sendKey = useRef<{ signature: string; id: string }>(), broadcastKey = useRef<{ signature: string; id: string }>()
  const fail = () => setError('Unable to update messages. Please try again.')
  const loadInbox = useCallback(async (next = 0, append = false) => {
    const version = ++inboxVersion.current
    try { const data = await messagesApi.inbox(next, filter); if (version !== inboxVersion.current) return; setThreads(old => append ? [...old, ...data.content] : data.content); setPage(next); setMore(next + 1 < data.totalPages) } catch { fail() }
  }, [filter])
  const loadThread = useCallback(async (id: number, reset = false) => {
    const version = ++generation.current
    const pane = historyPane.current
    const followLatest = reset || !pane || pane.scrollHeight - pane.scrollTop - pane.clientHeight < 100
    try {
      const [info, history] = await Promise.all([messagesApi.thread(id), messagesApi.history(id)])
      const knownLatest = reset ? undefined : latestByThread.current.get(id)
      let cursor = history.nextBefore
      while (knownLatest && history.items.length && history.items[history.items.length - 1].id > knownLatest && cursor) {
        const previous = await messagesApi.history(id, cursor)
        history.items.push(...previous.items); cursor = previous.nextBefore
      }
      if (history.items[0]) latestByThread.current.set(id, history.items[0].id)
      if (selected.current !== id || version !== generation.current) return
      setThread(info); setItems(old => reset ? [...history.items].reverse() : Array.from(new Map([...old, ...history.items].map(item => [item.id, item])).values()).sort((a, b) => a.id - b.id))
      if (followLatest) requestAnimationFrame(() => { if (selected.current === id && historyPane.current) historyPane.current.scrollTop = historyPane.current.scrollHeight })
      if (reset) setBefore(history.nextBefore)
      const latest = history.items[0]
      if (latest && document.visibilityState === 'visible') await messagesApi.read(id, latest.id)
      if (selected.current === id) await loadInbox()
    } catch { fail() }
  }, [loadInbox])
  const latestByThread = useRef(new Map<number, number>())
  const refresh = useRef(() => {})
  refresh.current = () => { loadInbox(); if (selected.current) loadThread(selected.current) }
  useEffect(() => { messagesApi.me().then(setMe).catch(fail); return watchMessages(() => refresh.current()) }, [])
  useEffect(() => { loadInbox() }, [loadInbox])
  useEffect(() => { const visible = () => { if (document.visibilityState === 'visible') refresh.current() }; document.addEventListener('visibilitychange', visible); return () => document.removeEventListener('visibilitychange', visible) }, [])
  useEffect(() => {
    if (!picker) return
    const version = ++pickerVersion.current
    const timer = setTimeout(() => { messagesApi.users(query).then(data => { if (version !== pickerVersion.current) return; setUsers(data.content); setUserPage(0); setUserMore(data.totalPages > 1) }).catch(fail) }, 300)
    return () => clearTimeout(timer)
  }, [picker, query])
  useEffect(() => { if (tab === 'broadcast') messagesApi.recipients().then(setCount).catch(fail); if (tab === 'reports') messagesApi.reports().then(data => { setReports(data.content); setReportPage(0); setReportMore(data.totalPages > 1) }).catch(fail) }, [tab])
  const open = (conversation: Conversation) => { selected.current = conversation.id; setThread(conversation); setItems([]); setBefore(undefined); setQuote(undefined); setText(''); setError(''); loadThread(conversation.id, true) }
  async function send() {
    if (!thread || !text.trim() || busy) return
    const signature = JSON.stringify([thread.id, text.trim(), quote?.id])
    if (sendKey.current?.signature !== signature) sendKey.current = { signature, id: crypto.randomUUID() }
    setBusy(true); setError('')
    try { await messagesApi.send(thread.id, text.trim(), sendKey.current.id, quote?.id); if (selected.current === thread.id) { setText(''); setQuote(undefined); sendKey.current = undefined; await loadThread(thread.id) } else await loadInbox() } catch { fail() } finally { setBusy(false) }
  }
  async function broadcast() {
    const signature = JSON.stringify([title.trim(), body.trim()])
    if (broadcastKey.current?.signature !== signature) broadcastKey.current = { signature, id: crypto.randomUUID() }
    setBusy(true); setError('')
    try { const result = await messagesApi.broadcast(title.trim(), body.trim(), broadcastKey.current.id); setPreview(false); setTitle(''); setBody(''); broadcastKey.current = undefined; setTab('conversations'); open(result); await loadInbox() } catch { fail() } finally { setBusy(false) }
  }
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-semibold">Messaging</h1><p className="text-muted-foreground">Conversations and announcements in the Pandefy app.</p></div>
    <div className="flex flex-wrap gap-2">
      <Button variant={tab === 'conversations' ? 'default' : 'outline'} onClick={() => setTab('conversations')}>Conversations</Button>
      {hasPermission('MESSAGE_BROADCAST') && <Button variant={tab === 'broadcast' ? 'default' : 'outline'} onClick={() => setTab('broadcast')}>Broadcast</Button>}
      {hasPermission('MESSAGE_MODERATE') && <Button variant={tab === 'reports' ? 'default' : 'outline'} onClick={() => setTab('reports')}>Reports</Button>}
    </div>
    {error && <div role="alert" className="rounded border border-red-500 p-3 text-red-500">{error} <button onClick={() => refresh.current()} className="underline">Retry</button></div>}
    {tab === 'conversations' && <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <section className="rounded-xl border border-border bg-card p-3 space-y-3">
        <div className="flex gap-2"><select aria-label="Conversation filter" className="flex-1 rounded border bg-background p-2" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All</option><option value="unread">Unread</option><option value="announcements">Announcements</option></select>{hasPermission('MESSAGE_SEND_DIRECT') && <Button onClick={() => setPicker(true)}>New</Button>}</div>
        {!threads.length && <p className="p-4 text-muted-foreground">No conversations yet.</p>}
        {threads.map(value => <button key={value.id} onClick={() => open(value)} className={`w-full rounded-lg p-3 text-left ${thread?.id === value.id ? 'bg-muted' : 'hover:bg-muted/50'}`}><div className="flex justify-between gap-2"><strong>{value.kind === 'ANNOUNCEMENT' ? value.title : value.peer.label}</strong>{value.unread > 0 && <span className="rounded bg-primary px-2 text-primary-foreground">{value.unread}</span>}</div><p className="truncate text-sm">{value.lastMessage?.body || 'Start the conversation'}</p><small className="text-muted-foreground">{date(value.lastActivity)}</small></button>)}
        {more && <Button variant="outline" onClick={() => loadInbox(page + 1, true)}>Load more</Button>}
      </section>
      <section className="rounded-xl border border-border bg-card p-4 flex flex-col min-h-[560px]">
        {!thread ? <p className="m-auto text-muted-foreground">Choose a conversation or start a new message.</p> : <>
          <div className="flex justify-between border-b border-border pb-3 gap-3"><div><h2 className="font-semibold">{thread.kind === 'ANNOUNCEMENT' ? thread.title : thread.peer.label}</h2>{thread.kind === 'ANNOUNCEMENT' && <small>{thread.processed} / {thread.recipientCount} recipients processed · {thread.complete ? 'Complete' : 'Sending'}</small>}</div>{thread.kind === 'DIRECT' && <Button variant="outline" onClick={async () => { if (!window.confirm(thread.blockedByMe ? 'Unblock this user?' : 'Block this user?')) return; try { await messagesApi.block(thread.peer.id, !thread.blockedByMe); await loadThread(thread.id) } catch { fail() } }}>{thread.blockedByMe ? 'Unblock' : 'Block'}</Button>}</div>
          <div ref={historyPane} className="flex-1 max-h-[60vh] overflow-y-auto py-4 space-y-3">
            {before && <Button variant="outline" onClick={async () => { try { const data = await messagesApi.history(thread.id, before); if (selected.current !== thread.id) return; setBefore(data.nextBefore); setItems(old => Array.from(new Map([...data.items, ...old].map(item => [item.id, item])).values()).sort((a, b) => a.id - b.id)) } catch { fail() } }}>Load earlier messages</Button>}
            {items.map(message => <article key={message.id} className={`max-w-[88%] rounded-xl p-3 ${message.author.id === me?.id ? 'ml-auto bg-primary/15' : 'bg-muted'}`}>
              <div className="flex justify-between gap-3"><strong className="text-sm">{message.author.label}{message.author.admin ? ' ✓' : ''}</strong>{thread.kind === 'DIRECT' && !thread.blocked && <button className="text-sm underline" onClick={() => setQuote(message)}>Reply</button>}</div>
              {message.replyTo && <blockquote className="my-2 border-l-2 border-primary pl-3 text-sm"><strong>{message.replyTo.author.label}</strong><p className="whitespace-pre-wrap">{message.replyTo.body}</p></blockquote>}
              <p className="whitespace-pre-wrap break-words">{message.body}</p><small className="text-muted-foreground">{date(message.createdAt)}{message.author.id === me?.id && thread.kind === 'DIRECT' && message.id <= thread.peerReadUpTo ? ' · Read' : ''}</small>
            </article>)}
          </div>
          {thread.kind === 'DIRECT' && hasPermission('MESSAGE_SEND_DIRECT') && !thread.blocked && <form className="border-t border-border pt-3" onSubmit={e => { e.preventDefault(); send() }}>
            {quote && <div className="mb-2 rounded bg-muted p-2 flex justify-between"><div><strong>{quote.author.label}</strong><p className="line-clamp-2">{quote.body}</p></div><button type="button" aria-label="Cancel reply" onClick={() => setQuote(undefined)}>×</button></div>}
            <textarea aria-label="Message" maxLength={2000} rows={3} className="w-full rounded border border-border bg-background p-3" value={text} onChange={e => setText(e.target.value)} disabled={busy} placeholder="Write a message" />
            <div className="flex items-center justify-between"><small>{text.length}/2000</small><Button disabled={busy || !text.trim()}>{busy ? 'Sending…' : 'Send'}</Button></div>
          </form>}
          {thread.blocked && <p className="pt-3 text-muted-foreground">Messaging is blocked in this conversation.</p>}
        </>}
      </section>
    </div>}
    {tab === 'broadcast' && <section className="max-w-2xl rounded-xl border border-border bg-card p-5 space-y-4"><h2 className="text-lg font-semibold">Announcement to all active users</h2><p>{count} recipients. Replies open private admin conversations.</p><label className="block">Title<Input maxLength={160} value={title} onChange={e => setTitle(e.target.value)} /></label><label className="block">Message<textarea rows={7} maxLength={2000} className="mt-1 w-full rounded border bg-background p-3" value={body} onChange={e => setBody(e.target.value)} /></label><div className="flex justify-between"><small>{body.length}/2000</small><Button disabled={!title.trim() || !body.trim() || busy} onClick={async () => { try { setCount(await messagesApi.recipients()); setPreview(true) } catch { fail() } }}>Preview announcement</Button></div></section>}
    {tab === 'reports' && <section className="space-y-3">{!reports.length && <p>No reports.</p>}{reports.map(report => <article key={report.id} className="rounded-xl border border-border bg-card p-4 space-y-2"><div className="flex justify-between"><strong>Report #{report.id} · {report.resolved ? 'Reviewed' : 'Open'}</strong><small>{date(report.createdAt)}</small></div><p>Reported by {report.reporter.label}: {report.reason}</p><blockquote className="border-l-2 pl-3 whitespace-pre-wrap"><strong>{report.message.author.label}</strong><p>{report.message.body}</p></blockquote>{report.resolved ? <p>{report.resolution}</p> : <div className="flex gap-2"><Input aria-label={`Resolution for report ${report.id}`} placeholder="Review outcome" maxLength={1000} value={resolution[report.id] || ''} onChange={e => setResolution(old => ({ ...old, [report.id]: e.target.value }))} /><Button disabled={!resolution[report.id]?.trim()} onClick={async () => { try { await messagesApi.resolve(report.id, resolution[report.id]); const data = await messagesApi.reports(); setReports(data.content) } catch { fail() } }}>Resolve</Button></div>}</article>)}{reportMore && <Button onClick={async () => { try { const data = await messagesApi.reports(reportPage + 1); setReports(old => [...old, ...data.content]); setReportPage(reportPage + 1); setReportMore(reportPage + 2 < data.totalPages) } catch { fail() } }}>Load more</Button>}</section>}
    {picker && <div role="dialog" aria-modal="true" aria-label="New message" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-xl bg-card p-5 space-y-4"><h2 className="text-xl font-semibold">New message</h2><Input aria-label="Search users" placeholder="Search name or phone number" value={query} onChange={e => setQuery(e.target.value)} /><div className="max-h-80 overflow-y-auto">{users.map(user => <button key={user.id} className="block w-full rounded p-3 text-left hover:bg-muted" onClick={async () => { try { const value = await messagesApi.direct(user.id); setPicker(false); open(value); loadInbox() } catch { fail() } }}>{user.label}{user.admin ? ' ✓' : ''}</button>)}{!users.length && <p>No users found.</p>}{userMore && <Button onClick={async () => { try { const data = await messagesApi.users(query, userPage + 1); setUsers(old => [...old, ...data.content]); setUserPage(userPage + 1); setUserMore(userPage + 2 < data.totalPages) } catch { fail() } }}>Load more</Button>}</div><Button variant="outline" onClick={() => setPicker(false)}>Close</Button></div></div>}
    {preview && <div role="dialog" aria-modal="true" aria-label="Preview announcement" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-xl bg-card p-5 space-y-4"><h2 className="text-xl font-semibold">{title}</h2><p className="whitespace-pre-wrap break-words">{body}</p><p>This will appear in the inbox of all {count} active users.</p><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setPreview(false)}>Back</Button><Button disabled={busy} onClick={broadcast}>{busy ? 'Queuing…' : 'Send announcement'}</Button></div></div></div>}
  </div>
}
