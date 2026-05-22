import { api, Page } from './client'

export type SupportSponsorship = {
  id: number
  supportRequestId: number
  supportRequestName?: string
  supportRequestStatus?: string
  initiatorPhoneNumber?: string
  initiatorName?: string
  amount: string
  sponsorType: string
  sponsorUserId?: number
  sponsorUserPhoneNumber?: string
  sponsorUserName?: string
  sponsorBusinessId?: number
  sponsorBusinessName?: string
  pendingSponsorshipId?: number
  createdAt?: string
}

export type PendingSponsorship = {
  id: number
  amount: string
  status: string
  sponsorUserPhoneNumber?: string
  sponsorUserName?: string
  sponsorBusinessId?: number
  sponsorBusinessName?: string
  sourceSupportSponsorshipId?: number
  reservedRequestId?: number
  usedByRequestId?: number
  expiresAt?: string
  createdAt?: string
  updatedAt?: string
}

export type SupportSponsorshipAnalytics = {
  totalSponsorships: number
  totalAmount: string
  userSponsorCount: number
  businessSponsorCount: number
  topSponsors: {
    sponsorKey: string
    sponsorLabel?: string
    sponsorPhoneNumber?: string
    sponsorType?: string
    sponsorshipCount: number
    totalAmount: string
  }[]
}

export async function listSupportSponsorships(params: {
  sponsorPhoneNumber?: string
  initiatorPhoneNumber?: string
  supportRequestId?: number
  sponsorType?: string
  minAmount?: number
  maxAmount?: number
  createdFrom?: string
  createdTo?: string
  page?: number
  size?: number
}) {
  const res = await api.get<Page<SupportSponsorship>>('/api/support-sponsorships', { params })
  return res.data
}

export async function getSupportSponsorshipAnalytics(params: {
  sponsorPhoneNumber?: string
  initiatorPhoneNumber?: string
  supportRequestId?: number
  sponsorType?: string
  minAmount?: number
  maxAmount?: number
  createdFrom?: string
  createdTo?: string
}) {
  const res = await api.get<SupportSponsorshipAnalytics>('/api/support-sponsorships/analytics', { params })
  return res.data
}

export async function listPendingSponsorships(params: {
  status?: string
  sponsorPhoneNumber?: string
  createdFrom?: string
  createdTo?: string
  page?: number
  size?: number
}) {
  const res = await api.get<Page<PendingSponsorship>>('/api/support-sponsorships/pending', { params })
  return res.data
}
