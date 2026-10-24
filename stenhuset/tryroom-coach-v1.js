/* Stenhuset "Prøv i mitt rom": scan coach. A minimal animated phone + arrow in the middle of the view that tells the customer how
 * to move so the room is scanned properly. Steps: 'hold' (keep still), 'floor' (point down at the floor), 'sweep' (pan slowly left/right
 * along the walls), 'up' (lift the phone so a wall shows), 'done' (check mark, then fades out). Shared by the AR and camera modes. */
const CSS=`
.tc{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);z-index:7;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;opacity:0;transition:opacity .35s}
.tc.on{opacity:1}
.tc svg{width:92px;height:92px;overflow:visible;filter:drop-shadow(0 2px 8px rgba(0,0,0,.55))}
.tc .tc-t{background:rgba(20,20,18,.72);color:#fff;padding:8px 14px;border-radius:999px;font:600 13px/1.3 var(--sans,system-ui,sans-serif);text-align:center;max-width:260px}
.tc .tc-c{display:flex;gap:6px}
.tc .tc-c span{background:rgba(20,20,18,.6);color:#fff;border-radius:999px;padding:4px 10px;font:600 11px/1.3 var(--sans,system-ui,sans-serif)}
.tc .tc-c span.ok{background:rgba(232,211,174,.95);color:#242725}
.tc .tc-fast{background:#e8a35f;color:#242725;border-radius:999px;padding:5px 12px;font:700 11px/1 var(--sans,system-ui,sans-serif);letter-spacing:.06em;text-transform:uppercase;display:none}
.tc.fast .tc-fast{display:block}
.tc .ph,.tc .ar1,.tc .ar2,.tc .ck{transform-box:fill-box;transform-origin:center}
.tc .ar1,.tc .ar2,.tc .ck{display:none}
.tc[data-s=hold] .ph{animation:tc-breathe 2.4s ease-in-out infinite}
.tc[data-s=floor] .ph{animation:tc-tilt 2s ease-in-out infinite}
.tc[data-s=floor] .ar1{display:block;animation:tc-down 1.2s ease-in-out infinite}
.tc[data-s=up] .ph{animation:tc-tiltup 2s ease-in-out infinite}
.tc[data-s=up] .ar1{display:block;transform:rotate(180deg) translateY(76px);animation:tc-up 1.2s ease-in-out infinite}
.tc[data-s=sweep] .ph{animation:tc-sweep 2.8s ease-in-out infinite}
.tc[data-s=sweep] .ar2{display:block;animation:tc-fade 2.8s ease-in-out infinite}
.tc[data-s=done] .ph{display:none}
.tc[data-s=done] .ck{display:block;animation:tc-pop .45s ease-out both}
@keyframes tc-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes tc-tilt{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(6px) scaleY(.82)}}
@keyframes tc-tiltup{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-6px) scaleY(.82)}}
@keyframes tc-down{0%,100%{transform:translateY(0);opacity:.55}50%{transform:translateY(9px);opacity:1}}
@keyframes tc-up{0%,100%{transform:rotate(180deg) translateY(76px);opacity:.55}50%{transform:rotate(180deg) translateY(85px);opacity:1}}
@keyframes tc-sweep{0%,100%{transform:translateX(-24px) rotate(-7deg)}50%{transform:translateX(24px) rotate(7deg)}}
@keyframes tc-fade{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes tc-pop{0%{transform:scale(.4);opacity:0}100%{transform:scale(1);opacity:1}}
@media(prefers-reduced-motion:reduce){.tc *{animation:none!important}}`;
const SVG=`<svg viewBox="-50 -50 100 100" aria-hidden="true">
 <g class="ar2" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M-46 0h14M-40 -6l-6 6 6 6"/><path d="M46 0h-14M40 -6l6 6-6 6"/></g>
 <g class="ph"><rect x="-15" y="-26" width="30" height="52" rx="6" fill="rgba(20,20,18,.55)" stroke="#fff" stroke-width="3"/><circle cx="0" cy="-17" r="2.2" fill="#fff"/></g>
 <g class="ar1" fill="none" stroke="#e8d3ae" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M0 31v14M-7 38l7 7 7-7"/></g>
 <g class="ck"><circle r="26" fill="rgba(232,211,174,.95)"/><path d="M-11 0l7 8 15-16" fill="none" stroke="#242725" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>
</svg>`;

export function createCoach(parent){
  if(!document.getElementById('tc-css')){const s=document.createElement('style');s.id='tc-css';s.textContent=CSS;document.head.appendChild(s);}
  const el=document.createElement('div');el.className='tc';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
  el.innerHTML=SVG+'<div class="tc-t"></div><div class="tc-c"></div><div class="tc-fast">Litt saktere</div>';
  parent.appendChild(el);
  const txt=el.querySelector('.tc-t'),chips=el.querySelector('.tc-c');
  let step=null,hideT=0,fastT=0;
  return {
    /* show a step with its text; 'done' hides itself after a moment */
    set(s,text){
      if(s===step&&txt.textContent===text)return;
      step=s;el.dataset.s=s;txt.textContent=text||'';el.classList.add('on');clearTimeout(hideT);
      if(s==='done')hideT=setTimeout(()=>{el.classList.remove('on');},1700);
    },
    chips(list){chips.innerHTML=list.map(c=>`<span class="${c[1]?'ok':''}">${c[1]?'✓ ':''}${c[0]}</span>`).join('');},
    fast(){el.classList.add('fast');clearTimeout(fastT);fastT=setTimeout(()=>el.classList.remove('fast'),1200);},
    hide(){step=null;el.classList.remove('on');},
    get step(){return step;},
    remove(){el.remove();}
  };
}
