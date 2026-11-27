(function () {
  'use strict';

  var html = document.documentElement;
  var root = document.body.getAttribute('data-root') || '';
  var mobile = window.matchMedia('(max-width: 860px)');

  // ------------------------------------------------- sidebar show / hide

  document.getElementById('sidebar-toggle').addEventListener('click', function () {
    if (mobile.matches) {
      html.classList.toggle('nav-open');
    } else {
      var collapsed = html.classList.toggle('nav-collapsed');
      try { localStorage.setItem('nav-collapsed', collapsed ? '1' : '0'); } catch (e) {}
    }
  });
  document.getElementById('backdrop').addEventListener('click', function () {
    html.classList.remove('nav-open');
  });

  // --------------------------------------------- expand / collapse nodes

  var sidebar = document.getElementById('sidebar');
  sidebar.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-nav-toggle]');
    if (!trigger) return;
    var item = trigger.closest('li');
    var toggle = item.querySelector('.nav-toggle');
    var list = item.querySelector('ul');
    var open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    list.hidden = !open;
  });

  var current = sidebar.querySelector('[aria-current="page"]');
  if (current && current.scrollIntoView) current.scrollIntoView({ block: 'nearest' });

  // -------------------------------------------------------------- search

  var input = document.getElementById('search-input');
  var panel = document.getElementById('search-results');
  var docs = window.SEARCH_DOCS || [];
  var index = null;

  function getIndex() {
    if (!index) {
      index = lunr(function () {
        this.ref('id');
        this.field('title', { boost: 10 });
        this.field('section', { boost: 2 });
        this.field('text');
        docs.forEach(function (doc) { this.add(doc); }, this);
      });
    }
    return index;
  }

  function terms(query) {
    return query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  }

  function search(query) {
    var words = terms(query);
    if (!words.length) return [];
    return getIndex().query(function (q) {
      words.forEach(function (word) {
        q.term(word, { boost: 100 }); // exact (stemmed) match
        q.term(word, { boost: 10, usePipeline: false, wildcard: lunr.Query.wildcard.TRAILING }); // prefix
        if (word.length > 3) q.term(word, { boost: 1, usePipeline: false, editDistance: 1 }); // typo
      });
    });
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function highlight(text, words) {
    var pattern = words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|');
    return escapeHtml(text).replace(new RegExp('(' + pattern + ')', 'gi'), '<mark>$1</mark>');
  }

  function excerpt(text, words) {
    var lower = text.toLowerCase();
    var at = -1;
    words.forEach(function (w) {
      var i = lower.indexOf(w);
      if (i >= 0 && (at < 0 || i < at)) at = i;
    });
    var start = Math.max(0, at - 60);
    var end = Math.min(text.length, start + 160);
    return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
  }

  function render() {
    var query = input.value.trim();
    if (!query) { panel.hidden = true; panel.innerHTML = ''; return; }
    var words = terms(query);
    var results = search(query).slice(0, 12);
    if (!results.length) {
      panel.innerHTML = '<p class="search-empty">No results for “' + escapeHtml(query) + '”.</p>';
    } else {
      panel.innerHTML = results.map(function (result) {
        var doc = docs[Number(result.ref)];
        return '<a href="' + escapeHtml(root + doc.url) + '">' +
          '<span class="result-title">' + highlight(doc.title, words) + '</span>' +
          (doc.section ? '<span class="result-section">' + escapeHtml(doc.section) + '</span>' : '') +
          '<span class="result-excerpt">' + highlight(excerpt(doc.text, words), words) + '</span></a>';
      }).join('');
    }
    panel.hidden = false;
  }

  input.addEventListener('input', render);
  input.addEventListener('focus', render);

  document.addEventListener('click', function (event) {
    if (!event.target.closest('.search')) panel.hidden = true;
  });

  document.addEventListener('keydown', function (event) {
    var inSearch = event.target.closest && event.target.closest('.search');
    if (event.key === 'Escape') {
      panel.hidden = true;
      html.classList.remove('nav-open');
      if (inSearch) input.blur();
    } else if (event.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) {
      event.preventDefault();
      input.focus();
      input.select();
    } else if (inSearch && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      var links = Array.prototype.slice.call(panel.querySelectorAll('a'));
      if (!links.length) return;
      event.preventDefault();
      var i = links.indexOf(document.activeElement) + (event.key === 'ArrowDown' ? 1 : -1);
      if (i < 0) input.focus(); else links[Math.min(i, links.length - 1)].focus();
    }
  });
})();
