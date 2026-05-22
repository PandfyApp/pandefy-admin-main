export function tokenPayload() {
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export function hasPermission(permission: string) {
  const payload = tokenPayload()
  const permissions = Array.isArray(payload?.permissions) ? payload.permissions : []
  return permissions.includes(permission)
}

export function hasRole(role: string) {
  const payload = tokenPayload()
  const roles = Array.isArray(payload?.roles) ? payload.roles : []
  return roles.includes(role)
}

export function hasAdminAccess() {
  const payload = tokenPayload()
  if (!payload) return false
  return String(payload?.role || '').toUpperCase() === 'ADMIN'
    || hasPermission('ADMIN_ACCESS')
    || hasRole('SUPER_ADMIN')
    || hasRole('ADMIN')
}

/** Any admin-portal feature that should not require per-feature RBAC setup */
export function canAccessAdminFeature(optionalPermission?: string) {
  if (!optionalPermission) {
    return hasAdminAccess()
  }
  return hasAdminAccess() || hasPermission(optionalPermission)
}

/** @deprecated use canAccessAdminFeature */
export function canViewSupport() {
  return canAccessAdminFeature()
}
