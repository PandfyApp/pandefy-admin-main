import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAdminUsers } from '../api/admin'
import { listSupportRequests } from '../api/supportRequests'
import { listWithdrawals } from '../api/withdrawals'
import DateRangeFilter from '../components/DateRangeFilter'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Activity, ArrowRight, Users, Wallet } from 'lucide-react'
import { canAccessAdminFeature, hasPermission } from '../lib/auth'
import { DateRangeValue, presetLabel, resolveDateRange } from '../lib/dateRanges'

type Stat = {
  label: string
  value: number
  kind: 'requests' | 'withdrawals' | 'users'
  to?: string
}

const initialRange: DateRangeValue = { preset: 'THIS_MONTH' }

const buildQuery = (path: string, query: Record<string, string | undefined>) => {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  const search = params.toString()
  return search ? `${path}?${search}` : path
}

const iconByKind = {
  requests: Activity,
  withdrawals: Wallet,
  users: Users,
} as const

export default function Home() {
  const navigate = useNavigate()
  const canReadSupport = canAccessAdminFeature()
  const canReadWithdrawals = hasPermission('WITHDRAWAL_READ')
  const canReadUsers = hasPermission('USER_READ')
  const [range, setRange] = useState<DateRangeValue>(initialRange)
  const [stats, setStats] = useState<Stat[]>([])
  const [loading, setLoading] = useState(true)

  const rangeParams = useMemo(() => resolveDateRange(range), [range])
  const requestQuery = useMemo(
    () => ({
      preset: range.preset,
      from: range.from,
      to: range.to,
    }),
    [range]
  )

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const nextStats: Stat[] = []

        if (canReadSupport) {
          const [srPending, srActive, srFunded, srCompleted] = await Promise.all([
            listSupportRequests({ status: 'PENDING', createdFrom: rangeParams.createdFrom, createdTo: rangeParams.createdTo, size: 1 }),
            listSupportRequests({ status: 'ACTIVE', createdFrom: rangeParams.createdFrom, createdTo: rangeParams.createdTo, size: 1 }),
            listSupportRequests({ status: 'FUNDED', createdFrom: rangeParams.createdFrom, createdTo: rangeParams.createdTo, size: 1 }),
            listSupportRequests({ status: 'COMPLETED', createdFrom: rangeParams.createdFrom, createdTo: rangeParams.createdTo, size: 1 }),
          ])

          nextStats.push(
            {
              label: 'Pending Requests',
              value: srPending.totalElements,
              kind: 'requests',
              to: buildQuery('/requests', { ...requestQuery, status: 'PENDING' }),
            },
            {
              label: 'Active Requests',
              value: srActive.totalElements,
              kind: 'requests',
              to: buildQuery('/requests', { ...requestQuery, status: 'ACTIVE' }),
            },
            {
              label: 'Funded Requests',
              value: srFunded.totalElements,
              kind: 'requests',
              to: buildQuery('/requests', { ...requestQuery, status: 'FUNDED' }),
            },
            {
              label: 'Completed Requests',
              value: srCompleted.totalElements,
              kind: 'requests',
              to: buildQuery('/requests', { ...requestQuery, status: 'COMPLETED' }),
            }
          )
        }

        if (canReadWithdrawals) {
          const [wdPending, wdPaid, wdRejected] = await Promise.all([
            listWithdrawals({ status: 'PENDING', createdFrom: rangeParams.createdFrom, createdTo: rangeParams.createdTo, size: 1 }),
            listWithdrawals({ status: 'PAID', createdFrom: rangeParams.createdFrom, createdTo: rangeParams.createdTo, size: 1 }),
            listWithdrawals({ status: 'REJECTED', createdFrom: rangeParams.createdFrom, createdTo: rangeParams.createdTo, size: 1 }),
          ])

          nextStats.push(
            {
              label: 'Pending Withdrawals',
              value: wdPending.totalElements,
              kind: 'withdrawals',
              to: buildQuery('/withdrawals', { ...requestQuery, status: 'PENDING' }),
            },
            {
              label: 'Paid Withdrawals',
              value: wdPaid.totalElements,
              kind: 'withdrawals',
              to: buildQuery('/withdrawals', { ...requestQuery, status: 'PAID' }),
            },
            {
              label: 'Rejected Withdrawals',
              value: wdRejected.totalElements,
              kind: 'withdrawals',
              to: buildQuery('/withdrawals', { ...requestQuery, status: 'REJECTED' }),
            }
          )
        }

        if (canReadUsers) {
          const page = await listAdminUsers({ includeDeleted: false, includeAppUsers: true, size: 1 })
          nextStats.push({
            label: 'Active Users',
            value: page.totalElements,
            kind: 'users',
            to: buildQuery('/users', { includeDeleted: 'false', includeAppUsers: 'true' }),
          })
        }

        setStats(nextStats)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [
    canReadSupport,
    canReadUsers,
    canReadWithdrawals,
    rangeParams.createdFrom,
    rangeParams.createdTo,
    requestQuery,
  ])

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-gradient-to-r from-sky-500/10 via-transparent to-emerald-500/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Dashboard</p>
              <div>
                <h1 className="text-2xl font-semibold">Overview</h1>
                <p className="text-sm text-muted-foreground">
                  Track requests, withdrawals, and active users from one place, then jump straight into the filtered list.
                </p>
              </div>
            </div>
            <DateRangeFilter value={range} onChange={setRange} />
          </div>
        </CardHeader>
      </Card>

      {canReadSupport && (
        <Card>
          <CardHeader>
            <div className="text-lg font-medium">Support</div>
            <div className="text-sm text-muted-foreground">Open support queues and sponsor activity.</div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-md border border-border bg-muted/30 px-4 py-2 text-sm hover:bg-muted"
              onClick={() => navigate('/requests')}
            >
              Support Requests
            </button>
            <button
              type="button"
              className="rounded-md border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm hover:bg-violet-500/20"
              onClick={() => navigate('/sponsors')}
            >
              Supporters & Sponsors
            </button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-sm text-muted-foreground">Showing request and withdrawal data for {presetLabel(range.preset)}.</div>
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tap any card to open its filtered list</div>
      </div>

      {stats.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You do not have access to overview metrics yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => {
            const Icon = iconByKind[stat.kind]
            const clickable = Boolean(stat.to)

            return (
              <Card
                key={stat.label}
                className={clickable ? 'group cursor-pointer overflow-hidden transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/20' : 'overflow-hidden'}
                onClick={() => stat.to && navigate(stat.to)}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={(event) => {
                  if (!stat.to) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate(stat.to)
                  }
                }}
              >
                <CardContent className="space-y-5 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                      <div className="text-4xl font-semibold tracking-tight">{loading ? '...' : stat.value.toLocaleString()}</div>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-muted-foreground transition group-hover:border-primary/30 group-hover:text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {stat.kind === 'users' ? 'Current active accounts' : 'Open filtered list'}
                    </span>
                    {clickable && <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
