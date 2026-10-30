"""SETAEI GBP private metrics dashboard. Does not alter Google accounts or profiles.

Registered on the existing OAuth Flask application, reusing its admin session.
All persisted numbers originate from Google APIs; there are no example KPIs.
"""
import json
import os
import re
import sqlite3
from datetime import date, timedelta
from pathlib import Path

from flask import Blueprint, Response, abort, jsonify, render_template_string, request

DB_PATH = Path(os.environ.get('SETAEI_GBP_DASHBOARD_DB', '/var/lib/setai-gbp/dashboard.sqlite3'))
B = Blueprint('setai_gbp_dashboard', __name__)
METRICS = {
    'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH': 'Search desktop',
    'BUSINESS_IMPRESSIONS_MOBILE_SEARCH': 'Search mobil',
    'BUSINESS_IMPRESSIONS_DESKTOP_MAPS': 'Maps desktop',
    'BUSINESS_IMPRESSIONS_MOBILE_MAPS': 'Maps mobil',
    'WEBSITE_CLICKS': 'Nettstedsklikk',
    'CALL_CLICKS': 'Telefonklikk',
    'BUSINESS_DIRECTION_REQUESTS': 'Veibeskrivelser',
}


def open_db():
    db = sqlite3.connect(f'file:{DB_PATH}?mode=ro', uri=True, timeout=3)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA busy_timeout=3000')
    return db


def must_be_admin():
    # This dashboard has no public API. Only the existing authenticated session.
    from flask import session
    if session.get('admin') is not True:
        abort(403)


def as_dict(row):
    return dict(row) if row else None


def dashboard_payload(location=None, days=30):
    result = dict(connected=False, updated_at=None, locations=[], selected=None,
                  days=days, summary={}, trend=[], keywords=[], reviews=[],
                  statuses=[], errors=[], account_name=None)
    if not DB_PATH.is_file():
        result['errors'] = ['Første Google-synkronisering er ikke utført ennå.']
        return result
    with open_db() as db:
        meta = db.execute('SELECT value FROM meta WHERE key=?', ('last_success_utc',)).fetchone()
        result['updated_at'] = meta['value'] if meta else None
        rows = db.execute('''SELECT id,title,website,account_id,place_id,store_code,
                        address,verification_state,last_seen_utc FROM locations ORDER BY id''').fetchall()
        result['locations'] = [dict(r) for r in rows]
        if not rows:
            result['errors'] = ['Ingen profiler funnet i synkroniserte data.']
            return result
        valid = {r['id'] for r in rows}
        if location not in valid:
            location = rows[0]['id']
        result['selected'] = location
        result['connected'] = True
        result['account_name'] = rows[0]['account_id']
        for row in db.execute('SELECT source,status,detail,checked_at FROM source_status WHERE location_id=? ORDER BY source', (location,)):
            result['statuses'].append(dict(row))
        oldest = (date.today() - timedelta(days=days)).isoformat()
        points = db.execute('''SELECT day,metric,value FROM daily_metrics
                    WHERE location_id=? AND day>=? ORDER BY day ASC''', (location,oldest)).fetchall()
        byday = {}
        for r in points:
            byday.setdefault(r['day'], {'date':r['day']})[r['metric']] = r['value']
        result['trend'] = list(byday.values())
        start = (date.today() - timedelta(days=days - 1)).isoformat()
        values = db.execute('''SELECT metric, SUM(value) AS total, COUNT(*) AS records
                   FROM daily_metrics WHERE location_id=? AND day>=?
                   GROUP BY metric''',(location,start)).fetchall()
        result['summary'] = {r['metric']: int(r['total']) for r in values if r['records']}
        month = db.execute('''SELECT period FROM keyword_metrics
                 WHERE location_id=? ORDER BY period DESC LIMIT 1''', (location,)).fetchone()
        if month:
            result['keyword_period'] = month['period']
            result['keywords'] = [dict(r) for r in db.execute('''SELECT keyword,value,threshold
               FROM keyword_metrics WHERE location_id=? AND period=?
               ORDER BY value IS NULL, value DESC, threshold DESC, keyword LIMIT 100''',(location,month['period']))]
        else:
            result['keyword_period'] = None
        result['reviews'] = [dict(r) for r in db.execute('''SELECT rating,reviewer,comment,review_time,reply
              FROM reviews WHERE location_id=? ORDER BY review_time DESC LIMIT 12''',(location,))]
        state = db.execute('''SELECT average_rating,total_reviews FROM review_totals WHERE location_id=?''',(location,)).fetchone()
        result['review_summary'] = as_dict(state)
    return result


