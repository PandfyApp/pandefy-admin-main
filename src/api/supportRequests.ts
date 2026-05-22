import { api, Page } from './client'

export type SupportRequest = {
  id: number
  name: string
  initiatorPhoneNumber: string
  requestedAmount: string
  baseAmount: string
  sponsoredAmount: string
  status: string
  createdAt?: string
}

export type SupportRequestComment = {
  id: number
  text: string
  authorName?: string
  authorType?: string
  userPhoneNumber?: string
  createdAt?: string
  authorDisplayLabel?: string
  authorProfilePicture?: string
  parentCommentId?: number
  parentCommentText?: string
  parentCommentAuthorName?: string
  parentCommentAuthorDisplayLabel?: string
  parentCommentAuthorPhoneMasked?: string
}

export type SupportRequestAnalytics = {
  totalRequests: number
  totalRequestedAmount: string
  totalBaseAmount: string
  totalSponsoredAmount: string
  pendingCount: number
  activeCount: number
  fundedCount: number
  completedCount: number
  cancelledCount: number
  statusTotals: { status: string; count: number; amount: string }[]
}

export async function listSupportRequests(params: { status?: string; createdFrom?: string; createdTo?: string; page?: number; size?: number }) {
  const res = await api.get<Page<SupportRequest>>('/api/support-requests', { params })
  return res.data
}

export async function getSupportRequestAnalytics(params: { status?: string; createdFrom?: string; createdTo?: string }) {
  const res = await api.get<SupportRequestAnalytics>('/api/support-requests/analytics', { params })
  return res.data
}

export async function getSupportRequest(id: number) {
  const res = await api.get<SupportRequest>(`/api/support-requests/${id}`)
  return res.data
}

export type SupportRequestPayment = {
  id: number
  amount: string
  status: string
  method?: string
  sponsorPhoneNumber?: string
  createdAt?: string
  providerReference?: string
  paymentType?: 'BASE' | 'SPONSOR' | string
  source?: string
  manual?: boolean
}

export async function listSupportRequestPayments(id: number, params: { page?: number; size?: number } = {}) {
  const res = await api.get<Page<SupportRequestPayment>>(`/api/support-requests/${id}/payments`, { params })
  return res.data
}

export async function listSupportRequestComments(id: number, params: { page?: number; size?: number } = {}) {
  const res = await api.get<Page<SupportRequestComment>>(`/api/support-requests/${id}/comments`, { params })
  return res.data
}

export async function deleteSupportRequestComment(id: number, commentId: number) {
  await api.delete(`/api/support-requests/${id}/comments/${commentId}`)
}

export type ManualPaymentConfirmPayload = {
  payerPhoneNumber: string
  amount: number
  method: string
  paymentType?: 'BASE' | 'SPONSOR'
  providerReference: string
  reason: string
  paidAt?: string
}

export async function manualConfirmSupportRequestPayment(id: number, payload: ManualPaymentConfirmPayload) {
  const res = await api.post(`/api/support-requests/${id}/payments/manual-confirm`, payload)
  return res.data
}

export type SponsorSummary = { phone: string; amount: number }

export async function listSupportRequestSponsors(id: number): Promise<SponsorSummary[]> {
  try {
    const res = await api.get<any[]>(`/api/support-requests/${id}/sponsors`)
    return (Array.isArray(res.data) ? res.data : [])
      .map((s) => ({
        phone: s?.phoneNumber || s?.phone || s?.sponsorPhoneNumber,
        amount: Number(s?.amount || 0),
      }))
      .filter((x) => !!x.phone)
  } catch {
    return []
  }
}
