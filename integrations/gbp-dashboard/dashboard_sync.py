"""Refresh read-only Google Business Profile metrics for the three authorized SETAEI profiles.

Uses the already encrypted OAuth token held by the existing SETAEI OAuth bridge.
It never changes Google Business Profile data. No fabricated sample values.
"""
import json
import os
import re
import sqlite3
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import requests
from app import google_access_token
from gbp_dashboard import DB_PATH, METRICS

ACCOUNT_API = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts'
LOCATIONS_API = 'https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations'
PERFORMANCE = 'https://businessprofileperformance.googleapis.com/v1/'
REVIEWS_API = 'https://mybusiness.googleapis.com/v4/'


def utcnow():
    return datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')


def month_before(d):
    first = d.replace(day=1)
    return first - timedelta(days=1)


def valid_location(name):
    return isinstance(name, str) and re.fullmatch(r'locations/\d{1,30}', name)


def api_call(session, url, **params):
    # These URLs are internally constructed from fixed Google API origins and validated numeric IDs.
    r = session.get(url, params=params or None, timeout=25)
    if r.status_code in (429, 500, 502, 503, 504):
        time.sleep(1.2)
        r = session.get(url, params=params or None, timeout=25)
    if not r.ok:
        try:
            err = r.json().get('error', {})
            if isinstance(err, dict):
                detail = (err.get('status') or err.get('message') or '')
            else:
                detail = ''
        except ValueError:
            detail = ''
        # Never emit request headers, bearer tokens, or Google OAuth credentials.
        raise RuntimeError('Google HTTP %d (%s)' % (r.status_code, str(detail)[:95]))
    return r.json()


def init_db(db):
    db.executescript('''
    PRAGMA journal_mode=WAL;
    PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS locations (
       id TEXT PRIMARY KEY,title TEXT NOT NULL,website TEXT,account_id TEXT,place_id TEXT,
       store_code TEXT,address TEXT,verification_state TEXT,last_seen_utc TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS daily_metrics (
       location_id TEXT NOT NULL,day TEXT NOT NULL,metric TEXT NOT NULL,value INTEGER NOT NULL,
       PRIMARY KEY(location_id, day,metric));
    CREATE TABLE IF NOT EXISTS keyword_metrics (
       location_id TEXT NOT NULL,period TEXT NOT NULL,keyword TEXT NOT NULL,
       value INTEGER,threshold INTEGER,PRIMARY KEY(location_id,period,keyword));
    CREATE TABLE IF NOT EXISTS reviews (
       location_id TEXT NOT NULL,review_id TEXT NOT NULL,rating INTEGER,reviewer TEXT,
       comment TEXT,review_time TEXT,reply TEXT,PRIMARY KEY(location_id,review_id));
    CREATE TABLE IF NOT EXISTS review_totals (
       location_id TEXT PRIMARY KEY,average_rating REAL,total_reviews INTEGER);
    CREATE TABLE IF NOT EXISTS source_status (
       location_id TEXT NOT NULL,source TEXT NOT NULL,status TEXT NOT NULL,
       detail TEXT,checked_at TEXT NOT NULL,PRIMARY KEY(location_id,source));
    ''')


def status(db, loc, source, result, detail=''):
    db.execute('''INSERT INTO source_status(location_id,source,status,detail,checked_at)
                 VALUES(?,?,?,?,?) ON CONFLICT(location_id,source) DO UPDATE SET
                 status=excluded.status,detail=excluded.detail,checked_at=excluded.checked_at''',
               (loc,source,result,str(detail)[:200],utcnow()))
    db.commit()


def list_accounts(sess):
    all_accounts=[]
    token=None
    for _ in range(10):
        args={'pageSize':100}
        if token: args['pageToken']=token
        data=api_call(sess,ACCOUNT_API,**args)
        all_accounts.extend(data.get('accounts',[]))
        token=data.get('nextPageToken')
        if not token:break
    return all_accounts


def list_locations(sess):
    locations=[]
    token=None
    for _ in range(12):
        args={'readMask':'name,title,websiteUri,storeCode,metadata,storefrontAddress,phoneNumbers,categories',
              'pageSize':100}
        if token: args['pageToken']=token
        try:
            data=api_call(sess,LOCATIONS_API,**args)
        except RuntimeError as exc:
            # Fall back to the verified minimal Google Business Information field mask.
            # Never silently swallow auth, quota, or network failures.
            if 'Google HTTP 400' not in str(exc):
                raise
            args['readMask']='name,title,storeCode,websiteUri,phoneNumbers'
            data=api_call(sess,LOCATIONS_API,**args)
        locations.extend(x for x in data.get('locations',[]) if valid_location(x.get('name')))
        token=data.get('nextPageToken')
        if not token: break
    return locations


