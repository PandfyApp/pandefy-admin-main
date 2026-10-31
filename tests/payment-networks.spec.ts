import { test, expect } from '@playwright/test'
const labels=['M-Pesa','Airtel Money','TigoPesa']
const methods=['mpesa','airtel','tigopesa']
async function setup(page:any,edit=true) {
  await page.addInitScript((canEdit:boolean)=>localStorage.setItem('token','test.'+btoa(JSON.stringify({role:'ADMIN',permissions:['CONFIG_READ',...(canEdit?['CONFIG_UPDATE']:[])]}))+'.signature'),edit)
  const rows=methods.map((method,i)=>({network:{method,label:labels[i],maintenance:false,message:'',updatedAt:null as string|null},updatedBy:null as string|null}))
  const writes:any[]=[]
  await page.route('http://localhost:8080/api/**',async(route:any)=>{
    const req=route.request(),path=new URL(req.url()).pathname
    if(path==='/api/config/payment-networks/admin')return route.fulfill({json:rows})
    if(path==='/api/config/payment-networks')return route.fulfill({json:rows.map(r=>r.network)})
    if(path.startsWith('/api/config/payment-networks/')&&req.method()==='PUT') {
      const method=path.split('/').pop(),body=req.postDataJSON();writes.push({method,...body})
      const row=rows.find(r=>r.network.method===method)!;Object.assign(row.network,body,{updatedAt:'2026-10-28T10:00:00Z'});row.updatedBy='Admin Example'
      return route.fulfill({json:row})
    }
    return route.fulfill({json:{value:'2000'}})
  })
  await page.goto('/settings')
  return writes
}
test('admin previews exact maintenance message, saves, reloads, and restores network',async({page})=>{
  const writes=await setup(page)
  const row=page.getByRole('region',{name:'M-Pesa'})
  await expect(row).toContainText('Available')
  await row.getByRole('checkbox').check()
  await expect(row.getByRole('button',{name:'Save network'})).toBeDisabled()
  const message='M-Pesa is under maintenance. Choose Airtel.'
  await row.getByRole('textbox').fill(message)
  await row.getByRole('button',{name:'Save network'}).click()
  await expect(page.getByRole('dialog')).toContainText(message)
  expect(writes).toHaveLength(0)
  await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click()
  await expect(row).toContainText('Under maintenance');await expect(row).toContainText('Admin Example')
  await page.reload();await expect(row).toContainText('Under maintenance')
  await row.getByRole('button',{name:'Restore availability'}).click()
  await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click()
  await expect(row).toContainText('Available')
  expect(writes).toEqual([{method:'mpesa',maintenance:true,message},{method:'mpesa',maintenance:false,message}])
})
test('cancel confirmation sends no configuration change',async({page})=>{
  const writes=await setup(page);const row=page.getByRole('region',{name:'Airtel Money'})
  await row.getByRole('checkbox').check();await row.getByRole('textbox').fill('Choose another network')
  await row.getByRole('button',{name:'Save network'}).click();await page.getByRole('dialog').getByRole('button',{name:'Cancel'}).click()
  expect(writes).toHaveLength(0)
})
test('configuration readers cannot change network availability',async({page})=>{
  await setup(page,false);const row=page.getByRole('region',{name:'TigoPesa'})
  await expect(row.getByRole('checkbox')).toBeDisabled();await expect(row.getByRole('textbox')).toBeDisabled();await expect(row.getByRole('button',{name:'Save network'})).toHaveCount(0)
})
