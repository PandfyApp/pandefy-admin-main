import { test, expect, Page } from '@playwright/test'
const registered = '255712345678', destination = '255745999888'
async function setup(page: Page, name: string | null = 'Jane Requester', permissions = ['WITHDRAWAL_READ', 'SUPPORT_READ', 'SUPPORT_ANALYTICS_READ']) {
  await page.addInitScript(permissions => localStorage.setItem('token', 'test.' + btoa(JSON.stringify({ role: 'ADMIN', permissions })) + '.signature'), permissions)
  const queries: URLSearchParams[] = [], writes: string[] = []
  await page.route('http://localhost:8080/api/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.request().method())) writes.push(path)
    let body: any = {}
    if (path === '/api/withdrawals') body = { content: [{ id: 1, requesterUserId: 99, requesterName: name, requesterPhoneNumber: registered, phoneNumber: destination, paymentMethod: 'mpesa', amount: '10000', status: 'PENDING', createdAt: '2026-10-26T12:00:00Z' }], totalPages: 1, totalElements: 1 }
    if (path === '/api/support-requests') {
      queries.push(url.searchParams)
      const next = url.searchParams.get('page') === '1'
      body = { content: [{ id: next ? 20 : 19, name: next ? 'Second request' : 'Older request', initiatorPhoneNumber: registered, requestedAmount: '10000', baseAmount: '5000', sponsoredAmount: '0', status: next ? 'COMPLETED' : 'PENDING', createdAt: '2024-01-01T12:00:00Z' }], totalPages: 2, totalElements: 2 }
    }
    return route.fulfill({ status: 200, json: body })
  })
  await page.goto('/withdrawals')
  await expect(page.getByRole('cell', { name: destination, exact: true })).toBeVisible()
  return { queries, writes }
}

test('withdrawal row and review show both identities and link all requester history', async ({ page }) => {
  const { queries, writes } = await setup(page)
  const row = page.getByRole('row').filter({ hasText: destination })
  await expect(row).toContainText('Jane Requester')
  await expect(row).toContainText(`Registered phone: ${registered}`)
  await expect(row.getByRole('link', { name: 'View all requests' })).toHaveAttribute('href', `/requests?initiatorPhoneNumber=${registered}&preset=ALL_TIME`)
  await row.getByRole('button', { name: 'View Details' }).click()
  const details = page.getByRole('region', { name: 'Requester details' })
  await expect(details).toContainText('Jane Requester')
  await expect(details).toContainText(registered)
  await expect(page.getByText('Withdrawal Phone Number', { exact: true })).toBeVisible()
  await details.getByRole('link', { name: 'View all requests' }).click()
  await expect(page.getByText('Older request', { exact: true })).toBeVisible()
  await expect(page.getByText(`Requests by ${registered}`)).toBeVisible()
  expect(queries[0].get('initiatorPhoneNumber')).toBe(registered)
  expect(queries[0].has('createdFrom')).toBe(false); expect(queries[0].has('createdTo')).toBe(false); expect(queries[0].has('status')).toBe(false)
  await expect(page.getByText('Total Requests', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Load more requests' }).click()
  await expect(page.getByText('Second request', { exact: true })).toBeVisible()
  await expect(page.getByText('Older request', { exact: true })).toBeVisible()
  expect(queries.some(query => query.get('page') === '1' && query.get('initiatorPhoneNumber') === registered)).toBe(true)
  await page.getByText('Older request', { exact: true }).click()
  await expect(page).toHaveURL(/\/requests\/19$/)
  expect(writes).toHaveLength(0)
})

test('missing profile name falls back to registered number', async ({ page }) => {
  await setup(page, null)
  const row = page.getByRole('row').filter({ hasText: destination })
  await expect(row).toContainText(registered)
  await expect(row).not.toContainText('undefined')
  await expect(row.getByRole('link', { name: 'View all requests' })).toBeVisible()
})

test('role without request access sees details without a restricted request link', async ({ page }) => {
  await setup(page, 'Jane Requester', ['WITHDRAWAL_READ'])
  await expect(page.getByRole('link', { name: 'View all requests' })).toHaveCount(0)
  await expect(page.getByText('Jane Requester', { exact: true })).toBeVisible()
})
