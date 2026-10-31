import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '../ui/card'
import Button from '../ui/button'
import { getAdminPaymentNetworks, getPaymentNetworks, setPaymentNetwork, type AdminPaymentNetwork } from '../../api/config'
import { hasPermission } from '../../lib/auth'

export default function PaymentNetworks() {
  const canEdit=hasPermission('CONFIG_UPDATE')
  const [rows,setRows]=useState<AdminPaymentNetwork[]>([])
  const [drafts,setDrafts]=useState<Record<string,{maintenance:boolean,message:string}>>({})
  const [saving,setSaving]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [confirm,setConfirm]=useState<string|null>(null)
  const load=async()=>{
    setLoading(true);setError('')
    try {
      const data=canEdit?await getAdminPaymentNetworks():(await getPaymentNetworks()).map(network=>({network,updatedBy:null}))
      setRows(data);setDrafts(Object.fromEntries(data.map(({network:n})=>[n.method,{maintenance:n.maintenance,message:n.message}])))
    } catch {setError('Unable to load payment networks. Please retry.')}
    finally {setLoading(false)}
  }
  useEffect(()=>{load()},[])
  const save=async(method:string)=>{
    const draft=drafts[method];setSaving(true);setError('');setNotice('')
    try {const updated=await setPaymentNetwork(method,draft.maintenance,draft.message);setRows(v=>v.map(r=>r.network.method===method?updated:r));setDrafts(v=>({...v,[method]:{maintenance:updated.network.maintenance,message:updated.network.message}}));setConfirm(null);setNotice(`${updated.network.label} ${updated.network.maintenance?'maintenance enabled':'availability restored'}.`)}
    catch(e:any){setError(e?.response?.data?.message||'Unable to update payment network')}
    finally{setSaving(false)}
  }
  return <Card className="max-w-3xl mb-6"><CardHeader><h2 className="font-semibold">Payment Networks</h2><p className="text-sm text-muted-foreground">Control request and support payments. Existing payments and withdrawals continue normally.</p></CardHeader><CardContent>
    {loading&&<p>Loading payment networks…</p>}
    {error&&<div role="alert" className="text-red-600 mb-3">{error} {!rows.length&&<Button onClick={load}>Retry</Button>}</div>}
    {notice&&<p role="status" className="text-green-600 mb-3">{notice}</p>}
    <div className="space-y-5">{rows.map(({network:n,updatedBy})=>{
      const draft=drafts[n.method];if(!draft)return null
      const changed=draft.maintenance!==n.maintenance||draft.message!==n.message
      return <section key={n.method} aria-label={n.label} className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-3"><h3 className="font-medium">{n.label}</h3><span className={n.maintenance?'text-orange-600':'text-green-600'}>{n.maintenance?'Under maintenance':'Available'}</span></div>
        <label className="flex gap-2"><input type="checkbox" checked={draft.maintenance} disabled={!canEdit||saving} onChange={e=>setDrafts(v=>({...v,[n.method]:{...draft,maintenance:e.target.checked}}))}/>Maintenance</label>
        <label className="block text-sm">Message shown to users<textarea aria-label={`${n.label} message`} maxLength={500} rows={3} disabled={!canEdit||saving} value={draft.message} onChange={e=>setDrafts(v=>({...v,[n.method]:{...draft,message:e.target.value}}))} placeholder={`${n.label} is currently under maintenance. Please choose another network.`} className="block w-full mt-1 rounded-md border bg-background p-2"/></label>
        {n.updatedAt&&<p className="text-xs text-muted-foreground">Last changed {new Date(n.updatedAt).toLocaleString()}{updatedBy?` by ${updatedBy}`:''}</p>}
        {canEdit&&<div className="flex flex-wrap gap-2"><Button disabled={saving||!changed||(draft.maintenance&&!draft.message.trim())} onClick={()=>setConfirm(n.method)}>Save network</Button>{n.maintenance&&<Button variant="outline" disabled={saving} onClick={()=>{setDrafts(v=>({...v,[n.method]:{...draft,maintenance:false}}));setConfirm(n.method)}}>Restore availability</Button>}</div>}
      </section>
    })}</div>
    {confirm&&<div role="dialog" aria-modal="true" aria-label="Confirm network availability" className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"><div className="bg-background rounded-xl p-6 max-w-lg w-full space-y-4"><h3 className="font-semibold">{drafts[confirm].maintenance?'Enable maintenance':'Restore availability'}: {rows.find(r=>r.network.method===confirm)?.network.label}</h3><p>{drafts[confirm].maintenance?'Users will see this message and cannot start payments with this network:':'Users can start payments with this network again.'}</p>{drafts[confirm].maintenance&&<blockquote className="border-l-4 pl-3 whitespace-pre-wrap">{drafts[confirm].message}</blockquote>}<div className="flex gap-2"><Button variant="outline" disabled={saving} onClick={()=>setConfirm(null)}>Cancel</Button><Button disabled={saving} onClick={()=>save(confirm)}>{saving?'Saving…':'Confirm'}</Button></div></div></div>}
  </CardContent></Card>
}
