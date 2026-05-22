import { api, Page } from './client'

export type Withdrawal = {
  id: number
  amount: string
  serviceFeePercent?: string
  serviceFeeAmount?: string
  disbursementAmount?: string
  phoneNumber: string
  paymentMethod: string
  status: string
  createdAt?: string
  approvedAt?: string
  approvedByUserId?: number
  approvedByName?: string
  approvedByPhoneNumber?: string
  reason?: string
  transactions?: {
    transactionId: string
    airtelMoneyId: string
    status: string
    amount: number
    createdAt: string
    message?: string
  }[]
}

export type WithdrawalAnalytics = {
  totalWithdrawals: number
  totalRequestedAmount: string
  totalServiceFeeAmount: string
  totalDisbursementAmount: string
  pendingCount: number
  paidCount: number
  rejectedCount: number
  failedCount: number
  statusTotals: { status: string; count: number; amount: string }[]
  approverTotals: {
    approverUserId?: number
    approverName?: string
    approverPhoneNumber?: string
    approvedCount: number
    totalApprovedAmount: string
    totalApprovedDisbursementAmount: string
  }[]
}

export async function listWithdrawals(params: { status?: string; createdFrom?: string; createdTo?: string; page?: number; size?: number }) {
  const res = await api.get<Page<Withdrawal>>('/api/withdrawals', { params })
  return res.data
}

export async function getWithdrawalAnalytics(params: { status?: string; createdFrom?: string; createdTo?: string }) {
  const res = await api.get<WithdrawalAnalytics>('/api/withdrawals/analytics', { params })
  return res.data
}

export async function updateWithdrawalStatus(id: number, status: string, reason?: string) {
  const token = localStorage.getItem('token')
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined
  const res = await api.put<Withdrawal>(`/api/withdrawals/${id}/status`, undefined, { params: { status, reason }, headers })
  return res.data
}

export async function disburseAirtel(data: { phoneNumber: string; amount: number; reference: string }) {
  const token = localStorage.getItem('token')
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined
  const res = await api.post('/api/airtel/disburse', data, { headers })
  return res.data
}

export async function disburseTigo(data: { phoneNumber: string; amount: number; referenceId: string; firstName?: string; lastName?: string }) {
  const token = localStorage.getItem('token')
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined
  const res = await api.post('/api/tigo/disburse', data, { headers })
  return res.data
}
