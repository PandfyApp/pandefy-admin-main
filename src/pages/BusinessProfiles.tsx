import { useEffect, useState } from 'react'
import { listBusinessProfiles, type BusinessProfile } from '../api/businessProfiles'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import Input from '../components/ui/input'

export default function BusinessProfiles() {
  const [items, setItems] = useState<BusinessProfile[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [page, size])

  async function load() {
    setLoading(true)
    const { content, total } = await listBusinessProfiles(page, size)
    const filtered = q.trim().length > 0
      ? content.filter(c => (c.businessName || '').toLowerCase().includes(q.toLowerCase()) || (c.userPhoneNumber || '').includes(q))
      : content
    setItems(filtered)
    setTotal(total)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Search by name or phone" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>Business Profiles</div>
            <div className="text-sm text-muted-foreground">Total: {total}</div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Support</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Max</TableHead>
                <TableHead>Goal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.businessName}</TableCell>
                  <TableCell>{r.userPhoneNumber}</TableCell>
                  <TableCell>{r.supportPreference ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{r.minimumSupportAmount ?? '-'}</TableCell>
                  <TableCell>{r.maximumSupportAmount ?? '-'}</TableCell>
                  <TableCell>{r.supportGoalAmount ?? '-'}</TableCell>
                </TableRow>
              ))}
              {items.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">No profiles</TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm">Page {page + 1}</div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 rounded border border-border" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</button>
              <button className="px-3 py-1 rounded border border-border" disabled={(page + 1) * size >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
              <select className="px-2 py-1 rounded border border-border" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0) }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
