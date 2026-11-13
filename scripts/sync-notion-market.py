import json, os, urllib.request, datetime
from pathlib import Path

TOKEN = os.environ["NOTION_TOKEN"]
DATA_SOURCE_ID = os.environ.get("NOTION_DATA_SOURCE_ID", "70d8c1da-ef61-419b-ae8c-0ae3aa8d4a35")
API = f"https://api.notion.com/v1/data_sources/{DATA_SOURCE_ID}/query"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Notion-Version": "2025-09-03", "Content-Type": "application/json"}

def request(cursor=None):
    body = {"page_size": 100}
    if cursor:
        body["start_cursor"] = cursor
    req = urllib.request.Request(API, data=json.dumps(body).encode(), headers=HEADERS, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

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
    if not data.get("has_more"):
        break
    cursor = data.get("next_cursor")

all_rows.sort(key=lambda r: r["date"], reverse=True)
latest = all_rows[0] if all_rows else None
previous = all_rows[1] if len(all_rows) > 1 else None

def change(key):
    if not latest or not previous:
        return None
    a, b = latest.get(key), previous.get(key)
    if a is None or b in (None, 0):
        return None
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

def fmt_number(value, prefix="", suffix=""):
    if value is None:
        return "—"
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return f"{prefix}{value:,.0f}{suffix}"

def fmt_change(item, prefix=""):
    if not item:
        return "전일 기록 없음"
    amount = item["absolute"]
    sign = "+" if amount > 0 else ""
    arrow = "▲" if amount > 0 else ("▼" if amount < 0 else "—")
    return f"{arrow} {prefix}{abs(amount):,.0f} ({sign}{item['percent']:.2f}%)"

def update_notion_board(payload):
    page_id = os.environ.get("NOTION_DASHBOARD_PAGE_ID", "414f1b8c-fe0c-8086-b6a9-ca61bf851e9e")
    base = "https://api.notion.com/v1"

    def get_children(parent_id):
        results, cursor = [], None
        while True:
            url = f"{base}/blocks/{parent_id}/children?page_size=100"
            if cursor:
                url += f"&start_cursor={cursor}"
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.load(response)
            results.extend(data.get("results", []))
            if not data.get("has_more"):
                return results
            cursor = data.get("next_cursor")

    # Locate the three metric cards inside the Notion column layout,
    # plus the small metadata line below them.
    blocks = get_children(page_id)
    index = 0
    while index < len(blocks):
        block = blocks[index]
        if block.get("type") == "column_list":
            for column in get_children(block["id"]):
                if column.get("type") == "column":
                    blocks.extend(get_children(column["id"]))
        index += 1

    targets = {}
    footer = None
    for block in blocks:
        kind = block.get("type")
        body = block.get(kind, {}) if kind else {}
        rich = body.get("rich_text", [])
        text_content = "".join(x.get("plain_text", "") for x in rich)
        if kind == "callout":
            for marker in ("USD / KRW", "GOLD / OUNCE", "GOLD / GRAM"):
                if marker in text_content:
                    targets[marker] = block["id"]
        elif kind == "paragraph" and "AS OF" in text_content:
            footer = block["id"]

    required = ("USD / KRW", "GOLD / OUNCE", "GOLD / GRAM")
    missing = [name for name in required if name not in targets]
    if missing or not footer:
        raise RuntimeError(
            "Dashboard metric blocks not found: "
            + ", ".join(missing or [])
            + ("; metadata line missing" if not footer else "")
        )

    latest = payload.get("latest") or {}
    changes = payload.get("changes") or {}
    previous_row = payload.get("previous") or {}

    def rt(text, bold=False, color=None):
        item = {"type": "text", "text": {"content": text}}
        annotations = {}
        if bold:
            annotations["bold"] = True
        if color:
            annotations["color"] = color
        if annotations:
            item["annotations"] = annotations
        return item

    metrics = [
        ("USD / KRW", "usdkrw", "₩", ""),
        ("GOLD / OUNCE", "gold_usd_oz", "$", "/oz"),
        ("GOLD / GRAM", "gold_krw_g", "₩", "/g"),
    ]

    for label, key, prefix, suffix in metrics:
        change_item = changes.get(key)
        delta = (change_item or {}).get("absolute")
        change_color = "green" if delta is not None and delta < 0 else (
            "red" if delta is not None and delta > 0 else "gray"
        )
        rich = [
            rt(label, False, "gray"),
            rt("\n" + fmt_number(latest.get(key), prefix, suffix), True),
            rt("\n" + fmt_change(change_item, prefix), False, change_color),
        ]
        patch = {"callout": {"rich_text": rich}}
        req = urllib.request.Request(
            f"{base}/blocks/{targets[label]}",
            data=json.dumps(patch, ensure_ascii=False).encode("utf-8"),
            headers=HEADERS,
            method="PATCH",
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            response.read()

    footer_text = (
        "AS OF " + str(latest.get("date", "—"))
        + "  /  PREVIOUS " + str(previous_row.get("date", "—"))
        + "  ·  AUTO-SYNC EVERY 5 MIN"
    )
    patch = {"paragraph": {"rich_text": [rt(footer_text, False, "gray")]}}
    req = urllib.request.Request(
        f"{base}/blocks/{footer}",
        data=json.dumps(patch, ensure_ascii=False).encode("utf-8"),
        headers=HEADERS,
        method="PATCH",
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        response.read()

    print("Updated all three Notion MARKET MONITOR cards and metadata.")

out = Path("data/notion-market.json")
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
update_notion_board(payload)
print(f"Synced {len(all_rows)} records; latest={latest}")