@B.get('/seo/google/dashboard')
@B.get('/seo/google/dashboard/')
def page():
    must_be_admin()
    return render_template_string(DASHBOARD_HTML)


@B.get('/seo/google/dashboard.js')
def dashboard_js():
    must_be_admin()
    return Response(DASHBOARD_JS, mimetype='application/javascript')


@B.get('/seo/google/api/dashboard')
def api_dashboard():
    must_be_admin()
    raw_days = request.args.get('days', '30')
    days = int(raw_days) if raw_days in ('7','30','90') else 30
    location = request.args.get('location','')
    if location and not re.fullmatch(r'locations/\d{1,30}',location):
        return jsonify({'error':'Ugyldig profil-ID'}),400
    try:
        return jsonify(dashboard_payload(location=location,days=days))
    except (sqlite3.Error, OSError):
        return jsonify({'error':'Kunne ikke åpne privat Google-datalager.'}),503


DASHBOARD_JS = r'''(()=>{'use strict';
const $=id=>document.getElementById(id); const f=new Intl.NumberFormat('nb-NO'); const state={days:30,location:''};
const text=(el,value)=>{el.textContent=String(value)}; const el=(tag,cls,content)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(content!==undefined)x.textContent=String(content);return x};
const format=(v)=>Number.isFinite(v)?f.format(v):'—';const sum=(s,keys)=>{let exists=false,total=0;for(const k of keys){if(Object.prototype.hasOwnProperty.call(s,k)){exists=true;total+=Number(s[k])||0}}return exists?total:null};
function lineGraph(days){const metrics=[['Search',['BUSINESS_IMPRESSIONS_DESKTOP_SEARCH','BUSINESS_IMPRESSIONS_MOBILE_SEARCH'],'#17243b'],['Maps',['BUSINESS_IMPRESSIONS_DESKTOP_MAPS','BUSINESS_IMPRESSIONS_MOBILE_MAPS'],'#ed8e42']];
const points=days.slice(-90);const series=metrics.map(m=>points.map(p=>sum(p,m[1])));if(!series.some(a=>a.some(v=>v!==null))){$('chart').replaceChildren(el('p','hint','Foreløpig ingen tilgjengelige daglige visningsdata.'));return}
const max=Math.max(1,...series.flat().filter(v=>v!==null));const W=740,H=260,L=44,R=20,T=14,B=40,w=W-L-R,h=H-T-B;let svg='<svg role="img" aria-label="Historikk for daglige Search- og Maps-visninger" viewBox="0 0 '+W+' '+H+'">';
for(let i=0;i<=4;i++){const y=T+h-i*h/4;svg+='<line x1="'+L+'" y1="'+y+'" x2="'+(W-R)+'" y2="'+y+'" stroke="#e5e9f0"/><text x="'+(L-8)+'" y="'+(y+4)+'" fill="#8a98ab" font-size="11" text-anchor="end">'+Math.round(max*i/4)+'</text>'}
series.forEach((arr,j)=>{let run=[];const flush=()=>{if(run.length>0)svg+='<polyline points="'+run.join(' ')+'" fill="none" stroke="'+metrics[j][2]+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';run=[]};arr.forEach((v,i)=>{if(v===null){flush();return}const x=L+(points.length<=1?w/2:i*w/(points.length-1));const y=T+h-v/max*h;run.push(x.toFixed(2)+','+y.toFixed(2))});flush()});
if(points.length){svg+='<text x="'+L+'" y="'+(H-9)+'" fill="#8997a8" font-size="11">'+points[0].date.slice(5)+'</text><text x="'+(W-R)+'" y="'+(H-9)+'" fill="#8997a8" font-size="11" text-anchor="end">'+points.at(-1).date.slice(5)+'</text>'}svg+='</svg>';$('chart').innerHTML=svg}
function update(v){let locSelect=$('location');const choices=v.locations||[];if(locSelect.options.length!==choices.length||Array.from(locSelect.options).some((o,i)=>o.value!==choices[i].id)){locSelect.replaceChildren(...choices.map(x=>{const o=el('option','',x.title+' · '+x.id.split('/').pop());o.value=x.id;return o}));}if(v.selected){state.location=v.selected;locSelect.value=v.selected}
const note=$('notice');let notes=[];if(choices.length>1)notes.push(choices.length+' SETAEI-oppføringer funnet. Velg én profil om gangen. Mulige duplikater må kontrolleres før tall kan kombineres.');if(v.errors?.length)notes.push(...v.errors);if(v.statuses?.some(x=>x.status==='error'))notes.push('Noen Google-API-er svarte med feil. Se datakildene nedenfor.');note.classList.toggle('hidden',!notes.length);text(note,notes.join(' '));text($('stamp'),v.updated_at?'Siste vellykkede synkronisering: '+v.updated_at+' UTC · Profil: '+v.selected:'Ingen fullført synkronisering registrert ennå');
const s=v.summary||{};text($('search'),format(sum(s,['BUSINESS_IMPRESSIONS_DESKTOP_SEARCH','BUSINESS_IMPRESSIONS_MOBILE_SEARCH'])));text($('maps'),format(sum(s,['BUSINESS_IMPRESSIONS_DESKTOP_MAPS','BUSINESS_IMPRESSIONS_MOBILE_MAPS'])));text($('website'),format(s.WEBSITE_CLICKS));text($('calls'),format(s.CALL_CLICKS));lineGraph(v.trend||[]);
const actions=$('actions');actions.replaceChildren();for(const [label,key] of [['Veibeskrivelser','BUSINESS_DIRECTION_REQUESTS'],['Nettstedsklikk','WEBSITE_CLICKS'],['Telefonklikk','CALL_CLICKS']]){const r=el('div','status');r.append(el('span','',label),el('strong','',format(s[key])));actions.append(r)}
text($('keywordperiod'),v.keyword_period?'Måned: '+v.keyword_period+' · Antall visninger, ikke søkerangering':'Månedlige søkeord · Google-data ikke tilgjengelig');let keywords=$('keywords');keywords.replaceChildren();if(!v.keywords?.length){let tr=el('tr');let td=el('td','hint','Ingen søkeorddata returnert');td.colSpan=2;tr.append(td);keywords.append(tr)}else{for(const k of v.keywords){const tr=el('tr');tr.append(el('td','',k.keyword),el('td','right',k.value!==null?format(k.value):('< '+format(k.threshold))));keywords.append(tr)}}
text($('rating'),v.review_summary?.total_reviews!==undefined?'Google-anmeldelser: '+format(v.review_summary.total_reviews)+' · Gj.snitt '+v.review_summary.average_rating:'Kun tilgjengelig for verifiserte profiler');const reviews=$('reviews');reviews.replaceChildren();if(!v.reviews?.length)reviews.append(el('p','hint','Ingen anmeldelser er tilgjengelige for denne profilen.'));else for(const r of v.reviews){const item=el('div','review');const header=el('div');header.append(el('span','stars','★'.repeat(Math.max(0,Math.min(5,Number(r.rating)||0)))) ,document.createTextNode(' '));header.append(el('strong','',r.reviewer||'Google-bruker'));item.append(header);if(r.comment)item.append(el('p','',r.comment));if(r.reply)item.append(el('p','hint','Svar: '+r.reply));reviews.append(item)}
const prof=$('profiles');prof.replaceChildren();if(!choices.length)prof.append(el('p','hint','Profiler kommer etter første synkronisering.'));else for(const l of choices){const row=el('div','status');let left=el('div');left.append(el('strong','',l.title),el('div','label',l.id));if(l.website)left.append(el('div','hint',l.website));row.append(left);row.append(el('span','hint',l.verification_state||'Status ikke kjent'));prof.append(row)}
const statuses=$('statuses');statuses.replaceChildren();if(!v.statuses?.length)statuses.append(el('p','hint','Datakildenes status vises etter synkronisering.'));else for(const x of v.statuses){const row=el('div','status'),l=el('div');l.append(el('strong','',x.source));if(x.detail)l.append(el('div','hint',x.detail));row.append(l,el('span',x.status==='ok'?'ok':'err',x.status==='ok'?'OK':'Feil'));statuses.append(row)}
}
async function load(){try{const q=new URLSearchParams({days:String(state.days)});if(state.location)q.set('location',state.location);const r=await fetch('/seo/google/api/dashboard?'+q,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);update(await r.json());}catch(e){$('notice').classList.remove('hidden');text($('notice'),'Kunne ikke hente private Google-data ('+e.message+'). Kontroller innlogging og datatjeneste.')}}
$('location').addEventListener('change',e=>{state.location=e.target.value;load()});document.querySelectorAll('[data-days]').forEach(b=>b.addEventListener('click',()=>{state.days=Number(b.dataset.days);document.querySelectorAll('[data-days]').forEach(x=>x.classList.toggle('active',x===b));load()}));load();
})();'''