def update_locations(db, accounts, locations):
    names = [a.get('name','') for a in accounts if re.fullmatch(r'accounts/\d{1,30}', a.get('name',''))]
    account_id = names[0] if len(names)==1 else None
    for loc in locations:
        metadata=loc.get('metadata') or {}
        address=loc.get('storefrontAddress') or {}
        address_parts=[]
        for key in ('addressLines','locality','postalCode'):
            v=address.get(key)
            if isinstance(v,list): address_parts.extend(map(str,v))
            elif v: address_parts.append(str(v))
        ad=' · '.join(address_parts)
        db.execute('''INSERT INTO locations(id,title,website,account_id,place_id,store_code,address,verification_state,last_seen_utc)
          VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          title=excluded.title, website=excluded.website,account_id=excluded.account_id,
          place_id=excluded.place_id, store_code=excluded.store_code,address=excluded.address,
          verification_state=excluded.verification_state,last_seen_utc=excluded.last_seen_utc''',
          (loc['name'],loc.get('title') or 'Uten navn',loc.get('websiteUri',''),account_id,
           metadata.get('placeId'),loc.get('storeCode'),ad,
           ('Voice of Merchant' if metadata.get('hasVoiceOfMerchant') else 'Status ikke avklart'),utcnow()))
    db.commit()
    return account_id


def date_params(start,end):
    d={}
    for label,day in (('start',start),('end',end)):
        prefix='dailyRange.%sDate.'%label
        d[prefix+'year']=day.year
        d[prefix+'month']=day.month
        d[prefix+'day']=day.day
    return d


def fetch_daily(sess,db,loc,start,end):
    # Multi-metric call may be restricted by API availability; expose an error, never invent zeroes.
    params=date_params(start,end)
    params['dailyMetrics']=list(METRICS.keys())
    url=PERFORMANCE+loc+':fetchMultiDailyMetricsTimeSeries'
    response=api_call(sess,url,**params)
    entries=response.get('multiDailyMetricTimeSeries',[])
    n=0
    for entry in entries:
        for series in entry.get('dailyMetricTimeSeries',[]):
            key=series.get('dailyMetric')
            if key not in METRICS:continue
            # Ignore sub-entity breakdowns to avoid double counting.
            if series.get('dailySubEntityType'):continue
            for point in (series.get('timeSeries') or {}).get('datedValues',[]):
                d=point.get('date') or {}
                try:
                    day=date(int(d['year']),int(d['month']),int(d['day']))
                    value=int(point['value'])
                except (KeyError,TypeError,ValueError): continue
                if day<start or day>end or value<0:continue
                db.execute('''INSERT INTO daily_metrics(location_id,day,metric,value) VALUES(?,?,?,?)
                      ON CONFLICT(location_id,day,metric) DO UPDATE SET value=excluded.value''',
                    (loc,day.isoformat(),key,value))
                n+=1
    db.commit()
    return n


def fetch_keywords(sess,db,loc,period):
    params={'monthlyRange.startMonth.year':period.year,
            'monthlyRange.startMonth.month':period.month,
            'monthlyRange.endMonth.year':period.year,
            'monthlyRange.endMonth.month':period.month,
            'pageSize':100}
    url=PERFORMANCE+loc+'/searchkeywords/impressions/monthly'
    results={}
    token=None
    for _ in range(5):
        if token: params['pageToken']=token
        data=api_call(sess,url,**params)
        for row in data.get('searchKeywordsCounts',[]):
            word=str(row.get('searchKeyword','')).strip().lower()[:240]
            if not word:continue
            insight=row.get('insightsValue') or {}
            v=th=None
            try:
                if insight.get('value') is not None:v=max(0,int(insight['value']))
                elif insight.get('threshold') is not None: th=max(0,int(insight['threshold']))
            except (ValueError,TypeError):pass
            results[word]=(v,th)
        token=data.get('nextPageToken')
        if not token:break
    # Replace only the selected month after a successful full fetch.
    db.execute('DELETE FROM keyword_metrics WHERE location_id=? AND period=?',(loc,period.strftime('%Y-%m')))
    for word,(v,th) in results.items():
        db.execute('''INSERT INTO keyword_metrics(location_id,period,keyword,value,threshold)
                      VALUES(?,?,?,?,?)''',(loc,period.strftime('%Y-%m'),word,v,th))
    db.commit()
    return len(results)


