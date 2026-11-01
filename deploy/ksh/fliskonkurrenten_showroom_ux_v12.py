#!/usr/bin/env python3
"""KSH showroom v12 - darker default lighting and self-explanatory touch controls."""
from pathlib import Path
from datetime import datetime, timezone
import shutil

root=Path('/var/www/setai/ksh/fliskonkurrenten')
roomjs=root/'assets/bathroom-v11-1/room.js'
html=root/'showroom/index.html'
css=root/'assets/ksh-showroom-v12.css'
stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')

def replace_once(value,a,b):
    count=value.count(a)
    if count!=1: raise RuntimeError(f'Expected 1 match ({count}) for: {a[:75]}')
    return value.replace(a,b,1)

js=roomjs.read_text()
if 'KSH_SHOWROOM_UX_V12' not in js:
    before=js
    js=replace_once(js,"const shapes={room:", "/* KSH_SHOWROOM_UX_V12 | visible tool names, understandable product icon, calm room light */\nconst shapes={room:")
    js=replace_once(js,"products:'<path d=\"M4 9h16v12H4Z M8 9V4h8v5 M2 14h20\"/>'","products:'<path d=\"M5 8h14l1 13H4L5 8Z M9 8V6a3 3 0 0 1 6 0v2 M12 11v7 M8.5 14.5h7\"/>'")
    js=replace_once(js,"const labels={room:'Rommål',floor:'Gulv',products:'Produkter',light:'Lys',camera:'Nullstill kamera',views:'Kameravisninger',budget:'Prisberegning'};",
       "const labels={room:'Rom og mål',floor:'Gulv og fliser',products:'Legg til eller fjern produkt',light:'Juster belysning',camera:'Nullstill kamera',views:'Velg kameravinkel',budget:'Pris og mengder'};\nconst visibleLabels={room:'Rom og mål',floor:'Gulv',products:'+ Produkt',light:'Lys',camera:'Nullstill',views:'Se rommet',budget:'Pris'};")
    js=replace_once(js,"${icon(k)}<span class=\"sr5-tooltip\">${labels[k]}</span></button>","${icon(k)}<span class=\"sr12-tool-label\" aria-hidden=\"true\">${visibleLabels[k]}</span><span class=\"sr5-tooltip\">${labels[k]}</span></button>")
    js=replace_once(js,"state.lightBrightness=Number.isFinite(+raw?.room?.lightBrightness)\n ?Math.max(20,Math.min(180,Number(raw.room.lightBrightness))):100;",
       "state.lightBrightness=raw?.room?.lightCustomized && Number.isFinite(+raw?.room?.lightBrightness)\n ?Math.max(20,Math.min(180,Number(raw.room.lightBrightness))):78;")
    js=replace_once(js,"this.sun.intensity=(s.daylight==='evening'?1.6:3.3)*factor;","this.sun.intensity=(s.daylight==='evening'?1.35:3.0)*factor;")
    js=replace_once(js,"if(ambient)ambient.intensity=.55+.65*factor;","if(ambient)ambient.intensity=.42+.55*factor;")
    js=replace_once(js,"this.renderer.toneMappingExposure=(s.daylight==='evening'?1.04:1.15)*Math.pow(factor,.48);",
       "this.renderer.toneMappingExposure=(s.daylight==='evening'?.98:1.08)*Math.pow(factor,.42);")
    js=replace_once(js,"'Rommet er tomt. Åpne produktikonet for å legge inn en modell.'","'Rommet er tomt. Trykk «+ Produkt» for å legge inn et produkt.'")
    js=replace_once(js,"state.lightTemperature=b.dataset.day==='day'?5500:3000;\n    update();",
       "state.lightTemperature=b.dataset.day==='day'?5500:3000;\n    state.lightCustomized=true;\n    update();")
    js=replace_once(js,"state.lightBrightness=+brightness.value;options.querySelector",
       "state.lightBrightness=+brightness.value;state.lightCustomized=true;options.querySelector")
    js=replace_once(js,"state.lightTemperature=+temperature.value;options.querySelector",
       "state.lightTemperature=+temperature.value;state.lightCustomized=true;options.querySelector")
    js=replace_once(js,"options.innerHTML='<p>Legg til eller fjern hvert produkt når du vil.",
       "options.innerHTML='<p><strong>Trykk «＋» for å legge til og «−» for å fjerne et produkt.</strong> Etter at du legger til et produkt, vender kameraet mot plasseringen. Valgene blir lagret.</p><p class=\"sr12-secondary\">")
    # Check replacement above: concatenation may require original rest of sentence; avoid invalid JS
    # More readable product guidance by replacing whole exact paragraph sequence
    js=replace_once(js,"Valgene og budsjettet lagres automatisk.</p>'+","Budsjettet oppdateres automatisk.</p>'+")
    js=replace_once(js,"'<small>'+(on?'I rommet · trykk for å fjerne':'Legg til i rommet')",
       "'<small>'+(on?'I rommet – trykk for å fjerne':'Trykk for å legge til i rommet')")
    js=replace_once(js,"'<button type=\"button\" class=\"sr8-clear\" id=\"sr8-clear\"",
       "'<button type=\"button\" class=\"sr8-clear\" id=\"sr8-clear\"")
    assert before!=js and js.count('KSH_SHOWROOM_UX_V12')==1
    shutil.copy2(roomjs,roomjs.with_name('room.js.bak.ux12-'+stamp))
    temp=roomjs.with_suffix('.js.tmp')
    temp.write_text(js)
    temp.chmod(0o644)
    temp.replace(roomjs)
    print('UPDATED_JS',roomjs,len(js))