DASHBOARD_HTML = r'''<!doctype html><html lang="no"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>SETAEI / Google Performance</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Arial,sans-serif;color-scheme:light;--ink:#202d43;--sub:#738098;--gold:#eb852f;--bg:#f5f7fb;--line:#e6eaf2;--navy:#17243b;--green:#168362}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink)}a{color:inherit}button,select{font:inherit}button{cursor:pointer}button:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid #f59c4a;outline-offset:2px}
.shell{max-width:1350px;padding:26px clamp(16px,3vw,46px) 90px;margin:auto}.nav{display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap;padding:7px 0 24px;border-bottom:1px solid var(--line)}.logo{font-size:22px;letter-spacing:-.9px;font-weight:850;color:var(--navy)}.logo b{color:var(--gold)}.navlinks{display:flex;gap:13px;align-items:center;flex-wrap:wrap}.navlinks a{font-size:13px;text-decoration:none;color:#54637d}.navlinks a:hover{text-decoration:underline}
.eyebrow{color:var(--gold);font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:800}.hero{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:34px 0 22px}.hero h1{font-size:clamp(27px,4vw,42px);line-height:1.1;letter-spacing:-1.6px;margin:10px 0}.hero p{margin:8px 0;color:var(--sub);font-size:14px;max-width:670px}.toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.select,.period{background:white;border:1px solid var(--line);border-radius:12px;padding:12px 14px;color:var(--navy);max-width:100%;box-shadow:0 4px 22px #1d2d4510}.period{display:flex;gap:3px;padding:4px}.period button{border:0;border-radius:9px;background:transparent;padding:9px 12px;color:#64748b;font-weight:700;font-size:13px}.period button.active{background:var(--navy);color:white}
.notice{border:1px solid #f3d3a5;background:#fff7ec;border-radius:14px;padding:15px 19px;color:#945215;font-size:13px;margin:0 0 22px}.notice.hidden{display:none}.stamp{font-size:12px;color:var(--sub);padding:6px 0 18px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px}.panel{background:white;border:1px solid var(--line);border-radius:20px;padding:22px;box-shadow:0 10px 40px #1c2f4c06;min-width:0}.kpi{min-height:148px;display:flex;flex-direction:column;justify-content:space-between}.kpi .value{font-size:clamp(24px,3vw,39px);letter-spacing:-1px;font-weight:780}.kpi .name{color:var(--sub);font-size:13px;font-weight:650}.kpi .small{font-size:11px;color:#a1aabd}.kpi span.dot{display:inline-block;width:8px;height:8px;background:var(--gold);border-radius:50%;margin-right:8px}
.layout{display:grid;grid-template-columns:1.6fr 1fr;gap:16px;margin-top:18px}.panel h2{font-size:17px;margin:0 0 8px;letter-spacing:-.3px}.subtitle{font-size:12px;color:var(--sub);margin:0 0 21px}.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--sub);margin:12px 0}.chip{width:10px;height:10px;display:inline-block;border-radius:3px;margin-right:5px}.chart{width:100%;min-height:245px}.chart svg{display:block;width:100%;height:auto}.tablewrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:13px}th{text-align:left;color:#8690a2;font-size:11px;text-transform:uppercase;letter-spacing:.65px}td,th{padding:11px 6px;border-bottom:1px solid var(--line);vertical-align:top}td.right,th.right{text-align:right}tr:last-child td{border-bottom:0}.hint{color:var(--sub);font-size:12px;line-height:1.6}.label{font-size:11px;color:#7d8ca4;background:#eff3f8;padding:4px 7px;border-radius:6px;display:inline-block;max-width:100%;overflow-wrap:anywhere}.review{padding:15px 0;border-bottom:1px solid var(--line)}.review:last-child{border-bottom:0}.stars{color:var(--gold);letter-spacing:1px}.review strong{font-size:13px}.review p{font-size:12px;line-height:1.55;color:#59677d;white-space:pre-wrap}.status{display:flex;justify-content:space-between;gap:8px;padding:12px 0;border-bottom:1px solid var(--line);font-size:12px}.status:last-child{border-bottom:0}.ok{color:var(--green);font-weight:800}.err{color:#bd5f44;font-weight:800}.footer{font-size:12px;color:var(--sub);margin-top:20px;line-height:1.6}
@media(max-width:1020px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.layout{grid-template-columns:1fr}}@media(max-width:540px){.grid{gap:10px}.panel{padding:16px;border-radius:15px}.kpi{min-height:120px}.hero{padding-top:22px}.hero h1{font-size:30px}.toolbar{width:100%}.select{width:100%}.nav{align-items:start}.chart{min-height:180px}}
</style></head><body><div class="shell"><nav class="nav"><span class="logo">SETAE<b>I</b><span style="font-size:11px;color:#9aabbf;font-weight:600;letter-spacing:1.5px;margin-left:8px">CONTROL ROOM</span></span><div class="navlinks"><a href="/seo/">SEO-oversikt</a><a href="/seo/google/">Google-tilkobling</a><a href="/seo/google/locations">Profiler</a></div></nav>
<header class="hero"><div><div class="eyebrow">Google Business Profile / Live datakilde</div><h1>SETAEI <span style="font-weight:390;color:#8694a8">Performance</span></h1><p>Synlighet, henvendelser og søkeord fra Google Search og Maps. Ekte API-data, lagret historisk per bedriftsprofil.</p></div><div class="toolbar"><select id="location" class="select" aria-label="Velg Google-bedriftsprofil"><option>Laster profiler …</option></select><div class="period" aria-label="Datoperiode"><button data-days="7">7 d</button><button data-days="30" class="active">30 d</button><button data-days="90">90 d</button></div></div></header>
<div id="notice" class="notice hidden" role="status"></div><div id="stamp" class="stamp">Laster data fra privat SETAEI-datalager …</div>
<section class="grid" aria-label="Nøkkeltall"><article class="panel kpi"><div class="name"><span class="dot"></span>Search-visninger</div><div class="value" id="search">—</div><div class="small">Desktop + mobil</div></article><article class="panel kpi"><div class="name"><span class="dot"></span>Maps-visninger</div><div class="value" id="maps">—</div><div class="small">Desktop + mobil</div></article><article class="panel kpi"><div class="name"><span class="dot"></span>Nettstedsklikk</div><div class="value" id="website">—</div><div class="small">Klikk fra bedriftsprofil</div></article><article class="panel kpi"><div class="name"><span class="dot"></span>Telefonklikk</div><div class="value" id="calls">—</div><div class="small">Ikke bekreftede samtaler</div></article></section>
<div class="layout"><section class="panel"><h2>Synlighet over tid</h2><p class="subtitle">Daglige visninger på Google Search og Maps</p><div id="chart" class="chart"><p class="hint">Laster graf …</p></div><div class="legend"><span><i class="chip" style="background:#17243b"></i>Search</span><span><i class="chip" style="background:#ed8e42"></i>Maps</span></div></section><section class="panel"><h2>Handlinger fra profilen</h2><p class="subtitle">Målt i valgt periode</p><div id="actions"></div><p class="hint">Google registrerer klikk og forespørsler, ikke faktiske telefonanrop eller salg.</p></section></div>
<div class="layout"><section class="panel"><h2>Oppdagede søkeord</h2><p class="subtitle" id="keywordperiod">Månedlige visninger fra Google Business Profile</p><div class="tablewrap"><table><thead><tr><th>Søkeord</th><th class="right">Antall / grense</th></tr></thead><tbody id="keywords"><tr><td colspan="2" class="hint">Venter på Google-data</td></tr></tbody></table></div></section><section class="panel"><h2>Anmeldelser</h2><p class="subtitle" id="rating">Kun tilgjengelig for verifiserte profiler</p><div id="reviews"></div></section></div>
<div class="layout"><section class="panel"><h2>Profilkontroll</h2><p class="subtitle">Google-oppføringene holdes adskilt til mulig duplisering er kontrollert</p><div id="profiles"></div></section><section class="panel"><h2>Datakilder og oppdateringer</h2><p class="subtitle">Hentestatus per API, ingen oppdiktede tall</p><div id="statuses"></div><p class="hint">Automatisk synkronisering via systemd-timer på VPS-en. Nye data blir synlige etter neste vellykkede kjøring.</p></section></div>
<footer class="footer">Privat SETAEI-dashboard · Google Business Profile API · Oppføringene summeres aldri på tvers før en administrator har vurdert profilene. Søkeordstatistikk er ikke organisk rangeringsposisjon.</footer></div>
<script src="/seo/google/dashboard.js" defer></script></body></html>'''


def register_dashboard(app):
    # Keep original OAuth CSP in place everywhere except the authenticated dashboard.
    # Insert at index zero because Flask runs app after_request callbacks in reverse order.
    def dashboard_security_headers(response):
        from flask import request as current_request
        if current_request.path in ('/seo/google/dashboard','/seo/google/dashboard/'):
            response.headers['Content-Security-Policy'] = (
                "default-src 'none'; style-src 'unsafe-inline'; script-src 'self'; "
                "connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
        elif current_request.path == '/seo/google/dashboard.js':
            response.headers['Content-Security-Policy'] = "default-src 'none'; base-uri 'none'"
        return response
    app.register_blueprint(B)
    app.after_request_funcs.setdefault(None, []).insert(0, dashboard_security_headers)