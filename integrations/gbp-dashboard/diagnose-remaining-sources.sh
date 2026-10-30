#!/usr/bin/env bash
# Read-only diagnostic of GBP review permission and monthly search keyword availability.
set -Eeuo pipefail
if [ "$(id -u)" != 0 ]; then echo 'Run with sudo.'; exit 1; fi
/opt/setai-gbp/.venv/bin/python - <<'PY'
import os, re, sys, json, sqlite3
from pathlib import Path
from datetime import date
root=Path('/opt/setai-gbp')
envpath=Path('/etc/setai-gbp/service.env')
dbpath=Path('/var/lib/setai-gbp/dashboard.sqlite3')
if not envpath.is_file() or not dbpath.is_file():
    raise SystemExit('STOP: expected local configuration or dashboard database is absent')
for line in envpath.read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        key,value=line.split('=',1)
        if re.fullmatch(r'[A-Z][A-Z0-9_]*',key):
            os.environ[key]=value.strip().strip('"').strip("'")
os.chdir(root)
sys.path.insert(0,str(root))
try:
    import app, requests
    token=app.google_access_token()
except Exception as exc:
    print('OAUTH_TOKEN=ERROR',type(exc).__name__)
    raise SystemExit(2)

s=requests.Session()
s.headers['Authorization']='Bearer '+token
s.headers['X-GOOG-API-FORMAT-VERSION']='2'
with sqlite3.connect(dbpath) as db:
    rows=db.execute('SELECT id,account_id FROM locations ORDER BY id LIMIT 10').fetchall()
print('STORED_PROFILES=',len(rows))
if not rows: raise SystemExit('No synchronized locations; run the sync first.')
for loc,account in rows:
    if not re.fullmatch(r'locations/[0-9]{1,30}',loc):
        print('SKIP_INVALID_LOCATION'); continue
    print('\nLOCATION_ID='+loc)
    if not account or not re.fullmatch(r'accounts/[0-9]{1,30}',account):
        print('REVIEW=SKIPPED; account identifier missing or invalid')
    else:
        url='https://mybusiness.googleapis.com/v4/'+account+'/'+loc+'/reviews'
        try:
            r=s.get(url,params={'pageSize':1},timeout=18)
            if r.ok:
                data=r.json()
                print('REVIEWS_HTTP=200; total_reviews=',data.get('totalReviewCount','unknown'))
            else:
                data=r.json() if r.headers.get('Content-Type','').startswith('application/json') else {}
                error=data.get('error',{}) if isinstance(data,dict) else {}
                reasons=[]
                services=[]
                for detail in error.get('details',[]):
                    if isinstance(detail,dict):
                        reason=detail.get('reason')
                        if reason: reasons.append(str(reason)[:70])
                        service=(detail.get('metadata') or {}).get('service')
                        if service: services.append(str(service)[:70])
                print('REVIEWS_HTTP=',r.status_code,'STATUS=',str(error.get('status','unknown'))[:50],
                      'REASONS=',','.join(reasons) or 'unspecified',
                      'SERVICE=',','.join(services) or 'unspecified')
        except Exception as exc:
            print('REVIEWS_REQUEST_FAILED=',type(exc).__name__)
    year=date.today().year
    month=date.today().month
    for step in range(1,4):
        y=year; m=month-step
        while m<=0:
            m+=12;y-=1
        params={'monthlyRange.startMonth.year':y,'monthlyRange.startMonth.month':m,
                'monthlyRange.endMonth.year':y,'monthlyRange.endMonth.month':m,'pageSize':100}
        try:
            q=s.get('https://businessprofileperformance.googleapis.com/v1/'+loc+'/searchkeywords/impressions/monthly',
                    params=params,timeout=18)
            if q.ok:
                data=q.json()
                print('KEYWORDS_MONTH=',f'{y}-{m:02d}','HTTP=200','ROWS=',len(data.get('searchKeywordsCounts',[])),
                      'HAS_MORE=',bool(data.get('nextPageToken')))
            else:
                err=q.json().get('error',{}) if q.headers.get('Content-Type','').startswith('application/json') else {}
                print('KEYWORDS_MONTH=',f'{y}-{m:02d}','HTTP=',q.status_code,'STATUS=',str(err.get('status','unknown'))[:60])
        except Exception as exc:
            print('KEYWORDS_REQUEST_FAILED=',type(exc).__name__)
print('\nDIAGNOSTIC_COMPLETED=YES; no changes made; no tokens displayed.')
PY
