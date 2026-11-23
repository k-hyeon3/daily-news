/* 에디터 픽(그날의 영상·요약)과 연속 완독 표시. data/editions.json을 쓴다. */
(function (DN) {
  'use strict';
  var el = DN.el, $ = DN.$;

  function dayDone(e) {
    var w = DN.watched[e.date] || {}, s = e.sections || [];
    return s.length > 0 && s.every(function (x) { return w[x.field]; });
  }
  function streak() {
    var n = 0;
    for (var i = 0; i < DN.editions.length; i++) {
      if (dayDone(DN.editions[i])) n++;
      else if (i === 0) continue; // 오늘을 아직 안 봤어도 어제까지의 연속은 유지
      else break;
    }
    return n;
  }

  // 자동 픽: 방금 모은 뉴스에서 분야별로 rank번째(0부터)로 많이 다룬 소식을 뽑아 에디터 픽과 같은 모양의 한 호로 만든다.
  var FIELDS = [
    { field: '정치·사회', cats: ['정치', '사회'] }, { field: '경제·금융', cats: ['경제'] },
    { field: 'IT·보안', cats: ['IT·과학'] }, { field: '국제', cats: ['국제'] }
  ];
  DN.autoEdition = function (rank) {
    var now = Date.now(), secs = [];
    function time(x) { return x.published ? Date.parse(x.published) : now - 3 * 3600 * 1000; }
    function score(x) { return (1 + (x.related ? x.related.length : 0)) * 10 - Math.min((now - time(x)) / 3600000, 36) * 0.2; }
    FIELDS.forEach(function (f) {
      var pool = (DN.news.items || []).filter(function (x) { return f.cats.indexOf(x.category) >= 0 && time(x) >= now - 36 * 3600000; })
        .sort(function (a, b) { return score(b) - score(a); }).slice(0, 12);
      if (!pool.length) return;
      var x = pool[rank % pool.length], n = 1 + (x.related ? x.related.length : 0);
      var arts = [{ outlet: x.outlet, title: x.title, url: x.url }].concat((x.related || []).map(function (r) { return { outlet: r.outlet, title: r.title || x.title, url: r.url }; }));
      secs.push({ field: f.field, title: x.title, summary: x.summary || '요약이 제공되지 않은 기사입니다. 아래 매체별 보도에서 확인하세요.',
        why: n > 1 ? n + '개 매체가 같은 소식을 다뤘습니다. 매체별 제목과 관점을 비교해 보세요.' : '', articles: arts, video: null });
    });
    return { date: 'auto', headline: '방금 모은 뉴스 기준 자동 픽 · ' + (rank + 1) + '번째 소식', sections: secs, auto: true };
  };

  DN.renderStreak = function () {
    var box = $('streak'); box.textContent = '';
    if (!DN.editions.length) { box.hidden = true; return; }
    box.hidden = false;
    var e = DN.editions[0], w = DN.watched[e.date] || {}, total = (e.sections || []).length;
    var c = (e.sections || []).filter(function (x) { return w[x.field]; }).length;
    box.appendChild(el('b', null, '연속 ' + streak() + '일째 완독'));
    box.appendChild(el('span', null, c >= total ? '오늘 영상을 모두 봤어요' : '오늘 영상 ' + (total - c) + '개 더 보면 완독'));
  };

  DN.renderPick = function () {
    var s = DN.state, box = $('pick');
    var show = DN.editions.length && s.cat === '전체' && !s.q.trim() && !s.bmOnly && !s.outlet;
    box.hidden = !show; if (!show) return;
    box.textContent = '';
    var e = s.auto ? DN.autoEdition(s.auto - 1) : DN.editions[s.edIdx]; if (!e || !(e.sections || []).length) return;
    var secs = e.sections || []; if (s.edSec >= secs.length) s.edSec = 0;
    var w = DN.watched[e.date] || {};

    var top = el('div', 'pick-top');
    top.appendChild(el('span', 't', '에디터 픽'));
    var hl = el('span', 'hl', e.headline); top.appendChild(hl);
    var rb = el('button', 'reco-refresh pick-refresh', DN.pickNote ? DN.pickNote : '↻ 다른 기사로 교체');
    rb.type = 'button'; rb.title = '새 에디터 픽이 있으면 불러오고, 없으면 지금 뉴스에서 다음으로 많이 다룬 소식들로 카드 전체를 바꿉니다';
    if (DN.pickNote) rb.disabled = true;
    rb.addEventListener('click', function () {
      rb.disabled = true; rb.textContent = '불러오는 중…';
      DN.refreshPick(function (msg) {
        DN.pickNote = msg; DN.renderPick(); DN.renderStreak();
        setTimeout(function () { DN.pickNote = ''; DN.renderPick(); }, 3000);
      });
    });
    top.appendChild(rb);
    if (DN.editions.length > 1) {
      var sel = el('select'); sel.setAttribute('aria-label', '지난 호 선택');
      DN.editions.forEach(function (x, i) { var o = el('option', null, DN.fmtDate(x.date)); o.value = i; if (i === s.edIdx && !s.auto) o.selected = true; sel.appendChild(o); });
      sel.addEventListener('change', function () { s.auto = 0; s.edIdx = +sel.value; s.edSec = 0; DN.renderPick(); });
      top.appendChild(sel);
    }
    var bb = el('button', 'reco-refresh pick-refresh', s.brief ? '탭으로 보기' : '한눈에 보기'); bb.type = 'button';
    bb.title = '네 분야 핵심을 한 화면에 모아 봅니다'; bb.style.marginLeft = '0';
    bb.addEventListener('click', function () { s.brief = !s.brief; DN.renderPick(); });
    top.appendChild(bb);
    box.appendChild(top);

    if (s.brief) {
      var grid = el('div', 'brief');
      secs.forEach(function (x, i) {
        var c = el('article', 'brief-card' + (w[x.field] ? ' done' : ''));
        c.appendChild(el('span', 'brief-f', x.field));
        c.appendChild(el('h3', null, x.title));
        var first = String(x.summary || '').split(/(?<=[.!?。]|다\.)\s+/)[0];
        c.appendChild(el('p', null, first));
        var n = (x.articles || []).length;
        var go = el('button', 'brief-go', '자세히 보기' + (n ? ' · 매체 ' + n + '곳' : '')); go.type = 'button';
        go.addEventListener('click', function () { s.brief = false; s.edSec = i; DN.renderPick(); });
        c.appendChild(go); grid.appendChild(c);
      });
      box.appendChild(grid); return;
    }

    var tabs = el('div', 'tabs'); tabs.setAttribute('role', 'tablist');
    secs.forEach(function (x, i) {
      var b = el('button', w[x.field] ? 'done' : '', x.field); b.type = 'button';
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(i === s.edSec));
      b.addEventListener('click', function () { s.edSec = i; DN.renderPick(); });
      tabs.appendChild(b);
    });
    box.appendChild(tabs);

    var sec = secs[s.edSec]; if (!sec) return;
    var body = el('div', 'pick-body'), left = el('div');
    left.appendChild(el('h3', null, sec.title));
    left.appendChild(el('p', null, sec.summary));
    if (sec.why) { var y = el('div', 'why'); y.appendChild(el('b', null, '왜 중요한가')); y.appendChild(el('p', null, sec.why)); left.appendChild(y); }
    if (sec.articles && sec.articles.length) {
      var a = el('div', 'arts'); a.appendChild(el('b', null, '매체별 보도'));
      var ul = el('ul');
      sec.articles.forEach(function (x) { var li = el('li'); li.appendChild(el('span', 'o', x.outlet)); li.appendChild(DN.link(x.url, x.title)); ul.appendChild(li); });
      a.appendChild(ul); left.appendChild(a);
    }
    var lab = el('label', 'check'), cb = el('input');
    if (e.auto) {
      var back = el('button', 'reco-refresh', '← 원래 에디터 픽으로'); back.type = 'button'; back.style.marginLeft = '0';
      back.addEventListener('click', function () { s.auto = 0; s.edIdx = 0; s.edSec = 0; DN.renderPick(); });
      left.appendChild(back);
    } else { cb.type = 'checkbox'; cb.checked = !!w[sec.field];
    cb.addEventListener('change', function () {
      DN.watched[e.date] = DN.watched[e.date] || {};
      if (cb.checked) DN.watched[e.date][sec.field] = true; else delete DN.watched[e.date][sec.field];
      DN.saveWatched(); DN.renderPick(); DN.renderStreak();
    });
    lab.appendChild(cb); lab.appendChild(el('span', null, '영상 보고 기사까지 읽었음')); left.appendChild(lab);
    }
    body.appendChild(left);

    if (sec.video) {
      var v = el('div', 'video'), p = el('div', 'play'); p.appendChild(DN.svg(DN.ICON.play)); v.appendChild(p);
      v.appendChild(el('div', 'vt', sec.video.title));
      v.appendChild(el('div', 'vm', [sec.video.channel, sec.video.date].filter(Boolean).join(' · ')));
      if (sec.video.note) v.appendChild(el('div', 'vn', sec.video.note));
      v.appendChild(DN.link(sec.video.url, '유튜브에서 보기', 'btn'));
      body.appendChild(v);
    }
    box.appendChild(body);
  };
})(window.DN);
