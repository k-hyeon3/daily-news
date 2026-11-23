#!/usr/bin/env python3
"""에디터 픽 후보 추리기: data/news.json에서 최근 30시간 안, 여러 매체가 다룬 소식을 분야별로 뽑아 텍스트로 출력한다.
data/news.json이 너무 커서 AI가 통째로 읽을 수 없을 때 쓴다. 표준 라이브러리만 사용."""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
FIELDS = [("정치·사회", ["정치", "사회"]), ("경제·금융", ["경제"]), ("IT·보안", ["IT·과학"]), ("국제", ["국제"])]
PER_FIELD = 8

d = json.loads((ROOT / "data" / "news.json").read_text(encoding="utf-8"))
now = datetime.now(timezone.utc)
for field, cats in FIELDS:
    items = []
    for x in d["items"]:
        if x["category"] not in cats or not x.get("published"):
            continue
        age = (now - datetime.fromisoformat(x["published"])).total_seconds() / 3600
        if age <= 30:
            items.append((len(x.get("related") or []), -age, x))
    items.sort(key=lambda t: (t[0], t[1]), reverse=True)
    print(f"\n######## {field}")
    for n, _, x in items[:PER_FIELD]:
        print(f"\n[{n + 1}개 매체] {x['outlet']} | {x['title']} | {x['published'][:16]}")
        if x.get("summary"):
            print(f"  요약: {x['summary'][:200]}")
        print(f"  {x['url']}")
        for r in x.get("related") or []:
            print(f"  - {r['outlet']} | {r.get('title') or ''} | {r['url']}")
