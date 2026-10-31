import { test, expect } from '@playwright/test'
test('admin can trace the offer base and recipient while reviewing a pending payment', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('token','test.'+btoa(JSON.stringify({role:'ADMIN',permissions:['SUPPORT_READ','SUPPORT_PAYMENT_MANUAL_CONFIRM']}))+'.signature'))
  const writes:string[]=[]
  await page.route('http://localhost:8080/api/**', async route => {
    const request=route.request(),path=new URL(request.url()).pathname
    if(['POST','PUT','DELETE'].includes(request.method()))writes.push(path)
    let body:any={content:[],totalElements:0,totalPages:0}
    if(path==='/api/support-requests/19')body={id:19,name:'Offer request',initiatorPhoneNumber:'255771234556',requestedAmount:'100000',baseAmount:'40000',fundingTarget:'60000',remainingFundingAmount:'60000',sponsoredAmount:'0',status:'PENDING',offerRequestId:20,offerState:'REVIEW'}
    if(path==='/api/support-requests/20')body={id:20,name:'Supported recipient',initiatorPhoneNumber:'255712345678',requestedAmount:'80000',baseAmount:'40000',sponsoredAmount:'40000',status:'FUNDED'}
    return route.fulfill({status:200,json:body})
  })
  await page.goto('/requests/19')
  const offer=page.getByRole('region',{name:'Offer payment'})
  await expect(offer).toContainText('REVIEW')
  await expect(offer).toContainText('no duplicate charge')
  await expect(page.getByText('TZS 60000 / goal TZS 60000')).toBeVisible()
  await offer.getByRole('link',{name:'View supported request'}).click()
  await expect(page).toHaveURL(/\/requests\/20$/)
  await expect(page.getByText('Supported recipient',{exact:true})).toBeVisible()
  expect(writes).toHaveLength(0)
})
