import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  getSupportSponsorshipAnalytics,
  listPendingSponsorships,
  listSupportSponsorships,
  PendingSponsorship,
  SupportSponsorship,
  SupportSponsorshipAnalytics,
} from '../api/sponsorships'
import DateRangeFilter from '../components/DateRangeFilter'
import Badge from '../components/ui/badge'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import Input from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { canAccessAdminFeature } from '../lib/auth'
import { DateRangePreset, DateRangeValue, resolveDateRange } from '../lib/dateRanges'

const money = (value?: string | number) => `TZS ${Number(value || 0).toLocaleString()}`
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

const sponsorLabel = (row: SupportSponsorship | PendingSponsorship) => {
  if ('sponsorBusinessName' in row && row.sponsorBusinessName) return row.sponsorBusinessName
  if (row.sponsorUserName) return row.sponsorUserName
  return row.sponsorUserPhoneNumber || '—'
}

export default function Sponsors() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const canReadAnalytics = canAccessAdminFeature()
  const tab = searchParams.get('tab') === 'pending' ? 'pending' : 'completed'
  const [completed, setCompleted] = useState<SupportSponsorship[]>([])
  const [pending, setPending] = useState<PendingSponsorship[]>([])
  const [analytics, setAnalytics] = useState<SupportSponsorshipAnalytics | null>(null)
  const [range, setRange] = useState<DateRangeValue>(() => rangeFromSearch(searchParams))
  const [sponsorType, setSponsorType] = useState(searchParams.get('sponsorType') || 'ALL')
  const [pendingStatus, setPendingStatus] = useState(searchParams.get('pendingStatus') || 'ALL')
  const [sponsorPhone, setSponsorPhone] = useState(searchParams.get('sponsorPhone') || '')
  const [initiatorPhone, setInitiatorPhone] = useState(searchParams.get('initiatorPhone') || '')
  const [supportRequestId, setSupportRequestId] = useState(searchParams.get('supportRequestId') || '')
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  const rangeParams = useMemo(() => resolveDateRange(range), [range])
  const parsedRequestId = supportRequestId.trim() ? Number(supportRequestId) : undefined

  const sharedFilters = useMemo(
    () => ({
      sponsorPhoneNumber: sponsorPhone.trim() || undefined,
      initiatorPhoneNumber: initiatorPhone.trim() || undefined,
      supportRequestId: Number.isFinite(parsedRequestId) ? parsedRequestId : undefined,
      sponsorType: sponsorType === 'ALL' ? undefined : sponsorType,
      createdFrom: rangeParams.createdFrom,
      createdTo: rangeParams.createdTo,
      size: 100,
    }),
    [sponsorPhone, initiatorPhone, parsedRequestId, sponsorType, rangeParams.createdFrom, rangeParams.createdTo]
  )

  const setTab = (next: 'completed' | 'pending') => {
    const params = new URLSearchParams(searchParams)
    if (next === 'pending') params.set('tab', 'pending')
    else params.delete('tab')
    setSearchParams(params)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        if (tab === 'pending') {
          const page = await listPendingSponsorships({
            status: pendingStatus === 'ALL' ? undefined : pendingStatus,
            sponsorPhoneNumber: sharedFilters.sponsorPhoneNumber,
            createdFrom: sharedFilters.createdFrom,
            createdTo: sharedFilters.createdTo,
            size: 100,
          })
          setPending([...page.content].sort((a, b) => b.id - a.id))
        } else {
          const page = await listSupportSponsorships(sharedFilters)
          setCompleted([...page.content].sort((a, b) => b.id - a.id))
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tab, sharedFilters, pendingStatus])

  useEffect(() => {
    if (!canReadAnalytics || tab !== 'completed') {
      setAnalytics(null)
      setAnalyticsLoading(false)
      return
    }
    const loadAnalytics = async () => {
      setAnalyticsLoading(true)
      try {
        const data = await getSupportSponsorshipAnalytics(sharedFilters)
        setAnalytics(data)
      } finally {
        setAnalyticsLoading(false)
      }
    }
    loadAnalytics()
  }, [canReadAnalytics, tab, sharedFilters])

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-gradient-to-r from-violet-500/10 via-transparent to-emerald-500/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Support Network</p>
              <div>
                <h1 className="text-2xl font-semibold">Supporters & Sponsors</h1>
                <p className="text-sm text-muted-foreground">Review completed sponsorships and pending sponsor credits with shared filters.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTab('completed')}
                className={`rounded-md px-3 py-2 text-sm ${tab === 'completed' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60'}`}
              >
                Completed Sponsorships
              </button>
              <button
                type="button"
                onClick={() => setTab('pending')}
                className={`rounded-md px-3 py-2 text-sm ${tab === 'pending' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60'}`}
              >
                Pending Credits
              </button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="text-lg font-medium">Filters</div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sponsor phone</label>
            <Input value={sponsorPhone} onChange={(e) => setSponsorPhone(e.target.value)} placeholder="2557..." />
          </div>
          {tab === 'completed' && (
            <>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Initiator phone</label>
                <Input value={initiatorPhone} onChange={(e) => setInitiatorPhone(e.target.value)} placeholder="2557..." />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Request ID</label>
                <Input value={supportRequestId} onChange={(e) => setSupportRequestId(e.target.value)} placeholder="e.g. 42" />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sponsor type</label>
                <Select value={sponsorType} onValueChange={setSponsorType}>
                  <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="USER">Individual</SelectItem>
                    <SelectItem value="BUSINESS">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {tab === 'pending' && (
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Credit status</label>
              <Select value={pendingStatus} onValueChange={setPendingStatus}>
                <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="RESERVED">Reserved</SelectItem>
                  <SelectItem value="USED">Used</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="md:col-span-2 xl:col-span-4">
            <DateRangeFilter value={range} onChange={setRange} />
          </div>
        </CardContent>
      </Card>

      {tab === 'completed' && canReadAnalytics && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="space-y-2 pt-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total Sponsorships</div>
              <div className="text-3xl font-semibold">{analyticsLoading ? '...' : analytics?.totalSponsorships ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2 pt-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total Amount</div>
              <div className="text-3xl font-semibold">{analyticsLoading ? '...' : money(analytics?.totalAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2 pt-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Individual Sponsors</div>
              <div className="text-3xl font-semibold">{analyticsLoading ? '...' : analytics?.userSponsorCount ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2 pt-5">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Business Sponsors</div>
              <div className="text-3xl font-semibold">{analyticsLoading ? '...' : analytics?.businessSponsorCount ?? 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'completed' && canReadAnalytics && (analytics?.topSponsors?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <div className="text-lg font-medium">Top Sponsors</div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {analytics?.topSponsors.map((entry) => (
              <div key={entry.sponsorKey} className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="font-medium">{entry.sponsorLabel || entry.sponsorPhoneNumber || entry.sponsorKey}</div>
                <div className="text-xs text-muted-foreground">{entry.sponsorType} • {entry.sponsorPhoneNumber || 'No phone'}</div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span>{entry.sponsorshipCount} sponsorships</span>
                  <span className="font-medium">{money(entry.totalAmount)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-medium">{tab === 'pending' ? 'Pending Sponsor Credits' : 'Completed Sponsorships'}</div>
              <div className="text-sm text-muted-foreground">Click a request ID to open request details.</div>
            </div>
            <Badge>{tab === 'pending' ? pending.length : completed.length} rows</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden rounded-b-lg">
            {tab === 'pending' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Sponsor</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Used On Request</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8}>Loading…</TableCell></TableRow>
                  ) : pending.length === 0 ? (
                    <TableRow><TableCell colSpan={8}>No pending sponsor credits found for this range</TableCell></TableRow>
                  ) : (
                    pending.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</TableCell>
                        <TableCell>{money(row.amount)}</TableCell>
                        <TableCell>{sponsorLabel(row)}</TableCell>
                        <TableCell>{row.sponsorUserPhoneNumber || '—'}</TableCell>
                        <TableCell><Badge>{row.status}</Badge></TableCell>
                        <TableCell>
                          {row.usedByRequestId ? (
                            <Link className="text-sky-400 hover:underline" to={`/requests/${row.usedByRequestId}`}>
                              #{row.usedByRequestId}
                            </Link>
                          ) : row.reservedRequestId ? (
                            <span className="text-muted-foreground">Reserved #{row.reservedRequestId}</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>{row.expiresAt ? new Date(row.expiresAt).toLocaleString() : '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Sponsor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead>Initiator</TableHead>
                    <TableHead>Request Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={9}>Loading…</TableCell></TableRow>
                  ) : completed.length === 0 ? (
                    <TableRow><TableCell colSpan={9}>No sponsorships found for this range</TableCell></TableRow>
                  ) : (
                    completed.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</TableCell>
                        <TableCell>{money(row.amount)}</TableCell>
                        <TableCell>{sponsorLabel(row)}</TableCell>
                        <TableCell><Badge variant="secondary">{row.sponsorType}</Badge></TableCell>
                        <TableCell>{row.sponsorUserPhoneNumber || '—'}</TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="text-sky-400 hover:underline"
                            onClick={() => navigate(`/requests/${row.supportRequestId}`)}
                          >
                            #{row.supportRequestId} {row.supportRequestName ? `• ${row.supportRequestName}` : ''}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{row.initiatorName || '—'}</div>
                          <div className="text-xs text-muted-foreground">{row.initiatorPhoneNumber || '—'}</div>
                        </TableCell>
                        <TableCell>{row.supportRequestStatus || '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
