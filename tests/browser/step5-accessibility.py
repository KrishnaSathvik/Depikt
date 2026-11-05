import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/step5')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await browser.new_context(viewport={'width':1280,'height':1800})
  page=await context.new_page(); results=[]
  async def guard(route):
   if route.request.method not in ['GET','HEAD','OPTIONS'] and ('/api/' in route.request.url or '/rest/v1/rpc/' in route.request.url): await route.abort()
   else: await route.continue_()
  await context.route('**/*',guard)
  if os.environ.get('LOVABLE_BROWSER_AUTH_STATUS')=='injected':
   cookies=json.loads(os.environ.get('LOVABLE_BROWSER_SUPABASE_COOKIES_JSON') or '[]')
   if cookies: await context.add_cookies([{**c,'url':'http://localhost:8080'} for c in cookies])
   await page.goto('http://localhost:8080')
   await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[os.environ['LOVABLE_BROWSER_SUPABASE_STORAGE_KEY'],os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON']])
  for name,url in [('home','/?mode=generate#create'),('build','/?mode=build#create'),('critique','/?mode=critique#create'),('library','/library'),('gallery','/library?tab=gallery'),('templates','/library?tab=templates'),('account','/account'),('history','/history'),('pricing','/pricing')]:
   await page.goto('http://localhost:8080'+url,wait_until='networkidle')
   await page.add_script_tag(path=str(OUT/'axe.min.js'))
   scan=await page.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary})).slice(0,6),count:v.nodes.length}))}")
   results.append({'page':name,'violations':scan}); print(name,json.dumps(scan))
  await page.goto('http://localhost:8080/account',wait_until='networkidle')
  # A real saved result, not a fixture or demo account.
  await page.get_by_role('button',name='Create a premium, professional Etsy listing mockup',exact=False).first.click()
  await page.get_by_role('button',name='Open in Generate').click()
  await page.wait_for_url('**/*mode=generate*')
  await page.get_by_role('button',name='Whole image',exact=True).click()
  await page.get_by_role('textbox',name='What should change?').fill('Make the frame white and keep the artwork unchanged.')
  assert await page.get_by_role('button',name='Apply edit',exact=False).is_enabled()
  await page.get_by_role('button',name='Markup',exact=True).click()
  await page.get_by_role('button',name='Rectangle',exact=True).click()
  canvas=page.locator('canvas[aria-label="Markup canvas"]'); await canvas.focus()
  await page.keyboard.press('Enter'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
  await page.get_by_role('button',name='Apply edit',exact=False).wait_for(state='visible')
  await page.wait_for_function("()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Apply edit')).disabled")
  await page.screenshot(path=str(OUT/'after-desktop-real-markup.png'))
  await page.get_by_role('button',name='Clear annotations').click()
  assert await page.get_by_role('button',name='Apply edit',exact=False).is_disabled()
  await page.set_viewport_size({'width':390,'height':844})
  await page.get_by_role('button',name='Rectangle',exact=True).click(); await canvas.focus()
  await page.keyboard.press('Enter'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
  await page.screenshot(path=str(OUT/'after-mobile-real-markup.png'))
  assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
  print('real saved creation -> whole image and keyboard markup flow passed; apply not submitted')
  OUT.joinpath('axe-results.json').write_text(json.dumps(results,indent=2))
  await browser.close()
asyncio.run(main())