else: print('JS_ALREADY_UPDATED')

css.write_text("""
/* KSH_SHOWROOM_UX_V12 - touch-first labeled toolbar */
#reisen .sr5-tools {
  position:absolute;
  top:13px;
  left:13px;
  right:13px;
  max-width:calc(100% - 84px);
  display:flex;
  flex-wrap:wrap;
  align-items:stretch;
  justify-content:flex-start;
  gap:7px;
  z-index:30;
  pointer-events:auto;
}
#reisen .sr5-tools button {
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:3px;
  box-sizing:border-box;
  flex:0 0 67px;
  width:67px;
  height:57px;
  min-width:0;
  min-height:57px;
  padding:6px 4px 5px;
  border:1px solid rgba(34,38,35,.12);
  border-radius:12px;
  background:rgba(251,249,243,.97);
  color:#202720;
  box-shadow:0 4px 16px rgba(15,20,15,.10);
  -webkit-tap-highlight-color:transparent;
  touch-action:manipulation;
}
#reisen .sr5-tools button svg {display:block;width:21px;height:21px;flex:0 0 21px}
#reisen .sr5-tools .sr12-tool-label {
  display:block;
  font:700 10px/1.18 'DM Sans',Arial,sans-serif;
  color:inherit;
  letter-spacing:-.014em;
  text-align:center;
  white-space:nowrap;
  overflow:visible;
}
#reisen .sr5-tools button[data-tool="products"] {
  color:#fff;
  background:#305247;
  border-color:#305247;
  box-shadow:0 4px 17px rgba(21,45,38,.32);
}
#reisen .sr5-tools button[data-tool="products"] .sr12-tool-label {font-weight:800}
#reisen .sr5-tools button[aria-expanded="true"] {background:#293b32;color:#fff;border-color:#293b32}
#reisen .sr5-tools button:focus-visible {outline:3px solid #f2b96e;outline-offset:2px}
#reisen .sr5-tooltip {display:none!important}
#reisen .sr11-fullscreen {z-index:35!important}
#reisen .sr5-tools button[data-tool="products"] svg{stroke-width:1.85}
#reisen #sr5-options .sr12-secondary{color:#666b63;font-size:12px;margin-top:-6px}
#reisen .sr5-drawer{z-index:45}
@media(max-width:420px){
 #reisen .sr5-tools{max-width:calc(100% - 82px);gap:5px}
 #reisen .sr5-tools button{flex-basis:58px;width:58px;height:55px;min-height:55px;padding:5px 2px}
 #reisen .sr5-tools .sr12-tool-label{font-size:9.5px}
 #reisen .sr5-tools button svg{width:20px;height:20px;flex-basis:20px}
}
@media(max-width:350px){
 #reisen .sr5-tools button{flex-basis:52px;width:52px}
 #reisen .sr5-tools .sr12-tool-label{font-size:8.5px}
}
@media(min-width:421px) and (max-width:750px) {
 #reisen .sr5-tools{max-width:calc(100% - 90px)}
 #reisen .sr5-tools button{flex-basis:64px;width:64px}
}
@media(prefers-reduced-motion:reduce){#reisen .sr5-tools button{transition:none!important}}
""".strip()+'\n')
css.chmod(0o644)
markup=html.read_text()
tag='<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/ksh-showroom-v12.css?v=12">'
if tag not in markup:
    if markup.count('</head>')!=1:raise RuntimeError('Invalid head')
    shutil.copy2(html,html.with_name('index.html.bak.ux12-'+stamp))
    out=markup.replace('</head>',tag+'</head>')
    out=out.replace('Velg produkter og materialer med ikonene. Budsjettet følger valgene dine.',
      'Start med «+ Produkt», juster gulv og rommål, og velg kameravinkel. Alle knappene har navn, og budsjettet oppdateres automatisk.')
    out=out.replace('/assets/bathroom-v11-1/room.js?v=11.1','/assets/bathroom-v11-1/room.js?v=12')
    tmp=html.with_suffix('.html.tmp');tmp.write_text(out);tmp.chmod(0o644);tmp.replace(html)
print('PUBLISHED_HTML',html,'CSS',css)
