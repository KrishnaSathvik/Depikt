import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/step5')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await browser.new_context(viewport={'width':1280,'height':1800})
  page=await context.new_page(); errors=[]; blocked=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  async def guard(route):
   req=route.request
   if req.method not in ['GET','HEAD','OPTIONS'] and ('/api/' in req.url or '/rest/v1/rpc/' in req.url):
    blocked.append(req.url.split('?')[0]); await route.abort(); return
   await route.continue_()
  await context.route('**/*',guard)
  if os.environ.get('LOVABLE_BROWSER_AUTH_STATUS')=='injected':
   cookies=json.loads(os.environ.get('LOVABLE_BROWSER_SUPABASE_COOKIES_JSON') or '[]')
   if cookies: await context.add_cookies([{**c,'url':'http://localhost:8080'} for c in cookies])
   await page.goto('http://localhost:8080')
   await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[os.environ['LOVABLE_BROWSER_SUPABASE_STORAGE_KEY'],os.environ['LOVABLE_BROWSER_SUPABASE_SESSION_JSON']])
  await page.goto('http://localhost:8080/?mode=build#create',wait_until='domcontentloaded')
  print('actual preview generation tab count',await page.get_by_role('tab',name='Generate',exact=True).count())
  for name,w,h in [('desktop',1280,1800),('tablet',820,1180),('mobile',390,844),('small-mobile',360,780)]:
   await page.set_viewport_size({'width':w,'height':h})
   await page.goto('http://localhost:8080/?mode=generate#create',wait_until='domcontentloaded')
   await page.locator('#create').scroll_into_view_if_needed()
   await page.get_by_role('textbox',name='Image prompt',exact=True).fill('A clear typographic poster with the exact title HELLO WORLD. '+('Keep every letter legible. '*80))
   await page.screenshot(path=str(OUT/f'after-{name}-generate.png'))
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
   await page.get_by_role('radio',name='Auto',exact=True).focus(); await page.keyboard.press('ArrowRight')
   assert await page.get_by_role('radio',name='1:1',exact=True).get_attribute('aria-checked')=='true'
   await page.get_by_text('Output settings',exact=False).click()
   await page.get_by_role('combobox',name='Output format').select_option('gif')
   assert await page.get_by_role('button',name='Generate image',exact=False).is_disabled()
   await page.screenshot(path=str(OUT/f'after-{name}-gif-settings.png'))
   await page.get_by_role('combobox',name='Output format').select_option('png')
   await page.get_by_role('tab',name='Improve prompt',exact=True).click()
   await page.screenshot(path=str(OUT/f'after-{name}-build.png'))
   await page.get_by_role('tab',name='Improve prompt',exact=True).focus(); await page.keyboard.press('ArrowRight')
   assert await page.get_by_role('tab',name='Critique',exact=True).get_attribute('aria-selected')=='true'
   await page.screenshot(path=str(OUT/f'after-{name}-critique.png'))
   print(name,'creation flow and keyboard passed')
  await page.set_viewport_size({'width':1280,'height':1800})
  await page.goto('http://localhost:8080/library',wait_until='domcontentloaded')
  await page.get_by_role('button',name='View prompt',exact=False).first.click()
  await page.screenshot(path=str(OUT/'library-prompt-dialog.png'))
  await page.get_by_role('button',name='Use this prompt',exact=False).click()
  await page.wait_for_url('**/*mode=generate*')
  assert (await page.get_by_role('textbox',name='Image prompt').input_value()).strip()
  await page.screenshot(path=str(OUT/'library-handoff.png'))
  print('real Library prompt handoff passed; no submission')
  await page.goto('http://localhost:8080/account',wait_until='domcontentloaded')
  print('signed-in account present',await page.get_by_role('heading',name='Creations',exact=True).count())
  print('errors',errors)
  print('blocked writes',len(blocked))
  await browser.close()
asyncio.run(main())
