import importlib, os, sqlite3, sys, tempfile, types
from datetime import date, timedelta
from pathlib import Path

root=Path(__file__).parent
sys.path.insert(0,str(root))
fakeflask=types.ModuleType('flask')
class BP:
    def __init__(self,*args,**kwargs):pass
    def get(self,*args,**kwargs):return lambda x:x
fakeflask.Blueprint=BP
fakeflask.abort=lambda code: (_ for _ in ()).throw(RuntimeError(code))
fakeflask.jsonify=lambda val:val
fakeflask.render_template_string=lambda s:s
fakeflask.request=types.SimpleNamespace(args={})
fakeflask.Response=lambda data,mimetype=None:data
sys.modules['flask']=fakeflask
fakeapp=types.ModuleType('app')
fakeapp.google_access_token=lambda:'UNIT_TEST_TOKEN'
sys.modules['app']=fakeapp
import gbp_dashboard as dashboard
import dashboard_sync as sync

with tempfile.TemporaryDirectory() as d:
    dashboard.DB_PATH=Path(d)/'data.sqlite3'
    sync.DB_PATH=dashboard.DB_PATH
    class R:
        def __init__(self,body):self.status_code=200;self.body=body;self.ok=True
        def json(self):return self.body
    class Sess:
        headers={}
        def get(self,url,params=None,timeout=None):
            if url.endswith('/accounts'):
                return R({'accounts':[{'name':'accounts/105249988601083040243'},{'name':'accounts/222222222222222222'}]})
            if '/accounts/-/locations' in url:
                return R({'locations':[{'name':'locations/467110247860418129','title':'SETAEI','websiteUri':'https://setai.no/'},{'name':'locations/14671405080341449883','title':'SETAEI','websiteUri':'https://www.setai.no/'},{'name':'locations/3333333333333','title':'Bilvask Express','websiteUri':'https://www.bilvaskexpress.no/'},{'name':'locations/44444444444','title':'Unrelated Client','websiteUri':'https://other.example/'}]})
            if '/accounts/105249988601083040243/locations' in url:
                return R({'locations':[{'name':'locations/467110247860418129','title':'SETAEI','websiteUri':'https://setai.no/'},{'name':'locations/14671405080341449883','title':'SETAEI','websiteUri':'https://www.setai.no/'}]})
            if '/accounts/222222222222222222/locations' in url:
                return R({'locations':[{'name':'locations/3333333333333','title':'Bilvask Express','websiteUri':'https://bilvaskexpress.no/'}]})
            if 'fetchMultiDailyMetricsTimeSeries' in url:
                x=date.today()-timedelta(days=1)
                return R({'multiDailyMetricTimeSeries':[{'dailyMetricTimeSeries':[{'dailyMetric':'WEBSITE_CLICKS','timeSeries':{'datedValues':[{'date':{'year':x.year,'month':x.month,'day':x.day},'value':('27' if '/locations/3333333333333:' in url else '14')}]}}]}]})
            if 'impressions/monthly' in url:
                return R({'searchKeywordsCounts':[{'searchKeyword':'setaei seo','insightsValue':{'value':'56'}},{'searchKeyword':'agency near me','insightsValue':{'threshold':'15'}}]})
            if '/reviews' in url:
                return R({'averageRating':4.5,'totalReviewCount':2,'reviews':[{'reviewId':'test-id','starRating':'FIVE','reviewer':{'displayName':'Test User'},'comment':'Very good','updateTime':'2026-10-01T08:00:00Z'}]})
            raise RuntimeError('Unexpected endpoint '+url)
    sync.requests.Session=lambda:Sess()
    assert sync.main()==0
    output=dashboard.dashboard_payload(days=30)
    assert len(output['locations'])==2
    client=dashboard.dashboard_payload(days=30,client='bilvaskexpress')
    assert len(client['locations'])==1
    assert client['locations'][0]['website'].endswith('bilvaskexpress.no/')
    assert client['summary']['WEBSITE_CLICKS']==27
    assert output['summary']['WEBSITE_CLICKS']==14
    assert sync.classify_client({'title':'Bilvask Express','websiteUri':'https://bilvaskexpress.no.evil.test/'}) is None
    assert sync.classify_client({'title':'Unrelated Client','websiteUri':'https://other.example/'}) is None
    assert sync.classify_client({'title':'Bilvask Express','websiteUri':''}) is None
    assert output['summary']['WEBSITE_CLICKS']==14
    assert output['keyword_period']
    assert output['keywords'][0]['value']==56
    assert output['keywords'][1]['threshold']==15
    assert output['review_summary']['total_reviews']==2
    other=dashboard.dashboard_payload(location='locations/467110247860418129', days=7)
    assert other['summary']['WEBSITE_CLICKS']==14
    assert other['selected'] != output['selected']
    assert dashboard.dashboard_payload(location='locations/999999',days=30)['selected']==output['selected']
    with sqlite3.connect(dashboard.DB_PATH) as db:
        assert db.execute('SELECT COUNT(*) FROM daily_metrics').fetchone()[0]==3
        assert db.execute('SELECT COUNT(*) FROM source_status').fetchone()[0]==9
        assert db.execute("SELECT account_id FROM locations WHERE client='bilvaskexpress'").fetchone()[0]=='accounts/222222222222222222'
    print('TESTS_OK: brand isolation, allowlisted Bilvaskexpress manager profile, per-account ownership, metrics, keywords, reviews, SQLite persistence')