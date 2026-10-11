#!/usr/bin/env python3
"""Refresh the full official WestLotto archive, validate, and replace atomically."""
import argparse
import csv
import datetime as dt
import io
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ARCHIVE = 'https://www.westlotto.de/westlotto-medien/zahlen-fakten/gewinnzahlendownload/eurojackpot.zip'
RECENT = 'https://www.westlotto.de/wlinfo/WL_InfoService?' + urllib.parse.urlencode(dict(
    gruppe='ErgebnisDownload', client='wldl', jahr_von=2022, jahr_bis=2035, spielart='EJ', format='csv'))
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'SETAEI-EuroJackpot-Statistics/1.0'})
    with urllib.request.urlopen(req, timeout=40) as response:
        return response.read(8_000_000)

def star_pool(date):
    return 8 if date < '2014-10-10' else 10 if date < '2022-03-25' else 12

def historic(blob):
    outer = zipfile.ZipFile(io.BytesIO(blob))
    workbook = zipfile.ZipFile(io.BytesIO(outer.read('Eurojackpot.xlsx')))
    shared = [''.join(x.itertext()) for x in ET.fromstring(workbook.read('xl/sharedStrings.xml')).findall('s:si', NS)]
    result = []
    for filename in workbook.namelist():
        if not re.fullmatch(r'xl/worksheets/sheet\d+\.xml', filename):
            continue
        for row in ET.fromstring(workbook.read(filename)).findall('.//s:row', NS):
            cells = {}
            for c in row:
                value = c.find('s:v', NS)
                if value is not None:
                    cells[re.sub(r'\d+', '', c.get('r'))] = shared[int(value.text)] if c.get('t') == 's' else value.text
            if not all(k in cells for k in 'BDEFGHIJ'):
                continue
            try:
                date = (dt.date(1899, 12, 30) + dt.timedelta(days=int(float(cells['B'])))).isoformat()
                if not '2012-03-23' <= date < '2022-01-01':
                    continue
                result.append({'date': date, 'main': sorted(int(float(cells[k])) for k in 'DEFGH'),
                               'stars': sorted(int(float(cells[k])) for k in 'IJ')})
            except ValueError:
                continue
    return result

def recent(blob):
    archive = zipfile.ZipFile(io.BytesIO(blob))
    filename = next(n for n in archive.namelist() if n.lower().endswith('.csv'))
    text = archive.read(filename).decode('utf-8-sig', errors='replace')
    rows = []
    for row in csv.reader(io.StringIO(text), delimiter=';'):
        if not row or not re.fullmatch(r'\d{2}\.\d{2}\.\d{4}', row[0].strip()):
            continue
        date = dt.datetime.strptime(row[0].strip(), '%d.%m.%Y').date().isoformat()
        rows.append({'date': date, 'main': sorted(int(x) for x in row[1:6]), 'stars': sorted(int(x) for x in row[6:8])})
    return rows

def validate(rows, today):
    unique = {}
    for row in rows:
        date = dt.date.fromisoformat(row['date'])
        if date > today:
            raise ValueError('Source contains a future result: ' + row['date'])
        permitted_days = [4] if row['date'] < '2022-03-29' else [1, 4]
        if date.weekday() not in permitted_days:
            raise ValueError('Unexpected draw weekday: ' + row['date'])
        for key, count, maximum in [('main', 5, 50), ('stars', 2, star_pool(row['date']))]:
            nums = row[key]
            if len(nums) != count or len(set(nums)) != count or any(type(n) is not int or not 1 <= n <= maximum for n in nums):
                raise ValueError('Invalid ' + key + ' on ' + row['date'])
        if row['date'] in unique and unique[row['date']] != row:
            raise ValueError('Conflicting source rows: ' + row['date'])
        unique[row['date']] = row
    rows = sorted(unique.values(), key=lambda r: r['date'])
    if not rows or rows[0]['date'] != '2012-03-23':
        raise ValueError('First draw missing')
    day = dt.date(2012, 3, 23)
    last = dt.date.fromisoformat(rows[-1]['date'])
    missing = []
    while day <= last:
        if day.weekday() == 4 or (day >= dt.date(2022, 3, 29) and day.weekday() == 1):
            if day.isoformat() not in unique:
                missing.append(day.isoformat())
        day += dt.timedelta(days=1)
    if missing:
        raise ValueError('Missing scheduled draws: ' + ', '.join(missing[:15]))
    return rows

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=Path(__file__).parent / 'history.js')
    parser.add_argument('--archive-cache', type=Path)
    parser.add_argument('--recent-cache', type=Path)
    args = parser.parse_args()
    today = dt.datetime.now(dt.timezone.utc).date()
    old = args.archive_cache.read_bytes() if args.archive_cache else fetch(ARCHIVE)
    new = args.recent_cache.read_bytes() if args.recent_cache else fetch(RECENT)
    rows = validate(historic(old) + recent(new), today)
    if args.output.exists():
        existing = json.loads(args.output.read_text().split('=', 1)[1].strip().rstrip(';'))
        old_rows = {r['date']: r for r in existing['draws']}
        if len(rows) < len(old_rows):
            raise ValueError('Refresh would shorten the archive')
        for row in rows:
            if row['date'] in old_rows and row != old_rows[row['date']]:
                raise ValueError('Published history changed; requires review: ' + row['date'])
    data = {'source': 'WestLotto (offisiell lotterioperatør)', 'sourceUrl': 'https://www.westlotto.de/service/downloads/downloads.html',
            'fetchedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'draws': rows}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    tmp = args.output.with_suffix('.tmp')
    tmp.write_text('window.EJ_HISTORY=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    tmp.replace(args.output)
    print(json.dumps({'draws': len(rows), 'first': rows[0]['date'], 'last': rows[-1]['date'], 'output': str(args.output)}))

if __name__ == '__main__':
    main()
