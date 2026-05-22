import { useState } from 'react'
import { api } from '../api/client'
import { useNavigate } from 'react-router-dom'
import Input from '../components/ui/input'
import Button from '../components/ui/button'

function isAdminToken(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return String(payload?.role || '').toUpperCase() === 'ADMIN'
  } catch {
    return false
  }
}

export default function Login() {
  const navigate = useNavigate()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requestOtp = async () => {
    setLoading(true)
    setError('')
    try {
      await api.post('/api/auth/otp/request', { phoneNumber })
      setStep('verify')
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to request OTP')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/auth/otp/verify-admin', { phoneNumber, otp })
      const token = res.data?.token
      if (token) {
        if (!isAdminToken(token)) {
          localStorage.removeItem('token')
          setError('Admin access required')
          return
        }
        localStorage.setItem('token', token)
        navigate('/')
      } else {
        setError('Invalid response')
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to verify OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card w-full max-w-md rounded-lg border border-border shadow-sm p-6">
        <h1 className="text-xl font-semibold mb-4">Admin Login</h1>
        {error && <div className="mb-3 p-2 text-sm rounded bg-destructive text-destructive-foreground/90">{error}</div>}
        <div className="space-y-3">
          <Input
            placeholder="Phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={step === 'verify'}
          />
          {step === 'verify' && (
            <Input
              placeholder="OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          )}
          <Button
            onClick={step === 'request' ? requestOtp : verifyOtp}
            disabled={loading}
          >
            {loading ? 'Please wait…' : step === 'request' ? 'Request OTP' : 'Verify OTP'}
          </Button>
          <div className="pt-2 text-center text-xs text-foreground/70">
            <a href="/delete-profile" className="underline text-primary">Delete Profile</a>
          </div>
        </div>
      </div>
    </div>
  )
}
