import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import Button from '../components/ui/button'
import Input from '../components/ui/input'
import Badge from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Modal } from '../components/ui/modal'
import {
  AdminRole,
  AdminUser,
  AdminUserDeleteImpact,
  AdminUserPayload,
  createAdminUser,
  deleteAdminUser,
  getAdminUserDeleteImpact,
  listAdminRoles,
  listAdminUsers,
  setAdminUserDeleted,
  updateAdminUser,
} from '../api/admin'
import { hasPermission } from '../lib/auth'

const emptyForm: AdminUserPayload = {
  phoneNumber: '',
  name: '',
  email: '',
  country: 'TZ',
  language: 'en',
  currency: 'TZS',
  type: 'PERSONAL',
  roles: ['VIEWER'],
}

export default function Users() {
  const [searchParams] = useSearchParams()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [includeDeleted, setIncludeDeleted] = useState(searchParams.get('includeDeleted') === 'true')
  const [includeAppUsers, setIncludeAppUsers] = useState(searchParams.get('includeAppUsers') === 'true')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<AdminUserPayload>(emptyForm)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleteImpact, setDeleteImpact] = useState<AdminUserDeleteImpact | null>(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const canCreate = hasPermission('USER_CREATE')
  const canUpdate = hasPermission('USER_UPDATE')
  const canDelete = hasPermission('USER_DELETE')

  const activeUsers = useMemo(() => users.filter((u) => !u.deleted).length, [users])
  const adminUsers = useMemo(() => users.filter((u) => u.permissions?.includes('ADMIN_ACCESS') && !u.deleted).length, [users])
  const appUsers = useMemo(() => users.filter((u) => !u.permissions?.includes('ADMIN_ACCESS') && !u.deleted).length, [users])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [roleRows, page] = await Promise.all([
        listAdminRoles(),
        listAdminUsers({ search, role: roleFilter || undefined, includeDeleted, includeAppUsers, size: 100 }),
      ])
      setRoles(roleRows)
      setUsers(page.content)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [roleFilter, includeDeleted, includeAppUsers])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setModalOpen(true)
  }

  const openEdit = (user: AdminUser) => {
    setEditing(user)
    setForm({
      phoneNumber: user.phoneNumber,
      name: user.name || '',
      email: user.email || '',
      country: user.country || 'TZ',
      language: user.language || 'en',
      currency: user.currency || 'TZS',
      type: user.type || 'PERSONAL',
      roles: user.roles || [],
    })
    setModalOpen(true)
  }

  const toggleRole = (roleName: string) => {
    const current = new Set(form.roles || [])
    current.has(roleName) ? current.delete(roleName) : current.add(roleName)
    setForm({ ...form, roles: Array.from(current) })
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await updateAdminUser(editing.id, form)
      } else {
        await createAdminUser(form)
      }
      setModalOpen(false)
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const toggleDeleted = async (user: AdminUser) => {
    setError('')
    try {
      await setAdminUserDeleted(user.id, !user.deleted)
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update user status')
    }
  }

  const openDeleteModal = async (user: AdminUser) => {
    setDeleteTarget(user)
    setDeleteImpact(null)
    setDeleteConfirmInput('')
    setDeleteLoading(true)
    setDeleteModalOpen(true)
    try {
      const impact = await getAdminUserDeleteImpact(user.id)
      setDeleteImpact(impact)
    } catch (e: any) {
      setDeleteModalOpen(false)
      setDeleteTarget(null)
      setError(e?.response?.data?.message || 'Failed to load delete impact')
    } finally {
      setDeleteLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setError('')
    try {
      await deleteAdminUser(deleteTarget.id)
      setDeleteModalOpen(false)
      setDeleteTarget(null)
      setDeleteImpact(null)
      setDeleteConfirmInput('')
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to delete user')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">Create dashboard users, assign multiple roles, and optionally include normal app users.</p>
        </div>
        {canCreate && <Button onClick={openCreate}>Add User</Button>}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent><div className="text-sm text-muted-foreground">All Users</div><div className="text-2xl font-semibold">{users.length}</div></CardContent></Card>
        <Card><CardContent><div className="text-sm text-muted-foreground">Dashboard Users</div><div className="text-2xl font-semibold">{adminUsers}</div></CardContent></Card>
        <Card><CardContent><div className="text-sm text-muted-foreground">App Users</div><div className="text-2xl font-semibold">{includeAppUsers ? appUsers : 0}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto_auto_auto]">
            <Input placeholder="Search by name, email, or phone" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All roles</option>
              {roles.map((role) => <option key={role.id} value={role.name}>{role.label}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={includeAppUsers} onChange={(e) => setIncludeAppUsers(e.target.checked)} />
              Include app users
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} />
              Include inactive
            </label>
            <Button variant="outline" onClick={load}>Search</Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6}>Loading users...</TableCell></TableRow>
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={6}>No users found.</TableCell></TableRow>
                ) : users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name || 'Unnamed user'}</div>
                      <div className="text-xs text-muted-foreground">{user.email || 'No email'}</div>
                    </TableCell>
                    <TableCell>{user.phoneNumber}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles?.map((role) => <Badge key={role} variant={role === 'USER' ? 'secondary' : 'default'}>{role}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={user.deleted ? 'destructive' : 'secondary'}>{user.deleted ? 'Inactive' : 'Active'}</Badge></TableCell>
                    <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && <Button size="sm" variant="outline" onClick={() => openEdit(user)}>Edit</Button>}
                        {canDelete && user.deleted && <Button size="sm" variant="secondary" onClick={() => toggleDeleted(user)}>Restore</Button>}
                        {canDelete && !user.deleted && <Button size="sm" variant="outline" onClick={() => toggleDeleted(user)}>Deactivate</Button>}
                        {canDelete && !user.deleted && <Button size="sm" variant="destructive" onClick={() => openDeleteModal(user)}>Delete</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'Add User'} className="max-w-2xl">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Phone number" value={form.phoneNumber || ''} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
            <Input placeholder="Full name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.type || 'PERSONAL'} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="PERSONAL">Personal</option>
              <option value="BUSINESS">Business</option>
            </select>
            <Input placeholder="Country" value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            <Input placeholder="Currency" value={form.currency || ''} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">Roles</div>
            <div className="mb-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              If this phone already belongs to a normal app user, saving will upgrade that existing account with the selected dashboard role(s).
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {roles.map((role) => (
                <label key={role.id} className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
                  <input type="checkbox" checked={(form.roles || []).includes(role.name)} onChange={() => toggleRole(role.name)} />
                  <span>
                    <span className="block font-medium">{role.label}</span>
                    <span className="block text-xs text-muted-foreground">{role.description || role.name}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save User'}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={deleteModalOpen} onClose={() => !deleteLoading && setDeleteModalOpen(false)} title="Delete User" className="max-w-2xl">
        <div className="space-y-4">
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            This is a strong confirmation step. The account will be deactivated and removed from active usage flows.
          </div>

          {deleteLoading && !deleteImpact ? (
            <div className="text-sm text-muted-foreground">Loading related records...</div>
          ) : deleteTarget && deleteImpact ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <Card>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">User</div>
                    <div className="text-lg font-semibold">{deleteTarget.name || 'Unnamed user'}</div>
                    <div className="text-xs text-muted-foreground">{deleteTarget.phoneNumber}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">Current Roles</div>
                    <div className="text-lg font-semibold">{deleteImpact.roleCount}</div>
                    <div className="text-xs text-muted-foreground">{(deleteTarget.roles || []).join(', ') || 'No roles'}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Card><CardContent><div className="text-sm text-muted-foreground">Support Requests</div><div className="text-2xl font-semibold">{deleteImpact.supportRequestsCreated}</div></CardContent></Card>
                <Card><CardContent><div className="text-sm text-muted-foreground">Sponsorships</div><div className="text-2xl font-semibold">{deleteImpact.sponsorshipsMade}</div></CardContent></Card>
                <Card><CardContent><div className="text-sm text-muted-foreground">Withdrawals</div><div className="text-2xl font-semibold">{deleteImpact.withdrawalsCreated}</div></CardContent></Card>
                <Card><CardContent><div className="text-sm text-muted-foreground">Business/Catalog</div><div className="text-2xl font-semibold">{deleteImpact.catalogsOwned}</div><div className="text-xs text-muted-foreground">{deleteImpact.ownsBusinessProfile ? 'Business profile linked' : 'No business profile'}</div></CardContent></Card>
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-4">
                <div className="mb-2 text-sm font-medium">What will happen</div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {deleteImpact.warnings.map((warning, index) => (
                    <li key={`${index}-${warning}`}>- {warning}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Type <span className="font-semibold">{deleteTarget.phoneNumber}</span> to confirm deletion
                </label>
                <Input
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  placeholder={deleteTarget.phoneNumber}
                />
              </div>
            </>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={deleteLoading}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteLoading || !deleteTarget || deleteConfirmInput.trim() !== deleteTarget.phoneNumber}
            >
              {deleteLoading ? 'Deleting...' : 'Delete User'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
