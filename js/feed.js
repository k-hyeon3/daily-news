/* 기사 목록: 필터·정렬·카드 렌더·북마크·읽음 */
(function (DN) {
  'use strict';
  var el = DN.el, $ = DN.$;

  // 묶음(대표 기사 + related)에 들어 있는 매체 목록과 검색 대상 문자열
  function outlets(x) { return [x.outlet].concat((x.related || []).map(function (r) { return r.outlet; })); }
  function hay(x) {
    return (x.title + ' ' + outlets(x).join(' ') + ' ' + (x.summary || '') + ' ' +
      (x.related || []).map(function (r) { return r.title; }).join(' ')).toLowerCase();
  }

  DN.filtered = function () {
    var s = DN.state, q = s.q.trim().toLowerCase();
    var out = DN.news.items.filter(function (x) {
      if (s.bmOnly && !DN.bm[x.id]) return false;
      if (s.cat !== '전체' && x.category !== s.cat) return false;
      if (s.newOnly && !DN.isNew(x)) return false;
      if (s.outlet && outlets(x).indexOf(s.outlet) < 0) return false;
      if (q && hay(x).indexOf(q) < 0) return false;
      return true;
    });
    if (s.sort === 'outlet') out = out.slice().sort(function (a, b) { return a.outlet < b.outlet ? -1 : a.outlet > b.outlet ? 1 : 0; });
    return out;
  };

  // 화면 갱신 없이 읽음만 기록(추천 카드 등에서 사용)
  DN.setRead = function (id) { if (!DN.read[id]) { DN.read[id] = Date.now(); DN.saveRead(); } };

  function markRead(id, card, foot) {
    if (DN.read[id]) return;
    DN.setRead(id);
    card.classList.add('is-read');
    foot.insertBefore(el('span', 'read', '읽음'), foot.querySelector('.bm'));
  }

  DN.toggleBm = function (id) {
    if (DN.bm[id]) delete DN.bm[id]; else DN.bm[id] = Date.now();
    DN.saveBm(); DN.sync(true);
  };

  function outletsLabel(x) { return '같은 소식 ' + x.related.length + '개 매체 더 보기'; }

  function card(x, q) {
    var c = el('article', 'card' + (DN.read[x.id] ? ' is-read' : ''));
    var m = el('div', 'meta');
    m.appendChild(el('span', 'outlet', x.outlet));
    if (DN.isNew(x)) m.appendChild(el('span', 'new', 'NEW'));
    var t = DN.rel(x.published); if (t) m.appendChild(el('span', 'time', t));
    c.appendChild(m);

    var h = el('h4'), a = DN.link(x.url, ''); DN.highlight(a, x.title, q); h.appendChild(a); c.appendChild(h);
    if (x.summary) { var s = el('p', 'sum'); DN.highlight(s, x.summary, q); c.appendChild(s); }

    var f = el('div', 'foot');
    if (x.related && x.related.length) {
      var rel = el('ul', 'rel'); rel.hidden = true;
      x.related.forEach(function (r) {
        var li = el('li'); li.appendChild(el('span', 'o', r.outlet));
        var ra = DN.link(r.url, ''); DN.highlight(ra, r.title, q); li.appendChild(ra);
        ra.addEventListener('click', function () { markRead(x.id, c, f); });
        rel.appendChild(li);
      });
      var tg = el('button', 'rel-toggle', outletsLabel(x)); tg.type = 'button'; tg.setAttribute('aria-expanded', 'false');
      tg.addEventListener('click', function () {
        var open = rel.hidden; rel.hidden = !open; tg.setAttribute('aria-expanded', String(open));
        tg.textContent = open ? '접기' : outletsLabel(x);
      });
      c.appendChild(tg); c.appendChild(rel);
    }
    f.appendChild(el('span', 'cat', x.category));
    if (DN.read[x.id]) f.appendChild(el('span', 'read', '읽음'));
    var b = el('button', 'bm'); b.type = 'button';
    b.setAttribute('aria-pressed', String(!!DN.bm[x.id])); b.setAttribute('aria-label', '북마크');
    b.appendChild(DN.svg(DN.ICON.bookmark));
    b.addEventListener('click', function () { DN.toggleBm(x.id); });
    f.appendChild(b); c.appendChild(f);
    a.addEventListener('click', function () { markRead(x.id, c, f); });
    return c;
  }

  DN.renderList = function () {
    var s = DN.state, all = DN.filtered(), feed = $('feed'), q = s.q.trim();
    feed.textContent = '';
    feed.className = 'feed' + (s.view === 'list' ? ' list' : '');
    all.slice(0, s.shown).forEach(function (x) { feed.appendChild(card(x, q)); });
    if (!all.length) {
      var msg = s.bmOnly ? '북마크한 기사가 없습니다. 카드의 북마크 아이콘을 눌러 저장해 보세요.'
        : q ? '“' + q + '”에 맞는 기사가 없습니다.' : '표시할 기사가 없습니다.';
      var em = el('div', 'empty', msg); em.style.gridColumn = '1/-1'; feed.appendChild(em);
    }
    var more = $('more');
    more.hidden = all.length <= s.shown;
    more.textContent = '더 보기 (' + (all.length - s.shown) + '건 남음)';

    var label = s.bmOnly ? '북마크' : (s.cat === '전체' ? '최신 기사' : s.cat);
    var lt = $('listTitle'); lt.textContent = label; lt.appendChild(el('small', null, all.length + '건'));
    var title = s.bmOnly ? '북마크한 기사' : (s.cat === '전체' ? '오늘의 뉴스' : s.cat + ' 뉴스');
    $('title').textContent = title;
    document.title = title + ' · 하루 한 판 뉴스';
  };

  // 매체 드롭다운: 현재 분야에 실제로 있는 매체만 건수와 함께 표시
  DN.renderOutlets = function () {
    var s = DN.state, sel = $('outlet'), counts = {};
    DN.news.items.forEach(function (x) {
      if (s.cat !== '전체' && x.category !== s.cat) return;
      outlets(x).forEach(function (o) { counts[o] = (counts[o] || 0) + 1; });
    });
    sel.textContent = '';
    var all = el('option', null, '매체 전체'); all.value = ''; sel.appendChild(all);
    Object.keys(counts).sort().forEach(function (k) { var o = el('option', null, k + ' (' + counts[k] + ')'); o.value = k; sel.appendChild(o); });
    if (s.outlet && !counts[s.outlet]) s.outlet = '';
    sel.value = s.outlet;
  };
})(window.DN);
