import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteSupportRequestComment, getSupportRequest, listSupportRequestComments, listSupportRequestPayments, listSupportRequestSponsors, manualConfirmSupportRequestPayment, SupportRequest, SupportRequestComment, SupportRequestPayment } from '../api/supportRequests'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import Badge from '../components/ui/badge'
import Button from '../components/ui/button'
import Input from '../components/ui/input'
import { Modal } from '../components/ui/modal'
import { hasPermission } from '../lib/auth'

const displayStatus = (s: string) => {
  if (s === 'PENDING') return 'WAITING'
  if (s === 'FUNDED') return 'Awarded'
  return s
}

const isBasePaymentConfirmed = (status?: string) => !!status && !['PENDING', 'CANCELLED', 'REJECTED'].includes(status)

const basePaymentStatus = (status?: string) => {
  if (status === 'CANCELLED' || status === 'REJECTED') return 'FAILED'
  return isBasePaymentConfirmed(status) ? 'PAID' : 'WAITING'
}

const paymentStatusLabel = (status?: string) => status === 'SUCCESS' ? 'PAID' : status || '—'

const isPaidPayment = (status?: string) => ['PAID', 'SUCCESS'].includes(status || '')

const normalizeManualMethod = (method?: string) => {
  const value = (method || '').toUpperCase()
  if (value.includes('AIRTEL')) return 'AIRTEL'
  if (value.includes('MPESA') || value.includes('M-PESA')) return 'MPESA'
  if (value.includes('TIGO')) return 'TIGO'
  return 'MANUAL'
}

const canConfirmPaymentRow = (payment: SupportRequestPayment) => {
  if (payment.manual || isPaidPayment(payment.status)) return false
  if (payment.paymentType === 'BASE') return true
  return payment.paymentType === 'SPONSOR'
}

const paymentRowId = (payment: SupportRequestPayment) => {
  if (payment.paymentType === 'BASE') return 'BASE'
  return payment.providerReference || String(payment.id)
}

