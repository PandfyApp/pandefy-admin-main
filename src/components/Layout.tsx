import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import Button from './ui/button'
import { canAccessAdminFeature, hasPermission } from '../lib/auth'

export default function Layout() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null)
  const logout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  useEffect(() => {
    const t = localStorage.getItem('theme')
    const d = t ? t === 'dark' : true
    setTheme(d ? 'dark' : 'light')
  }, [])

  useEffect(() => {
    if (!theme) return
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  const canSeeDashboard = hasPermission('DASHBOARD_READ')
  const canSeeSupport = canAccessAdminFeature()
  const canSeeWithdrawals = hasPermission('WITHDRAWAL_READ')
  const canSeeBusiness = hasPermission('BUSINESS_READ')
  const canSeeUsers = hasPermission('USER_READ')
  const canSeeRoles = hasPermission('ROLE_READ')
  const canSeeSettings = hasPermission('CONFIG_READ')

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="flex w-64 flex-col border-r border-border bg-card">
        <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
          <Link to="/" className="font-bold">Pandefy Admin</Link>
        </div>
        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {canSeeDashboard && <NavLink to="/" end className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'bg-muted text-foreground' : 'text-foreground/80 hover:bg-muted'}`}>Home</NavLink>}
          {canSeeSupport && <NavLink to="/requests" className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'bg-muted text-foreground' : 'text-foreground/80 hover:bg-muted'}`}>Requests</NavLink>}
          {canSeeSupport && <NavLink to="/sponsors" className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'bg-muted text-foreground' : 'text-foreground/80 hover:bg-muted'}`}>Supporters & Sponsors</NavLink>}
          {canSeeWithdrawals && <NavLink to="/withdrawals" className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'bg-muted text-foreground' : 'text-foreground/80 hover:bg-muted'}`}>Withdrawals</NavLink>}
          {canSeeBusiness && <NavLink to="/business-profiles" className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'bg-muted text-foreground' : 'text-foreground/80 hover:bg-muted'}`}>Business Profiles</NavLink>}
          {canSeeUsers && <NavLink to="/users" className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'bg-muted text-foreground' : 'text-foreground/80 hover:bg-muted'}`}>Users</NavLink>}
          {canSeeRoles && <NavLink to="/roles" className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'bg-muted text-foreground' : 'text-foreground/80 hover:bg-muted'}`}>Roles & Permissions</NavLink>}
          <NavLink to="/delete-profile" className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'bg-muted text-foreground' : 'text-foreground/80 hover:bg-muted'}`}>Delete Profile</NavLink>
          <NavLink to="/safety-standards" className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'bg-muted text-foreground' : 'text-foreground/80 hover:bg-muted'}`}>Safety Standards</NavLink>
          {canSeeSettings && <NavLink to="/settings" className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'bg-muted text-foreground' : 'text-foreground/80 hover:bg-muted'}`}>Settings</NavLink>}
        </nav>
      </aside>
      <main className="flex-1">
        <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6">
          <div className="font-semibold">Dashboard</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleTheme} className="h-9 w-9 p-0">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="secondary" onClick={logout}>Logout</Button>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
