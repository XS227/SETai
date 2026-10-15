/* Lightweight browser-side preview gate; not server-side authentication. */
(function(){'use strict';
 const root=document.documentElement,key='setaei-eurojackpot-preview-v1';
 let approved=false;try{approved=sessionStorage.getItem(key)==='approved';}catch{}
 if(approved){root.removeAttribute('data-preview-locked');return;}
 root.setAttribute('data-preview-locked','');
 const style=document.createElement('style');
 style.textContent=`#preview-gate{position:fixed;inset:0;z-index:2147483647;display:grid!important;place-items:center;padding:24px;background:radial-gradient(ellipse at top,#30303b,#17171d 65%);color:#f1f0f5;font-family:system-ui,sans-serif;overflow:auto}#preview-gate *{box-sizing:border-box}#preview-gate .preview-card{width:min(440px,100%);padding:clamp(24px,5vw,40px);border:1px solid #44434f;border-radius:24px;background:#24242e;box-shadow:0 24px 90px #0005}#preview-gate .preview-brand{font-size:13px;letter-spacing:.18em;color:#93ddc2;margin:0 0 28px}#preview-gate h1{font-size:32px;line-height:1.2;letter-spacing:-.025em;margin:0 0 12px}#preview-gate p{font-size:15px;line-height:1.65;color:#c1bfcc;margin:0 0 24px}#preview-gate label{display:block;font-size:14px;margin-bottom:9px}#preview-gate input{display:block;width:100%;height:58px;border:1px solid #64616f;border-radius:12px;background:#18181f;color:#fff;padding:12px 16px;font-size:24px;letter-spacing:.2em;outline-offset:4px}#preview-gate button{width:100%;min-height:52px;border:0;border-radius:12px;margin-top:18px;font-size:16px;font-weight:650;background:#a5dfca;color:#143b31;cursor:pointer}#preview-gate input:focus-visible,#preview-gate button:focus-visible{outline:3px solid #e9bbcd}#preview-gate #preview-access-error{margin:14px 0 0;color:#f1a9c2;font-size:14px}#preview-gate [hidden]{display:none!important}`;
 document.head.append(style);
 function mount(){
  const gate=document.createElement('div');gate.id='preview-gate';gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');gate.setAttribute('aria-labelledby','preview-access-title');
  gate.innerHTML='<div class="preview-card"><div class="preview-brand">SETAEI · NUMBER LAB</div><h1 id="preview-access-title">Early preview</h1><p>Enter your access code to explore the SETAEI Number Lab.</p><form id="preview-access-form"><label for="preview-access-code">Access code</label><input id="preview-access-code" type="password" inputmode="numeric" autocomplete="one-time-code" maxlength="12" required aria-describedby="preview-access-error"><button type="submit">Enter the lab →</button><p id="preview-access-error" role="alert" hidden></p></form></div>';
  document.body.append(gate);const input=document.getElementById('preview-access-code'),error=document.getElementById('preview-access-error');
  document.getElementById('preview-access-form').addEventListener('submit',event=>{
   event.preventDefault();if(input.value.trim()!=='227'){error.textContent='That code is not correct. Please try again.';error.hidden=false;input.setAttribute('aria-invalid','true');input.select();return;}
   try{sessionStorage.setItem(key,'approved');}catch{}
   root.removeAttribute('data-preview-locked');gate.remove();
   const target=document.querySelector('main a,main button,main input');if(target)target.focus({preventScroll:true});
  });
  input.addEventListener('input',()=>{input.removeAttribute('aria-invalid');error.hidden=true;});input.focus();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
