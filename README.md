# 하루 한 판 뉴스

분야별 뉴스를 한눈에 보는 페이지. 왼쪽 분야 사이드바에서 정치·경제·사회·IT·과학·국제·문화·스포츠를 고르면 그 분야 기사가 전부 나온다. 맨 위에는 매일 올라오는 "에디터 픽"(분야별 영상 1개 + 요약 + 매체별 보도)이 붙는다.

- 실제 서비스 주소: https://claude.ai/artifact/1ZCiHrsdoomshswRm5ui1B
- 아티팩트 slug: 047f04b3-3daf-424e-8672-1cda05266dae
- 디자인(Figma): https://www.figma.com/design/HnpDhVpi5U3mw0Q4jNvNH0

## 파일 구조

```
index.html              뼈대 HTML (스타일·스크립트는 아래 파일을 불러온다)
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
- 발행 시각을 안 주는 매체(한겨레, JTBC)는 화면에 시각을 표시하지 않고, 같은 분야의 실제 시각 사이에 피드 순서대로 끼워 정렬한다.
- JTBC "뉴스룸 다시보기" 같은 지난 방송 VOD는 제외한다.
- RSS에는 기사 본문이 없다. 제목과 요약 한두 줄만 보여 주고 본문은 각 매체에서 읽는다.

## 기능

분야 전환 · 전체 검색(검색어 강조) · 매체 필터 · 정렬(최신순/매체순) · 카드형/목록형 · 더 보기 · 북마크(저장·북마크만 보기) · 읽음 표시 · 다크 모드(OS 설정 따름, 수동 전환 저장) · 에디터 픽(지난 호 선택, 분야 탭, 완독 체크, 연속 일수) · 업데이트 시각(36시간 넘으면 "오래됨" 표시) · 모바일 반응형

단축키: `/` 검색 · `B` 북마크만 보기 · `D` 다크 모드 · `G` 카드/목록 전환 · `Esc` 검색어 지우기

## 디자인 시스템

Figma 파일의 변수와 `css/tokens.css`의 CSS 변수는 같은 이름·값이다(예: `brand/primary` → `--brand-primary`). 색을 바꿀 땐 두 곳을 같이 고친다.
Figma 스타터 요금제는 변수 모드가 1개뿐이라 Light는 `Color`, Dark는 `Color Dark` 컬렉션으로 따로 두었다.
글꼴: 헤드라인 Noto Serif KR, 본문 IBM Plex Sans KR.

## 실제 페이지(claude.ai 아티팩트)에 반영하기

로컬 파일을 고쳐도 claude.ai 페이지는 바뀌지 않는다. Claude에게 "바탕화면 daily-news 폴더를 하루 한 판 뉴스 아티팩트에 다시 게시해줘"라고 하면 된다. 이제 여러 파일이라 `index.html`과 `css/`, `js/`를 함께 올려야 한다.

주의:
- 매일 아침 7시 12분 예약 작업은 서비스 쪽 `data/editions.json`만 갱신한다. 다시 게시할 때 `data/editions.json`은 올리지 않는다(올리면 그동안 쌓인 호가 덮어써진다).
- 아티팩트에서는 브라우저가 외부 서버로 fetch할 수 없어서 `data/news.json`은 게시 시점의 스냅샷이다. 매일 자동으로 바뀌지 않는다. 자동 갱신하려면 예약 작업이 `fetch_news.py`를 돌려 `news.json`도 올리도록 지시문을 고쳐야 한다(Claude에게 요청).
- 데이터 형식을 바꾸면 예약 작업의 지시문도 같이 고쳐야 한다.

## 데이터 형식

`data/news.json`
```json
{
  "updated": "2026-11-17T16:09:00+09:00",
  "categories": ["정치", "경제", "사회", "IT·과학", "국제", "문화", "스포츠"],
  "items": [
    {"id": "12자리 해시", "category": "", "outlet": "", "title": "", "url": "https://...", "summary": "", "published": "ISO 시각 또는 null"}
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

## 규칙

- 외부에서 온 제목·요약은 `innerHTML`이 아니라 `textContent`로만 넣는다(`DN.el`, `DN.highlight` 사용). `innerHTML`은 `DN.svg`로 고정 아이콘 문자열을 넣을 때만 쓴다.
- 링크는 `https://`로 시작할 때만 건다(`DN.safeUrl`).
- 아티팩트 환경 제약: 유튜브 등 외부 iframe 불가(영상은 링크로만), 외부 이미지 로드 불가(썸네일 없음), 스크립트는 일부 CDN만 허용.
