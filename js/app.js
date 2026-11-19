/* 앱 진입점: 사이드바, 이벤트 연결, 키보드 단축키, 데이터 로드. 가장 마지막에 불러온다. */
(function (DN) {
  'use strict';
  var el = DN.el, $ = DN.$, S = DN.state;

  function navBtn(name, count, current, onclick) {
    var li = el('li'), b = el('button'); b.type = 'button';
    b.appendChild(el('span', 'dot')); b.appendChild(el('span', 'name', name)); b.appendChild(el('span', 'count', String(count)));
    if (current) b.setAttribute('aria-current', 'true');
    b.addEventListener('click', onclick); li.appendChild(b); return li;
  }

  function renderNav() {
    var nav = $('nav'); nav.textContent = '';
    var counts = {}; DN.news.items.forEach(function (x) { counts[x.category] = (counts[x.category] || 0) + 1; });
    nav.appendChild(navBtn('전체', DN.news.items.length, S.cat === '전체' && !S.bmOnly, function () { setCat('전체'); }));
    DN.cats.forEach(function (c) { nav.appendChild(navBtn(c, counts[c] || 0, S.cat === c && !S.bmOnly, function () { setCat(c); })); });
    var ids = {}; DN.news.items.forEach(function (x) { ids[x.id] = 1; });
    var bc = Object.keys(DN.bm).filter(function (id) { return ids[id]; }).length;
    var n2 = $('nav2'); n2.textContent = '';
    n2.appendChild(navBtn('북마크', bc, S.bmOnly, function () { S.bmOnly = true; S.shown = DN.PAGE; DN.sync(); }));
  }

  function renderBadges() {
    var n = Object.keys(DN.bm).length, b = $('bmBadge');
    b.textContent = n > 99 ? '99+' : String(n); b.classList.toggle('on', n > 0);
    $('bmBtn').setAttribute('aria-pressed', String(S.bmOnly));
    $('vCard').setAttribute('aria-pressed', String(S.view === 'card'));
    $('vList').setAttribute('aria-pressed', String(S.view === 'list'));
    $('searchBox').classList.toggle('has', !!S.q);
    var nb = $('newBtn'), n = DN.base ? DN.news.items.filter(DN.isNew).length : 0;
    nb.hidden = !DN.base || n === 0;
    nb.textContent = '새 기사만 (' + n + ')';
    nb.setAttribute('aria-pressed', String(S.newOnly));
  }

  // 화면 전체 다시 그리기. keepOutlets: 매체 드롭다운은 그대로 둘 때(검색·북마크 토글)
  DN.sync = function (keepOutlets) {
    renderNav(); if (!keepOutlets) DN.renderOutlets();
    DN.renderPick(); DN.renderReco(); DN.renderList(); renderBadges();
  };

  function setCat(c) {
    S.cat = c; S.bmOnly = false; S.shown = DN.PAGE;
    try { history.replaceState(null, '', '#' + encodeURIComponent(c)); } catch (e) {}
    DN.sync();
  }
  function setView(v) { S.view = v; DN.saveView(); DN.renderList(); renderBadges(); }
  function clearSearch() { $('q').value = ''; S.q = ''; S.shown = DN.PAGE; DN.sync(true); }

  function bind() {
    var timer;
    $('q').addEventListener('input', function (e) {
      S.q = e.target.value; $('searchBox').classList.toggle('has', !!S.q);
      clearTimeout(timer); timer = setTimeout(function () { S.shown = DN.PAGE; DN.sync(true); }, 120);
    });
    $('clearQ').addEventListener('click', function () { clearSearch(); $('q').focus(); });
    $('outlet').addEventListener('change', function (e) { S.outlet = e.target.value; S.shown = DN.PAGE; DN.sync(true); });
    $('sort').addEventListener('change', function (e) { S.sort = e.target.value; S.shown = DN.PAGE; DN.renderList(); });
    $('more').addEventListener('click', function () { S.shown += DN.PAGE; DN.renderList(); });
    $('vCard').addEventListener('click', function () { setView('card'); });
    $('vList').addEventListener('click', function () { setView('list'); });
    $('bmBtn').addEventListener('click', function () { S.bmOnly = !S.bmOnly; S.shown = DN.PAGE; DN.sync(); });
    $('themeBtn').addEventListener('click', DN.toggleTheme);
    $('newBtn').addEventListener('click', function () { S.newOnly = !S.newOnly; S.shown = DN.PAGE; DN.sync(true); });

    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
      if (e.key === 'Escape' && typing && t.id === 'q') { clearSearch(); t.blur(); return; }
      if (typing) return;
      var k = e.key.toLowerCase();
      if (k === '/') { e.preventDefault(); $('q').focus(); }
      else if (k === 'b') { S.bmOnly = !S.bmOnly; S.shown = DN.PAGE; DN.sync(); }
      else if (k === 'd') DN.toggleTheme();
      else if (k === 'g') setView(S.view === 'card' ? 'list' : 'card');
    });
    window.addEventListener('hashchange', function () {
      var c = decodeURIComponent(location.hash.slice(1));
      if (c && (c === '전체' || DN.cats.indexOf(c) >= 0) && c !== S.cat) { S.cat = c; S.bmOnly = false; S.shown = DN.PAGE; DN.sync(); }
    });
  }

  function fetchJson(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }

  function renderUpdated() {
    var u = new Date(DN.news.updated), upd = $('upd');
    if (isNaN(u)) return;
    upd.classList.remove('stale');
    upd.textContent = '뉴스 업데이트 ' + (u.getMonth() + 1) + '/' + u.getDate() + ' ' + ('0' + u.getHours()).slice(-2) + ':' + ('0' + u.getMinutes()).slice(-2);
    if ((Date.now() - u.getTime()) / 3600000 > 36) { upd.classList.add('stale'); upd.textContent += ' (오래됨)'; }
  }

  // 실시간 갱신: 열어 둔 동안 주기적으로(그리고 탭으로 돌아올 때) news.json을 다시 받아 바뀌었으면 화면에 반영한다.
  // 스크롤을 내려 읽는 중이면 화면을 흔들지 않고 '새 기사 N건' 알림만 띄운다(누르면 반영).
  var POLL_MS = 3 * 60 * 1000, pending = null, polling = false;
  function applyNews(news) {
    pending = null; $('liveBar').hidden = true;
    var oldIds = {}; DN.news.items.forEach(function (x) { (x.ids || [x.id]).forEach(function (i) { oldIds[i] = 1; }); });
    var allIds = []; news.items.forEach(function (x) { allIds.push.apply(allIds, x.ids || [x.id]); });
    DN.news = news;
    DN.refreshVisit(allIds, Object.keys(oldIds));
    renderUpdated(); DN.sync(true);
  }
  function poll() {
    if (polling || !DN.news || !DN.news.items) return;
    polling = true;
    fetchJson('data/news.json').then(function (news) {
      if (!news || !news.items || !news.items.length || news.updated === DN.news.updated) return;
      if (window.scrollY > 300) {
        var oldIds = {}; DN.news.items.forEach(function (x) { (x.ids || [x.id]).forEach(function (i) { oldIds[i] = 1; }); });
        var n = news.items.filter(function (x) { return (x.ids || [x.id]).some(function (i) { return !oldIds[i]; }); }).length;
        pending = news;
        $('liveBtn').textContent = n ? '새 기사 ' + n + '건 · 눌러서 불러오기' : '뉴스가 갱신되었습니다 · 눌러서 불러오기';
        $('liveBar').hidden = false;
      } else applyNews(news);
    }).catch(function () {}).then(function () { polling = false; });
  }
  function startLive() {
    setInterval(function () { if (!document.hidden) poll(); }, POLL_MS);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
    window.addEventListener('online', poll);
    $('liveBtn').addEventListener('click', function () { if (pending) applyNews(pending); window.scrollTo({ top: 0 }); });
  }

  function boot(news, editions) {
    DN.news = news;
    DN.editions = (editions || []).filter(function (x) { return x && x.date; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var now = new Date();
    $('date').textContent = DN.fmtDate(now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate());

    if (!news || !news.items || !news.items.length) {
      $('feed').className = '';
      $('feed').appendChild(el('p', 'error', '뉴스 데이터를 불러오지 못했습니다. tools/fetch_news.py를 실행해 data/news.json을 만든 뒤 새로 고쳐 보세요.'));
      DN.renderPick(); DN.renderStreak();
      return;
    }
    DN.cats = news.categories && news.categories.length ? news.categories
      : Array.from(new Set(news.items.map(function (x) { return x.category; })));
    var allIds = []; news.items.forEach(function (x) { allIds.push.apply(allIds, x.ids || [x.id]); });
    DN.initVisit(allIds);
    var h = decodeURIComponent(location.hash.slice(1)); if (h && DN.cats.indexOf(h) >= 0) S.cat = h;

    renderUpdated();
    DN.renderStreak(); DN.sync();
    startLive();
  }

  // 홈 화면 설치·오프라인용 서비스 워커(https 또는 localhost에서만 동작)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  bind();
  Promise.all([
    fetchJson('data/news.json').catch(function () { return null; }),
    fetchJson('data/editions.json').catch(function () { return []; })
  ]).then(function (r) { boot(r[0], r[1]); });
})(window.DN);
