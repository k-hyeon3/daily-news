#!/usr/bin/env python3
"""언론사 RSS를 모아 data/news.json을 만든다. 표준 라이브러리만 사용.

사용: python tools/fetch_news.py
일부 피드가 죽어 있어도 나머지로 계속 진행하고, 마지막에 피드별 수집 결과를 출력한다.
"""
import hashlib
import html
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "news.json"
KST = timezone(timedelta(hours=9))
PER_FEED = 30          # 피드당 최대 기사 수
MAX_PER_CATEGORY = 200  # 분야당 보관 상한
UA = "Mozilla/5.0 (compatible; DailyNewsReader/1.0)"

CATEGORIES = ["정치", "경제", "사회", "IT·과학", "국제", "문화", "스포츠"]

# (분야, 매체, RSS 주소)
FEEDS = [
    # 연합뉴스
    ("정치", "연합뉴스", "https://www.yna.co.kr/rss/politics.xml"),
    ("경제", "연합뉴스", "https://www.yna.co.kr/rss/economy.xml"),
    ("사회", "연합뉴스", "https://www.yna.co.kr/rss/society.xml"),
    ("IT·과학", "연합뉴스", "https://www.yna.co.kr/rss/industry.xml"),
    ("국제", "연합뉴스", "https://www.yna.co.kr/rss/international.xml"),
    ("문화", "연합뉴스", "https://www.yna.co.kr/rss/culture.xml"),
    ("스포츠", "연합뉴스", "https://www.yna.co.kr/rss/sports.xml"),
    # 한겨레
    ("정치", "한겨레", "https://www.hani.co.kr/rss/politics/"),
    ("경제", "한겨레", "https://www.hani.co.kr/rss/economy/"),
    ("사회", "한겨레", "https://www.hani.co.kr/rss/society/"),
    ("IT·과학", "한겨레", "https://www.hani.co.kr/rss/science/"),
    ("국제", "한겨레", "https://www.hani.co.kr/rss/international/"),
    ("문화", "한겨레", "https://www.hani.co.kr/rss/culture/"),
    ("스포츠", "한겨레", "https://www.hani.co.kr/rss/sports/"),
    # 경향신문
    ("정치", "경향신문", "https://www.khan.co.kr/rss/rssdata/politic_news.xml"),
    ("경제", "경향신문", "https://www.khan.co.kr/rss/rssdata/economy_news.xml"),
    ("사회", "경향신문", "https://www.khan.co.kr/rss/rssdata/society_news.xml"),
    ("IT·과학", "경향신문", "https://www.khan.co.kr/rss/rssdata/it_news.xml"),
    ("국제", "경향신문", "https://www.khan.co.kr/rss/rssdata/kh_world.xml"),
    ("문화", "경향신문", "https://www.khan.co.kr/rss/rssdata/culture_news.xml"),
    ("스포츠", "경향신문", "https://www.khan.co.kr/rss/rssdata/kh_sports.xml"),
    # 동아일보
    ("정치", "동아일보", "https://rss.donga.com/politics.xml"),
    ("경제", "동아일보", "https://rss.donga.com/economy.xml"),
    ("사회", "동아일보", "https://rss.donga.com/national.xml"),
    ("IT·과학", "동아일보", "https://rss.donga.com/science.xml"),
    ("국제", "동아일보", "https://rss.donga.com/international.xml"),
    ("문화", "동아일보", "https://rss.donga.com/culture.xml"),
    ("스포츠", "동아일보", "https://rss.donga.com/sports.xml"),
    # 매일경제
    ("정치", "매일경제", "https://www.mk.co.kr/rss/30200030/"),
    ("경제", "매일경제", "https://www.mk.co.kr/rss/30100041/"),
    ("사회", "매일경제", "https://www.mk.co.kr/rss/50400012/"),
    ("IT·과학", "매일경제", "https://www.mk.co.kr/rss/50700001/"),
    ("국제", "매일경제", "https://www.mk.co.kr/rss/30300018/"),
    ("스포츠", "매일경제", "https://www.mk.co.kr/rss/71000001/"),
    # 한국경제
    ("정치", "한국경제", "https://www.hankyung.com/feed/politics"),
    ("경제", "한국경제", "https://www.hankyung.com/feed/economy"),
    ("사회", "한국경제", "https://www.hankyung.com/feed/society"),
    ("IT·과학", "한국경제", "https://www.hankyung.com/feed/it"),
    ("국제", "한국경제", "https://www.hankyung.com/feed/international"),
    ("문화", "한국경제", "https://www.hankyung.com/feed/life"),
    ("스포츠", "한국경제", "https://www.hankyung.com/feed/sports"),
    # JTBC
    ("정치", "JTBC", "https://fs.jtbc.co.kr/RSS/politics.xml"),
    ("경제", "JTBC", "https://fs.jtbc.co.kr/RSS/economy.xml"),
    ("사회", "JTBC", "https://fs.jtbc.co.kr/RSS/society.xml"),
    ("국제", "JTBC", "https://fs.jtbc.co.kr/RSS/international.xml"),
    ("문화", "JTBC", "https://fs.jtbc.co.kr/RSS/culture.xml"),
    ("스포츠", "JTBC", "https://fs.jtbc.co.kr/RSS/sports.xml"),
    # IT 전문
    ("IT·과학", "ZDNet Korea", "https://feeds.feedburner.com/zdkorea"),
    ("IT·과학", "전자신문", "https://rss.etnews.com/Section901.xml"),
]

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def clean(text, limit=None):
    text = html.unescape(TAG_RE.sub(" ", text or ""))
    text = WS_RE.sub(" ", text).strip()
    if limit and len(text) > limit:
        text = text[: limit - 1].rstrip() + "…"
    return text


