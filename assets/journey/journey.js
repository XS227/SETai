(() => {
'use strict';
const root=document.documentElement;
const journey=document.getElementById('journey');
const scenes=[...document.querySelectorAll('.scene')];
const chapters=[...document.querySelectorAll('.chapter-nav a')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const film=document.getElementById('world-film');
const filmButton=document.getElementById('film-toggle');
const nextBtn=document.getElementById('next-scene');
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
let frame=0,current=0,motion=false,userPaused=false,language='no';
const faMap={
"All work":"همه پروژه‌ها",
"Let's talk":"گفتگو کنیم",
"01 / Where every story starts":"۰۱ / جایی که هر داستان آغاز می‌شود",
"Every idea<br>needs a place<br>to <em>begin.</em>":"هر ایده‌ای<br>به جایی برای<br><em>شروع نیاز دارد.</em>",
"I'm Khabat. Come behind the scenes of SETAEI — from the first line of a story to the systems, products and worlds I build.":"من خباط هستم. پشت صحنه SETAEI را ببینید — از نخستین خط یک داستان تا سیستم‌ها، محصولات و جهان‌هایی که می‌سازم.",
"Enter the Shahnameh project ↗":"ورود به پروژه شاهنامه ↗",
"Project imagery / Shahnameh film":"تصویر پروژه / فیلم شاهنامه",
"02 / Behind the scenes":"۰۲ / پشت صحنه",
"Back at<br>the <em>desk.</em>":"بازگشت به<br><em>میز کار.</em>",
"The brief becomes sketches. Sketches become code. 15+ years across IT, security and infrastructure meet strategy, design and AI research in the same workspace.":"ایده به طرح تبدیل می‌شود و طرح به کد. بیش از ۱۵ سال تجربه در فناوری اطلاعات، امنیت و زیرساخت در کنار استراتژی، طراحی و پژوهش هوش مصنوعی قرار می‌گیرد.",
"How I can help ↗":"ببینید چگونه می‌توانم کمک کنم ↗",
"Studio / Creative visualization":"استودیو / تصویرسازی خلاق",
"03 / Selected client work":"۰۳ / پروژه‌های منتخب مشتریان",
"Three collaborations.<br><em>Built to perform.</em>":"سه همکاری.<br><em>ساخته‌شده برای نتیجه.</em>",
"A quieter look at three client projects where brand, web and SEO meet.":"نگاهی ساده‌تر به سه پروژه مشتری که در آن هویت برند، وب و سئو به هم می‌رسند.",
"See all projects ↗":"مشاهده همه پروژه‌ها ↗",
"Brand · Web · SEO":"هویت برند · وب · سئو",
"Web · SEO · Content":"وب · سئو · محتوا",
"Web · SEO · Local visibility":"وب · سئو · دیده‌شدن محلی",
"03 / One studio, many worlds":"۰۳ / یک استودیو، جهان‌های متعدد",
"Built ideas.<br><em>Out in the world.</em>":"ایده‌هایی که ساخته شدند.<br><em>و وارد دنیای واقعی شدند.</em>",
"Products, client work, research and film — move through the constellation.":"محصولات، پروژه‌های مشتریان، پژوهش و فیلم — در این منظومه حرکت کنید.",
"VPN · Wallet · AI":"VPN · کیف پول · AI",
"Game · AI world":"بازی · جهان AI",
"Brand · Web":"برند · وب",
"AI analytics":"تحلیل هوشمند",
"AI film":"فیلم AI",
"AI music video":"موزیک‌ویدیوی AI",
"All projects ↗":"همه پروژه‌ها ↗",
"04 / Inside the story":"۰۴ / درون داستان",
"A world<br>brought to life.":"جهانی که<br>زنده شده است.",
"Persian storytelling, AI filmmaking and an interactive universe. From a single frame to characters, scenes and experiences.":"روایت ایرانی، فیلم‌سازی با هوش مصنوعی و یک جهان تعاملی؛ از یک فریم تا شخصیت‌ها، صحنه‌ها و تجربه‌ها.",
"Explore the film project ↗":"پروژه فیلم را ببینید ↗",
"Discover RealGram ↗":"RealGram را کشف کنید ↗",
"Play film":"پخش فیلم",
"05 / The global stage":"۰۵ / صحنه جهانی",
"A film.<br>A global stage.<br><em>One shot.</em>":"یک فیلم.<br>یک صحنه جهانی.<br><em>یک فرصت.</em>",
"Our Shahnameh short film is competing in Higgsfield's global AI film festival.":"فیلم کوتاه شاهنامه ما در جشنواره جهانی فیلم هوش مصنوعی Higgsfield رقابت می‌کند.",
"See how the film was made ↗":"پشت صحنه ساخت فیلم را ببینید ↗",
"AI FILM FESTIVAL · VIEW ENTRY ↗":"جشنواره فیلم AI · مشاهده اثر ↗",
"AI video / Higgsfield":"ویدیوی AI / Higgsfield",
"06 / Search visibility":"۰۶ / دیده‌شدن در جستجو",
"Get found.<br><em>Get chosen.</em>":"پیدا شوید.<br><em>انتخاب شوید.</em>",
"SEO, local visibility and AI-driven content that helps the right customers actually find you.":"سئو، دیده‌شدن محلی و محتوای مبتنی بر هوش مصنوعی که کمک می‌کند مشتریان درست واقعاً شما را پیدا کنند.",
"SEO in Oslo ↗":"سئو در اسلو ↗",
"Get found.<br>Get chosen.<br><em>Keep growing.</em>":"پیدا شوید.<br>انتخاب شوید.<br><em>و رشد را ادامه دهید.</em>",
"SETAEI combines technical SEO, content structure, local search and AI-search visibility — built to turn rankings into real business opportunities.":"SETAEI سئوی فنی، ساختار محتوا، جستجوی محلی و دیده‌شدن در جستجوی هوش مصنوعی را ترکیب می‌کند تا رتبه‌ها به فرصت‌های واقعی کسب‌وکار تبدیل شوند.",
"Explore SEO services ↗":"خدمات سئو را ببینید ↗",
"AI-driven SEO ↗":"سئوی مبتنی بر هوش مصنوعی ↗",
"Google · Local · AI search":"گوگل · محلی · جستجوی AI",
"06 / Product ecosystem":"۰۶ / اکوسیستم محصول",
"VPN. Wallet. AI.<br><em>One identity.</em>":"VPN. کیف پول. AI.<br><em>یک هویت.</em>",
"RealGram brings privacy, community, wallet, Hakim AI and the Shahnameh game into one product — built as a living platform, not a static demo.":"RealGram حریم خصوصی، جامعه، کیف پول، Hakim AI و بازی شاهنامه را در یک محصول جمع می‌کند — یک پلتفرم زنده، نه یک دموی ثابت.",
"Explore the case study ↗":"مطالعه موردی را ببینید ↗",
"Open RealGram ↗":"باز کردن RealGram ↗",
"08 / Strategy and execution":"۰۸ / استراتژی و اجرا",
"Strategy and execution<br>from the same <em>brain.</em>":"استراتژی و اجرا<br>از یک <em>ذهن.</em>",
"Services designed for founders, SMEs and organizations in Oslo and Norway that need a CTO, AI developer, SaaS developer, full-stack developer or SEO expert — without a full-time hire.":"خدمات برای بنیان‌گذاران، شرکت‌های کوچک و سازمان‌هایی که به CTO، توسعه‌دهنده AI، SaaS، فول‌استک یا متخصص SEO نیاز دارند — بدون استخدام تمام‌وقت.",
"AI Development":"توسعه هوش مصنوعی",
"AI assistants, automation flows, multi-agent concepts and business-specific decision tools.":"دستیارهای هوش مصنوعی، اتوماسیون، سیستم‌های چندعاملی و ابزارهای تصمیم‌گیری اختصاصی کسب‌وکار.",
"From business idea to working product: architecture, dashboards, Firebase, APIs, payments and launch pages.":"از ایده کسب‌وکار تا محصول عملی: معماری، داشبورد، Firebase، API، پرداخت و صفحه راه‌اندازی.",
"SEO & Web Design":"SEO و طراحی وب",
"Premium websites for clinics, creators and local businesses that need credibility and conversion-focused design.":"وب‌سایت‌های حرفه‌ای برای کلینیک‌ها، سازندگان و کسب‌وکارهای محلی با تمرکز بر اعتبار و تبدیل.",
"Translating business ambition into practical architecture and execution for startups.":"تبدیل هدف تجاری به معماری عملی و اجرای واقعی برای استارتاپ‌ها.",
"Security & Infrastructure":"امنیت و زیرساخت",
"Practical security thinking, hosting, deployment pipelines, access control and monitoring.":"امنیت عملی، میزبانی، فرایند استقرار، کنترل دسترسی و پایش.",
"Growth Systems":"سیستم‌های رشد",
"Referral engines, SEO infrastructure, lead capture and data-driven customer acquisition.":"سیستم معرفی، زیرساخت SEO، جذب لید و جذب مشتری مبتنی بر داده.",
"See all services ↗":"همه خدمات ↗",
"08 / Research-ready profile":"۰۸ / پروفایل پژوهشی",
"Academic work connected<br>to real <em>commercial products.</em>":"پژوهش دانشگاهی متصل<br>به <em>محصولات واقعی.</em>",
"Connecting agentic AI, CRM workflows, referral systems, scoring and decision support — research grounded in systems already in production, not hypothetical scenarios.":"پیوند هوش مصنوعی عامل‌محور، فرایندهای CRM، سیستم‌های معرفی، امتیازدهی و پشتیبانی تصمیم — پژوهشی مبتنی بر سامانه‌های واقعی در حال استفاده.",
"Data Layer":"لایه داده",
"Lead Agent":"عامل لید",
"Scoring Agent":"عامل امتیازدهی",
"Coordinator Agent":"عامل هماهنگ‌کننده",
"Outreach Agent":"عامل ارتباط",
"Payout / Decision Agent":"عامل پرداخت / تصمیم",
"Published work connecting token economies, AI models and financial systems — the founder profile working at the intersection of technology and commerce.":"آثار منتشرشده در پیوند اقتصاد توکنی، مدل‌های هوش مصنوعی و سیستم‌های مالی — در مرز فناوری و تجارت.",
"07 / Continuous learning":"۰۷ / یادگیری مستمر",
"Certified by the world's<br>leading <em>technology companies.</em>":"دارای گواهی از<br><em>شرکت‌های فناوری پیشرو جهان.</em>",
"AI Developer Certificate":"گواهی توسعه‌دهنده هوش مصنوعی",
"AI Professional Certificate":"گواهی حرفه‌ای هوش مصنوعی",
"DeFi Specialization":"تخصص DeFi",
"Learn AI Agents":"یادگیری AI Agents",
"AI for Work and Life":"هوش مصنوعی برای کار و زندگی",
"Experience at Apple":"تجربه در Apple",
"09 / The next beginning":"۰۹ / آغاز بعدی",
"Where does<br>your idea<br><em>take us?</em>":"ایده شما<br>ما را به کجا<br><em>می‌برد؟</em>",
"A website. An AI product. A world nobody has seen before. Let's start with a conversation.":"یک وب‌سایت. یک محصول هوش مصنوعی. جهانی که هنوز کسی ندیده است. از یک گفتگو شروع کنیم.",
"Tell me about your idea ↗":"از ایده‌تان بگویید ↗",
"Services":"خدمات",
"Work":"پروژه‌ها",
"Blog":"وبلاگ",
"Email":"ایمیل",
"Tell us what you are building — we will get back to you within 24 hours.":"بگویید چه چیزی می‌سازید — حداکثر تا ۲۴ ساعت پاسخ می‌دهیم.",
"Name *":"نام *",
"Company":"شرکت",
"Email *":"ایمیل *",
"Phone (optional)":"تلفن (اختیاری)",
"What do you need? *":"به چه چیزی نیاز دارید؟ *",
"Send message":"ارسال پیام",
"By submitting, you confirm we may contact you about your inquiry.":"با ارسال فرم تأیید می‌کنید که برای پاسخ به درخواست شما با شما تماس بگیریم.",
"Message sent":"پیام ارسال شد",
"Thank you for getting in touch. We will reply within 24 hours.":"از تماس شما سپاسگزاریم. حداکثر تا ۲۴ ساعت پاسخ می‌دهیم.",
"Close":"بستن"
};
const translations=[...document.querySelectorAll('[data-en]')].map(el=>({el,no:el.innerHTML,en:el.dataset.en,fa:faMap[el.dataset.en]||el.dataset.en}));
const chapterNames={
 no:{"Intro":"Intro","Studio":"Studio","Prosjekter":"Prosjekter","Shahnameh":"Shahnameh","Higgsfield AI Festival":"Higgsfield AI Festival","SEO":"SEO","Tjenester":"Tjenester","Forskning":"Forskning","Sertifiseringer":"Sertifiseringer","Neste idé":"Neste idé"},
 en:{"Intro":"Intro","Studio":"Studio","Prosjekter":"Projects","Shahnameh":"Shahnameh","Higgsfield AI Festival":"Higgsfield AI Festival","SEO":"SEO","Tjenester":"Services","Forskning":"Research","Sertifiseringer":"Certifications","Neste idé":"Next idea"},
 fa:{"Intro":"مقدمه","Studio":"استودیو","Prosjekter":"پروژه‌ها","Shahnameh":"شاهنامه","Higgsfield AI Festival":"جشنواره Higgsfield","SEO":"سئو","Tjenester":"خدمات","Forskning":"پژوهش","Sertifiseringer":"گواهی‌ها","Neste idé":"ایده بعدی"}
};
const ui=(no,en,fa)=>language==='fa'?fa:language==='en'?en:no;
// Two-digit chapter numbers; Persian digits in fa ("۰۳" rather than "03").
const faDigits='۰۱۲۳۴۵۶۷۸۹';
const num=n=>{const s=String(n).padStart(2,'0');return language==='fa'?s.replace(/\d/g,d=>faDigits[d]):s};
function filmLabel(){filmButton.textContent=film.paused?ui('Spill film','Play film','پخش فیلم'):ui('Pause film','Pause film','توقف فیلم')}
function loadFilm(){const source=film.querySelector('source');if(!source.src){source.src=source.dataset.src;film.load()}}
function playFilm(){loadFilm();film.play().then(filmLabel).catch(filmLabel)}
filmButton.addEventListener('click',()=>{if(film.paused){userPaused=false;playFilm()}else{userPaused=true;film.pause();filmLabel()}});
film.addEventListener('pause',filmLabel);film.addEventListener('play',filmLabel);
const filmSceneIndex=scenes.findIndex(s=>s.contains(film));
function update(){
 frame=0;
 const last=scenes.length-1;
 const span=Math.max(1,journey.offsetHeight-innerHeight);
 const progress=clamp((scrollY-journey.offsetTop)/span)*last;
 const active=motion?Math.min(last,Math.floor(progress+.12)):scenes.reduce((a,s,i)=>s.getBoundingClientRect().top<innerHeight*.5?i:a,0);
 current=active;
 scenes.forEach((scene,i)=>{
  if(!motion)return;
  const local=progress-i;
  const enter=i===0?1:smooth((local+.35)/.35);
  const leave=i===last?1:1-smooth((local-.65)/.35);
  const alpha=enter*leave;
  scene.style.opacity=alpha;
  scene.classList.toggle('is-visible',alpha>.001);
  scene.classList.toggle('is-active',i===active);
  scene.inert=i!==active;
  scene.setAttribute('aria-hidden',String(i!==active));
  const t=clamp(local);
  const fx=scene.dataset.fx;
  if(fx){
   const target=fx==='browserZoom'?scene.querySelector('.browser-surface'):fx==='projectField'?scene.querySelector('.project-cloud'):scene.querySelector('.visual');
   if(target){
    if(fx==='zoomSlow')target.style.transform=`scale(${1+t*.65})`;
    else if(fx==='zoomStrong')target.style.transform=`scale(${1+smooth((t-.1)/.9)*4.2})`;
    else if(fx==='zoomTiny')target.style.transform=`scale(${1+t*.12})`;
    else if(fx==='browserZoom')target.style.transform=`scale(${.86+smooth(t)*.95})`;
    else if(fx==='projectField')target.style.transform=`perspective(1000px) translate3d(${(t-.5)*22}px,${(t-.5)*-12}px,0) rotateZ(${(t-.5)*1.1}deg) scale(${.97+t*.06})`;
   }
  }
  const copy=scene.querySelector('.scene-copy');
  if(copy){copy.style.opacity=i===last?1:1-smooth((t-.35)/.4);copy.style.transform=`translateY(${-t*28}px)`;}
 });
 chapters.forEach((a,i)=>a.setAttribute('aria-current',String(i===active)));
 const chapter=scenes[active].dataset.chapter;
 const label=document.getElementById('chapter-label');const b=document.createElement('b');b.textContent=num(active+1);
 label.replaceChildren(b,` / ${chapterNames[language]?.[chapter]||chapter}`);
 const docSpan=Math.max(1,document.documentElement.scrollHeight-innerHeight);
 root.style.setProperty('--journey-progress',(motion?progress/last:clamp(scrollY/docSpan)).toFixed(4));
 nextBtn.textContent=active===last?ui('Tilbake til toppen ↑','Back to top ↑','بازگشت به بالا ↑'):ui('Scroll for å utforske ↓','Scroll to explore ↓','برای ادامه اسکرول کنید ↓');
 if(active===filmSceneIndex&&!document.hidden&&!reduced.matches&&!userPaused&&!navigator.connection?.saveData){if(film.paused)playFilm()}else if(!film.paused){film.pause()}
}
function requestUpdate(){if(!frame)frame=requestAnimationFrame(update)}
function configure(){
 // At zoomed text sizes / short landscape heights, retain normal readable flow.
 motion=!reduced.matches&&innerHeight>=560&&innerWidth>=320;
 root.classList.toggle('journey-motion',motion);
 scenes.forEach(s=>{s.inert=false;s.removeAttribute('aria-hidden');s.style.opacity='';s.classList.remove('is-active','is-visible');const c=s.querySelector('.scene-copy');if(c){c.style.opacity='';c.style.transform=''};const v=s.querySelector('.visual');if(v)v.style.transform='';const b=s.querySelector('.browser-surface');if(b)b.style.transform='';const p=s.querySelector('.project-cloud');if(p)p.style.transform=''});
 update();
}
function goTo(index){
 const last=scenes.length-1;
 index=clamp(index,0,last);
 if(motion){const span=journey.offsetHeight-innerHeight;scrollTo({top:journey.offsetTop+span*index/last,behavior:reduced.matches?'auto':'smooth'})}
 else scenes[index].scrollIntoView({behavior:reduced.matches?'auto':'smooth'});
}
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const index=scenes.findIndex(s=>'#'+s.id===a.getAttribute('href'));if(index<0)return;e.preventDefault();history.replaceState(null,'','#'+scenes[index].id);goTo(index)}));
nextBtn.addEventListener('click',()=>goTo(current===scenes.length-1?0:current+1));
window.addEventListener('scroll',requestUpdate,{passive:true});
let resizeTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(configure,120)},{passive:true});
reduced.addEventListener('change',configure);
document.addEventListener('visibilitychange',requestUpdate);
configure();
const initial=scenes.findIndex(s=>'#'+s.id===location.hash);if(initial>=0)goTo(initial);
const metaByLang={
 no:{title:'CTO, AI-ekspert & SaaS-utvikler i Oslo, Norge | SETAEI',desc:'Khabat Setaei er CTO, AI-ekspert, SaaS-utvikler, fullstack-utvikler og SEO-ekspert i Oslo. SETAEI bygger AI-systemer og SaaS-produkter for kunder i hele Norge.'},
 en:{title:'CTO, AI Expert & SaaS Developer | SETAEI',desc:'Khabat Setaei builds AI systems, SaaS products, websites and growth infrastructure for companies and founders.'},
 fa:{title:'توسعه‌دهنده هوش مصنوعی، SaaS و CTO | SETAEI',desc:'SETAEI سیستم‌های هوش مصنوعی، محصولات SaaS، وب‌سایت و زیرساخت رشد برای کسب‌وکارها و بنیان‌گذاران می‌سازد.'}
};
function setLanguage(lang,persist=true){
 if(!['no','en','fa'].includes(lang))lang='en';
 language=lang;
 root.lang=lang==='no'?'no':lang;
 root.dir=lang==='fa'?'rtl':'ltr';
 translations.forEach(t=>t.el.innerHTML=t[lang]||t.en);
 chapters.forEach((a,i)=>a.textContent=num(i+1));
 document.querySelectorAll('.lang-switch [data-lang]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.lang===lang)));
 const m=metaByLang[lang]; if(m){document.title=m.title;const d=document.getElementById('metaDesc');if(d)d.content=m.desc;const ot=document.getElementById('metaOgTitle');if(ot)ot.content=m.title;const od=document.getElementById('metaOgDesc');if(od)od.content=m.desc;const tt=document.getElementById('metaTwTitle');if(tt)tt.content=m.title;const td=document.getElementById('metaTwDesc');if(td)td.content=m.desc;}
 const message=document.getElementById('cf-message');if(message)message.placeholder=ui('Noen setninger om prosjektet, tidsplan og hvordan vi kan hjelpe.','A few lines about the project, timing and how we can help.','چند خط درباره پروژه، زمان‌بندی و اینکه چگونه می‌توانیم کمک کنیم.');
 filmLabel();
 update();
 if(persist){try{localStorage.setItem('setaei-lang',lang)}catch{}}
}
document.querySelectorAll('.lang-switch [data-lang]').forEach(btn=>btn.addEventListener('click',()=>setLanguage(btn.dataset.lang)));
document.querySelectorAll('.js-email').forEach(el=>{el.href='mailto:'+el.dataset.u+'@'+el.dataset.d;});
function detectInitialLanguage(){
 const q=new URLSearchParams(location.search).get('lang');if(['no','en','fa'].includes(q))return q;
 try{const saved=localStorage.getItem('setaei-lang');if(['no','en','fa'].includes(saved))return saved}catch{}
 if(location.pathname.startsWith('/en/'))return'en';
 const nav=(navigator.language||'en').toLowerCase();
 if(nav.startsWith('fa')||nav.startsWith('prs'))return'fa';
 if(nav.startsWith('no')||nav.startsWith('nb')||nav.startsWith('nn'))return'no';
 return'en';
}
setLanguage(detectInitialLanguage(),false);
  // ── video popup (gallery tiles with data-video) ─────────────
  const videoOverlay = document.getElementById('videoOverlay');
  const videoModal   = document.getElementById('videoModal');
  const videoPlayer   = document.getElementById('videoModalPlayer');
  function openVideo(src, poster) {
    videoPlayer.poster = poster || '';
    videoPlayer.src = src;
    videoOverlay.classList.add('open');
    videoModal.classList.add('open');
    videoOverlay.setAttribute('aria-hidden', 'false');
    videoModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    videoPlayer.play().catch(() => {});
  }
  function closeVideo() {
    videoOverlay.classList.remove('open');
    videoModal.classList.remove('open');
    videoOverlay.setAttribute('aria-hidden', 'true');
    videoModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
  }
  document.querySelectorAll('.js-video-tile').forEach(el => {
    el.addEventListener('click', () => openVideo(el.dataset.video, el.dataset.poster));
  });
  document.getElementById('videoClose').addEventListener('click', closeVideo);
  videoOverlay.addEventListener('click', closeVideo);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && videoModal.classList.contains('open')) closeVideo();
  });

  // ── contact modal ──────────────────────────────────────────
  const contactOverlay = document.getElementById('contactOverlay');
  const contactSheet   = document.getElementById('contactSheet');
  const contactForm    = document.getElementById('contactForm');
  const contactStatus  = document.getElementById('contactStatus');
  const contactSubmit  = document.getElementById('contactSubmit');
  const contactSuccess = document.getElementById('contactSuccess');

  function openContact() {
    contactOverlay.classList.add('open');
    contactSheet.classList.add('open');
    contactOverlay.setAttribute('aria-hidden', 'false');
    contactSheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { const f = document.getElementById('cf-name'); if (f) f.focus(); }, 350);
  }
  function closeContact() {
    contactOverlay.classList.remove('open');
    contactSheet.classList.remove('open');
    contactOverlay.setAttribute('aria-hidden', 'true');
    contactSheet.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Reset back to the form for next time, after the close transition ends —
    // avoids a visible flash of the form underneath the success state.
    setTimeout(() => {
      if (!contactSheet.classList.contains('open')) showContactForm();
    }, 400);
  }
  function showContactSuccess() {
    contactForm.hidden = true;
    contactSuccess.hidden = false;
    const closeBtn = document.getElementById('contactSuccessClose');
    if (closeBtn) closeBtn.focus();
  }
  function showContactForm() {
    contactSuccess.hidden = true;
    contactForm.hidden = false;
    contactForm.reset();
    contactForm.querySelectorAll('input, textarea, button').forEach(el => el.disabled = false);
    setContactStatus('', '');
  }
  document.getElementById('contactSuccessClose').addEventListener('click', closeContact);
  document.querySelectorAll('.js-open-contact').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();

      openContact();
    });
  });
  document.getElementById('contactClose').addEventListener('click', closeContact);
  contactOverlay.addEventListener('click', closeContact);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && contactSheet.classList.contains('open')) closeContact();
  });

  function setContactStatus(msg, kind) {
    contactStatus.textContent = msg;
    contactStatus.className = 'status ' + (kind || '');
  }

  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    const lang = document.documentElement.lang;
    setContactStatus(lang === 'fa' ? 'در حال ارسال…' : lang === 'en' ? 'Sending…' : 'Sender…', '');
    contactSubmit.disabled = true;
    const fd = new FormData(contactForm);
    const payload = {
      name:    (fd.get('name')    || '').toString().trim(),
      company: (fd.get('company') || '').toString().trim(),
      email:   (fd.get('email')   || '').toString().trim(),
      phone:   (fd.get('phone')   || '').toString().trim(),
      message: (fd.get('message') || '').toString().trim(),
      source:  (fd.get('source')  || 'homepage').toString().trim(),
      website: (fd.get('website') || '').toString().trim()
    };
    try {
      const r = await fetch('/api/homepage-contact.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const d = await r.json().catch(() => ({}));
      if (d.ok) {
        showContactSuccess();
      } else {
        setContactStatus(d.error || (lang === 'fa' ? 'ارسال پیام انجام نشد. لطفاً مستقیماً به khabat@setai.no ایمیل بزنید.' : lang === 'en' ? 'Could not send the message. Please email khabat@setai.no directly.' : 'Klarte ikke å sende meldingen. Send gjerne en e-post til khabat@setai.no i mellomtiden.'), 'err');
        contactSubmit.disabled = false;
      }
    } catch (err) {
      setContactStatus(lang === 'fa' ? 'خطای شبکه. دوباره تلاش کنید یا مستقیماً به khabat@setai.no ایمیل بزنید.' : lang === 'en' ? 'Network error. Please try again, or email khabat@setai.no directly.' : 'Nettverksfeil. Prøv igjen, eller send en e-post til khabat@setai.no i mellomtiden.', 'err');
      contactSubmit.disabled = false;
    }
  });

// Restore focus and keep keyboard navigation within the contact dialog.
let returnFocus;
document.querySelectorAll('.js-open-contact').forEach(el=>el.addEventListener('click',()=>{returnFocus=el}));
contactSheet.addEventListener('keydown',e=>{
 if(e.key!=='Tab')return;
 const items=[...contactSheet.querySelectorAll('button,input,textarea,a[href]')].filter(el=>!el.disabled&&el.getClientRects().length);
 const first=items[0],last=items[items.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});
const closeWatch=new MutationObserver(()=>{if(!contactSheet.classList.contains('open'))returnFocus?.focus()});
closeWatch.observe(contactSheet,{attributes:true,attributeFilter:['class']});
})();
