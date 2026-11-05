import {test,expect,type Page} from "@playwright/test";
import {readFile} from "node:fs/promises";
import {unzipSync} from "fflate";
import {PDFDocument} from "pdf-lib";

const pending={id:"23456789-1234-1234-1234-123456789abc",productId:"zip-day",mode:"test",amountPaise:500,currency:"INR",status:"pending",createdAt:"2026-11-04T00:00:00Z",paidAt:null,expiresAt:null,refundedPaise:0,paymentId:null,checkoutUrl:"https://rzp.io/i/testOnly",restoreCode:"PRK-abcdefghijklmnopqrstuvwx"};
async function mockPayments(page:Page,features:string[]=[]){
 await page.route("**/api/commerce/**",async(route)=>{const path=new URL(route.request().url()).pathname;const json=path.endsWith("/catalog")?{mode:"test",enabled:true,donationsEnabled:true}:path.endsWith("/access")?{mode:"test",features,expiresAt:"2099-01-01T00:00:00Z",orders:[]}:path.endsWith("/checkout")?{...pending,...JSON.parse(route.request().postData()||"{}")}:{ready:true};await route.fulfill({json});});
}
test("checkout requires email, sends only payment data and preserves its restore code",async({page})=>{
 await mockPayments(page);await page.goto("/pricing");await expect(page.getByText("TEST MODE",{exact:false})).toBeVisible();
 const checkoutRequests:string[]=[];page.on("request",(request)=>{if(request.url().endsWith("/checkout"))checkoutRequests.push(request.postData()||"");});
 const buy=page.getByRole("button",{name:"Get ZIP Day Pass — ₹5",exact:true});await buy.click();expect(checkoutRequests).toHaveLength(0);await page.getByLabel("Email for this payment").fill("buyer@example.test");await buy.click();
 await expect(page.getByRole("heading",{name:"Your checkout is ready"})).toBeVisible();expect(JSON.parse(checkoutRequests[0])).toEqual({productId:"zip-day",email:"buyer@example.test"});
 await expect(page.locator(".restore-code").first()).toHaveText(pending.restoreCode);await expect(page.getByRole("link",{name:"Continue to Razorpay — ₹5"})).toHaveAttribute("target","_blank");
});
test("donations start at ₹5 and remain separate from feature purchases",async({page},testInfo)=>{
 await mockPayments(page);await page.setViewportSize({width:390,height:844});await page.goto("/donate");await page.getByLabel("Email for this payment").fill("supporter@example.test");await page.getByLabel("Amount in rupees").fill("4");let payload:unknown=null;page.on("request",(request)=>{if(request.url().endsWith("/checkout"))payload=JSON.parse(request.postData()!);});
 await page.getByRole("button",{name:"Donate ₹4",exact:true}).click();expect(payload).toBeNull();await page.getByRole("button",{name:"₹5",exact:true}).click();await page.getByRole("button",{name:"Donate ₹5",exact:true}).click();await expect(page.getByRole("heading",{name:"Your checkout is ready"})).toBeVisible();expect(payload).toEqual({productId:"donation",email:"supporter@example.test",amountPaise:500});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath("donate-phone.png"),fullPage:true});
});
async function readyPair(page:Page){
 await page.goto("/");
 const base64=await page.evaluate(()=>{const c=document.createElement("canvas");c.width=800;c.height=1000;const ctx=c.getContext("2d")!;ctx.fillStyle="#dae5f5";ctx.fillRect(0,0,800,1000);ctx.fillStyle="#2859b8";ctx.fillRect(150,100,500,800);return c.toDataURL("image/jpeg").split(",")[1];});
 for(const kind of ["photo","signature"]){if(kind==="signature")await page.locator("#workflow-tab-signature").click();const editor=page.locator(`#${kind}-editor`);await editor.locator('input[type="file"]').setInputFiles({name:`synthetic-${kind}.jpg`,mimeType:"image/jpeg",buffer:Buffer.from(base64,"base64")});await editor.getByRole("button",{name:"Resize & compress",exact:true}).click();await expect(editor.getByRole("link",{name:kind==="photo"?"Download photo":"Download signature",exact:true})).toBeVisible();}
 await page.locator("#workflow-tab-review").click();
}
test("paid shortcuts generate real ZIP and A4 PDF bytes locally while free downloads remain",async({page},testInfo)=>{
 await mockPayments(page,["zip","print"]);await readyPair(page);const paid=page.locator(".paid-exports");await expect(paid.getByRole("button",{name:"Download both as ZIP",exact:true})).toBeDisabled();await paid.getByRole("button",{name:"Check my paid access",exact:true}).click();
 await expect(page.getByRole("tabpanel",{name:/Review & download/}).getByRole("link",{name:"Download photo",exact:true})).toBeVisible();
 const zipEvent=page.waitForEvent("download");await paid.getByRole("button",{name:"Download both as ZIP",exact:true}).click();const zip=unzipSync(await readFile((await(await zipEvent).path())!));expect(Object.keys(zip)).toHaveLength(2);for(const bytes of Object.values(zip)){expect(bytes[0]).toBe(255);expect(bytes[1]).toBe(216);}expect(Object.keys(zip).some((name)=>name.includes("synthetic"))).toBe(false);
 const pdfEvent=page.waitForEvent("download");await paid.getByRole("button",{name:"Download print-sheet PDF",exact:true}).click();const pdf=await PDFDocument.load(await readFile((await(await pdfEvent).path())!));expect(pdf.getPageCount()).toBe(1);expect(pdf.getPage(0).getWidth()).toBeCloseTo(210*72/25.4,2);expect(pdf.getPage(0).getHeight()).toBeCloseTo(297*72/25.4,2);await page.screenshot({path:testInfo.outputPath("paid-shortcuts.png"),fullPage:true});
});
test("expired access is rechecked before creating a paid download",async({page})=>{
 await mockPayments(page,["zip"]);await readyPair(page);const paid=page.locator(".paid-exports");await paid.getByRole("button",{name:"Check my paid access",exact:true}).click();await expect(paid.getByRole("button",{name:"Download both as ZIP",exact:true})).toBeEnabled();await page.route("**/api/commerce/access",(route)=>route.fulfill({json:{mode:"test",features:[],expiresAt:null,orders:[]}}));await paid.getByRole("button",{name:"Download both as ZIP",exact:true}).click();await expect(paid.getByRole("alert")).toContainText("active pass");await expect(paid.getByRole("button",{name:"Download both as ZIP",exact:true})).toBeDisabled();
});
test("print sheets also handle PNG and WebP results and reject impossible page layouts",async({page})=>{
 await mockPayments(page,["zip","print"]);await readyPair(page);
 for(const format of ["image/png","image/webp"]){
  await page.locator("#workflow-tab-photo").click();const editor=page.locator("#photo-editor");await editor.getByLabel("Output format",{exact:true}).selectOption(format);await editor.getByRole("button",{name:"Resize & compress",exact:true}).click();await expect(editor.getByRole("link",{name:"Download photo",exact:true})).toBeVisible();await page.locator("#workflow-tab-review").click();const paid=page.locator(".paid-exports");await paid.getByRole("button",{name:"Check my paid access",exact:true}).click();const event=page.waitForEvent("download");await paid.getByRole("button",{name:"Download print-sheet PDF",exact:true}).click();const pdf=await PDFDocument.load(await readFile((await(await event).path())!));expect(pdf.getPageCount()).toBe(1);
 }
 const paid=page.locator(".paid-exports");await paid.getByLabel("Print tile width (mm)").fill("150");await paid.getByLabel("Print tile height (mm)").fill("150");await paid.getByRole("button",{name:"Download print-sheet PDF",exact:true}).click();await expect(paid.getByRole("alert")).toContainText("will not fit");
});