def parse_date(s):
    if not s:
        return None
    s = s.strip()
    try:
        dt = parsedate_to_datetime(s)
    except (TypeError, ValueError):
        try:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=KST)
    return dt.astimezone(timezone.utc)


def local(tag):
    return tag.rsplit("}", 1)[-1]


def child_text(el, *names):
    for c in el:
        if local(c.tag) in names and (c.text or "").strip():
            return c.text
    return ""


def fetch(feed):
    cat, outlet, url = feed
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read()
        root = ET.fromstring(raw)
    except Exception as e:  # 피드 하나가 죽어도 전체는 계속
        return feed, [], f"{type(e).__name__}: {e}"
    items = []
    for it in root.iter():
        if local(it.tag) not in ("item", "entry"):
            continue
        title = clean(child_text(it, "title"))
        link = child_text(it, "link").strip()
        if not link:
            for c in it:
                if local(c.tag) == "link" and c.get("href"):
                    link = c.get("href")
                    break
        if not title or not link.startswith("http"):
            continue
        if "다시보기" in title:  # 지난 방송 VOD는 뉴스가 아니므로 제외
            continue
        link = link.replace("http://", "https://", 1)
        summary = clean(child_text(it, "description", "summary", "encoded", "content"), 160)
        pub = parse_date(child_text(it, "pubDate", "published", "updated", "date"))
        items.append({
            "_rank": len(items),  # 피드 안 순서(0이 최신). 발행 시각이 없는 기사의 정렬용
            "category": cat,
            "outlet": outlet,
            "title": title,
            "url": link,
            "summary": summary if summary != title else "",
            "published": pub.isoformat() if pub else None,
        })
        if len(items) >= PER_FEED:
            break
    return feed, items, None


# ---------- 같은 사건 묶기 ----------
CLUSTER_MIN_SHARED = 3      # 제목에서 겹치는 핵심어 최소 개수
CLUSTER_MIN_RATIO = 0.5     # 더 짧은 제목 기준 겹침 비율
CLUSTER_MAX_SIZE = 8
STOPWORDS = {"속보", "단독", "종합", "오늘", "내일", "어제", "포토", "영상", "사진", "인터뷰", "논란", "관련", "대한", "위해", "통해", "이후", "가운데"}
WORD_RE = re.compile(r"[0-9A-Za-z가-힣]+")


def title_tokens(title):
    """제목에서 핵심어 집합을 만든다. 조사·어미 차이를 줄이려고 3글자 이상 단어는 앞 3글자만 쓴다."""
    toks = set()
    for w in WORD_RE.findall(re.sub(r"\[[^\]]*\]", " ", title)):
        if w in STOPWORDS:
            continue
        if len(w) >= 3:
            toks.add(w[:3])
        elif len(w) == 2:
            toks.add(w)
        elif w.isdigit():
            toks.add(w)
    return toks


