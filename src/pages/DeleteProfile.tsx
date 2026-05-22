import { useState } from 'react'
import Button from '../components/ui/button'
import Input from '../components/ui/input'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export default function DeleteProfile() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'request' | 'verify' | 'done'>('request')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const requestOtp = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await api.post('/api/users/delete/otp/request', { phoneNumber })
      setStep('verify')
      setMessage('OTP sent to your phone')
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const verifyDelete = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await api.post('/api/users/delete/otp/verify', { phoneNumber, otp })
      setStep('done')
      setMessage('Your account has been scheduled for deletion')
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to delete account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card w-full max-w-2xl rounded-lg border border-border shadow-sm p-6">
        <h1 className="text-2xl font-semibold mb-3">Delete your Pandefy profile</h1>
        <p className="text-sm text-foreground/80 mb-4">
        </p>

        {error && <div className="mb-3 p-2 text-sm rounded bg-destructive text-destructive-foreground/90">{error}</div>}
        {message && <div className="mb-3 p-2 text-sm rounded bg-muted text-foreground/80">{message}</div>}

        <div className="space-y-4">
          <div className="rounded-md border border-border p-4">
            <h2 className="text-lg font-semibold mb-2">Delete via OTP</h2>
            <div className="space-y-3">
              <Input placeholder="Phone number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} disabled={step !== 'request'} />
              {step === 'verify' && (
                <Input placeholder="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
              )}
              <Button onClick={step === 'request' ? requestOtp : verifyDelete} disabled={loading}>
                {loading ? 'Please wait…' : step === 'request' ? 'Send OTP' : 'Delete account'}
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-border p-4">
            <h2 className="text-lg font-semibold mb-2">Email option</h2>
            <p className="text-sm text-foreground/80 mb-3">Send us a data deletion request, and our team will process it promptly.</p>
            <a className="inline-block" href="mailto:info@pandefy.com?subject=Delete%20my%20Pandefy%20account">
              <Button>Email info@pandefy.com</Button>
            </a>
          </div>

          <div className="text-sm text-foreground/60">
            <p>
              If you cannot access your phone number, use the email option above. We may contact you to confirm ownership before completing deletion.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
          </div>
        </div>
      </div>
    </div>
  )
}
