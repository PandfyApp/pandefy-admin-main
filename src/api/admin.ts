import { api, Page } from './client'

export type AdminPermission = {
  id: number
  key: string
  label: string
  category: string
  description?: string
}

export type AdminRole = {
  id: number
  name: string
  label: string
  description?: string
  systemRole: boolean
  permissionKeys: string[]
  userCount: number
}

export type AdminUser = {
  id: number
  phoneNumber: string
  name?: string
  email?: string
  country?: string
  language?: string
  currency?: string
  type?: string
  legacyRole?: string
  deleted: boolean
  createdAt?: string
  roles: string[]
  permissions: string[]
}

export type AdminUserDeleteImpact = {
  userId: number
  phoneNumber: string
  name?: string
  alreadyDeleted: boolean
  hardDelete: boolean
  roleCount: number
  supportRequestsCreated: number
  sponsorshipsMade: number
  withdrawalsCreated: number
  ownsBusinessProfile: boolean
  catalogsOwned: number
  warnings: string[]
}

export type AdminUserPayload = {
  phoneNumber?: string
  name?: string
  email?: string
  country?: string
  language?: string
  currency?: string
  type?: string
  roles?: string[]
}

export async function listAdminUsers(params: { search?: string; role?: string; includeDeleted?: boolean; includeAppUsers?: boolean; page?: number; size?: number }) {
  const { data } = await api.get<Page<AdminUser>>('/api/admin/users', { params })
  return data
}

export async function createAdminUser(payload: AdminUserPayload) {
  const { data } = await api.post<AdminUser>('/api/admin/users', payload)
  return data
}

export async function updateAdminUser(id: number, payload: AdminUserPayload) {
  const { data } = await api.put<AdminUser>(`/api/admin/users/${id}`, payload)
  return data
}

export async function assignAdminUserRoles(id: number, roles: string[]) {
  const { data } = await api.patch<AdminUser>(`/api/admin/users/${id}/roles`, { roles })
  return data
}

export async function setAdminUserDeleted(id: number, deleted: boolean) {
  const { data } = await api.patch<AdminUser>(`/api/admin/users/${id}/status`, { deleted })
  return data
}

export async function getAdminUserDeleteImpact(id: number) {
  const { data } = await api.get<AdminUserDeleteImpact>(`/api/admin/users/${id}/delete-impact`)
  return data
}

export async function deleteAdminUser(id: number) {
  await api.delete(`/api/admin/users/${id}`)
}

export async function listAdminRoles() {
  const { data } = await api.get<AdminRole[]>('/api/admin/roles')
  return data
}

export async function createAdminRole(payload: { name: string; label: string; description?: string; permissionKeys: string[] }) {
  const { data } = await api.post<AdminRole>('/api/admin/roles', payload)
  return data
}

export async function updateAdminRole(id: number, payload: { label: string; description?: string; permissionKeys: string[] }) {
  const { data } = await api.put<AdminRole>(`/api/admin/roles/${id}`, payload)
  return data
}

export async function deleteAdminRole(id: number) {
  await api.delete(`/api/admin/roles/${id}`)
}

export async function listAdminPermissions() {
  const { data } = await api.get<AdminPermission[]>('/api/admin/permissions')
  return data
}