export default function RequestDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const canManualConfirmPayment = hasPermission('SUPPORT_PAYMENT_MANUAL_CONFIRM')
  const canDeleteComments = hasPermission('SUPPORT_COMMENT_DELETE')
  const [item, setItem] = useState<SupportRequest | null>(null)
  const [payments, setPayments] = useState<SupportRequestPayment[]>([])
  const [comments, setComments] = useState<SupportRequestComment[]>([])
  const [paymentsError, setPaymentsError] = useState('')
  const [commentsError, setCommentsError] = useState('')
  const [loading, setLoading] = useState(true)
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualSaving, setManualSaving] = useState(false)
  const [manualError, setManualError] = useState('')
  const [manualForm, setManualForm] = useState({
    paymentType: 'SPONSOR' as 'BASE' | 'SPONSOR',
    payerPhoneNumber: '',
    amount: '',
    method: 'TIGO',
    providerReference: '',
    reason: '',
    paidAt: '',
  })

  const loadDetails = async () => {
    setLoading(true)
    try {
      if (!id) return
      const req = await getSupportRequest(Number(id))
      setItem(req)
      try {
        const pay = await listSupportRequestPayments(Number(id), { size: 100 })
        const list = pay.content || []
        const hasBasePayment = list.some((p) => p.paymentType === 'BASE')
        const base = !hasBasePayment && req.baseAmount && req.initiatorPhoneNumber
          ? [{
              id: 0,
              amount: req.baseAmount,
              status: basePaymentStatus(req.status),
              method: 'Initiator Base',
              sponsorPhoneNumber: req.initiatorPhoneNumber,
              paymentType: 'BASE',
              source: 'BASE_SYNTHETIC',
              createdAt: undefined,
            } as SupportRequestPayment]
          : []
        setPaymentsError('')
        setPayments([...base, ...list])
      } catch (e: any) {
        const code = e?.response?.status
        setPaymentsError(code === 403 ? 'You do not have permission to view payments for this request.' : 'Failed to load payments')
        setPayments([])
        try {
          const sponsors = await listSupportRequestSponsors(Number(id))
          if (sponsors.length > 0) {
            const fallback = sponsors.map((s) => ({
              id: -1,
              amount: String(s.amount),
              status: 'PAID',
              method: 'Sponsor',
              sponsorPhoneNumber: s.phone,
              createdAt: undefined,
            } as SupportRequestPayment))
            setPaymentsError('')
            setPayments(fallback)
          }
        } catch {}
      }
      try {
        const commentPage = await listSupportRequestComments(Number(id), { size: 100 })
        setComments(commentPage.content || [])
        setCommentsError('')
      } catch (e: any) {
        const code = e?.response?.status
        setCommentsError(code === 403 ? 'You do not have permission to view comments for this request.' : 'Failed to load comments')
        setComments([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetails()
  }, [id])

  const submitManualConfirm = async () => {
    if (!id) return
    setManualError('')
    const amount = Number(manualForm.amount)
    if (!manualForm.payerPhoneNumber.trim() || !manualForm.providerReference.trim() || !manualForm.reason.trim()) {
      setManualError('Payer phone, provider reference, and reason are required.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setManualError('Enter a valid positive amount.')
      return
    }
    if (!confirm('Confirm this payment manually? This affects request financial totals.')) return
    setManualSaving(true)
    try {
      await manualConfirmSupportRequestPayment(Number(id), {
        payerPhoneNumber: manualForm.payerPhoneNumber.trim(),
        amount,
        method: manualForm.method,
        paymentType: manualForm.paymentType,
        providerReference: manualForm.providerReference.trim(),
        reason: manualForm.reason.trim(),
        paidAt: manualForm.paidAt ? new Date(manualForm.paidAt).toISOString() : undefined,
      })
      setManualOpen(false)
      setManualForm({ paymentType: 'SPONSOR', payerPhoneNumber: '', amount: '', method: 'TIGO', providerReference: '', reason: '', paidAt: '' })
      await loadDetails()
    } catch (e: any) {
      setManualError(e?.response?.data?.message || 'Failed to manually confirm payment')
    } finally {
      setManualSaving(false)
    }
  }

  const openManualConfirm = (paymentType: 'BASE' | 'SPONSOR', seed?: Partial<SupportRequestPayment>) => {
    setManualError('')
    setManualForm({
      paymentType,
      payerPhoneNumber: seed?.sponsorPhoneNumber || (paymentType === 'BASE' ? item?.initiatorPhoneNumber || '' : ''),
      amount: seed?.amount ? String(seed.amount) : paymentType === 'BASE' ? String(item?.baseAmount || '') : '',
      method: normalizeManualMethod(seed?.method),
      providerReference: seed?.providerReference || '',
      reason: '',
      paidAt: '',
    })
    setManualOpen(true)
  }

  const handleDeleteComment = async (comment: SupportRequestComment) => {
    if (!id) return
    const author = comment.authorDisplayLabel || comment.authorName || comment.userPhoneNumber || 'this user'
    if (!confirm(`Delete this comment by ${author}? Replies will remain, but their reply link will be cleared.`)) return
    setDeletingCommentId(comment.id)
    try {
      await deleteSupportRequestComment(Number(id), comment.id)
      setComments((prev) => prev.filter((entry) => entry.id !== comment.id).map((entry) => entry.parentCommentId === comment.id
        ? { ...entry, parentCommentId: undefined, parentCommentText: undefined, parentCommentAuthorName: undefined, parentCommentAuthorDisplayLabel: undefined, parentCommentAuthorPhoneMasked: undefined }
        : entry))
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete comment')
    } finally {
      setDeletingCommentId(null)
    }
  }

  return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Request Details</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
          </div>
        </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-lg font-medium">{item?.name || '—'}</div>
              <div className="text-sm text-muted-foreground">#{id}</div>
            </div>
            <Badge variant={item?.status === 'REJECTED' ? 'destructive' : 'default'}>{item ? displayStatus(item.status) : '—'}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <div>Loading…</div>}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Initiator Phone</div>
                <div className="text-sm">{item?.initiatorPhoneNumber || '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Base Amount</div>
                <div className="text-sm">{item ? `TZS ${item.baseAmount}` : '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Requested Amount</div>
                <div className="text-sm">{item ? `TZS ${item.requestedAmount}` : '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Sponsored Amount</div>
                <div className="text-sm">{item ? `TZS ${item.sponsoredAmount}` : '—'}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        {(() => {
          const sponsorPayments = payments
            .filter((p) => !!p.sponsorPhoneNumber && p.paymentType !== 'BASE' && p.id !== 0 && isPaidPayment(p.status))
            .map((p) => ({
              phone: p.sponsorPhoneNumber as string,
              amount: Number(p.amount || 0),
            }))

          const raw: any = item as any
          const candidates = raw?.sponsors || raw?.sponsorships || raw?.contributors || raw?.sponsorInfos || []
          const sponsorFromRequest = Array.isArray(candidates)
            ? candidates
                .map((s: any) => ({
                  phone: s?.phoneNumber || s?.phone || s?.sponsorPhoneNumber,
                  amount: Number(s?.amount || s?.contribution || s?.totalAmount || 0),
                }))
                .filter((s: any) => !!s.phone)
            : []

          const combined = [...sponsorPayments, ...sponsorFromRequest]
          const agg: Record<string, { total: number; count: number }> = {}
          combined.forEach(({ phone, amount }) => {
            agg[phone] = agg[phone]
              ? { total: agg[phone].total + amount, count: agg[phone].count + 1 }
              : { total: amount, count: 1 }
          })
          const rows = Object.entries(agg)
          if (rows.length === 0) return null
          return (
            <>
              <CardHeader>
                <div className="text-lg font-medium">Sponsors</div>
              </CardHeader>
              <CardContent>
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phone</TableHead>
                        <TableHead>Total Contributed</TableHead>
                        <TableHead>Payments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map(([phone, info]) => (
                        <TableRow key={phone}>
                          <TableCell>{phone}</TableCell>
                          <TableCell>TZS {info.total}</TableCell>
                          <TableCell>{info.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </>
          )
        })()}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-medium">Payments</div>
              <div className="text-sm text-muted-foreground">Confirm the base payment or add verified sponsor payments here.</div>
            </div>
            {canManualConfirmPayment && isBasePaymentConfirmed(item?.status) && (
              <Button onClick={() => openManualConfirm('SPONSOR')}>Add Sponsor Payment</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {paymentsError && <div className="mb-3 p-2 text-sm rounded bg-destructive text-destructive-foreground/90">{paymentsError}</div>}
          {payments.length === 0 ? (
            <div className="text-sm text-muted-foreground">No payments found</div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Payer Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    {canManualConfirmPayment && <TableHead>Action</TableHead>}
                  </TableRow>
                </TableHeader>
                  <TableBody>
                  {payments.map((p) => (
                    <TableRow key={`${p.source || 'PAY'}-${p.id}-${p.providerReference || ''}`}>
                      <TableCell>{paymentRowId(p)}</TableCell>
                      <TableCell>TZS {p.amount}</TableCell>
                      <TableCell>{p.method || '—'}</TableCell>
                      <TableCell>{p.sponsorPhoneNumber || '—'}</TableCell>
                      <TableCell><Badge variant={p.status === 'FAILED' || p.status === 'REJECTED' ? 'destructive' : 'default'}>{paymentStatusLabel(p.status)}</Badge></TableCell>
                      <TableCell>{p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}</TableCell>
                      {canManualConfirmPayment && (
                        <TableCell>
                          {canConfirmPaymentRow(p) ? (
                            <Button size="sm" onClick={() => openManualConfirm(p.paymentType === 'BASE' ? 'BASE' : 'SPONSOR', p)}>
                              {p.paymentType === 'BASE' ? 'Confirm Base' : 'Confirm Manually'}
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-medium">Comments</div>
              <div className="text-sm text-muted-foreground">Review discussion on this request and remove comments when moderation is needed.</div>
            </div>
            <Badge>{comments.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {commentsError && <div className="mb-3 p-2 text-sm rounded bg-destructive text-destructive-foreground/90">{commentsError}</div>}
          {comments.length === 0 ? (
            <div className="text-sm text-muted-foreground">No comments yet</div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{comment.authorDisplayLabel || comment.authorName || comment.userPhoneNumber || 'Unknown user'}</div>
                        {comment.authorType && <Badge variant="secondary">{comment.authorType}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {comment.userPhoneNumber || '—'} {comment.createdAt ? `• ${new Date(comment.createdAt).toLocaleString()}` : ''}
                      </div>
                    </div>
                    {canDeleteComments && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteComment(comment)}
                        disabled={deletingCommentId === comment.id}
                      >
                        {deletingCommentId === comment.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    )}
                  </div>
                  {comment.parentCommentId && (
                    <div className="mt-3 rounded-md border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
                      Replying to {comment.parentCommentAuthorDisplayLabel || comment.parentCommentAuthorName || comment.parentCommentAuthorPhoneMasked || 'another comment'}: {comment.parentCommentText || 'Original comment deleted'}
                    </div>
                  )}
                  <div className="mt-3 whitespace-pre-wrap text-sm">{comment.text}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={manualOpen}
        onClose={() => !manualSaving && setManualOpen(false)}
        title={manualForm.paymentType === 'BASE' ? 'Confirm Base Payment' : 'Add Sponsor Payment'}
        className="max-w-xl"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            Only use this after verifying the payment in the provider portal. {manualForm.paymentType === 'BASE' ? 'This will activate the request.' : 'This will update the sponsored balance.'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Payer Phone</label>
              <Input value={manualForm.payerPhoneNumber} onChange={(e) => setManualForm({ ...manualForm, payerPhoneNumber: e.target.value })} placeholder="2557..." />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Amount</label>
              <Input type="number" value={manualForm.amount} onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })} placeholder="Amount paid" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Method</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={manualForm.method}
                onChange={(e) => setManualForm({ ...manualForm, method: e.target.value })}
              >
                <option value="TIGO">Tigo Pesa</option>
                <option value="AIRTEL">Airtel Money</option>
                <option value="MPESA">M-Pesa</option>
                <option value="MANUAL">Manual/Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Provider Reference</label>
              <Input value={manualForm.providerReference} onChange={(e) => setManualForm({ ...manualForm, providerReference: e.target.value })} placeholder="Transaction/reference ID" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Paid At Optional</label>
              <Input type="datetime-local" value={manualForm.paidAt} onChange={(e) => setManualForm({ ...manualForm, paidAt: e.target.value })} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Verification Reason</label>
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={manualForm.reason}
                onChange={(e) => setManualForm({ ...manualForm, reason: e.target.value })}
                placeholder="Example: Verified in Tigo merchant portal by reference..."
              />
            </div>
          </div>
          {manualError && <div className="rounded-md bg-destructive p-2 text-sm text-destructive-foreground">{manualError}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setManualOpen(false)} disabled={manualSaving}>Cancel</Button>
            <Button onClick={submitManualConfirm} disabled={manualSaving}>{manualSaving ? 'Confirming...' : manualForm.paymentType === 'BASE' ? 'Confirm Base Payment' : 'Add Sponsor Payment'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
