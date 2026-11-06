#!/usr/bin/env python3
"""SETAEI independent Keno archive updater. Data are third-party, NOT official."""
from __future__ import annotations

import argparse
from datetime import datetime, date
import json
from pathlib import Path
import sys
from urllib.request import urlopen, Request
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup

SOURCE = "https://statyr.com/nb-no/keno/arkiv"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "Keno" / "draws.json"
HEADERS = {"User-Agent": "SETAEI-LotteryAudit/1.0 (independent research; historical draw data)"}


def normalize_record(date_string: str, numbers: list[int]) -> dict:
    draw_date = date.fromisoformat(date_string)
    if len(numbers) != 20 or len(set(numbers)) != 20 or any(not isinstance(n, int) or n < 1 or n > 70 for n in numbers):
        raise ValueError(f"Invalid Keno draw for {date_string}: expected 20 unique integers, 1..70")
    if draw_date > datetime.now(ZoneInfo("Europe/Oslo")).date():
        raise ValueError(f"Future-dated draw: {date_string}")
    return {"date": date_string, "numbers": sorted(numbers)}


def parse_archive_year(html: str, year: int) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    rows: list[dict] = []
    dates = set()
    for section in soup.find_all("section", attrs={"aria-labelledby": True}):
        for li in section.select("li"):
            dt = li.select_one("time[datetime]")
            if dt is None:
                continue
            date_string = dt.get("datetime", "")
            if not date_string.startswith(f"{year}-"):
                continue
            spans = li.select("span.ball[data-value]")
            values = [int(s["data-value"]) for s in spans]
            row = normalize_record(date_string, values)
            if row["date"] in dates:
                raise ValueError("Duplicate draw in source: " + date_string)
            dates.add(row["date"])
            rows.append(row)
    if not rows:
        raise ValueError(f"No valid Keno results found for {year}; source may have changed")
    return sorted(rows, key=lambda row: row["date"])


def fetch_year(year: int) -> list[dict]:
    req = Request(f"{SOURCE}/{year}", headers=HEADERS)
    with urlopen(req, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError(f"Archive HTTP {response.status} for {year}")
        html = response.read().decode("utf-8")
    return parse_archive_year(html, year)


def validate_archive(draws: list[dict]) -> None:
    if not draws:
        raise ValueError("Empty dataset")
    prev = ""
    for item in draws:
        rec = normalize_record(item["date"], item["numbers"])
        if rec["numbers"] != item["numbers"]:
            raise ValueError("Numbers must be sorted within each row")
        if rec["date"] <= prev:
            raise ValueError("Out-of-order/duplicate dates")
        prev = rec["date"]


def merge_draws(existing: list[dict], new: list[dict]) -> list[dict]:
    old = {item["date"]: item["numbers"] for item in existing}
    combined = {item["date"]: item for item in existing}
    for item in new:
        when = item["date"]
        if when in old and old[when] != item["numbers"]:
            raise ValueError(f"ARCHIVE DISCREPANCY on {when}; aborting until manually verified")
        combined[when] = item
    result = sorted(combined.values(), key=lambda x: x["date"])
    validate_archive(result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--full", action="store_true", help="Re-fetch all years since 2011")
    args = parser.parse_args()
    today = datetime.now(ZoneInfo("Europe/Oslo")).date()
    existing_data = None
    if args.output.exists():
        existing_data = json.loads(args.output.read_text(encoding="utf-8"))
        validate_archive(existing_data["draws"])
    existing = existing_data["draws"] if existing_data else []

    if args.full or not existing:
        years = range(2011, today.year + 1)
    else:
        years = [today.year]
        if today.month == 1:
            years.insert(0, today.year - 1)

    fetched = []
    for year in years:
        rows = fetch_year(year)
        print(f"{year}: {len(rows)} records")
        fetched.extend(rows)
    result = merge_draws(existing, fetched)
    if len(result) == len(existing):
        print(f"No new draw found; kept {len(existing)} historical records unchanged.")
        return

    doc = {
        "source": SOURCE,
        "source_kind": "independent_third_party",
        "retrieved": str(today),
        "game": "Norsk Tipping Keno",
        "rules": {"pool": 70, "drawn": 20, "pick_min": 2, "pick_max": 10},
        "draws": result
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temp = args.output.with_suffix(".json.tmp")
    temp.write_text(json.dumps(doc, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    temp.replace(args.output)
    print(f"Updated {len(result)} validated records through {result[-1]['date']}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Keno archive update aborted: {exc}", file=sys.stderr)
        sys.exit(1)
