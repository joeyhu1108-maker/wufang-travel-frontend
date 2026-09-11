// Run against the built local preview; no external network is needed.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=fileURLToPath(new URL('../qa-output/tibet-ui/',import.meta.url));
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
const results=[];
try{
  for(const width of [1440,1024,768,390,320]){
    const context=await browser.newContext({viewport:{width,height:width>760?1000:844},reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',(error)=>errors.push(error.message));
    await page.goto(process.env.QA_ROOT_URL||'http://127.0.0.1:4177/',{waitUntil:'networkidle'});
    await page.locator('#hero-image').evaluate((img)=>img.decode());
    const snap=async(name)=>{
      await page.evaluate(()=>new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.screenshot({path:`${output}/${width}-${name}.png`});
    };
    await snap('home');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}: page overflow`);
    const clipped=await page.locator('h1,h2,.header,.hero-actions').evaluateAll((elements)=>elements.filter((el)=>el.scrollWidth>el.clientWidth+2).map((el)=>el.id||el.className));
    assert.deepEqual(clipped,[],`${width}: clipped headings/actions`);
    for(const [name,selector] of [['routes','#route-index'],['overview','#route-overview'],['passport','#discover'],['field','#field'],['about','#about']]){
      await page.locator(selector).evaluate((el)=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-85));
      await page.locator(`${selector} img`).evaluateAll(async(images)=>Promise.all(images.map((img)=>img.decode())));
      await snap(name);
    }
    await page.locator('.header-book').click();
    await page.locator('#booking-content[data-step=date]').waitFor();
    await snap('calendar');
    const dialogOverflow=await page.locator('#booking-dialog').evaluate((el)=>el.scrollWidth>el.clientWidth);
    assert.equal(dialogOverflow,false,`${width}: dialog overflow`);
    await page.locator('#booking-dialog [data-close]').click();
    await page.locator('dialog[open]').waitFor({state:'hidden'});
    await page.locator('[data-action=quiz]').first().click();
    await page.locator('.quiz-panel').waitFor();await snap('quiz');
    assert.deepEqual(errors,[]);
    results.push({width,status:'passed',headingsClipped:0,pageErrors:0});
    await context.close();
  }
  await writeFile(`${output}/results.json`,JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
