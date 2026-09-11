// Optional browser QA: install Playwright locally, or set PLAYWRIGHT_MODULE / CHROME_BIN.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=fileURLToPath(new URL('../qa-output/',import.meta.url));
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
const results=[];
const scenarios=[
  {name:'booking-desktop',width:1440,height:1000,url:process.env.QA_ROOT_URL||'http://127.0.0.1:4177/'},
  {name:'booking-mobile',width:390,height:844,url:process.env.QA_SUBDIR_URL||'http://127.0.0.1:4178/dist/'},
  {name:'booking-small-mobile',width:320,height:740,url:process.env.QA_ROOT_URL||'http://127.0.0.1:4177/'},
];
try{
  for(const scenario of scenarios){
    const context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},reducedMotion:'reduce'});
    const errors=[],external=[],badResponses=[];
    await context.route('**/*',(route)=>{
      if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();
      external.push(route.request().url());return route.abort();
    });
    const page=await context.newPage();
    page.on('pageerror',(error)=>errors.push(error.message));
    page.on('response',(response)=>{if(response.status()>=400)badResponses.push(response.url());});
    const action=(name)=>page.locator(`[data-booking-action="${name}"]`);
    const step=async(name)=>{await page.locator(`#booking-content[data-step="${name}"]`).waitFor();};
    const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wufang-demo-orders-v1'))?.orders||[]);
    const capture=async(name)=>{
      await page.locator('.booking-scroll').evaluate((element)=>element.scrollTop=0);
      const overflow=await page.locator('#booking-dialog').evaluate((dialog)=>[dialog,...dialog.querySelectorAll('.booking-scroll,.booking-main,.booking-footer')].filter((element)=>element.scrollWidth>element.clientWidth+1).map((element)=>element.className));
      assert.deepEqual(overflow,[],`${scenario.name}/${name}: horizontal overflow`);
      await page.screenshot({path:`${output}/${scenario.name}-${name}.png`});
    };
    await page.goto(scenario.url,{waitUntil:'networkidle'});
    await page.locator('.header-book').click();await step('date');
    await action('continue-date').click();assert.match(await page.locator('#booking-error').textContent(),/选择集合日期/);
    await page.locator('#book-month-next').click();
    await page.locator('#book-route-thirteen').click();
    await page.locator('.calendar-days button:enabled').first().click();
    const firstDate=await page.locator('.calendar-days [aria-pressed="true"]').getAttribute('data-value');
    await action('people').last().click();
    assert.match(await page.locator('.booking-footer strong').textContent(),/37,600/);
    await capture('date');
    await action('continue-date').click();await step('travelers');
    await action('continue-travelers').click();assert.equal(await page.locator('[aria-invalid="true"]').count(),4);
    await action('fill').click();
    await page.locator('#book-phone').fill('123');await action('continue-travelers').click();
    assert.match(await page.locator('#book-error-phone').textContent(),/11 位/);
    await page.locator('#book-phone').fill('13800000000');
    await page.locator('#book-traveler-0').fill('<b>旅人一</b>');
    await page.locator('#book-note').fill('演示备注：想看日落');
    await capture('travelers');
    await action('continue-travelers').click();await step('review');
    assert.match(await page.locator('.booking-main').textContent(),/<b>旅人一<\/b>/);
    assert.equal(await page.locator('.booking-details b').count(),0);
    await action('edit-travelers').click();await step('travelers');
    assert.equal(await page.locator('#book-note').inputValue(),'演示备注：想看日落');
    await action('continue-travelers').click();await step('review');
    await action('edit-date').click();await step('date');
    assert.equal(await page.locator('.calendar-days [aria-pressed="true"]').getAttribute('data-value'),firstDate);
    await action('continue-date').click();await step('travelers');
    assert.equal(await page.locator('#book-contact').inputValue(),'演示联系人');
    await action('continue-travelers').click();await step('review');
    await action('create-order').click();assert.match(await page.locator('#booking-error').textContent(),/演示预订说明/);
    assert.equal((await stored()).length,0);
    await page.locator('#book-agreed').check();await capture('review');
    await action('create-order').click();await step('payment');
    assert.equal((await stored()).length,1);assert.equal((await stored())[0].date,firstDate);
    await capture('payment');await action('authorize').click();await step('authorize');await capture('cashier');
    await page.locator('[data-outcome="failure"]').click();await step('result');
    assert.match(await page.locator('#booking-title').textContent(),/支付没有完成/);
    assert.equal((await stored())[0].status,'pending');await capture('failure');
    await action('payment').click();await step('payment');await page.locator('#book-method-alipay').click();
    await action('authorize').click();await page.locator('[data-outcome="cancel"]').click();await step('result');
    assert.equal((await stored())[0].status,'pending');
    await action('payment').click();await action('authorize').click();
    await page.locator('[data-outcome="success"]').dblclick();await step('result');
    assert.equal((await stored()).length,1);assert.equal((await stored())[0].status,'paid');assert.equal((await stored())[0].method,'alipay');
    assert.match(await page.locator('.booking-intro').textContent(),/实际扣款 ¥0/);await capture('success');
    await page.goBack();await step('detail');assert.equal(await action('payment').count(),0);
    await page.locator('#booking-dialog [data-close]').click();await page.locator('#booking-dialog').waitFor({state:'hidden'});
    await page.reload({waitUntil:'networkidle'});
    await page.locator('[data-action="orders"]:visible').first().click();await step('orders');
    assert.equal(await page.locator('.booking-order-card').count(),1);await capture('orders');
    await page.locator('#book-filter-pending').click();assert.equal(await page.locator('.booking-order-card').count(),0);
    await action('new').last().click();await step('date');
    await page.locator('#book-mode-private').click();await page.locator('#book-month-next').click();
    await page.locator('.calendar-days button:enabled').nth(3).click();
    await capture('private-date');await action('continue-date').click();await action('fill').click();await action('continue-travelers').click();
    await page.locator('#book-agreed').check();await action('create-order').click();await step('payment');
    assert.equal((await stored()).length,2);
    await page.reload({waitUntil:'networkidle'});await page.locator('[data-action="orders"]:visible').first().click();
    await page.locator('#book-filter-pending').click();await page.locator('.booking-order-card').click();await step('detail');
    await action('payment').click();await step('payment');
    await action('detail').click();await action('cancel-prompt').click();
    await action('keep-order').click();assert.equal((await stored())[0].status,'pending');
    await action('cancel-prompt').click();await action('cancel-order').click();await step('detail');
    assert.equal((await stored())[0].status,'cancelled');assert.equal(await action('payment').count(),0);await capture('cancelled');
    const saved=await stored();
    assert.ok(saved.every((order)=>!('phone' in order)&&!('contact' in order)&&!('travelers' in order)&&!('note' in order)));
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(badResponses,[]);
    results.push({scenario:scenario.name,viewport:`${scenario.width}x${scenario.height}`,checks:'dates, group/private, capacity, validation, totals, editing, escaping, failure, retry, cancel, duplicate click, success, Back, refresh, orders, privacy, zero external requests',status:'passed'});
    console.log(`${scenario.name}: passed`);
    await context.close();
  }
  for(const mode of ['blocked-storage','malformed-storage']){
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    await context.addInitScript((mode)=>{
      if(mode==='blocked-storage'){
        Storage.prototype.getItem=()=>{throw new Error('Storage blocked');};
        Storage.prototype.setItem=()=>{throw new Error('Storage blocked');};
      }else{localStorage.setItem('wufang-demo-orders-v1','not valid JSON');}
    },mode);
    const page=await context.newPage();
    await page.goto(scenarios[0].url,{waitUntil:'networkidle'});
    await page.locator('.header-book').click();
    if(mode==='blocked-storage')await page.locator('.booking-storage-note').waitFor();
    await page.locator('#book-mode-private').click();await page.locator('#book-month-next').click();
    await page.locator('.calendar-days button:enabled').first().click();
    for(const action of ['continue-date','fill','continue-travelers'])await page.locator(`[data-booking-action="${action}"]`).click();
    await page.locator('#book-agreed').check();
    await page.locator('[data-booking-action="create-order"]').click();await page.locator('[data-booking-action="authorize"]').click();
    await page.locator('[data-outcome="success"]').click();
    await page.locator('#booking-content[data-step="result"]').waitFor();
    assert.match(await page.locator('.booking-intro').textContent(),/模拟支付成功/);
    results.push({scenario:mode,status:'passed'});console.log(`${mode}: passed`);
    await context.close();
  }
  await writeFile(`${output}/booking-results.json`,JSON.stringify(results,null,2)+'\n');
}finally{await browser.close();}
