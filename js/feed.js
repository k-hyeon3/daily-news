/* 기사 목록: 필터·정렬·카드 렌더·북마크·읽음 */
(function (DN) {
  'use strict';
  var el = DN.el, $ = DN.$;

  DN.filtered = function () {
    var s = DN.state, q = s.q.trim().toLowerCase();
    var out = DN.news.items.filter(function (x) {
      if (s.bmOnly && !DN.bm[x.id]) return false;
      if (s.cat !== '전체' && x.category !== s.cat) return false;
      if (s.outlet && x.outlet !== s.outlet) return false;
      if (q && (x.title + ' ' + x.outlet + ' ' + (x.summary || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    if (s.sort === 'outlet') out = out.slice().sort(function (a, b) { return a.outlet < b.outlet ? -1 : a.outlet > b.outlet ? 1 : 0; });
    return out;
  };

  function markRead(id, card, foot) {
    if (DN.read[id]) return;
    DN.read[id] = Date.now(); DN.saveRead();
    card.classList.add('is-read');
    foot.insertBefore(el('span', 'read', '읽음'), foot.querySelector('.bm'));
  }

  DN.toggleBm = function (id) {
    if (DN.bm[id]) delete DN.bm[id]; else DN.bm[id] = Date.now();
    DN.saveBm(); DN.sync(true);
  };

  function card(x, q) {
    var c = el('article', 'card' + (DN.read[x.id] ? ' is-read' : ''));
    var m = el('div', 'meta');
    m.appendChild(el('span', 'outlet', x.outlet));
    var t = DN.rel(x.published); if (t) m.appendChild(el('span', 'time', t));
    c.appendChild(m);

    var h = el('h4'), a = DN.link(x.url, ''); DN.highlight(a, x.title, q); h.appendChild(a); c.appendChild(h);
    if (x.summary) { var s = el('p', 'sum'); DN.highlight(s, x.summary, q); c.appendChild(s); }

    var f = el('div', 'foot');
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
    DN.news.items.forEach(function (x) { if (s.cat === '전체' || x.category === s.cat) counts[x.outlet] = (counts[x.outlet] || 0) + 1; });
    sel.textContent = '';
    var all = el('option', null, '매체 전체'); all.value = ''; sel.appendChild(all);
    Object.keys(counts).sort().forEach(function (k) { var o = el('option', null, k + ' (' + counts[k] + ')'); o.value = k; sel.appendChild(o); });
    if (s.outlet && !counts[s.outlet]) s.outlet = '';
    sel.value = s.outlet;
  };
})(window.DN);
