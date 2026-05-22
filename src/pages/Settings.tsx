import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import Input from '../components/ui/input'
import Button from '../components/ui/button'
import {
  getBusinessSupportMaxAmount,
  getBusinessSupportMinAmount,
  getMaxRequestAmount,
  getMinRequestAmount,
  getWithdrawFeePercent,
  getWithdrawMaxAmount,
  getWithdrawMinAmount,
  setBusinessSupportMaxAmount,
  setBusinessSupportMinAmount,
  setMaxRequestAmount,
  setMinRequestAmount,
  setWithdrawFeePercent,
  setWithdrawMaxAmount,
  setWithdrawMinAmount,
} from '../api/config'
import { hasPermission } from '../lib/auth'

export default function Settings() {
  const canUpdateConfig = hasPermission('CONFIG_UPDATE')
  const [currentMax, setCurrentMax] = useState<number | null>(null)
  const [value, setValue] = useState<string>('')
  const [currentMin, setCurrentMin] = useState<number | null>(null)
  const [minValue, setMinValue] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [error, setError] = useState<string>('')

  const [wdMin, setWdMin] = useState<string>('')
  const [wdMax, setWdMax] = useState<string>('')
  const [wdFee, setWdFee] = useState<string>('')
  const [wdCurrentMin, setWdCurrentMin] = useState<number | null>(null)
  const [wdCurrentMax, setWdCurrentMax] = useState<number | null>(null)
  const [wdCurrentFee, setWdCurrentFee] = useState<number | null>(null)
  const [bizMin, setBizMin] = useState<string>('')
  const [bizMax, setBizMax] = useState<string>('')
  const [bizCurrentMin, setBizCurrentMin] = useState<number | null>(null)
  const [bizCurrentMax, setBizCurrentMax] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setMessage('')
      setError('')
      try {
        const v = await getMaxRequestAmount()
        setCurrentMax(v)
        setValue(v != null ? String(v) : '')
        const mv = await getMinRequestAmount()
        setCurrentMin(mv)
        setMinValue(String(mv))

        const wMin = await getWithdrawMinAmount()
        const wMax = await getWithdrawMaxAmount()
        const wFee = await getWithdrawFeePercent()
        setWdCurrentMin(wMin)
        setWdCurrentMax(wMax)
        setWdCurrentFee(wFee)
        setWdMin(wMin != null ? String(wMin) : '')
        setWdMax(wMax != null ? String(wMax) : '')
        setWdFee(String(wFee))

        const bMin = await getBusinessSupportMinAmount()
        const bMax = await getBusinessSupportMaxAmount()
        setBizCurrentMin(bMin)
        setBizCurrentMax(bMax)
        setBizMin(String(bMin))
        setBizMax(bMax != null ? String(bMax) : '')
      } catch {
        setError('Failed to load current value')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const onSave = async () => {
    if (!canUpdateConfig) {
      setError('You do not have permission to update configuration')
      return
    }
    setSaving(true)
    setMessage('')
    setError('')
    const n = Number(value)
    if (!Number.isFinite(n) || n <= 0) {
      setError('Enter a valid positive amount')
      setSaving(false)
      return
    }
    const mn = Number(minValue)
    if (!Number.isFinite(mn) || mn <= 0) {
      setError('Enter a valid positive minimum')
      setSaving(false)
      return
    }
    try {
      const updated = await setMaxRequestAmount(n)
      setCurrentMax(updated)
      const updatedMin = await setMinRequestAmount(mn)
      setCurrentMin(updatedMin)
      setMessage('Updated successfully')
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const onSaveWithdraw = async () => {
    if (!canUpdateConfig) {
      setError('You do not have permission to update configuration')
      return
    }
    setSaving(true)
    setMessage('')
    setError('')
    const mMin = wdMin.trim() === '' ? null : Number(wdMin)
    const mMax = wdMax.trim() === '' ? null : Number(wdMax)
    const fee = Number(wdFee)
    if (mMin != null && (!Number.isFinite(mMin) || mMin <= 0)) {
      setError('Enter a valid positive withdraw minimum or leave empty')
      setSaving(false)
      return
    }
    if (mMax != null && (!Number.isFinite(mMax) || mMax <= 0)) {
      setError('Enter a valid positive withdraw maximum or leave empty')
      setSaving(false)
      return
    }
    if (!Number.isFinite(fee) || fee < 0) {
      setError('Enter a valid fee percent')
      setSaving(false)
      return
    }
    try {
      if (mMin != null) {
        const updated = await setWithdrawMinAmount(mMin)
        setWdCurrentMin(updated)
      } else {
        await setWithdrawMinAmount(0)
        setWdCurrentMin(null)
        setWdMin('')
      }
      if (mMax != null) {
        const updated = await setWithdrawMaxAmount(mMax)
        setWdCurrentMax(updated)
      } else {
        await setWithdrawMaxAmount(0)
        setWdCurrentMax(null)
        setWdMax('')
      }
      const updatedFee = await setWithdrawFeePercent(fee)
      setWdCurrentFee(updatedFee)
      setMessage('Withdraw settings updated')
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update withdraw settings')
    } finally {
      setSaving(false)
    }
  }

  const onSaveBusinessSupport = async () => {
    if (!canUpdateConfig) {
      setError('You do not have permission to update configuration')
      return
    }
    setSaving(true)
    setMessage('')
    setError('')
    const min = Number(bizMin)
    const max = bizMax.trim() === '' ? null : Number(bizMax)
    if (!Number.isFinite(min) || min < 0) {
      setError('Enter a valid business support minimum')
      setSaving(false)
      return
    }
    if (max != null && (!Number.isFinite(max) || max <= 0)) {
      setError('Enter a valid positive business support maximum or leave empty')
      setSaving(false)
      return
    }
    if (max != null && min > max) {
      setError('Business support minimum cannot be greater than maximum')
      setSaving(false)
      return
    }
    try {
      const updatedMin = await setBusinessSupportMinAmount(min)
      setBizCurrentMin(updatedMin)
      if (max != null) {
        const updatedMax = await setBusinessSupportMaxAmount(max)
        setBizCurrentMax(updatedMax)
      } else {
        await setBusinessSupportMaxAmount(0)
        setBizCurrentMax(null)
        setBizMax('')
      }
      setMessage('Business support limits updated')
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update business support limits')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Settings</h1>
      <Card className="max-w-xl">
        <CardHeader>
          <div className="text-sm text-muted-foreground">Support Request Amount Limits</div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm">Current Min: {loading ? 'Loading…' : currentMin != null ? `TZS ${currentMin}` : 'TZS 2000 (default)'}</div>
            <div className="text-sm">Current Max: {loading ? 'Loading…' : currentMax != null ? `TZS ${currentMax}` : 'Not set'}</div>
            <Input
              type="number"
              placeholder="Enter min amount (TZS)"
              value={minValue}
              onChange={(e) => setMinValue(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Enter max amount (TZS)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button onClick={onSave} disabled={saving || !canUpdateConfig}>{saving ? 'Saving…' : 'Save'}</Button>
              {message && <div className="text-sm text-green-600">{message}</div>}
              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="h-6" />
      <Card className="max-w-xl">
        <CardHeader>
          <div className="text-sm text-muted-foreground">Withdraw Settings</div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm">Current Min: {loading ? 'Loading…' : wdCurrentMin != null ? `TZS ${wdCurrentMin}` : 'Not set'}</div>
            <div className="text-sm">Current Max: {loading ? 'Loading…' : wdCurrentMax != null ? `TZS ${wdCurrentMax}` : 'Not set'}</div>
            <div className="text-sm">Service Fee: {loading ? 'Loading…' : wdCurrentFee != null ? `${wdCurrentFee}%` : '4.2% (default)'}</div>
            <Input
              type="number"
              placeholder="Withdraw min amount (TZS)"
              value={wdMin}
              onChange={(e) => setWdMin(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Withdraw max amount (TZS)"
              value={wdMax}
              onChange={(e) => setWdMax(e.target.value)}
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Service fee percent (e.g., 4.2)"
              value={wdFee}
              onChange={(e) => setWdFee(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button onClick={onSaveWithdraw} disabled={saving || !canUpdateConfig}>{saving ? 'Saving…' : 'Save Withdraw Settings'}</Button>
              {message && <div className="text-sm text-green-600">{message}</div>}
              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="h-6" />
      <Card className="max-w-xl">
        <CardHeader>
          <div className="text-sm text-muted-foreground">Business Support Amount Limits</div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm">Current Min: {loading ? 'Loading…' : `TZS ${bizCurrentMin ?? 0}`}</div>
            <div className="text-sm">Current Max: {loading ? 'Loading…' : bizCurrentMax != null ? `TZS ${bizCurrentMax}` : 'Not set'}</div>
            <div className="text-xs text-muted-foreground">
              Applies to business profile creation and updates in the app for Minimum Support Amount and Maximum Support Amount.
            </div>
            <Input
              type="number"
              placeholder="Business support minimum amount (TZS)"
              value={bizMin}
              onChange={(e) => setBizMin(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Business support maximum amount (TZS)"
              value={bizMax}
              onChange={(e) => setBizMax(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button onClick={onSaveBusinessSupport} disabled={saving || !canUpdateConfig}>{saving ? 'Saving…' : 'Save Business Support Limits'}</Button>
              {message && <div className="text-sm text-green-600">{message}</div>}
              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