def cluster(items, sort_key):
    """제목이 비슷한 다른 매체 기사를 하나로 묶는다. 대표(lead)는 가장 먼저 나온 기사로 정해
    새 기사가 붙어도 대표 id(북마크·읽음 기준)가 바뀌지 않게 한다."""
    order = sorted(items, key=sort_key)            # 오래된 것부터
    toks = {it["id"]: title_tokens(it["title"]) for it in items}
    clusters = []                                  # {lead, members:[...]}
    by_tok = {}                                    # 핵심어 -> 클러스터 번호들
    for it in order:
        t = toks[it["id"]]
        cand = {}
        for w in t:
            for ci in by_tok.get(w, ()):
                cand[ci] = cand.get(ci, 0) + 1
        best, best_score = None, 0.0
        for ci, shared in cand.items():
            c = clusters[ci]
            lt = toks[c["lead"]["id"]]
            if shared < CLUSTER_MIN_SHARED or len(c["members"]) >= CLUSTER_MAX_SIZE:
                continue
            if any(m["outlet"] == it["outlet"] for m in c["members"]):
                continue
            ratio = shared / max(1, min(len(t), len(lt)))
            if ratio >= CLUSTER_MIN_RATIO and ratio > best_score:
                best, best_score = ci, ratio
        if best is None:
            clusters.append({"lead": it, "members": [it]})
            for w in t:
                by_tok.setdefault(w, []).append(len(clusters) - 1)
        else:
            clusters[best]["members"].append(it)
    return clusters


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    with ThreadPoolExecutor(max_workers=12) as ex:
        results = list(ex.map(fetch, FEEDS))

    seen_url, seen_title, all_items = set(), set(), []
    report = []
    for (cat, outlet, url), items, err in results:
        report.append((cat, outlet, len(items), err))
        for it in items:
            key = re.sub(r"[^0-9a-z가-힣]", "", it["title"].lower())
            if it["url"] in seen_url or key in seen_title:
                continue
            seen_url.add(it["url"])
            seen_title.add(key)
            it["id"] = hashlib.sha1(it["url"].encode()).hexdigest()[:12]
            all_items.append(it)

    # 발행 시각이 없는 기사는 같은 분야의 가장 최근 '실제 발행 시각'을 기준으로
    # 피드 내 순번×3분씩 뒤로 두어 정렬 위치만 정한다(화면에는 시각을 표시하지 않음).
    now = datetime.now(timezone.utc).isoformat()
    ref = {}
    for it in all_items:
        if it["published"] and it["published"] <= now:
            ref[it["category"]] = max(ref.get(it["category"], ""), it["published"])

    def sort_key(x):
        if x["published"]:
            return x["published"]
        base = ref.get(x["category"], now)
        return (datetime.fromisoformat(base) - timedelta(minutes=3 * x["_rank"])).isoformat()

    clusters = cluster(all_items, sort_key)

    kept_items, per_cat = [], {}
    clusters.sort(key=lambda c: max(sort_key(m) for m in c["members"]), reverse=True)  # 가장 새 기사 기준
    for c in clusters:
        lead, members = c["lead"], c["members"]
        cats = {}
        for m in members:
            cats[m["category"]] = cats.get(m["category"], 0) + 1
        category = max(cats, key=lambda k: (cats[k], k == lead["category"]))
        n = per_cat.get(category, 0)
        if n >= MAX_PER_CATEGORY:
            continue
        per_cat[category] = n + 1
        dated = [m["published"] for m in members if m["published"]]
        rec = {k: lead[k] for k in ("id", "outlet", "title", "url", "summary")}
        rec["category"] = category
        rec["published"] = max(dated) if dated else None           # 묶음 안에서 가장 최근 발행 시각
        rec["ids"] = [m["id"] for m in members]                     # '새 기사' 판정용
        rec["related"] = [{k: m[k] for k in ("id", "outlet", "title", "url")}
                          for m in sorted(members, key=sort_key, reverse=True) if m is not lead]
        kept_items.append(rec)
    kept = kept_items

    out = {
        "updated": datetime.now(KST).isoformat(timespec="seconds"),
        "categories": CATEGORIES,
        "items": kept,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    ok = sum(1 for r in report if r[2] > 0)
    print(f"피드 {ok}/{len(report)}개 성공, 기사 {len(kept)}건 저장 -> {OUT}")
    for cat in CATEGORIES:
        print(f"  {cat}: {per_cat.get(cat, 0)}건")
    failed = [r for r in report if r[2] == 0]
    if failed:
        print("\n실패/빈 피드:")
        for cat, outlet, _, err in failed:
            print(f"  [{cat}] {outlet}: {err or '기사 없음'}")
    return 0 if kept else 1


if __name__ == "__main__":
    sys.exit(main())
