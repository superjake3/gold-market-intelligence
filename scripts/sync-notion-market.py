import json, os, urllib.request, datetime
from pathlib import Path

TOKEN = os.environ["NOTION_TOKEN"]
DATA_SOURCE_ID = os.environ.get("NOTION_DATA_SOURCE_ID", "70d8c1da-ef61-419b-ae8c-0ae3aa8d4a35")
API = f"https://api.notion.com/v1/data_sources/{DATA_SOURCE_ID}/query"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Notion-Version": "2025-09-03", "Content-Type": "application/json"}

def request(cursor=None):
    body = {"page_size": 100}
    if cursor: body["start_cursor"] = cursor
    req = urllib.request.Request(API, data=json.dumps(body).encode(), headers=HEADERS, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r: return json.load(r)

def number(props, key):
    p = props.get(key, {})
    v = p.get("number") if p.get("type") == "number" else None
    return float(v) if v is not None else None

def row_date(props, created):
    p = props.get("날짜", {})
    d = p.get("date") or {}
    return (d.get("start") or created or "")[:10]

all_rows, cursor = [], None
while True:
    data = request(cursor)
    for page in data.get("results", []):
        props = page.get("properties", {})
        values = {
            "usdkrw": number(props, "달러 가격"),
            "gold_usd_oz": number(props, "국제 금 가격"),
            "gold_krw_g": number(props, "금 가격"),
        }
        if any(v is not None for v in values.values()):
            created = page.get("created_time", "")
            all_rows.append({"date": row_date(props, created), **values})
    if not data.get("has_more"): break
    cursor = data.get("next_cursor")

all_rows.sort(key=lambda r: r["date"], reverse=True)
latest = all_rows[0] if all_rows else None
previous = all_rows[1] if len(all_rows) > 1 else None

def change(key):
    if not latest or not previous: return None
    a, b = latest.get(key), previous.get(key)
    if a is None or b in (None, 0): return None
    return {"absolute": round(a-b, 4), "percent": round((a-b)/b*100, 4)}

payload = {
    "source": "Notion 🌱 한 줄 일기",
    "data_source_id": DATA_SOURCE_ID,
    "fetched_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "latest": latest,
    "previous": previous,
    "changes": {"usdkrw": change("usdkrw"), "gold_usd_oz": change("gold_usd_oz"), "gold_krw_g": change("gold_krw_g")},
    "history": all_rows[:7],
    "record_count": len(all_rows),
}
out = Path("data/notion-market.json")
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Synced {len(all_rows)} records; latest={latest}")
