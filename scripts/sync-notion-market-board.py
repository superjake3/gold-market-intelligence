import json
import os
import urllib.request
import datetime
from decimal import Decimal

TOKEN = os.environ["NOTION_TOKEN"]
DATA_SOURCE_ID = os.environ.get("NOTION_DATA_SOURCE_ID", "70d8c1da-ef61-419b-ae8c-0ae3aa8d4a35")
PAGE_ID = os.environ.get("NOTION_DASHBOARD_PAGE_ID", "414f1b8c-fe0c-8086-b6a9-ca61bf851e9e")
API = "https://api.notion.com/v1"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": "2025-09-03",
    "Content-Type": "application/json",
}

def api_request(url, method="GET", body=None):
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = response.read()
        return json.loads(raw) if raw else {}

def get_records():
    rows, cursor = [], None
    while True:
        body = {"page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        result = api_request(f"{API}/data_sources/{DATA_SOURCE_ID}/query", "POST", body)
        for page in result.get("results", []):
            props = page.get("properties", {})
            def number(name):
                item = props.get(name, {})
                value = item.get("number") if item.get("type") == "number" else None
                return float(value) if value is not None else None
            values = {
                "usdkrw": number("달러 가격"),
                "gold_usd_oz": number("국제 금 가격"),
                "gold_krw_g": number("금 가격"),
            }
            if any(value is not None for value in values.values()):
                rows.append({
                    "created_time": page.get("created_time") or "",
                    "title": "".join(x.get("plain_text", "") for x in props.get("하루 요약이나 다짐", {}).get("title", [])),
                    **values,
                })
        if not result.get("has_more"):
            break
        cursor = result.get("next_cursor")
    rows.sort(key=lambda row: row["created_time"], reverse=True)
    return rows

def number_text(value, decimals=2):
    if value is None:
        return "—"
    if float(value).is_integer():
        return f"{int(value):,}"
    return f"{value:,.{decimals}f}"

def price_text(value, prefix, suffix=""):
    if value is None:
        return "—"
    return f"{prefix}{number_text(value)}{suffix}"

def metric_line(current, previous, prefix, suffix=""):
    if current is None:
        return "기록된 가격 없음", "gray"
    if previous is None:
        return "전일 기록 없음", "gray"
    delta = current - previous
    if previous == 0:
        return "변동률 계산 불가", "gray"
    percent = delta / previous * 100
    if delta > 0:
        arrow, color, sign = "▲", "red", "+"
    elif delta < 0:
        arrow, color, sign = "▼", "blue", "−"
    else:
        arrow, color, sign = "—", "gray", ""
    amount = number_text(abs(delta))
    return f"{arrow} {sign}{prefix}{amount}{suffix}  ({sign}{abs(percent):.2f}%)  ·  전일 대비", color

def rich(text, bold=False, color=None):
    item = {"type": "text", "text": {"content": text}}
    annotations = {}
    if bold:
        annotations["bold"] = True
    if color:
        annotations["color"] = color
    if annotations:
        item["annotations"] = annotations
    return item

def get_page_blocks():
    blocks = []
    cursor = None
    while True:
        url = f"{API}/blocks/{PAGE_ID}/children?page_size=100"
        if cursor:
            url += f"&start_cursor={cursor}"
        data = api_request(url)
        blocks.extend(data.get("results", []))
        if not data.get("has_more"):
            return blocks
        cursor = data.get("next_cursor")

def main():
    rows = get_records()
    latest = rows[0] if rows else None
    previous = rows[1] if len(rows) > 1 else None
    blocks = get_page_blocks()
    targets = {}
    for block in blocks:
        if block.get("type") != "column_list":
            continue
        for column in api_request(f"{API}/blocks/{block['id']}/children?page_size=100").get("results", []):
            if column.get("type") != "column":
                continue
            children = api_request(f"{API}/blocks/{column['id']}/children?page_size=100").get("results", [])
            for child in children:
                if child.get("type") != "callout":
                    continue
                content = "".join(part.get("plain_text", "") for part in child.get("callout", {}).get("rich_text", []))
                for marker in ("USD / KRW", "GOLD / OUNCE", "GOLD / GRAM"):
                    if marker in content:
                        targets[marker] = child["id"]

    required = ("USD / KRW", "GOLD / OUNCE", "GOLD / GRAM")
    missing = [label for label in required if label not in targets]
    if missing:
        raise RuntimeError("MARKET BOARD callouts missing: " + ", ".join(missing))

    metrics = [
        ("USD / KRW", "usdkrw", "₩", ""),
        ("GOLD / OUNCE", "gold_usd_oz", "$", " / oz"),
        ("GOLD / GRAM", "gold_krw_g", "₩", " / g"),
    ]
    for label, key, prefix, suffix in metrics:
        current = latest.get(key) if latest else None
        prior = previous.get(key) if previous else None
        line, color = metric_line(current, prior, prefix, suffix)
        rich_text = [
            rich(label, color="gray"),
            rich("\\n" + price_text(current, prefix, suffix), bold=True),
            rich("\\n" + line, color=color),
        ]
        api_request(f"{API}/blocks/{targets[label]}", "PATCH", {
            "callout": {"rich_text": rich_text}
        })

    if latest:
        stamp = latest["created_time"].replace("T", " ").replace("Z", " UTC")
        status = f"UPDATED FROM 기록 · {stamp} · PREVIOUS ENTRY COMPARED"
    else:
        status = "기록 데이터 입력 대기 중"
    # Update the small board status paragraph without touching the journal or dashboard.
    status_block = None
    for block in blocks:
        if block.get("type") == "paragraph":
            text = "".join(x.get("plain_text", "") for x in block.get("paragraph", {}).get("rich_text", []))
            if "BOARD STATUS" in text:
                status_block = block["id"]
                break
    if status_block:
        api_request(f"{API}/blocks/{status_block}", "PATCH", {
            "paragraph": {"rich_text": [rich("BOARD STATUS  ·  " + status, color="gray")]}
        })
    print(f"Updated MARKET BOARD from {len(rows)} price-bearing 기록 entries.")

if __name__ == "__main__":
    main()
