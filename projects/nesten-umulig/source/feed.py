#!/usr/bin/env python3
"""Read one existing job; publish an explicit allowlist of aggregate observations.

No search, model training, balance queries, key derivation or job mutations.
The input path is configured by the service, never by a web request.
"""
import os,json,math,datetime,subprocess,tempfile
from pathlib import Path

UTC=datetime.timezone.utc
DATA=Path(os.environ.get('SETAEI_PUBLIC_DATA','/var/lib/setai-research-public'))
SOURCE=Path(os.environ['SETAEI_OBSERVATION_FILE'])
MAX_SERIES=360

def integer(value,name):
    if isinstance(value,bool):raise ValueError(name)
    if isinstance(value,int):n=value
    elif isinstance(value,str) and value.isascii() and value.isdigit() and len(value)<=80:n=int(value)
    else:raise ValueError(name)
    if n<0:raise ValueError(name)
    return n

def stamp(value):
    if isinstance(value,(int,float)) and not isinstance(value,bool):
        if not math.isfinite(value):raise ValueError('timestamp')
        return datetime.datetime.fromtimestamp(value/1000 if value>1e11 else value,UTC).isoformat().replace('+00:00','Z')
    if not isinstance(value,str):raise ValueError('timestamp')
    dt=datetime.datetime.fromisoformat(value.replace('Z','+00:00'))
    if dt.tzinfo is None:raise ValueError('timestamp timezone')
    return dt.astimezone(UTC).isoformat().replace('+00:00','Z')

def timestamp(value):return datetime.datetime.fromisoformat(value.replace('Z','+00:00')).timestamp()

def atomic(path,payload):
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o755)
    fd,tmp=tempfile.mkstemp(prefix='.'+path.name,dir=path.parent)
    try:
        with os.fdopen(fd,'w') as f:
            json.dump(payload,f,ensure_ascii=False,separators=(',',':'),allow_nan=False)
            f.flush();os.fsync(f.fileno())
        os.chmod(tmp,0o644);os.replace(tmp,path)
        d=os.open(path.parent,os.O_RDONLY)
        try:os.fsync(d)
        finally:os.close(d)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

def service_info():
    """No administrative token, private process environment or target is read."""
    try:
        text=subprocess.run(['systemctl','show','setai-key-agent.service','-p','ActiveState','-p','CPUQuotaPerSecUSec','-p','CPUUsageNSec','-p','MemoryCurrent','-p','MemoryMax'],capture_output=True,text=True,timeout=3,check=True).stdout
        info=dict(line.split('=',1) for line in text.splitlines() if '=' in line)
        raw=info.get('CPUQuotaPerSecUSec','');quota=None
        if raw.endswith('ms'):quota=float(raw[:-2])/10
        elif raw.endswith('us'):quota=float(raw[:-2])/10000
        elif raw.endswith('s'):quota=float(raw[:-1])*100
        def reading(name):
            raw=info.get(name,'');return int(raw) if raw.isascii() and raw.isdigit() else None
        cpu=reading('CPUUsageNSec');memory=reading('MemoryCurrent');limit=reading('MemoryMax')
        return {'serviceActive':info.get('ActiveState')=='active','cpuQuotaPercent':quota,
            'cpuTotalNanoseconds':str(cpu) if cpu is not None else None,
            'memoryMiB':memory/1048576 if memory is not None else None,
            'memoryLimitMiB':limit/1048576 if limit is not None else None}
    except (OSError,ValueError,subprocess.SubprocessError):return {'serviceActive':None,'cpuQuotaPercent':None}

