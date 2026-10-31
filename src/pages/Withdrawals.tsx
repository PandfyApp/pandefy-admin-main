import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { disburseAirtel, disburseTigo, getWithdrawalAnalytics, listWithdrawals, updateWithdrawalStatus, Withdrawal, WithdrawalAnalytics } from '../api/withdrawals'
import DateRangeFilter from '../components/DateRangeFilter'
import Badge from '../components/ui/badge'
import Button from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import Input from '../components/ui/input'
import { Modal } from '../components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { hasPermission } from '../lib/auth'
import { DateRangePreset, DateRangeValue, resolveDateRange } from '../lib/dateRanges'

const money = (value?: string | number) => `TZS ${Number(value || 0).toLocaleString()}`
const initialRange: DateRangeValue = { preset: 'THIS_MONTH' }
const allowedPresets: DateRangePreset[] = ['ALL_TIME', 'TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH', 'LAST_MONTH', 'CUSTOM']

const looksLikeTigoSuccessMessage = (value?: unknown) => {
  if (!value) return false
  const normalized = String(value).toLowerCase()
  return normalized.includes('yamekamilika')
    || normalized.includes('imekamilika')
    || normalized.includes('successful')
    || normalized.includes('success')
    || normalized.includes('completed')
    || normalized.includes('processed successfully')
}

const isTigoSuccessResponse = (response: any) => {
  const status = String(response?.status || '').toUpperCase()
  const nestedStatus = response?.tigoResponse?.ResponseStatus
  return response?.success === true
    || response?.ResponseStatus === true
    || nestedStatus === true
    || status === 'SUCCESS'
    || status === 'PENDING'
    || looksLikeTigoSuccessMessage(response?.message)
    || looksLikeTigoSuccessMessage(response?.ResponseDescription)
    || looksLikeTigoSuccessMessage(response?.tigoResponse?.ResponseDescription)
}

const rangeFromSearch = (searchParams: URLSearchParams): DateRangeValue => {
  const presetParam = searchParams.get('preset')
  const preset = allowedPresets.includes(presetParam as DateRangePreset) ? (presetParam as DateRangePreset) : initialRange.preset
  return {
    preset,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  }
}

function RequesterDetails({ withdrawal }: { withdrawal: Withdrawal }) {
  const phone = withdrawal.requesterPhoneNumber
  return <div className="space-y-1">
    <div className="font-medium">{withdrawal.requesterName?.trim() || phone || 'Name not provided'}</div>
    <div className="text-xs text-muted-foreground">Registered phone: {phone || 'Not available'}</div>
    {phone && hasPermission('SUPPORT_READ') && <Link className="inline-block text-sm text-primary underline" to={`/requests?${new URLSearchParams({ initiatorPhoneNumber: phone, preset: 'ALL_TIME' })}`}>View all requests</Link>}
  </div>
}

