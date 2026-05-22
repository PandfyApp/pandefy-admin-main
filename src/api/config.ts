import { api } from './client'

export async function getMaxRequestAmount(): Promise<number | null> {
  const res = await api.get('/api/config/max-request-amount')
  const v = res.data?.value
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export async function setMaxRequestAmount(value: number): Promise<number> {
  const res = await api.put('/api/config/max-request-amount', { value: String(value) })
  const v = res.data?.value
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : value
  }
  return value
}

export async function getMinRequestAmount(): Promise<number> {
  const res = await api.get('/api/config/min-request-amount')
  const v = res.data?.value
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 2000
  }
  return 2000
}

export async function setMinRequestAmount(value: number): Promise<number> {
  const res = await api.put('/api/config/min-request-amount', { value: String(value) })
  const v = res.data?.value
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : value
  }
  return value
}

export async function getWithdrawMinAmount(): Promise<number | null> {
  const res = await api.get('/api/config/withdraw-min-amount')
  const v = res.data?.value
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export async function setWithdrawMinAmount(value: number): Promise<number> {
  const res = await api.put('/api/config/withdraw-min-amount', { value: String(value) })
  const v = res.data?.value
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : value
  }
  return value
}

export async function getWithdrawMaxAmount(): Promise<number | null> {
  const res = await api.get('/api/config/withdraw-max-amount')
  const v = res.data?.value
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export async function setWithdrawMaxAmount(value: number): Promise<number> {
  const res = await api.put('/api/config/withdraw-max-amount', { value: String(value) })
  const v = res.data?.value
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : value
  }
  return value
}

export async function getWithdrawFeePercent(): Promise<number> {
  const res = await api.get('/api/config/withdraw-service-fee-percent')
  const v = res.data?.value
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 4.2
  }
  return 4.2
}

export async function setWithdrawFeePercent(value: number): Promise<number> {
  const res = await api.put('/api/config/withdraw-service-fee-percent', { value: String(value) })
  const v = res.data?.value
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : value
  }
  return value
}

export async function getBusinessSupportMinAmount(): Promise<number> {
  const res = await api.get('/api/config/business-support-min-amount')
  const v = res.data?.value
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

export async function setBusinessSupportMinAmount(value: number): Promise<number> {
  const res = await api.put('/api/config/business-support-min-amount', { value: String(value) })
  const v = res.data?.value
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : value
  }
  return value
}

export async function getBusinessSupportMaxAmount(): Promise<number | null> {
  const res = await api.get('/api/config/business-support-max-amount')
  const v = res.data?.value
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return null
}

export async function setBusinessSupportMaxAmount(value: number): Promise<number> {
  const res = await api.put('/api/config/business-support-max-amount', { value: String(value) })
  const v = res.data?.value
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : value
  }
  return value
}
