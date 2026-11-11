#!/usr/bin/env python3
"""Collect macroeconomic indicators from FRED and Bank of Korea ECOS."""
import datetime as dt
import json
import os
import sys
import urllib.parse
import urllib.request

KST = dt.timezone(dt.timedelta(hours=9))
TODAY = dt.datetime.now(KST).date()
FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"
ECOS_BASE = "https://ecos.bok.or.kr/api/StatisticSearch"

def get_json(url):
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "GoldMarketIntelligence/1.0", "Accept": "application/json"}
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError(f"HTTP {response.status}: {url.split('?')[0]}")
        return json.loads(response.read().decode("utf-8-sig"))

def number(value):
    if value in (None, "", "."):
        return None
    try:
        return float(str(value).replace(",", "").strip())
    except ValueError:
        return None

def fred_series(api_key, series_id, label, unit, frequency, years=2):
    start = (TODAY - dt.timedelta(days=365 * years)).isoformat()
    params = urllib.parse.urlencode({
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json",
        "observation_start": start,
        "observation_end": TODAY.isoformat(),
        "sort_order": "asc",
        "limit": 1000
    })
    payload = get_json(FRED_BASE + "?" + params)
    rows = []
    for item in payload.get("observations", []):
        value = number(item.get("value"))
        if value is not None:
            rows.append({"date": item.get("date"), "value": value})
    if not rows:
        raise RuntimeError(f"FRED {series_id}: no valid observations")
    return {
        "label": label,
        "series_id": series_id,
        "unit": unit,
        "frequency": frequency,
        "source": "Federal Reserve Economic Data (FRED)",
        "source_url": f"https://fred.stlouisfed.org/series/{series_id}",
        "observations": rows[-400:],
        "latest": rows[-1],
        "previous": rows[-2] if len(rows) > 1 else None
    }

def ecos_series(api_key, stat_code, item_code, cycle, start_date, label, unit):
    end_date = TODAY.strftime("%Y%m" if cycle == "M" else "%Y%m%d")
    start = start_date.strftime("%Y%m" if cycle == "M" else "%Y%m%d")
    path = "/".join([
        ECOS_BASE,
        urllib.parse.quote(api_key, safe=""),
        "json", "kr", "1", "100",
        stat_code, cycle, start, end_date, item_code
    ])
    payload = get_json(path)
    block = payload.get("StatisticSearch")
    if not isinstance(block, dict):
        result = payload.get("RESULT", {})
        raise RuntimeError(f"ECOS {stat_code}: {result.get('CODE', 'unknown')} {result.get('MESSAGE', payload)}")
    rows = []
    for item in block.get("row", []):
        value = number(item.get("DATA_VALUE"))
        if value is not None:
            rows.append({"date": item.get("TIME"), "value": value})
    rows.sort(key=lambda row: row["date"])
    if not rows:
        raise RuntimeError(f"ECOS {stat_code}/{item_code}: no valid observations")
    return {
        "label": label,
        "table_code": stat_code,
        "item_code": item_code,
        "unit": unit,
        "frequency": "월별",
        "source": "한국은행 경제통계시스템(ECOS)",
        "source_url": "https://ecos.bok.or.kr/",
        "observations": rows[-120:],
        "latest": rows[-1],
        "previous": rows[-2] if len(rows) > 1 else None
    }

def main():
    fred_key = os.environ.get("FRED_API_KEY", "").strip()
    ecos_key = os.environ.get("ECOS_API_KEY", "").strip()
    if not fred_key or not ecos_key:
        raise RuntimeError("FRED_API_KEY and ECOS_API_KEY must be configured as GitHub Actions secrets.")

    daily_start = TODAY - dt.timedelta(days=365 * 2)
    monthly_start = TODAY.replace(year=TODAY.year - 5)

    indicators = {
        "us_10y_yield": fred_series(fred_key, "DGS10", "미국 10년물 국채금리", "%", "일별"),
        "us_10y_real_yield": fred_series(fred_key, "DFII10", "미국 10년물 실질금리(TIPS)", "%", "일별"),
        "usd_broad_index": fred_series(fred_key, "DTWEXBGS", "미국 달러 종합지수", "지수", "일별"),
        "us_cpi": fred_series(fred_key, "CPIAUCSL", "미국 소비자물가지수(CPI)", "지수", "월별", years=5),
        "kr_base_rate": ecos_series(ecos_key, "722Y001", "0101000", "M", monthly_start, "한국은행 기준금리", "%"),
        "kr_cpi": ecos_series(ecos_key, "901Y009", "0", "M", monthly_start, "한국 소비자물가지수(CPI)", "지수")
    }

    output = {
        "schema_version": 1,
        "fetched_at": dt.datetime.now(KST).isoformat(timespec="seconds"),
        "note": "각 지표의 latest.date는 실제 통계 기준일이며 fetched_at은 수집 시각입니다.",
        "indicators": indicators
    }
    os.makedirs("data", exist_ok=True)
    temp_path = "data/economic-indicators.json.tmp"
    with open(temp_path, "w", encoding="utf-8") as file:
        json.dump(output, file, ensure_ascii=False, indent=2)
    os.replace(temp_path, "data/economic-indicators.json")
    for key, item in indicators.items():
        print(f"{key}: {item['latest']['date']} = {item['latest']['value']} {item['unit']}")
    print(f"Saved {len(indicators)} indicators at {output['fetched_at']}")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
