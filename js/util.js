/* 공용 유틸: DOM 생성, 링크, 날짜 포맷. 전역 네임스페이스 DN 하나만 쓴다. */
window.DN = window.DN || {};
(function (DN) {
  'use strict';

  DN.$ = function (id) { return document.getElementById(id); };

  // 데이터는 항상 textContent로 넣는다(외부에서 온 제목이 섞이므로 innerHTML 금지)
  DN.el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  DN.safeUrl = function (u) { return typeof u === 'string' && /^https:\/\//.test(u) ? u : null; };

  DN.link = function (url, text, cls) {
    var a = DN.el('a', cls, text), u = DN.safeUrl(url);
    if (u) { a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  };

  // 고정된 SVG 문자열 전용. 외부 데이터를 넣지 말 것.
  DN.svg = function (html) {
    var s = DN.el('span'); s.style.display = 'contents'; s.innerHTML = html; return s;
  };
  DN.ICON = {
    bookmark: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 4h12v17l-6-4-6 4V4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    play: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7L8 5Z" fill="#fff"/></svg>'
  };

  DN.rel = function (iso) {
    if (!iso) return '';
    var t = Date.parse(iso); if (isNaN(t)) return '';
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return '방금 전';
    if (m < 60) return m + '분 전';
    var h = Math.floor(m / 60); if (h < 24) return h + '시간 전';
    var d = Math.floor(h / 24); if (d < 7) return d + '일 전';
    var dt = new Date(t); return (dt.getMonth() + 1) + '월 ' + dt.getDate() + '일';
  };

  DN.fmtDate = function (d) {
    var p = String(d).split('-'), dt = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return p[0] + '년 ' + (+p[1]) + '월 ' + (+p[2]) + '일 ' + ['일', '월', '화', '수', '목', '금', '토'][dt.getUTCDay()] + '요일';
  };

  // 검색어를 <mark>로 강조 (textContent 기반이라 안전)
  DN.highlight = function (node, text, q) {
    node.textContent = '';
    var i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
    if (i < 0) { node.textContent = text; return; }
    node.appendChild(document.createTextNode(text.slice(0, i)));
    node.appendChild(DN.el('mark', null, text.slice(i, i + q.length)));
    node.appendChild(document.createTextNode(text.slice(i + q.length)));
  };
})(window.DN);
