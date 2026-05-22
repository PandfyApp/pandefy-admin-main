import { api } from './client'

export type BusinessProfile = {
  id: number
  userPhoneNumber: string
  businessName: string
  businessCaption?: string
  logo?: string
  supportPreference: boolean
  minimumSupportAmount?: number
  maximumSupportAmount?: number
  supportGoalAmount?: number
}

export async function listBusinessProfiles(page = 0, size = 20) {
  const res = await api.get('/api/business-profiles', { params: { page, size } })
  const data = res.data ?? {}
  const content = (data.content ?? data.items ?? data.data ?? data.results) as BusinessProfile[] | undefined
  const total = (data.totalElements ?? data.total ?? data.count ?? content?.length ?? 0) as number
  return { content: content ?? [], total }
}
