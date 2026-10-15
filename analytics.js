/* Cookie-free visit and engagement measurement. No form values or persistent IDs. */
(() => {
  'use strict';
  const script = document.currentScript;
  const endpoint = script && script.dataset.endpoint;
  const counter = document.getElementById('view-count');
  if (!endpoint || window.__personalAnalyticsStarted) return;
  window.__personalAnalyticsStarted = true;
  const counterURL = new URL('/counter', endpoint).href;
  async function showCount() {
    if (!counter) return;
    try {
      const response = await fetch(counterURL, { mode: 'cors', credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw new Error('Counter unavailable');
      const result = await response.json();
      if (!Number.isSafeInteger(result.views) || result.views < 0) throw new Error('Invalid count');
      counter.textContent = new Intl.NumberFormat().format(result.views) + (result.views === 1 ? ' view' : ' views');
    } catch {
      if (counter.textContent === 'Views · —') counter.textContent = 'Views unavailable';
    }
  }
  const params = new URLSearchParams(location.search);
  const optedOut = navigator.doNotTrack === '1' || navigator.globalPrivacyControl || params.get('analytics') === 'off';
  const allowedOrigins = ['https://christopherluey.github.io', 'http://100.83.140.110:8000', 'http://localhost:8000', 'http://127.0.0.1:8000', 'http://christopherluey.taila17f6f.ts.net:8000'];
  const uuid = () => {
    if (crypto.randomUUID) return crypto.randomUUID();
    // randomUUID requires HTTPS; getRandomValues also works on the Tailscale HTTP preview.
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = bytes[6] & 15 | 64; bytes[8] = bytes[8] & 63 | 128;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  };
  setInterval(() => { if (!document.hidden) showCount(); }, 60000);
  if (optedOut || !allowedOrigins.includes(location.origin) || !window.crypto || !crypto.getRandomValues) {
    showCount(); return;
  }
  const clean = value => String(value || '').replace(/[\x00-\x1f\x7f<>]/g, '').trim().slice(0, 100);
  const page = { id: uuid(), path: location.pathname, source: params.get('utm_source') || '', medium: params.get('utm_medium') || '', campaign: params.get('utm_campaign') || '', referrer: '' };
  try { page.referrer = new URL(document.referrer).origin; } catch { /* Direct visit. */ }
  let queue = [], sending = false, sentPage = false;
  function track(name, details = {}) {
    if (queue.length >= 300) return;
    queue.push({ id: uuid(), name, target: clean(details.target), section: clean(details.section), value: details.value || 0 });
  }
  async function flush() {
    if (sending || sentPage && !queue.length) return;
    sending = true;
    const batch = queue.slice(0, 20), first = !sentPage;
    try {
      const response = await fetch(endpoint, { method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ page, events: batch }) });
      if (response.ok) { queue.splice(0, batch.length); sentPage = true; }
    } catch { /* Tracking must never interrupt the page. */ }
    finally { sending = false; if (first) showCount(); }
  }
  function finalFlush() {
    if (!sentPage || queue.length) fetch(endpoint, { method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ page, events: queue.slice(0, 20) }) }).catch(() => {});
  }
  function sectionOf(el) {
    const parent = el.closest('[data-analytics-section]');
    if (parent) return parent.dataset.analyticsSection;
    let block = el;
    while (block.parentElement && block.parentElement.tagName !== 'MAIN') block = block.parentElement;
    while (block) {
      if (block.dataset && block.dataset.analyticsSection) return block.dataset.analyticsSection;
      block = block.previousElementSibling;
    }
    return 'About';
  }
  document.addEventListener('click', event => {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const el = event.target.closest('a, button[aria-controls], summary');
    if (!el) return;
    const section = sectionOf(el);
    if (el.matches('button[aria-controls]')) {
      track('details_toggle', { section, target: (el.getAttribute('aria-expanded') === 'true' ? 'open: ' : 'close: ') + el.getAttribute('aria-controls').replace(/-body$/, '') });
    } else if (el.tagName === 'SUMMARY') {
      track('details_toggle', { section, target: (el.parentElement.open ? 'close: ' : 'open: ') + clean(el.textContent) });
    } else {
      let url; try { url = new URL(el.href); } catch { return; }
      const target = url.protocol === 'mailto:' ? 'Email' : ['http:', 'https:'].includes(url.protocol) ? clean(el.textContent) || url.pathname.split('/').pop() || url.hostname : '';
      if (!target) return;
      track('link_click', { section, target });
    }
    flush();
  });
  const sections = [...document.querySelectorAll('[data-analytics-section]')];
  const reached = new Set(), depths = new Set(), visible = new Map();
  let activeSection = 'About', lastTick = performance.now(), lastInput = performance.now();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const name = entry.target.dataset.analyticsSection;
        visible.set(entry.target, entry.isIntersecting ? entry.intersectionRect.height : 0);
        if (entry.isIntersecting && entry.intersectionRect.height >= Math.min(150, entry.boundingClientRect.height / 2) && !reached.has(name)) {
          reached.add(name); track('section_view', { section: name, target: name });
        }
      }
      const largest = [...visible].sort((a, b) => b[1] - a[1])[0];
      activeSection = largest && largest[1] > 0 ? largest[0].dataset.analyticsSection : activeSection;
    }, { threshold: [0, .1, .25, .5, .75, 1] });
    sections.forEach(el => observer.observe(el));
  }
  function accrue() {
    const now = performance.now(), seconds = Math.min(30, (now - lastTick) / 1000);
    if (!document.hidden && now - lastInput < 60000 && seconds >= 1) track('active_time', { section: activeSection, value: Math.round(seconds) });
    lastTick = now;
  }
  for (const type of ['pointerdown', 'pointermove', 'keydown', 'scroll']) document.addEventListener(type, () => { lastInput = performance.now(); }, { passive: true });
  document.addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (max <= 0) return;
    const progress = 100 * scrollY / max;
    for (const depth of [25, 50, 75, 90]) if (progress >= depth && !depths.has(depth)) {
      depths.add(depth); track('scroll_depth', { target: String(depth), value: depth });
    }
  }, { passive: true });
  setInterval(accrue, 15000);
  setInterval(flush, 10000);
  addEventListener('online', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { accrue(); finalFlush(); }
    else { lastTick = lastInput = performance.now(); flush(); showCount(); }
  });
  addEventListener('pagehide', () => { accrue(); finalFlush(); });
  addEventListener('pageshow', event => {
    if (event.persisted) {
      page.id = uuid(); sentPage = false; queue = []; reached.clear(); depths.clear();
      lastTick = lastInput = performance.now(); flush();
    }
  });
  flush();
})();
