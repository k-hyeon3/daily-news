# 하루 한 판 뉴스

분야별 뉴스를 한눈에 보는 페이지. 왼쪽 분야 사이드바에서 정치·경제·사회·IT·과학·국제·문화·스포츠를 고르면 그 분야 기사가 전부 나온다. 맨 위에는 매일 올라오는 "에디터 픽"(분야별 영상 1개 + 요약 + 매체별 보도)이 붙는다.

- 서비스 주소: https://k-hyeon3.github.io/daily-news/ (GitHub Pages)
- 저장소: https://github.com/k-hyeon3/daily-news
- 디자인(Figma): https://www.figma.com/design/HnpDhVpi5U3mw0Q4jNvNH0

## 파일 구조

```
index.html              뼈대 HTML (스타일·스크립트는 아래 파일을 불러온다)
manifest.webmanifest    홈 화면 설치용 앱 정보(이름, 색, 아이콘)
sw.js                   서비스 워커: 오프라인에서도 마지막 화면과 기사 목록이 열린다
icons/                  앱 아이콘(SVG 원본 + PNG 192/512/maskable/apple-touch + Windows용 icon.ico)
tools/make_shortcut.ps1 바탕화면 바로가기 만들기(주소창 없는 앱 창으로 열림)
css/
  tokens.css            디자인 토큰(색·간격·반경·글꼴), 다크 모드 값
  layout.css            기본 요소, 사이드바, 메인 영역 뼈대
  components.css        에디터 픽, 필터 줄, 기사 카드
  responsive.css        화면 크기별 조정 (항상 마지막에 불러올 것)
js/                     프레임워크 없음. 전역 네임스페이스 DN 하나를 공유한다
  util.js               DOM 생성(textContent 기반), 링크, 날짜, 검색어 강조
  store.js              상태 + localStorage(북마크·읽음·본 영상·테마·보기 방식)
  feed.js               기사 필터·정렬·카드 렌더·북마크·읽음
  pick.js               에디터 픽, 연속 완독
  app.js                사이드바, 이벤트, 단축키, 데이터 로드 (맨 마지막에 불러올 것)
tools/fetch_news.py     언론사 RSS를 모아 data/news.json 생성 (표준 라이브러리만 사용)
tools/add_edition.py    에디터 픽 한 호를 editions.json에 합치고 커밋·push (예약 작업이 호출)
.github/workflows/      3시간마다 뉴스를 모아 GitHub Pages에 배포
data/news.json          분야별 전체 기사 (fetch_news.py가 만든다)
data/editions.json      에디터 픽 데이터. 한 줄에 하루치 한 호, 최신이 맨 위
run-local.bat           뉴스 수집 후 로컬 미리보기 실행 (Python 필요)
```

스크립트 로드 순서는 `util → store → feed → pick → app`이다. 순서를 바꾸면 안 된다.

## 로컬에서 실행