def fetch_reviews(sess,db,loc,account_id):
    if not account_id:
        raise RuntimeError('Flere Google-kontoer: kan ikke velge anmeldelseskonto automatisk.')
    locid=loc.split('/')[1]
    url=REVIEWS_API+account_id+'/locations/'+locid+'/reviews'
    data=api_call(sess,url,pageSize=50,orderBy='updateTime desc')
    rating={'ONE':1,'TWO':2,'THREE':3,'FOUR':4,'FIVE':5}
    n=0
    for rev in data.get('reviews',[]):
        rid=rev.get('reviewId') or rev.get('name','')
        if not rid:continue
        who=(rev.get('reviewer') or {}).get('displayName','Google-bruker')
        reply=(rev.get('reviewReply') or {}).get('comment')
        db.execute('''INSERT INTO reviews(location_id,review_id,rating,reviewer,comment,review_time,reply)
            VALUES(?,?,?,?,?,?,?) ON CONFLICT(location_id,review_id) DO UPDATE SET
            rating=excluded.rating,reviewer=excluded.reviewer,comment=excluded.comment,
            review_time=excluded.review_time,reply=excluded.reply''',
            (loc,rid,rating.get(rev.get('starRating'),0),str(who)[:300],
             str(rev.get('comment') or '')[:2000],rev.get('updateTime') or rev.get('createTime') or '',
             str(reply)[:2000] if reply else None))
        n+=1
    db.execute('''INSERT INTO review_totals(location_id,average_rating,total_reviews)
      VALUES(?,?,?) ON CONFLICT(location_id) DO UPDATE SET
      average_rating=excluded.average_rating,total_reviews=excluded.total_reviews''',
      (loc,data.get('averageRating'),data.get('totalReviewCount')))
    db.commit()
    return n


def main():
    DB_PATH.parent.mkdir(parents=True,exist_ok=True)
    start_time=time.monotonic()
    with sqlite3.connect(DB_PATH,timeout=10) as db:
        init_db(db)
        try:
            token=google_access_token()
        except Exception as exc:
            print('ERROR: Google OAuth refresh failed. Reconnect in private OAuth panel.',type(exc).__name__)
            return 2
        sess=requests.Session()
        sess.headers['Authorization']='Bearer '+token
        sess.headers['X-GOOG-API-FORMAT-VERSION']='2'
        try:
            accounts=list_accounts(sess)
            locations=[l for l in list_locations(sess) if (str(l.get('title','')).strip().casefold()=='setaei' and
                       ('setai.no' in str(l.get('websiteUri','')) or not l.get('websiteUri')))]
            account_id=update_locations(db,accounts,locations)
        except (requests.RequestException,RuntimeError,ValueError) as exc:
            print('ERROR: Could not list Google profiles.',str(exc)[:140])
            return 2
        print('SETAEI PROFILE COUNT:',len(locations),'[each kept separate]')
        end=date.today()-timedelta(days=1)
        start=end-timedelta(days=89)
        keyword_month=month_before(date.today())
        successes=0
        for loc in locations:
            locid=loc['name']
            for source, action in [
                ('performance',lambda:fetch_daily(sess,db,locid,start,end)),
                ('search_keywords',lambda:fetch_keywords(sess,db,locid,keyword_month)),
                ('reviews',lambda:fetch_reviews(sess,db,locid,account_id))]:
                try:
                    count=action()
                    status(db,locid,source,'ok','%d oppføringer returnert'%count)
                    print('OK',locid,source,count)
                    successes+=1
                except (requests.RequestException,RuntimeError,ValueError,KeyError) as exc:
                    status(db,locid,source,'error',str(exc)[:180])
                    print('WARN',locid,source,str(exc)[:160])
        if successes:
            db.execute('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
                       ('last_success_utc',utcnow()))
            db.commit()
        print('FINISHED in %.1fs, successful source queries %d/%d'%(time.monotonic()-start_time,successes,len(locations)*3))
        return 0 if successes else 1


if __name__=='__main__':
    sys.exit(main())