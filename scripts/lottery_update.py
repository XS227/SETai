#!/usr/bin/env python3
"""SETAEI Forskning: Lotto (Norsk Tipping) and EuroJackpot (WestLotto) archive updater. Stdlib only.
Writes normalized {game, source, retrieved, draws:[{date, main[, stars]}]}. Stops on contradictions."""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

OSLO = ZoneInfo("Europe/Oslo")
HEADERS = {"User-Agent": "SETAEI-LotteryAudit/1.0 (independent research; historical draw data)"}
NT_API = "https://api.norsk-tipping.no/LotteryGameInfo/v2/api/results/lotto"
WL_PAGE = "https://www.westlotto.de/infos-und-zahlen/gewinnzahlen/eurojackpot/gewinnzahlen_ejp.html"
RULES = {"lotto": dict(main=7, pool=34), "eurojackpot": dict(main=5, pool=50, stars=2, star_pool=12)}


def get(url: str) -> str:
    with urlopen(Request(url, headers=HEADERS), timeout=40) as r:
        if r.status != 200:
            raise RuntimeError(f"HTTP {r.status} for {url}")
        return r.read().decode("utf-8")


def validate_draw(game: str, d: dict) -> None:
    r = RULES[game]
    date.fromisoformat(d["date"])
    m = d["main"]
    if m != sorted(m) or len(m) != r["main"] or len(set(m)) != r["main"] or any(not isinstance(n, int) or n < 1 or n > r["pool"] for n in m):
        raise ValueError(f"Invalid main numbers {d}")
    if game == "eurojackpot":
        s = d["stars"]
        sp = r["star_pool"] if d["date"] >= "2022-03-25" else 10
        if s != sorted(s) or len(s) != 2 or len(set(s)) != 2 or any(not isinstance(n, int) or n < 1 or n > sp for n in s):
            raise ValueError(f"Invalid stars {d}")
    if date.fromisoformat(d["date"]) > datetime.now(OSLO).date():
        raise ValueError(f"Future-dated draw {d['date']}")


def validate_archive(game: str, draws: list[dict]) -> None:
    if not draws:
        raise ValueError("Empty dataset")
    prev = ""
    for d in draws:
        validate_draw(game, d)
        if d["date"] <= prev:
            raise ValueError("Out-of-order/duplicate dates at " + d["date"])
        prev = d["date"]


def merge(game: str, existing: list[dict], new: list[dict]) -> list[dict]:
    comb = {d["date"]: d for d in existing}
    for d in new:
        old = comb.get(d["date"])
        if old and (old["main"] != d["main"] or old.get("stars") != d.get("stars")):
            raise ValueError(f"ARCHIVE DISCREPANCY on {d['date']}; aborting until manually verified")
        comb[d["date"]] = old or d
    out = sorted(comb.values(), key=lambda x: x["date"])
    validate_archive(game, out)
    return out


def fetch_lotto(since: date, until: date) -> list[dict]:
    q = urlencode({"fromDate": since.isoformat(), "toDate": until.isoformat()})
    data = json.loads(get(f"{NT_API}?{q}"))
    rows = []
    for g in data.get("gameResult", []):
        if not g.get("isFinalized"):
            continue
        main = sorted(int(w["number"]) for w in g.get("winnerNumber", []) if w.get("type") == 1)
        if len(main) != 7:
            continue
        when = datetime.fromisoformat(g["drawDate"].replace("Z", "+00:00")).astimezone(OSLO).date().isoformat()
        rows.append({"date": when, "main": main})
    return sorted(rows, key=lambda r: r["date"])


def parse_ej(html: str, wanted: date) -> dict | None:
    m = re.search(r"Ergebnisse vom <span>[^<]*?(\d{2})\.(\d{2})\.(\d{4})</span>", html)
    if not m or date(int(m[3]), int(m[2]), int(m[1])) != wanted:
        return None  # no draw on that date (page falls back to another date)
    seg = html[m.start(): m.start() + 4000]
    seg = seg.split("Gezogene Reihenfolge")[0]
    nums = [int(x) for x in re.findall(r'polygon-label">(\d+)<', seg)]
    if len(nums) != 7:
        raise ValueError(f"Unexpected EuroJackpot markup for {wanted}: {nums}")
    return {"date": wanted.isoformat(), "main": sorted(nums[:5]), "stars": sorted(nums[5:])}


def fetch_ej(since: date, until: date) -> list[dict]:
    rows, d = [], since
    while d <= until:
        if d.weekday() in (1, 4):  # Tuesday, Friday
            row = parse_ej(get(f"{WL_PAGE}?datum={d.strftime('%d.%m.%Y')}"), d)
            if row:
                rows.append(row)
        d += timedelta(days=1)
    return rows


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--game", required=True, choices=["lotto", "eurojackpot"])
    ap.add_argument("--output", type=Path, required=True)
    a = ap.parse_args()
    today = datetime.now(OSLO).date()
    doc = json.loads(a.output.read_text(encoding="utf-8"))
    existing = doc["draws"]
    validate_archive(a.game, existing)
    since = date.fromisoformat(existing[-1]["date"]) - timedelta(days=14)  # overlap re-verifies recent rows
    fetched = (fetch_lotto if a.game == "lotto" else fetch_ej)(since, today)
    print(f"{a.game}: fetched {len(fetched)} rows from {since}")
    result = merge(a.game, existing, fetched)
    if len(result) == len(existing):
        print(f"No new draw; kept {len(existing)} records.")
        return
    doc["draws"] = result
    doc["retrieved"] = today.isoformat()
    tmp = a.output.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(doc, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    tmp.replace(a.output)
    print(f"Updated {len(result)} records through {result[-1]['date']}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print(f"{Path(__file__).name} aborted: {exc}", file=sys.stderr)
        sys.exit(1)