index.html을 더블클릭하면 데이터가 안 뜬다(file:// 에서는 fetch가 막힘).
`run-local.bat`을 실행하면 뉴스를 새로 모은 뒤 http://localhost:8787/ 이 열린다.
수집만 하려면 `python tools/fetch_news.py`.

## 뉴스 수집 (tools/fetch_news.py)

- 연합뉴스, 한겨레, 경향신문, 동아일보, 매일경제, 한국경제, JTBC, ZDNet Korea, 전자신문 RSS를 읽는다. 목록은 파일 위쪽 `FEEDS`에서 고친다(분야, 매체, 주소).
- 피드 하나가 죽어도 나머지로 계속하고, 끝에 분야별 건수와 실패한 피드를 출력한다.
- 주소와 제목이 같은 기사는 하나로 합치고, 분야당 최대 200건을 최신순으로 보관한다.
- 같은 소식 묶기: 제목의 핵심어(3글자 이상 단어는 앞 3글자)가 3개 이상, 짧은 제목 기준 50% 이상 겹치고 매체가 다르면 한 묶음으로 본다(최대 8개). 정확도를 우선해 기준을 빡빡하게 잡았으니 놓치는 묶음은 있어도 엉뚱한 기사가 섞이는 일은 드물다. 기준은 `fetch_news.py` 위쪽 `CLUSTER_*` 상수에서 고친다. 대표 기사는 가장 먼저 나온 기사라 새 기사가 붙어도 대표 id(북마크·읽음 기준)가 바뀌지 않는다.
- 발행 시각을 안 주는 매체(한겨레, JTBC)는 화면에 시각을 표시하지 않고, 같은 분야의 실제 시각 사이에 피드 순서대로 끼워 정렬한다.
- JTBC "뉴스룸 다시보기" 같은 지난 방송 VOD는 제외한다.
- RSS에는 기사 본문이 없다. 제목과 요약 한두 줄만 보여 주고 본문은 각 매체에서 읽는다.

## 기능

새 기사 표시(NEW 배지, 새 기사만 보기) · 같은 소식 묶기(여러 매체 보도를 한 카드로) · 홈 화면 설치(PWA, 오프라인 열람) · 분야 전환 · 전체 검색(검색어 강조) · 매체 필터 · 정렬(최신순/매체순) · 카드형/목록형 · 더 보기 · 북마크(저장·북마크만 보기) · 읽음 표시 · 다크 모드(기본은 항상 밝은 화면, OS 설정은 따르지 않음. 사용자가 전환하면 다시 바꾸기 전까지 그 선택을 기억) · 에디터 픽(지난 호 선택, 분야 탭, 완독 체크, 연속 일수) · 업데이트 시각(36시간 넘으면 "오래됨" 표시) · 모바일 반응형

단축키: `/` 검색 · `B` 북마크만 보기 · `D` 다크 모드 · `G` 카드/목록 전환 · `Esc` 검색어 지우기

## 디자인 시스템

Figma 파일의 변수와 `css/tokens.css`의 CSS 변수는 같은 이름·값이다(예: `brand/primary` → `--brand-primary`). 색을 바꿀 땐 두 곳을 같이 고친다.
Figma 스타터 요금제는 변수 모드가 1개뿐이라 Light는 `Color`, Dark는 `Color Dark` 컬렉션으로 따로 두었다.
글꼴: 헤드라인 Noto Serif KR, 본문 IBM Plex Sans KR.

## 배포와 자동 갱신 (GitHub Pages)

`.github/workflows/update-news.yml`이 아래 경우에 뉴스를 새로 모아 Pages에 배포한다.

- 3시간마다(cron `7 */3 * * *`, UTC 기준)
- `main`에 push할 때(코드나 `data/editions.json`을 고쳤을 때)
- Actions 탭에서 수동 실행(Run workflow), 또는 `gh workflow run update-news.yml`

동작 방식:
- `data/news.json`은 저장소에 커밋하지 않는다(`.gitignore`). 배포할 때마다 `tools/fetch_news.py`가 새로 만든다. 로컬에서는 `run-local.bat`이 만든다.
- 수집 결과가 0건이면 워크플로가 실패하고 이전 배포가 그대로 유지된다.
- 배포되는 파일은 `index.html`, `css/`, `js/`, `data/`뿐이다(`tools/`와 README는 제외).
- 상태 확인: `gh run list`, 실패 원인: `gh run view --log-failed`.

코드를 고치고 반영하는 법: 커밋하고 `git push`하면 몇 분 안에 자동 배포된다.

에디터 픽(`data/editions.json`)은 저장소에 커밋된 파일이 원본이다. 이 파일을 고쳐 push하면 다음 배포에 반영된다.

### 에디터 픽 매일 갱신

매일 아침 7시 12분의 예약 작업("하루 한 판 뉴스 갱신", https://claude.ai/code/routines/trig_01XFoeg9X5fkj6kdJ8G7Eurg)이 그날 호를 만든다.
1. 옛 claude.ai 아티팩트(slug 047f04b3-3daf-424e-8672-1cda05266dae)의 `editions.json`을 갱신한다(기존 동작, 그대로 유지).
2. 같은 레코드를 사용자 PC로 보내 `python tools/add_edition.py --b64z <압축 JSON>`을 실행한다. 이 스크립트가 검증, 병합(같은 날짜는 교체, 최신이 위, 60호까지), 커밋, push를 하고, push되면 Actions가 자동 배포한다.

주의:
- 2번은 그 시각에 PC가 켜져 있고 Claude 데스크톱이 연결돼 있어야 한다. 아니면 실패 사실만 알리고 넘어간다(아티팩트 갱신과 별개). 빠진 날은 `python tools/add_edition.py --file record.json`으로 나중에 채울 수 있다.
- 커밋 안 된 `data/editions.json` 변경이 있으면 스크립트가 중단한다. 직접 고친 뒤에는 먼저 커밋하거나 되돌린다.
- 검증만 해 보려면 `--dry-run`을 붙인다(파일·커밋·push 없음).

## 데이터 형식

`data/news.json`
```json
{
  "updated": "2026-11-17T16:09:00+09:00",
  "categories": ["정치", "경제", "사회", "IT·과학", "국제", "문화", "스포츠"],
  "items": [
    {"id": "12자리 해시", "category": "", "outlet": "", "title": "", "url": "https://...", "summary": "",
     "published": "묶음 안 가장 최근 발행 시각(ISO) 또는 null",
     "ids": ["묶음에 든 모든 기사 id(대표 포함)"],
     "related": [{"id": "", "outlet": "", "title": "", "url": "https://..."}]}
  ]
}
```

`data/editions.json` (한 호)
```json
{
  "date": "YYYY-MM-DD",
  "headline": "그날 흐름 한 문장",
  "sections": [
    {
      "field": "정치·사회 | 경제·금융 | IT·보안 | 국제",
      "title": "", "summary": "", "why": "",
      "video": {"title": "", "channel": "", "url": "", "date": "", "note": ""},
      "articles": [{"outlet": "", "title": "", "url": ""}],
      "terms": [{"term": "", "desc": ""}]
    }
  ],
  "more": [{"title": "", "outlet": "", "url": ""}]
}
```

## 테마

기본은 밝은 화면이다. OS가 다크 모드여도 따라가지 않는다. 오른쪽 위 달 버튼(또는 `D` 키)으로 바꾸면 localStorage(`daily-news-theme-v1`)에 저장돼 새로고침·재방문 후에도 유지되고, 다시 바꿀 때까지 고정이다. 저장은 기기·브라우저마다 따로이다. 첫 화면이 그려지기 전에 `index.html` 맨 위의 인라인 스크립트가 저장값을 먼저 적용해서 화면이 깜빡이지 않는다.

## 새 기사 표시

지난 방문 때 화면에 있던 기사 id 목록을 localStorage(`daily-news-visit-v1`)에 두고 비교한다. 30분 안의 새로고침은 같은 방문으로 본다. 처음 방문하거나 새 기사가 없으면 토글을 숨긴다. 기기·브라우저마다 따로 기록된다.

## 홈 화면 설치(PWA)

https 또는 localhost에서 열면 브라우저가 설치를 제안한다(Chrome 주소창의 설치 아이콘, iOS Safari는 공유 → 홈 화면에 추가). 같은 출처 파일은 네트워크 우선·실패 시 캐시라서 온라인일 때는 항상 최신이고 오프라인에서는 마지막으로 본 내용이 열린다. 구조를 크게 바꿀 때는 `sw.js`의 `VERSION`을 올린다. 새 파일을 추가하면 `sw.js`의 `SHELL`과 배포 워크플로의 `cp` 목록에도 넣는다.

## 바탕화면 바로가기

`powershell -ExecutionPolicy Bypass -File tools\make_shortcut.ps1`을 실행하면 바탕화면에 "하루 한 판 뉴스" 아이콘이 생기고, 누르면 주소창 없는 앱 창으로 사이트가 열린다(Chrome, 없으면 Edge).
- 로컬 서버로 열고 싶으면 `-Url http://localhost:8787/`(먼저 `run-local.bat` 실행 필요), 이름을 바꾸려면 `-Name`.
- 아이콘은 `icons/icon.ico`를 가리킨다. 이 폴더를 옮기면 아이콘만 깨지니 스크립트를 다시 실행한다.
- 같은 효과를 브라우저 기능으로도 낼 수 있다: Chrome에서 사이트를 열고 주소창의 설치 아이콘(또는 메뉴 → 저장 및 공유 → 앱으로 설치)을 누르면 바탕화면·시작 메뉴에 바로가기가 생긴다(PWA).

## 규칙

- 외부에서 온 제목·요약은 `innerHTML`이 아니라 `textContent`로만 넣는다(`DN.el`, `DN.highlight` 사용). `innerHTML`은 `DN.svg`로 고정 아이콘 문자열을 넣을 때만 쓴다.
- 링크는 `https://`로 시작할 때만 건다(`DN.safeUrl`).
- 영상은 링크로만 연다(유튜브 iframe은 쓰지 않음). RSS에는 썸네일이 없다.
