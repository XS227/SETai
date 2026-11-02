const {chromium}=require('/home/ubuntu/somi-build/node_modules/playwright');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:'/home/ubuntu/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const p=await browser.newPage({viewport:{width:440,height:950},isMobile:true,hasTouch:true});
const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('https://setai.no/ksh/flyt-gulv/?newmobile=27',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForSelector('.net26-guide .net26-media',{timeout:15000});
const diag=await p.evaluate(()=>{
 const g=document.querySelector('.net26-guide');
 const cards=[...g.querySelectorAll('.net21-card')];
 const styles=el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color,grid:getComputedStyle(el).gridTemplateColumns});
 return {selected:[...g.querySelectorAll('[data-net21-project][aria-pressed="true"]')].map(el=>el.textContent.trim()),cards:cards.length,guide:styles(g),result:styles(g.querySelector('.net21-result')),card:styles(cards[0]),cardsLayout:styles(g.querySelector('.net21-cards')),docWidth:document.documentElement.scrollWidth,windowWidth:innerWidth,rects:cards.map(el=>({width:Math.round(el.getBoundingClientRect().width),height:Math.round(el.getBoundingClientRect().height)}))};
});
console.log('FLYT',JSON.stringify(diag));
await p.locator('#prosjektveiviser').screenshot({path:'/tmp/ksh-flyt-v27-final.png',timeout:20000});
await p.goto('https://setai.no/ksh/heimdal-naturstein/3d-studio/?newmobile=27',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForSelector('#stoneViewer .ksh25-stone-toolbar',{timeout:15000});
console.log('HEIMDAL',JSON.stringify(await p.evaluate(()=>({topFullscreenVisible:getComputedStyle(document.querySelector('#stoneViewer .ksh25-stone-toolbar button')).display,sharedFullscreenCount:document.querySelectorAll('#stoneViewer .ksh29-fullscreen').length,sliderCount:document.querySelectorAll('#stoneViewer .ksh25-stone-toolbar input[type=range]').length,docWidth:document.documentElement.scrollWidth,windowWidth:innerWidth}))));
await p.locator('#stoneViewer').screenshot({path:'/tmp/ksh-heimdal-v27-final.png',timeout:20000});
console.log('ERRORS',JSON.stringify(errors));
await browser.close();
})().catch(e=>{console.error(e.stack||e);process.exit(2)});