def build(job,old,agent,now):
    prefix=str(job.get('prefix','')).removeprefix('0x')
    if len(prefix)!=40 or any(c not in '0123456789abcdefABCDEF' for c in prefix):raise ValueError('This public study expects a 160-bit address target')
    attempts=integer(job.get('attempts'),'attempts')
    updated=stamp(job.get('updated',job.get('updatedUtc')))
    started=stamp(job.get('started',job.get('startedUtc')))
    state=job.get('status',job.get('state','unknown'))
    state={'active':'running','searching':'running'}.get(state,state)
    if state not in ['running','paused','found','completed','stopped']:state='unknown'
    candidates=[job.get(k) for k in ['stats','addressStats','addressStreamStats']]
    stats=next((s for s in candidates if isinstance(s,dict) and isinstance(s.get('histogram'),list)),None)
    if stats is None or len(stats['histogram'])!=161:raise ValueError('histogram')
    histogram=[integer(v,'histogram') for v in stats['histogram']]
    if any(v>9007199254740991 for v in histogram):raise ValueError('histogram precision')
    samples=integer(stats['samples'],'samples')
    if samples==0 or sum(histogram)!=samples:raise ValueError('histogram total')
    total=sum(i*n for i,n in enumerate(histogram))
    best=max(i for i,n in enumerate(histogram) if n)
    public_stats={'samples':samples,'histogram':histogram,'bestMatchedBits':best,'exactMatches':histogram[160],'totalMatchedBits':total}
    if 'sinceAttempt' in stats:public_stats['sinceAttempt']=str(integer(stats['sinceAttempt'],'sinceAttempt'))
    same=old and old.get('startedUtc')==started
    series=old.get('series',[]) if old else []
    # Revalidate retained rows; a previous public file cannot inject arbitrary fields.
    cleaned=[]
    for row in series[-MAX_SERIES:]:
        try:cleaned.append({'atUtc':stamp(row['atUtc']),'attempts':str(integer(row['attempts'],'attempts')),'discontinuity':row.get('discontinuity') is True})
        except (KeyError,ValueError,TypeError):continue
    series=cleaned
    if not series or series[-1]['atUtc']!=updated or int(series[-1]['attempts'])!=attempts:
        gap=not same or bool(series and (attempts<int(series[-1]['attempts']) or timestamp(updated)-timestamp(series[-1]['atUtc'])>120))
        series.append({'atUtc':updated,'attempts':str(attempts),'discontinuity':gap})
    series=series[-MAX_SERIES:]
    rate=None;window=None
    if same and len(series)>1 and not series[-1]['discontinuity']:
        for row in reversed(series[:-1]):
            dt=timestamp(updated)-timestamp(row['atUtc'])
            if dt>120:break
            delta=attempts-int(row['attempts'])
            if delta<0:break
            if 10<=dt<=90:rate=delta/dt;window=dt
            if row.get('discontinuity') or dt>=60:break
    instant=None;instant_window=None
    if same and len(series)>1 and not series[-1]['discontinuity']:
        latest,previous=series[-1],series[-2]
        dt=timestamp(latest['atUtc'])-timestamp(previous['atUtc'])
        delta=int(latest['attempts'])-int(previous['attempts'])
        if 0<dt<=120 and delta>=0:instant=delta/dt;instant_window=dt
    public_agent={k:agent.get(k) for k in ['serviceActive','cpuQuotaPercent','cpuTotalNanoseconds','memoryMiB','memoryLimitMiB']}
    public_agent.update(cpuPercent=None,cpuWindowSeconds=None)
    previous_agent=(old or {}).get('agent',{})
    if same and agent.get('cpuTotalNanoseconds') is not None and previous_agent.get('cpuTotalNanoseconds') is not None:
        dt=timestamp(now)-timestamp(old['generatedUtc'])
        delta=int(agent['cpuTotalNanoseconds'])-int(previous_agent['cpuTotalNanoseconds'])
        if 0<dt<=120 and delta>=0:
            public_agent['cpuPercent']=delta/(dt*10000000)
            public_agent['cpuWindowSeconds']=dt
    return {'schema':'setaei-public-observation-v1','sourceStatus':'current','generatedUtc':now,'checkpointUtc':updated,'startedUtc':started,'attempts':str(attempts),'targetBits':160,'state':state,'agent':public_agent,'measuredRate':rate,'rateWindowSeconds':window,'instantRate':instant,'instantWindowSeconds':instant_window,'stats':public_stats,'series':series,'scope':'Aggregate read-only observation. This stream does not recover private keys or evaluate AI; probabilities on the page are idealized reference models.'}

def main():
    if SOURCE.stat().st_size>32*1024*1024:raise ValueError('Observation file unexpectedly large')
    job=json.loads(SOURCE.read_text())
    file=DATA/'public/live.json'
    try:old=json.loads(file.read_text())
    except (OSError,ValueError):old=None
    info=service_info()
    now=datetime.datetime.now(UTC).isoformat().replace('+00:00','Z')
    payload=build(job,old,info,now)
    atomic(file,payload)
    print('Public aggregate observation updated.')

if __name__=='__main__':main()
