const {chromium}=require('/home/ubuntu/somi-build/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/home/ubuntu/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const targets=[
  ['Fliskonkurrenten','/ksh/fliskonkurrenten/'],
  ['Flis katalog','/ksh/fliskonkurrenten/varer/'],
  ['Heimslig','/ksh/heimslig/'],
  ['Heimslig 3D','/ksh/heimslig/3d-studio/'],
  ['Heimdal','/ksh/heimdal-naturstein/'],
  ['Heimdal 3D','/ksh/heimdal-naturstein/3d-studio/'],
  ['Flyt-Gulv','/ksh/flyt-gulv/']];
 const results=[];
 for(const width of [440,360,1365]){
  const page=await browser.newPage({viewport:{width,height:980},isMobile:width<600,hasTouch:width<600,deviceScaleFactor:1});
  for(const [name,path] of targets){
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('https://setai.no'+path+'?darkheader30test=1',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForTimeout(250);
   const result=await page.evaluate(()=>{
    const el=document.querySelector('header.ksh23-unified-header,header.ksh23-flis-nav,header.nav,header.bath-header,header.ksh2-head,header.k13-head,header.site-head,header.full-head');
    const logo=document.querySelector('.ksh24-heimslig-logo span,.ksh23-heimslig-wordmark');
    const menu=el?.querySelector('button.hamburger,button.menu-toggle,button.ksh23-flis-menu,button.hamb');
    return {
     headerTag:el?.tagName,headerClass:el?.className,
     bg:el?getComputedStyle(el).backgroundColor:'MISSING',
     logo:logo?getComputedStyle(logo).color:'n/a',
     burgerColor:menu?getComputedStyle(menu).color:'n/a',
     burgerBorder:menu?getComputedStyle(menu).borderColor:'n/a',
     scrollWidth:document.documentElement.scrollWidth,
     innerWidth:innerWidth,
     darkCss:!!document.querySelector('link[href*="ksh-dark-header-v30.css"]')
    };
   });
   if(width===440&&['Fliskonkurrenten','Heimslig 3D','Heimdal 3D','Flyt-Gulv'].includes(name)){
    await page.screenshot({path:'/tmp/ksh-v30-'+name.replace(/\W+/g,'-').toLowerCase()+'.png',fullPage:false});
   }
   let menuOpened=null;
   if(width===440){
    const btn=page.locator('header.ksh23-unified-header button.hamburger,header.ksh23-unified-header button.menu-toggle,header.ksh23-flis-nav button.ksh23-flis-menu,header.nav button.hamb').first();
    if(await btn.count()){
      try{await btn.click({timeout:1500});menuOpened=await btn.getAttribute('aria-expanded');}catch(e){menuOpened='click unavailable';}
    }
   }
   results.push({name,width,...result,menuOpened,errors:errors.slice(0,2)});
  }
  await page.close();
 }
 console.log(JSON.stringify(results,null,2));
 await browser.close();
})().catch(e=>{console.error(e.stack||e);process.exit(2)});
