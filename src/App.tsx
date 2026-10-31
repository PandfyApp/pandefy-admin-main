import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import Requests from './pages/Requests'
import Withdrawals from './pages/Withdrawals'
import RequestDetails from './pages/RequestDetails'
import Layout from './components/Layout'
import DeleteProfile from './pages/DeleteProfile'
import SafetyStandards from './pages/SafetyStandards'
import Settings from './pages/Settings'
import BusinessProfiles from './pages/BusinessProfiles'
import Users from './pages/Users'
import Roles from './pages/Roles'
import Messaging from './pages/Messaging'
import { hasAdminAccess, hasPermission } from './lib/auth'

function isAdminToken(token: string | null) {
  if (!token) return false
  return hasAdminAccess()
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('token')
  if (!isAdminToken(token)) {
    localStorage.removeItem('token')
    return <Navigate to="/login" replace />
  }
  return children
}

function Forbidden() {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h1 className="text-xl font-semibold">Access restricted</h1>
      <p className="mt-2 text-sm text-muted-foreground">Your dashboard role does not include permission to use this section.</p>
    </div>
  )
}

function RequirePermission({ permission, children }: { permission: string; children: JSX.Element }) {
  return hasPermission(permission) ? children : <Forbidden />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/delete-profile" element={<DeleteProfile />} />
      <Route path="/safety-standards" element={<SafetyStandards />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<RequirePermission permission="DASHBOARD_READ"><Home /></RequirePermission>} />
        <Route path="requests" element={<RequirePermission permission="SUPPORT_READ"><Requests /></RequirePermission>} />
        <Route path="requests/:id" element={<RequirePermission permission="SUPPORT_READ"><RequestDetails /></RequirePermission>} />
        <Route path="withdrawals" element={<RequirePermission permission="WITHDRAWAL_READ"><Withdrawals /></RequirePermission>} />
        <Route path="business-profiles" element={<RequirePermission permission="BUSINESS_READ"><BusinessProfiles /></RequirePermission>} />
        <Route path="users" element={<RequirePermission permission="USER_READ"><Users /></RequirePermission>} />
        <Route path="messaging" element={<RequirePermission permission="MESSAGE_READ"><Messaging /></RequirePermission>} />
        <Route path="roles" element={<RequirePermission permission="ROLE_READ"><Roles /></RequirePermission>} />
        <Route path="settings" element={<RequirePermission permission="CONFIG_READ"><Settings /></RequirePermission>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
