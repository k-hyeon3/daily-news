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
  }

  // 화면 전체 다시 그리기. keepOutlets: 매체 드롭다운은 그대로 둘 때(검색·북마크 토글)
  DN.sync = function (keepOutlets) {
    renderNav(); if (!keepOutlets) DN.renderOutlets();
    DN.renderPick(); DN.renderList(); renderBadges();
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
    var h = decodeURIComponent(location.hash.slice(1)); if (h && DN.cats.indexOf(h) >= 0) S.cat = h;

    var u = new Date(news.updated), upd = $('upd');
    if (!isNaN(u)) {
      upd.textContent = '뉴스 업데이트 ' + (u.getMonth() + 1) + '/' + u.getDate() + ' ' + ('0' + u.getHours()).slice(-2) + ':' + ('0' + u.getMinutes()).slice(-2);
      if ((Date.now() - u.getTime()) / 3600000 > 36) { upd.classList.add('stale'); upd.textContent += ' (오래됨)'; }
    }
    DN.renderStreak(); DN.sync();
  }

  bind();
  Promise.all([
    fetchJson('data/news.json').catch(function () { return null; }),
    fetchJson('data/editions.json').catch(function () { return []; })
  ]).then(function (r) { boot(r[0], r[1]); });
})(window.DN);
