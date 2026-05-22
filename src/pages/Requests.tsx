import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupportRequestAnalytics, listSupportRequests, SupportRequest, SupportRequestAnalytics } from '../api/supportRequests'
import DateRangeFilter from '../components/DateRangeFilter'
import Badge from '../components/ui/badge'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { DateRangePreset, DateRangeValue, resolveDateRange } from '../lib/dateRanges'
import { hasPermission } from '../lib/auth'

const displayStatus = (s: string) => {
  if (s === 'PENDING') return 'WAITING'
  if (s === 'FUNDED') return 'Awarded'
  return s
}

const money = (value?: string | number) => `TZS ${Number(value || 0).toLocaleString()}`

const statusTone = (status: string) => {
  if (status === 'PENDING') return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
  if (status === 'ACTIVE') return 'border-sky-500/30 bg-sky-500/10 text-sky-200'
  if (status === 'FUNDED') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
  if (status === 'COMPLETED') return 'border-green-500/30 bg-green-500/10 text-green-200'
  return 'border-border bg-muted text-muted-foreground'
}

const initialRange: DateRangeValue = { preset: 'THIS_MONTH' }
const allowedPresets: DateRangePreset[] = ['TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'LAST_MONTH', 'CUSTOM']

const rangeFromSearch = (searchParams: URLSearchParams): DateRangeValue => {
  const presetParam = searchParams.get('preset')
  const preset = allowedPresets.includes(presetParam as DateRangePreset) ? (presetParam as DateRangePreset) : initialRange.preset
  return {
    preset,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  }
}

export default function Requests() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const canReadAnalytics = hasPermission('SUPPORT_ANALYTICS_READ')
  const [items, setItems] = useState<SupportRequest[]>([])
  const [analytics, setAnalytics] = useState<SupportRequestAnalytics | null>(null)
  const [status, setStatus] = useState<string>(searchParams.get('status') || 'ALL')
  const [range, setRange] = useState<DateRangeValue>(() => rangeFromSearch(searchParams))
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  const rangeParams = useMemo(() => resolveDateRange(range), [range])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const page = await listSupportRequests({
          status: status === 'ALL' ? undefined : status,
          createdFrom: rangeParams.createdFrom,
          createdTo: rangeParams.createdTo,
          size: 100,
        })
        setItems([...page.content].sort((a, b) => b.id - a.id))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [status, rangeParams.createdFrom, rangeParams.createdTo])

  useEffect(() => {
    if (!canReadAnalytics) {
      setAnalytics(null)
      setAnalyticsLoading(false)
      return
    }
    const loadAnalytics = async () => {
      setAnalyticsLoading(true)
      try {
        const data = await getSupportRequestAnalytics({
          status: status === 'ALL' ? undefined : status,
          createdFrom: rangeParams.createdFrom,
          createdTo: rangeParams.createdTo,
        })
        setAnalytics(data)
      } finally {
        setAnalyticsLoading(false)
      }
    }
    loadAnalytics()
  }, [canReadAnalytics, status, rangeParams.createdFrom, rangeParams.createdTo])

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-gradient-to-r from-emerald-500/10 via-transparent to-sky-500/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Support Desk</p>
              <div>
                <h1 className="text-2xl font-semibold">Support Requests</h1>
                <p className="text-sm text-muted-foreground">Filter by time and status, then review the entire queue in the same window.</p>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(180px,220px)_auto]">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="min-w-[180px]" placeholder="All statuses" />
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">WAITING</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="FUNDED">Awarded</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DateRangeFilter value={range} onChange={setRange} />
            </div>
          </div>
        </CardHeader>
      </Card>

      {canReadAnalytics && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-emerald-500/20">
              <CardContent className="space-y-2 pt-5">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total Requests</div>
                <div className="text-3xl font-semibold">{analyticsLoading ? '...' : analytics?.totalRequests ?? 0}</div>
              </CardContent>
            </Card>
            <Card className="border-sky-500/20">
              <CardContent className="space-y-2 pt-5">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Requested Total</div>
                <div className="text-3xl font-semibold">{analyticsLoading ? '...' : money(analytics?.totalRequestedAmount)}</div>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20">
              <CardContent className="space-y-2 pt-5">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Base Total</div>
                <div className="text-3xl font-semibold">{analyticsLoading ? '...' : money(analytics?.totalBaseAmount)}</div>
              </CardContent>
            </Card>
            <Card className="border-violet-500/20">
              <CardContent className="space-y-2 pt-5">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sponsored Total</div>
                <div className="text-3xl font-semibold">{analyticsLoading ? '...' : money(analytics?.totalSponsoredAmount)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="text-lg font-medium">Status Breakdown</div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {(analytics?.statusTotals || []).map((entry) => (
                  <div key={entry.status} className={`rounded-xl border p-4 ${statusTone(entry.status)}`}>
                    <div className="text-xs uppercase tracking-[0.15em]">{displayStatus(entry.status)}</div>
                    <div className="mt-3 text-2xl font-semibold">{entry.count}</div>
                    <div className="mt-1 text-sm opacity-80">{money(entry.amount)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-medium">Request Queue</div>
              <div className="text-sm text-muted-foreground">Every row below reflects the selected time range.</div>
            </div>
            <Badge>{items.length} rows</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="bg-card overflow-hidden rounded-b-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Initiator Phone</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Base Amount</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Sponsored</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8}>Loading…</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={8}>No requests found for this range</TableCell></TableRow>
                ) : (
                  items.map((it, idx) => (
                    <TableRow key={it.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/requests/${it.id}`)}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{it.name}</TableCell>
                      <TableCell>{it.initiatorPhoneNumber}</TableCell>
                      <TableCell>{it.createdAt ? new Date(it.createdAt).toLocaleString() : '—'}</TableCell>
                      <TableCell>{money(it.baseAmount)}</TableCell>
                      <TableCell>{money(it.requestedAmount)}</TableCell>
                      <TableCell>{money(it.sponsoredAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={it.status === 'REJECTED' ? 'destructive' : 'default'}>{displayStatus(it.status)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
