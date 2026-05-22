import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import Button from '../components/ui/button'
import Input from '../components/ui/input'
import Badge from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Modal } from '../components/ui/modal'
import {
  AdminPermission,
  AdminRole,
  createAdminRole,
  deleteAdminRole,
  listAdminPermissions,
  listAdminRoles,
  updateAdminRole,
} from '../api/admin'
import { hasPermission } from '../lib/auth'

export default function Roles() {
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [permissions, setPermissions] = useState<AdminPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdminRole | null>(null)
  const [form, setForm] = useState({ name: '', label: '', description: '', permissionKeys: [] as string[] })

  const canCreate = hasPermission('ROLE_CREATE')
  const canUpdate = hasPermission('ROLE_UPDATE') && hasPermission('ROLE_PERMISSION_ASSIGN')
  const canDelete = hasPermission('ROLE_DELETE')

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, AdminPermission[]>>((acc, permission) => {
      acc[permission.category] = acc[permission.category] || []
      acc[permission.category].push(permission)
      return acc
    }, {})
  }, [permissions])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [roleRows, permissionRows] = await Promise.all([listAdminRoles(), listAdminPermissions()])
      setRoles(roleRows)
      setPermissions(permissionRows)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', label: '', description: '', permissionKeys: ['ADMIN_ACCESS', 'DASHBOARD_READ'] })
    setModalOpen(true)
  }

  const openEdit = (role: AdminRole) => {
    setEditing(role)
    setForm({
      name: role.name,
      label: role.label,
      description: role.description || '',
      permissionKeys: role.permissionKeys || [],
    })
    setModalOpen(true)
  }

  const togglePermission = (key: string) => {
    const current = new Set(form.permissionKeys)
    current.has(key) ? current.delete(key) : current.add(key)
    setForm({ ...form, permissionKeys: Array.from(current) })
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await updateAdminRole(editing.id, {
          label: form.label,
          description: form.description,
          permissionKeys: form.permissionKeys,
        })
      } else {
        await createAdminRole(form)
      }
      setModalOpen(false)
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save role')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (role: AdminRole) => {
    if (role.name === 'SUPER_ADMIN') {
      setError('SUPER_ADMIN cannot be deleted.')
      return
    }
    const assignedText = role.userCount > 0 ? ` This will remove it from ${role.userCount} user(s).` : ''
    if (!confirm(`Delete role ${role.label}?${assignedText}`)) return
    setError('')
    try {
      await deleteAdminRole(role.id)
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to delete role')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">Create custom dashboard roles and assign seeded backend permissions.</p>
        </div>
        {canCreate && <Button onClick={openCreate}>Create Role</Button>}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent><div className="text-sm text-muted-foreground">Roles</div><div className="text-2xl font-semibold">{roles.length}</div></CardContent></Card>
        <Card><CardContent><div className="text-sm text-muted-foreground">Permissions</div><div className="text-2xl font-semibold">{permissions.length}</div></CardContent></Card>
        <Card><CardContent><div className="text-sm text-muted-foreground">Protected Roles</div><div className="text-2xl font-semibold">{roles.filter((r) => r.name === 'SUPER_ADMIN').length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="font-medium">Role Catalog</div>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5}>Loading roles...</TableCell></TableRow>
                ) : roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="font-medium">{role.label}</div>
                      <div className="text-xs text-muted-foreground">{role.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-xl flex-wrap gap-1">
                        {role.permissionKeys.slice(0, 8).map((key) => <Badge key={key} variant="secondary">{key}</Badge>)}
                        {role.permissionKeys.length > 8 && <Badge>+{role.permissionKeys.length - 8}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{role.userCount}</TableCell>
                    <TableCell><Badge variant={role.systemRole ? 'secondary' : 'default'}>{role.systemRole ? 'System' : 'Custom'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && <Button size="sm" variant="outline" onClick={() => openEdit(role)}>Edit</Button>}
                        {canDelete && role.name !== 'SUPER_ADMIN' && <Button size="sm" variant="destructive" onClick={() => remove(role)}>Delete</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Role' : 'Create Role'} className="max-w-4xl">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Role key, e.g. OPERATIONS_LEAD" value={form.name} disabled={!!editing} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Display label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-2">
            {Object.entries(groupedPermissions).map(([category, items]) => (
              <div key={category} className="rounded-lg border border-border">
                <div className="border-b border-border bg-muted/50 px-3 py-2 text-sm font-medium">{category}</div>
                <div className="grid gap-2 p-3 md:grid-cols-2">
                  {items.map((permission) => (
                    <label key={permission.id} className="flex items-start gap-2 rounded-md p-2 text-sm hover:bg-muted/60">
                      <input type="checkbox" checked={form.permissionKeys.includes(permission.key)} onChange={() => togglePermission(permission.key)} />
                      <span>
                        <span className="block font-medium">{permission.label}</span>
                        <span className="block text-xs text-muted-foreground">{permission.key}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Role'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
