/* 상태와 localStorage 저장(북마크·읽음·본 영상·테마·보기 방식) */
(function (DN) {
  'use strict';

  var K = {
    bm: 'daily-news-bookmarks-v1',
    read: 'daily-news-read-v1',
    watch: 'daily-news-watched-v1',
    theme: 'daily-news-theme-v1',
    view: 'daily-news-view-v1',
    visit: 'daily-news-visit-v1'
  };
  DN.PAGE = 24;

  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  DN.news = null;       // data/news.json
  DN.editions = [];     // data/editions.json (최신 호가 맨 앞)
  DN.cats = [];
  DN.bm = load(K.bm, {});
  DN.read = load(K.read, {});
  DN.watched = load(K.watch, {});
  DN.state = {
    cat: '전체', q: '', outlet: '', sort: 'new', bmOnly: false, newOnly: false,
    view: load(K.view, 'card') === 'list' ? 'list' : 'card',
    shown: DN.PAGE, edIdx: 0, edSec: 0
  };

  DN.saveBm = function () { save(K.bm, DN.bm); };
  DN.saveWatched = function () { save(K.watch, DN.watched); };
  DN.saveView = function () { save(K.view, DN.state.view); };
  DN.saveRead = function () {
    var ks = Object.keys(DN.read);
    if (ks.length > 3000) { // 오래된 것부터 정리해 2000개만 유지
      ks.sort(function (a, b) { return DN.read[a] - DN.read[b]; })
        .slice(0, ks.length - 2000).forEach(function (k) { delete DN.read[k]; });
    }
    save(K.read, DN.read);
  };

  // '새 기사' 판정: 지난 방문 때 화면에 있던 기사 id 목록(base)과 비교한다.
  // 30분 안의 새로고침은 같은 방문으로 보고 base를 유지한다.
  DN.base = null;
  DN.initVisit = function (ids) {
    var SESSION = 30 * 60 * 1000, v = load(K.visit, null), now = Date.now(), base = null;
    if (v && v.cur) base = (now - v.t > SESSION) ? v.cur : v.base;
    save(K.visit, { base: base, cur: ids, t: now });
    DN.base = base ? new Set(base) : null;
  };
  // 열어 둔 채로 새 기사가 들어왔을 때: 비교 기준(base)은 유지해 새 기사가 NEW로 보이게 하고, 저장된 목록만 갱신한다.
  DN.refreshVisit = function (ids, prevIds) {
    var v = load(K.visit, null);
    if (!DN.base) DN.base = new Set(prevIds); // 첫 방문이었다면 방금 전까지 화면에 있던 기사를 기준으로 삼는다
    save(K.visit, { base: v && v.base ? v.base : prevIds, cur: ids, t: Date.now() });
  };
  DN.isNew = function (x) {
    if (!DN.base) return false;
    return (x.ids || [x.id]).some(function (i) { return !DN.base.has(i); });
  };

  // 테마: 기본은 밝은 화면. 사용자가 전환하면 그 선택을 저장하고 다시 바꾸기 전까지 유지한다.
  // (페이지가 그려지기 전에 index.html 맨 위 인라인 스크립트가 같은 값을 먼저 적용해 깜빡임을 막는다)
  function applyTheme(t) { document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light'); }
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  DN.toggleTheme = function () { var t = isDark() ? 'light' : 'dark'; applyTheme(t); save(K.theme, t); };
  applyTheme(load(K.theme, 'light'));
})(window.DN);
