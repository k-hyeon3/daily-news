/* 분야 화면 맨 위의 "오늘의 ○○ 추천 뉴스".
 * 기준: 최근 36시간 안의 기사 중 가장 많은 매체가 다룬 소식(같은 소식 묶음 크기)을 우선하고,
 * 같으면 더 최근 기사를 앞에 둔다. 발행 시각이 없는 기사는 3시간 전으로 가정한다. */
(function (DN) {
  'use strict';
  var el = DN.el, $ = DN.$;

  DN.recommend = function (cat, n) {
    var now = Date.now(), cutoff = now - 36 * 3600 * 1000;
    function time(x) { return x.published ? Date.parse(x.published) : now - 3 * 3600 * 1000; }
    function score(x) {
      var outlets = 1 + (x.related ? x.related.length : 0);
      var ageH = Math.min((now - time(x)) / 3600000, 36);
      return outlets * 10 - ageH * 0.2 + (x.summary ? 1 : 0);
    }
    return DN.news.items
      .filter(function (x) { return x.category === cat && time(x) >= cutoff; })
      .sort(function (a, b) { return score(b) - score(a); })
      .slice(0, n);
  };

  function count(x) { return 1 + (x.related ? x.related.length : 0); }

  DN.renderReco = function () {
    var s = DN.state, box = $('reco');
    // 검색·필터·북마크 보기 중에는 숨겨서 결과를 가리지 않는다
    var show = s.cat !== '전체' && !s.q.trim() && !s.bmOnly && !s.outlet && !s.newOnly;
    var list = show ? DN.recommend(s.cat, 3) : [];
    box.hidden = !list.length;
    if (!list.length) return;
    box.textContent = '';

    var main = list[0], left = el('div', 'reco-main');
    var head = el('div', 'reco-head');
    head.appendChild(el('span', 't', '오늘의 ' + s.cat + ' 추천 뉴스'));
    head.appendChild(el('span', 'n', count(main) + '개 매체 보도'));
    left.appendChild(head);

    var h = el('h3'), a = DN.link(main.url, main.title); h.appendChild(a); left.appendChild(h);
    if (main.summary) left.appendChild(el('p', 'sum', main.summary));

    var chips = el('div', 'reco-outlets');
    [{ outlet: main.outlet, url: main.url, id: main.id }].concat(main.related || []).forEach(function (r) {
      var c = DN.link(r.url, r.outlet, 'chip'); c.title = r.title || main.title;
      c.addEventListener('click', function () { DN.setRead(main.id); });
      chips.appendChild(c);
    });
    left.appendChild(chips);
    a.addEventListener('click', function () { DN.setRead(main.id); });
    box.appendChild(left);

    if (list.length > 1) {
      var right = el('div', 'reco-more');
      right.appendChild(el('div', 'label', '함께 많이 다룬 소식'));
      var ol = el('ol');
      list.slice(1).forEach(function (x) {
        var li = el('li'), la = DN.link(x.url, x.title);
        la.addEventListener('click', function () { DN.setRead(x.id); });
        li.appendChild(la);
        li.appendChild(el('span', 'm', x.outlet + (count(x) > 1 ? ' 외 ' + (count(x) - 1) + '곳' : '')));
        ol.appendChild(li);
      });
      right.appendChild(ol);
      box.appendChild(right);
    }
  };
})(window.DN);
