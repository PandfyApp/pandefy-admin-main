import { api, Page } from './client'
export type MessageActor = { id: number; label: string; avatar?: string; admin: boolean }
export type Message = { id: number; threadId: number; author: MessageActor; body: string; createdAt: string; clientId: string; replyTo?: { id: number; author: MessageActor; body: string } }
export type Conversation = { id: number; kind: string; title?: string; peer: MessageActor; lastMessage?: Message; lastActivity: string; unread: number; peerReadUpTo: number; blocked: boolean; blockedByMe: boolean; recipientCount: number; processed: number; complete: boolean }
export type MessageReport = { id: number; message: Message; reporter: MessageActor; reason: string; createdAt: string; resolved: boolean; resolution?: string }
export const messagesApi = {
  me: async () => (await api.get<MessageActor>('/api/messages/me')).data,
  inbox: async (page = 0, filter = 'all') => (await api.get<Page<Conversation>>('/api/messages/threads', { params: { page, filter } })).data,
  users: async (q: string, page = 0) => (await api.get<Page<MessageActor>>('/api/messages/users', { params: { q, page } })).data,
  direct: async (id: number) => (await api.post<Conversation>(`/api/messages/admin/direct/${id}`)).data,
  thread: async (id: number) => (await api.get<Conversation>(`/api/messages/threads/${id}`)).data,
  history: async (id: number, before?: number) => (await api.get<{ items: Message[]; nextBefore?: number }>(`/api/messages/threads/${id}/history`, { params: { before } })).data,
  read: async (id: number, upTo: number) => api.put(`/api/messages/threads/${id}/read/${upTo}`),
  send: async (id: number, body: string, clientId: string, replyToId?: number) => (await api.post<Message>(`/api/messages/threads/${id}/messages`, { body, clientId, replyToId })).data,
  recipients: async () => (await api.get<{ count: number }>('/api/messages/admin/recipients')).data.count,
  broadcast: async (title: string, body: string, clientId: string) => (await api.post<Conversation>('/api/messages/admin/broadcasts', { title, body, clientId })).data,
  reports: async (page = 0) => (await api.get<Page<MessageReport>>('/api/messages/admin/reports', { params: { page } })).data,
  resolve: async (id: number, reason: string) => api.put(`/api/messages/admin/reports/${id}`, { reason }),
  block: async (id: number, block: boolean) => block ? api.put(`/api/messages/users/${id}/block`) : api.delete(`/api/messages/users/${id}/block`),
}
export function watchMessages(changed: () => void) {
  let stopped = false, socket: WebSocket | undefined, retry: ReturnType<typeof setTimeout> | undefined, ping: ReturnType<typeof setInterval> | undefined, delay = 2000
  function connect() {
    if (stopped) return
    const token = localStorage.getItem('token')
    if (!token) return
    const url = new URL('/api/messages/live', api.defaults.baseURL || window.location.origin)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    socket = new WebSocket(url.toString())
    socket.onopen = () => {
      socket?.send(JSON.stringify({ token }))
      ping = setInterval(() => { if (socket?.readyState === WebSocket.OPEN) socket.send('ping') }, 25000)
    }
    socket.onmessage = event => {
      try { const data = JSON.parse(event.data); if (data.type === 'ready' || data.type === 'changed') { delay = 2000; changed() } } catch { /* Ignore malformed events. */ }
    }
    socket.onerror = () => socket?.close()
    socket.onclose = () => { clearInterval(ping); if (!stopped) { retry = setTimeout(connect, delay); delay = Math.min(delay * 2, 30000) } }
  }
  connect()
  return () => { stopped = true; clearTimeout(retry); clearInterval(ping); socket?.close() }
}
