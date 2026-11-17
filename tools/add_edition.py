#!/usr/bin/env python3
"""에디터 픽 한 호를 data/editions.json에 합치고 커밋·push 한다. 표준 라이브러리만 사용.

예약 작업이 하루치 레코드(JSON)를 base64로 넘겨 호출한다(따옴표 문제를 피하려고).
  python tools/add_edition.py --b64 <base64 JSON>
  python tools/add_edition.py --b64z <base64(zlib 압축 JSON)>   (명령줄 길이 제한을 피할 때)
  python tools/add_edition.py --file record.json
옵션: --dry-run  파일 수정·커밋·push 없이 검증과 결과 요약만 출력

규칙(예약 작업 지시문과 동일): 같은 날짜가 있으면 교체, 최신 호가 맨 위, 60호 초과 시 오래된 것부터 삭제,
한 줄에 한 호.
"""
import argparse
import base64
import json
import zlib
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILE = ROOT / "data" / "editions.json"
MAX_EDITIONS = 60


def fail(msg):
    print("오류:", msg, file=sys.stderr)
    sys.exit(1)


def git(*args, check=True):
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    if check and r.returncode != 0:
        fail("git " + " ".join(args) + "\n" + (r.stderr or r.stdout).strip())
    return r


def validate(rec):
    if not isinstance(rec, dict):
        fail("레코드가 객체가 아닙니다")
    for k in ("date", "headline", "sections"):
        if not rec.get(k):
            fail(f"'{k}' 항목이 없습니다")
    if not (len(rec["date"]) == 10 and rec["date"][4] == "-" and rec["date"][7] == "-"):
        fail("date는 YYYY-MM-DD 형식이어야 합니다")
    if not isinstance(rec["sections"], list):
        fail("sections는 배열이어야 합니다")
    for s in rec["sections"]:
        if not s.get("field") or not s.get("title") or not s.get("summary"):
            fail("각 분야에는 field, title, summary가 필요합니다")
        urls = [a.get("url") for a in s.get("articles", [])] + [(s.get("video") or {}).get("url")]
        for u in urls:
            if u and not str(u).startswith("https://"):
                fail(f"https가 아닌 URL: {u}")


def write_lines(path, recs):
    body = ",\n".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in recs)
    path.write_text("[\n" + body + "\n]\n", encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--b64")
    g.add_argument("--b64z")
    g.add_argument("--file")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    if a.b64:
        raw = base64.b64decode(a.b64).decode("utf-8")
    elif a.b64z:
        raw = zlib.decompress(base64.b64decode(a.b64z)).decode("utf-8")
    else:
        raw = Path(a.file).read_text(encoding="utf-8")
    try:
        rec = json.loads(raw)
    except json.JSONDecodeError as e:
        fail(f"JSON 파싱 실패: {e}")
    validate(rec)

    if not a.dry_run:
        if git("status", "--porcelain", "--", "data/editions.json").stdout.strip():
            fail("data/editions.json에 커밋 안 된 변경이 있어 중단합니다")
        git("pull", "--rebase", "--quiet")  # 저장소 쪽 최신 호를 먼저 받는다

    cur = json.loads(FILE.read_text(encoding="utf-8")) if FILE.exists() else []
    replaced = any(r.get("date") == rec["date"] for r in cur)
    merged = [rec] + [r for r in cur if r.get("date") != rec["date"]]
    merged.sort(key=lambda r: r["date"], reverse=True)
    merged = merged[:MAX_EDITIONS]
    print(f"{'교체' if replaced else '추가'}: {rec['date']} (분야 {len(rec['sections'])}개) -> 총 {len(merged)}호")

    if a.dry_run:
        print("dry-run: 파일을 바꾸지 않았습니다")
        return
    write_lines(FILE, merged)
    git("add", "data/editions.json")
    if not git("diff", "--cached", "--quiet", check=False).returncode:
        print("변경 없음")
        return
    git("commit", "-q", "-m", f"에디터 픽 {rec['date']}호 {'교체' if replaced else '추가'}")
    git("push", "-q")
    print("push 완료")


if __name__ == "__main__":
    main()
