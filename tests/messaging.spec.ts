import { test, expect } from '@playwright/test'
const admin = { id: 1, label: 'Admin', admin: true }
const bob = { id: 2, label: 'Bob', admin: false }
const original = { id: 10, threadId: 1, author: bob, body: 'Original question', createdAt: '2026-10-26T12:00:00Z', clientId: 'original-0001' }
const direct = { id: 1, kind: 'DIRECT', peer: bob, lastMessage: original, lastActivity: original.createdAt, unread: 1, peerReadUpTo: 10, blocked: false, blockedByMe: false, recipientCount: 0, processed: 0, complete: true }
const announcement = { ...direct, id: 2, kind: 'ANNOUNCEMENT', title: 'Service update', unread: 0, recipientCount: 3, processed: 3 }
const pageOf = (content: any[]) => ({ content, totalElements: content.length, totalPages: 1, size: 20, number: 0 })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('token')) localStorage.setItem('token', 'test.' + btoa(JSON.stringify({ role: 'ADMIN', permissions: ['MESSAGE_READ', 'MESSAGE_SEND_DIRECT', 'MESSAGE_BROADCAST', 'MESSAGE_MODERATE'] })) + '.signature')
    // HTTP fixtures drive these browser tests; backend tests cover authenticated sockets.
    class QuietSocket { static OPEN = 1; readyState = 0; close() {} send() {} }
    Object.defineProperty(window, 'WebSocket', { value: QuietSocket })
  })
})

async function fixture(page: any, options: { failFirst?: boolean } = {}) {
  const sent: any[] = [], broadcasts: any[] = [], resolutions: any[] = []
  const history = [original]; let blocked = false
  await page.route('http://localhost:8080/api/**', async (route: any) => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method()
    let result: any = {}
    if (path === '/api/messages/me') result = admin
    else if (path === '/api/messages/threads') result = pageOf(broadcasts.length ? [announcement, direct] : [direct])
    else if (path === '/api/messages/users') result = pageOf([bob])
    else if (path === '/api/messages/admin/direct/2') result = direct
    else if (path === '/api/messages/admin/recipients') result = { count: 3 }
    else if (path === '/api/messages/admin/broadcasts') { broadcasts.push(request.postDataJSON()); result = announcement }
    else if (path === '/api/messages/admin/reports') result = pageOf([{ id: 9, message: original, reporter: admin, reason: 'Spam', createdAt: original.createdAt, resolved: !!resolutions.length, resolution: resolutions[0]?.reason }])
    else if (path === '/api/messages/admin/reports/9') resolutions.push(request.postDataJSON())
    else if (path === '/api/messages/users/2/block') blocked = method === 'PUT'
    else if (/\/threads\/\d+\/history$/.test(path)) result = { items: [...history].reverse(), nextBefore: null }
    else if (/\/threads\/\d+\/messages$/.test(path)) {
      const data = request.postDataJSON(); sent.push(data)
      if (options.failFirst && sent.length === 1) return route.fulfill({ status: 503, json: {} })
      const value = { ...original, id: 11, author: admin, body: data.body, clientId: data.clientId, replyTo: data.replyToId ? original : null }; history.push(value); result = value
    } else if (/\/threads\/\d+$/.test(path)) result = path.endsWith('/2') ? announcement : { ...direct, blocked, blockedByMe: blocked }
    return route.fulfill({ status: 200, json: result })
  })
  await page.goto('/messaging')
  return { sent, broadcasts, resolutions }
}

test('admin quotes the original user and retry preserves idempotency key', async ({ page }) => {
  const { sent } = await fixture(page, { failFirst: true })
  await page.getByRole('button', { name: /Bob.*Original question/ }).click()
  await page.getByRole('button', { name: 'Reply', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Cancel reply' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Answer')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.locator('article').filter({ hasText: 'Answer' })).toContainText('Bob')
  expect(sent).toHaveLength(2); expect(sent[0].clientId).toBe(sent[1].clientId); expect(sent[1].replyToId).toBe(10)
})

test('broadcast requires preview and queues one announcement', async ({ page }) => {
  const { broadcasts } = await fixture(page)
  await page.getByRole('button', { name: 'Broadcast', exact: true }).click()
  await page.getByLabel('Title', { exact: true }).fill('Service update')
  await page.getByLabel('Message', { exact: true }).fill('Hello everyone')
  await page.getByRole('button', { name: 'Preview announcement', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Preview announcement' })).toContainText('all 3 active users')
  expect(broadcasts).toHaveLength(0)
  await page.getByRole('button', { name: 'Send announcement', exact: true }).click()
  await expect(page.getByText('3 / 3 recipients processed · Complete')).toBeVisible()
  expect(broadcasts).toHaveLength(1); expect(broadcasts[0].body).toBe('Hello everyone')
})

test('new direct conversation, block/unblock and moderation work', async ({ page }) => {
  const { resolutions } = await fixture(page)
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Bob', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toBeVisible()
  page.on('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Block', exact: true }).click()
  await expect(page.getByText('Messaging is blocked in this conversation.')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Unblock', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Reports', exact: true }).click()
  await page.getByRole('textbox', { name: 'Resolution for report 9' }).fill('Reviewed and action taken')
  await page.getByRole('button', { name: 'Resolve', exact: true }).click()
  await expect(page.getByText('Report #9 · Reviewed')).toBeVisible()
  expect(resolutions[0].reason).toBe('Reviewed and action taken')
})

test('read-only dashboard role cannot send or broadcast', async ({ page }) => {
  await fixture(page)
  await page.evaluate(() => localStorage.setItem('token', 'test.' + btoa(JSON.stringify({ role: 'ADMIN', permissions: ['MESSAGE_READ'] })) + '.signature'))
  await page.reload()
  await expect(page.getByRole('button', { name: 'Broadcast', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'New', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reports', exact: true })).toHaveCount(0)
})