export default function Withdrawals() {
  const [searchParams] = useSearchParams()
  const canUpdateStatus = hasPermission('WITHDRAWAL_UPDATE_STATUS')
  const canDisburse = hasPermission('WITHDRAWAL_DISBURSE')
  const canReadAnalytics = hasPermission('WITHDRAWAL_ANALYTICS_READ')
  const [items, setItems] = useState<Withdrawal[]>([])
  const [analytics, setAnalytics] = useState<WithdrawalAnalytics | null>(null)
  const [status, setStatus] = useState<string>(searchParams.get('status') || 'ALL')
  const [range, setRange] = useState<DateRangeValue>(() => rangeFromSearch(searchParams))
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
  const [modalMno, setModalMno] = useState<string>('')
  const [modalReason, setModalReason] = useState<string>('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const rangeParams = useMemo(() => resolveDateRange(range), [range])

  const load = async () => {
    setLoading(true)
    try {
      const page = await listWithdrawals({
        status: status === 'ALL' ? undefined : status,
        createdFrom: rangeParams.createdFrom,
        createdTo: rangeParams.createdTo,
        size: 100,
      })
      setItems(page.content.sort((a, b) => b.id - a.id))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
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
        const data = await getWithdrawalAnalytics({
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

  const openModal = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal)
    setModalMno('')
    setModalReason(withdrawal.reason || '')
    setFirstName('')
    setLastName('')
  }

  const closeModal = () => {
    setSelectedWithdrawal(null)
    setModalMno('')
    setModalReason('')
    setFirstName('')
    setLastName('')
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedWithdrawal) return
    if (!canUpdateStatus) {
      alert('You do not have permission to update withdrawal status.')
      return
    }
    setUpdatingId(selectedWithdrawal.id)
    try {
      await updateWithdrawalStatus(selectedWithdrawal.id, newStatus, modalReason || undefined)
      await load()
      closeModal()
    } finally {
      setUpdatingId(null)
    }
  }

  const handleApproveDisburse = async () => {
    if (!selectedWithdrawal) return
    if (!canDisburse) {
      alert('You do not have permission to authorize withdrawal disbursements.')
      return
    }
    const disbursementAmount = Number(selectedWithdrawal.disbursementAmount ?? selectedWithdrawal.amount)
    if (!Number.isFinite(disbursementAmount) || disbursementAmount <= 0) {
      alert('Invalid disbursement amount')
      return
    }
    if (!modalMno) {
      if (!confirm('No MNO selected. Mark as PAID without automated disbursement?')) return
      await handleStatusUpdate('PAID')
      return
    }

    setUpdatingId(selectedWithdrawal.id)
    try {
      if (modalMno === 'AIRTEL') {
        const amountInt = Math.round(disbursementAmount)
        const res = await disburseAirtel({
          phoneNumber: selectedWithdrawal.phoneNumber,
          amount: amountInt,
          reference: `WID-${selectedWithdrawal.id}`,
        })
        if (res.status === 'PENDING' || res.status === 'SUCCESS') {
          await updateWithdrawalStatus(selectedWithdrawal.id, 'PAID', 'Paid via Airtel Money')
          alert('Disbursement initiated successfully!')
          closeModal()
          await load()
        } else {
          alert(`Disbursement Failed: ${res.message || 'Unknown error'}`)
          closeModal()
          await load()
        }
      } else if (modalMno === 'TIGO') {
        const amountInt = Math.round(disbursementAmount)
        const res = await disburseTigo({
          phoneNumber: selectedWithdrawal.phoneNumber,
          amount: amountInt,
          referenceId: `WID-${selectedWithdrawal.id}`,
          firstName: firstName || 'Beneficiary',
          lastName: lastName || 'User',
        })
        const ok = isTigoSuccessResponse(res)
        if (ok) {
          await updateWithdrawalStatus(selectedWithdrawal.id, 'PAID', 'Paid via Tigo Pesa')
          alert('Disbursement initiated successfully!')
          closeModal()
          await load()
        } else {
          alert(`Disbursement Failed: ${res?.message || res?.ResponseDescription || 'Unknown error'}`)
          closeModal()
          await load()
        }
      } else {
        alert(`${modalMno} integration is not implemented yet.`)
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message
      alert(`Disbursement Failed: ${msg}`)
      if (confirm('Disbursement failed. Mark withdrawal as FAILED?')) {
        await updateWithdrawalStatus(selectedWithdrawal.id, 'FAILED', `Disbursement Failed: ${msg}`)
        await load()
        closeModal()
      }
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-gradient-to-r from-amber-500/10 via-transparent to-emerald-500/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Finance Queue</p>
              <div>
                <h1 className="text-2xl font-semibold">Withdrawals</h1>
                <p className="text-sm text-muted-foreground">Review withdrawals, track approvers, and monitor how money moves in the selected window.</p>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(180px,220px)_auto]">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="min-w-[180px]">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
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
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total Withdrawals</div>
                <div className="text-3xl font-semibold">{analyticsLoading ? '...' : analytics?.totalWithdrawals ?? 0}</div>
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
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Fees Total</div>
                <div className="text-3xl font-semibold">{analyticsLoading ? '...' : money(analytics?.totalServiceFeeAmount)}</div>
              </CardContent>
            </Card>
            <Card className="border-violet-500/20">
              <CardContent className="space-y-2 pt-5">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Net Disbursement</div>
                <div className="text-3xl font-semibold">{analyticsLoading ? '...' : money(analytics?.totalDisbursementAmount)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <Card>
              <CardHeader>
                <div className="text-lg font-medium">Status Totals</div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {(analytics?.statusTotals || []).map((entry) => (
                    <div key={entry.status} className="rounded-xl border border-border/70 bg-muted/20 p-4">
                      <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{entry.status}</div>
                      <div className="mt-3 text-2xl font-semibold">{entry.count}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{money(entry.amount)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="text-lg font-medium">Approver Totals</div>
              </CardHeader>
              <CardContent>
                {(analytics?.approverTotals || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No approver activity in this range.</div>
                ) : (
                  <div className="space-y-3">
                    {analytics?.approverTotals.map((approver) => (
                      <div key={`${approver.approverUserId || approver.approverPhoneNumber || 'unknown'}`} className="rounded-xl border border-border/70 bg-muted/20 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{approver.approverName || approver.approverPhoneNumber || 'Unknown Approver'}</div>
                            <div className="text-xs text-muted-foreground">{approver.approverPhoneNumber || 'No phone'}</div>
                          </div>
                          <Badge>{approver.approvedCount} actions</Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-muted-foreground">Approved Amount</div>
                            <div className="font-medium">{money(approver.totalApprovedAmount)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Net Paid</div>
                            <div className="font-medium">{money(approver.totalApprovedDisbursementAmount)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-medium">Withdrawal Queue</div>
              <div className="text-sm text-muted-foreground">Approver and totals below reflect the selected time range.</div>
            </div>
            <Badge>{items.length} rows</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-b-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Withdrawal Phone</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={11}>Loading…</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={11}>No withdrawals found for this range</TableCell></TableRow>
                ) : (
                  items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.id}</TableCell>
                      <TableCell>{it.createdAt ? new Date(it.createdAt).toLocaleString() : '—'}</TableCell>
                      <TableCell>{money(it.amount)}</TableCell>
                      <TableCell>{money(it.serviceFeeAmount)}</TableCell>
                      <TableCell>{money(it.disbursementAmount ?? it.amount)}</TableCell>
                      <TableCell><RequesterDetails withdrawal={it} /></TableCell>
                      <TableCell>{it.phoneNumber}</TableCell>
                      <TableCell>{it.paymentMethod}</TableCell>
                      <TableCell>
                        {it.approvedByName || it.approvedByPhoneNumber ? (
                          <div>
                            <div className="font-medium">{it.approvedByName || 'Unnamed Approver'}</div>
                            <div className="text-xs text-muted-foreground">{it.approvedByPhoneNumber || 'No phone'}</div>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell><Badge variant={it.status === 'REJECTED' || it.status === 'FAILED' ? 'destructive' : it.status === 'PAID' ? 'secondary' : 'default'}>{it.status}</Badge></TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => openModal(it)}>
                          {(it.status === 'PENDING' || it.status === 'FAILED') && (canUpdateStatus || canDisburse) ? 'Review' : 'View Details'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={!!selectedWithdrawal}
        onClose={closeModal}
        title={`Withdrawal #${selectedWithdrawal?.id}`}
        className="max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {selectedWithdrawal && (
          <div className="space-y-4">
            <section aria-label="Requester details" className="rounded-lg border border-border p-3">
              <p className="mb-2 text-xs uppercase text-muted-foreground">Requester</p>
              <RequesterDetails withdrawal={selectedWithdrawal} />
            </section>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Requested Amount</p>
                <p className="font-medium text-lg">{money(selectedWithdrawal.amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Disbursement Amount</p>
                <p className="font-medium">{money(selectedWithdrawal.disbursementAmount ?? selectedWithdrawal.amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Withdrawal Phone Number</p>
                <p className="font-medium">{selectedWithdrawal.phoneNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Service Fee</p>
                <p className="font-medium">
                  {money(selectedWithdrawal.serviceFeeAmount)}
                  {selectedWithdrawal.serviceFeePercent ? ` (${selectedWithdrawal.serviceFeePercent}%)` : ''}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Method</p>
                <p className="font-medium">{selectedWithdrawal.paymentMethod}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Status</p>
                <Badge variant={selectedWithdrawal.status === 'REJECTED' ? 'destructive' : 'default'}>
                  {selectedWithdrawal.status}
                </Badge>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Approver</p>
                <p className="font-medium">
                  {selectedWithdrawal.approvedByName || selectedWithdrawal.approvedByPhoneNumber
                    ? `${selectedWithdrawal.approvedByName || 'Unnamed Approver'}${selectedWithdrawal.approvedByPhoneNumber ? ` • ${selectedWithdrawal.approvedByPhoneNumber}` : ''}`
                    : 'Not approved yet'}
                </p>
              </div>
            </div>

            {selectedWithdrawal.transactions && selectedWithdrawal.transactions.length > 0 && (
              <div className="border-t border-border pt-4">
                <h3 className="mb-2 text-sm font-medium">Transaction History</h3>
                <div className="space-y-2">
                  {selectedWithdrawal.transactions.map((tx) => (
                    <div key={tx.transactionId} className="rounded border border-border bg-muted p-2 text-xs">
                      <div className="flex justify-between">
                        <span className="font-semibold">{tx.status}</span>
                        <span className="text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span>{tx.transactionId}</span>
                        <span>{tx.airtelMoneyId || '-'}</span>
                      </div>
                      {tx.message && <div className="mt-1 font-medium text-red-500">{tx.message}</div>}
                      <div className="mt-1">{money(tx.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(selectedWithdrawal.status === 'PENDING' || selectedWithdrawal.status === 'FAILED') && (canUpdateStatus || canDisburse) ? (
              <div className="space-y-4 border-t border-border pt-4">
                {canDisburse && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Disburse Via</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black"
                      value={modalMno}
                      onChange={(e) => setModalMno(e.target.value)}
                    >
                      <option value="" disabled>Select Mobile Network</option>
                      <option value="AIRTEL">Airtel Money</option>
                      <option value="MPESA">M-Pesa</option>
                      <option value="TIGO">Tigo Pesa</option>
                    </select>
                  </div>
                )}

                {canDisburse && modalMno === 'TIGO' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">First Name</label>
                      <Input placeholder="Beneficiary First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Last Name</label>
                      <Input placeholder="Beneficiary Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason / Note (Optional)</label>
                  <Input placeholder="Enter note or rejection reason..." value={modalReason} onChange={(e) => setModalReason(e.target.value)} />
                </div>

                <div className="flex gap-2 pt-2">
                  {canDisburse && (
                    <Button className="flex-1" onClick={handleApproveDisburse} disabled={updatingId === selectedWithdrawal.id}>
                      {updatingId === selectedWithdrawal.id ? 'Processing...' : (selectedWithdrawal.status === 'FAILED' ? 'Retry & Pay' : 'Approve & Pay')}
                    </Button>
                  )}
                  {canUpdateStatus && (
                    <Button variant="destructive" className="flex-1" onClick={() => handleStatusUpdate('REJECTED')} disabled={updatingId === selectedWithdrawal.id}>
                      Reject
                    </Button>
                  )}
                </div>
                <Button variant="secondary" className="mt-2 w-full" onClick={closeModal} disabled={updatingId === selectedWithdrawal.id}>
                  Cancel / Close
                </Button>
              </div>
            ) : (
              <div className="border-t border-border pt-4">
                {selectedWithdrawal.reason && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">Note/Reason</p>
                    <p className="text-sm">{selectedWithdrawal.reason}</p>
                  </div>
                )}
                <Button className="w-full" onClick={closeModal}>Close</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
