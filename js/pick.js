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
    var e = DN.editions[s.edIdx]; if (!e) return;
    var secs = e.sections || []; if (s.edSec >= secs.length) s.edSec = 0;
    var w = DN.watched[e.date] || {};

    var top = el('div', 'pick-top');
    top.appendChild(el('span', 't', '에디터 픽'));
    var hl = el('span', 'hl', e.headline); top.appendChild(hl);
    var rb = el('button', 'reco-refresh pick-refresh', DN.pickNote ? DN.pickNote : '↻ 다른 픽 보기');
    rb.type = 'button'; rb.title = '새 에디터 픽이 있으면 불러오고, 없으면 다른 픽으로 넘깁니다';
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
      DN.editions.forEach(function (x, i) { var o = el('option', null, DN.fmtDate(x.date)); o.value = i; if (i === s.edIdx) o.selected = true; sel.appendChild(o); });
      sel.addEventListener('change', function () { s.edIdx = +sel.value; s.edSec = 0; DN.renderPick(); });
      top.appendChild(sel);
    }
    box.appendChild(top);

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
    var lab = el('label', 'check'), cb = el('input'); cb.type = 'checkbox'; cb.checked = !!w[sec.field];
    cb.addEventListener('change', function () {
      DN.watched[e.date] = DN.watched[e.date] || {};
      if (cb.checked) DN.watched[e.date][sec.field] = true; else delete DN.watched[e.date][sec.field];
      DN.saveWatched(); DN.renderPick(); DN.renderStreak();
    });
    lab.appendChild(cb); lab.appendChild(el('span', null, '영상 보고 기사까지 읽었음')); left.appendChild(lab);
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
