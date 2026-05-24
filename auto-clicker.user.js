// ==UserScript==
// @name         Auto Clicker
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Sekme aktif olunca otomatik resme tıklar, indirme başlar, sekmeyi kapatır. 50 sekme açık olsa hepsini sırayla yapar.
// @author       Psrpis
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_windowClose
// ==/UserScript==

(function () {
  'use strict';

  const PANEL_KEY  = 'rsk_panel_pos';
  const RULE_KEY   = 'rsk_rule';
  const ACTIVE_KEY = 'rsk_active';
  const DELAY_KEY  = 'rsk_delay';
  const WAIT_KEY   = 'rsk_wait';

  let selectMode = false;
  let highlightEl = null;
  let rule       = GM_getValue(RULE_KEY,   null);
  let active     = GM_getValue(ACTIVE_KEY, false);
  let closeDelay = GM_getValue(DELAY_KEY,  2000);
  let waitDelay  = GM_getValue(WAIT_KEY,   1500); // sekme açılınca kaç ms bekle

  let alreadyRan = false; // bu sekmede zaten çalıştı mı

  /* ── Panel ── */
  const panel = document.createElement('div');
  panel.id = 'rsk-panel';
  Object.assign(panel.style, {
    position: 'fixed', zIndex: '2147483647',
    top: '20px', right: '20px', width: '240px',
    background: '#1a1a1a', color: '#f0f0f0',
    borderRadius: '10px', fontFamily: 'system-ui, sans-serif',
    fontSize: '13px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    userSelect: 'none', overflow: 'hidden',
  });

  panel.innerHTML = `
    <div id="rsk-header" style="padding:10px 14px;background:#111;cursor:move;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #333;">
      <span style="font-weight:600;font-size:13px;">⚡ Auto Clicker</span>
      <div style="display:flex;align-items:center;gap:10px;">
        <span id="rsk-minimize" title="Küçült" style="cursor:pointer;opacity:.6;font-size:16px;line-height:1;">−</span>
        <span id="rsk-close" title="Paneli Kapat" style="cursor:pointer;opacity:.6;font-size:18px;line-height:1;">×</span>
      </div>
    </div>
    <div id="rsk-body" style="padding:12px 14px;">
      <div id="rsk-status" style="padding:7px 10px;border-radius:6px;margin-bottom:10px;font-size:12px;background:#2a2a2a;color:#aaa;min-height:32px;line-height:1.4;">Henüz resim seçilmedi.</div>
      <div style="display:flex;flex-direction:column;gap:7px;">
        <button id="rsk-btn-select" style="padding:8px;border-radius:6px;border:none;background:#3b82f6;color:#fff;cursor:pointer;font-size:12px;font-weight:600;">🎯 Sayfadan Resim Seç</button>

        <button id="rsk-btn-toggle" style="padding:8px;border-radius:6px;border:1px solid #444;background:#2a2a2a;color:#f0f0f0;cursor:pointer;font-size:12px;font-weight:600;">▶ Oto-Tıklamayı Başlat</button>

        <button id="rsk-btn-clear" style="padding:8px;border-radius:6px;border:1px solid #333;background:transparent;color:#888;cursor:pointer;font-size:12px;">✕ Seçimi Sil</button>
      </div>

      <div style="margin-top:12px;border-top:1px solid #333;padding-top:10px;">
        <label style="font-size:11px;color:#666;display:block;margin-bottom:4px;">Sekme bekleme süresi (sn)</label>
        <div style="display:flex;align-items:center;gap:8px;">
          <input id="rsk-wait" type="range" min="0.5" max="10" step="0.5" value="${waitDelay/1000}" style="flex:1;accent-color:#f59e0b;"/>
          <span id="rsk-wait-label" style="font-size:12px;min-width:28px;">${waitDelay/1000}s</span>
        </div>
      </div>

      <div style="margin-top:10px;">
        <label style="font-size:11px;color:#666;display:block;margin-bottom:4px;">Kapatma gecikmesi (sn)</label>
        <div style="display:flex;align-items:center;gap:8px;">
          <input id="rsk-delay" type="range" min="0" max="10" step="0.5" value="${closeDelay/1000}" style="flex:1;accent-color:#3b82f6;"/>
          <span id="rsk-delay-label" style="font-size:12px;min-width:28px;">${closeDelay/1000}s</span>
        </div>
      </div>

      <div id="rsk-log" style="margin-top:10px;font-size:11px;color:#666;min-height:14px;line-height:1.5;"></div>
    </div>
  `;
  document.documentElement.appendChild(panel);

  /* Yeniden aç butonu */
  const reopenBtn = document.createElement('div');
  Object.assign(reopenBtn.style, {
    position: 'fixed', zIndex: '2147483647',
    top: '20px', right: '20px',
    background: '#1a1a1a', color: '#f0f0f0',
    borderRadius: '8px', padding: '7px 12px',
    fontFamily: 'system-ui, sans-serif', fontSize: '13px',
    cursor: 'pointer', display: 'none',
    boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
    userSelect: 'none',
  });
  reopenBtn.textContent = '⚡ Auto Clicker';
  document.documentElement.appendChild(reopenBtn);

  const savedPos = GM_getValue(PANEL_KEY, null);
  if (savedPos) {
    panel.style.top = savedPos.top; panel.style.right = 'auto'; panel.style.left = savedPos.left;
    reopenBtn.style.top = savedPos.top; reopenBtn.style.right = 'auto'; reopenBtn.style.left = savedPos.left;
  }

  /* Sürükleme */
  let drag = false, ox = 0, oy = 0;
  document.getElementById('rsk-header').addEventListener('mousedown', e => {
    drag = true; ox = e.clientX - panel.getBoundingClientRect().left; oy = e.clientY - panel.getBoundingClientRect().top;
  });
  document.addEventListener('mousemove', e => {
    if (!drag) return;
    const l = (e.clientX - ox) + 'px', t = (e.clientY - oy) + 'px';
    panel.style.left = l; panel.style.top = t; panel.style.right = 'auto';
    reopenBtn.style.left = l; reopenBtn.style.top = t; reopenBtn.style.right = 'auto';
  });
  document.addEventListener('mouseup', () => {
    if (drag) { GM_setValue(PANEL_KEY, { top: panel.style.top, left: panel.style.left }); drag = false; }
  });

  /* Minimize */
  const body = document.getElementById('rsk-body');
  let minimized = false;
  document.getElementById('rsk-minimize').addEventListener('click', () => {
    minimized = !minimized;
    body.style.display = minimized ? 'none' : 'block';
    document.getElementById('rsk-minimize').textContent = minimized ? '+' : '−';
  });

  /* Kapat / Aç */
  document.getElementById('rsk-close').addEventListener('click', () => {
    panel.style.display = 'none'; reopenBtn.style.display = 'block';
  });
  reopenBtn.addEventListener('click', () => {
    reopenBtn.style.display = 'none'; panel.style.display = 'block';
  });

  /* Sliderlar */
  document.getElementById('rsk-wait').addEventListener('input', function () {
    waitDelay = parseFloat(this.value) * 1000;
    GM_setValue(WAIT_KEY, waitDelay);
    document.getElementById('rsk-wait-label').textContent = this.value + 's';
  });
  document.getElementById('rsk-delay').addEventListener('input', function () {
    closeDelay = parseFloat(this.value) * 1000;
    GM_setValue(DELAY_KEY, closeDelay);
    document.getElementById('rsk-delay-label').textContent = this.value + 's';
  });

  function setStatus(html, color) {
    const s = document.getElementById('rsk-status');
    s.innerHTML = html; s.style.color = color || '#aaa';
  }
  function log(msg) { document.getElementById('rsk-log').textContent = msg; }

  function describeRule(r) {
    if (!r) return 'Seçim yok';
    let parts = [];
    if (r.alt) parts.push(`alt: "${r.alt}"`);
    if (r.cls) parts.push(`class: ${r.cls}`);
    if (r.src) parts.push(`src: "${r.src}"`);
    if (r.w)   parts.push(`${r.w}×${r.h}px`);
    return parts.join(' · ') || '(genel resim)';
  }

  function updateUI() {
    setStatus(
      rule ? `<b style="color:#4ade80">✔ Seçili:</b><br>${describeRule(rule)}` : 'Henüz resim seçilmedi.',
      rule ? '#ccc' : '#aaa'
    );
    const toggleBtn = document.getElementById('rsk-btn-toggle');
    toggleBtn.textContent = active ? '⏸ Durdur' : '▶ Oto-Tıklamayı Başlat';
    toggleBtn.style.background = active ? '#16a34a' : '#2a2a2a';
    toggleBtn.style.borderColor = active ? '#16a34a' : '#444';
  }

  /* ── Seçim modu ── */
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', zIndex: '2147483640',
    cursor: 'crosshair', background: 'rgba(59,130,246,0.08)', display: 'none',
  });
  const overlayLabel = document.createElement('div');
  Object.assign(overlayLabel.style, {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    background: 'rgba(0,0,0,0.75)', color: '#fff',
    padding: '12px 24px', borderRadius: '8px',
    fontSize: '15px', fontFamily: 'system-ui,sans-serif', pointerEvents: 'none',
  });
  overlayLabel.textContent = '🎯 Tıklamak istediğin resmin üzerine gel ve tıkla  (ESC = iptal)';
  overlay.appendChild(overlayLabel);
  document.documentElement.appendChild(overlay);

  const highlight = document.createElement('div');
  Object.assign(highlight.style, {
    position: 'absolute', zIndex: '2147483641', pointerEvents: 'none',
    border: '3px solid #3b82f6', borderRadius: '4px',
    background: 'rgba(59,130,246,0.15)', display: 'none',
  });
  document.documentElement.appendChild(highlight);

  function startSelectMode() { selectMode = true; overlay.style.display = 'block'; }
  function stopSelectMode() {
    selectMode = false; overlay.style.display = 'none';
    highlight.style.display = 'none'; highlightEl = null;
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && selectMode) stopSelectMode(); });

  document.addEventListener('mousemove', e => {
    if (!selectMode) return;
    overlay.style.pointerEvents = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = 'all';
    if (el && el.tagName === 'IMG' && !panel.contains(el)) {
      highlightEl = el;
      const r = el.getBoundingClientRect();
      Object.assign(highlight.style, {
        display: 'block',
        top: (r.top + window.scrollY) + 'px', left: (r.left + window.scrollX) + 'px',
        width: r.width + 'px', height: r.height + 'px',
      });
    } else { highlight.style.display = 'none'; highlightEl = null; }
  }, true);

  overlay.addEventListener('click', e => {
    overlay.style.pointerEvents = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = 'all';
    if (!el || el.tagName !== 'IMG') { log('Resim değil, tekrar dene.'); return; }
    const src = el.src ? extractSrcKey(el.src) : null;
    const alt = el.alt ? el.alt.trim().slice(0, 60) : null;
    const cls = el.className ? el.className.trim().split(/\s+/).filter(c => c.length > 2 && c.length < 30)[0] : null;
    const w = Math.round(el.naturalWidth || el.offsetWidth);
    const h = Math.round(el.naturalHeight || el.offsetHeight);
    rule = { src, alt, cls, w, h };
    GM_setValue(RULE_KEY, rule);
    stopSelectMode(); updateUI(); log('Seçim kaydedildi!');
  }, true);

  function extractSrcKey(src) {
    try {
      const u = new URL(src);
      const parts = u.pathname.split('/').filter(Boolean);
      const file = parts[parts.length - 1];
      const base = file.replace(/\.[^.]+$/, '').replace(/[@?#].*/, '');
      return base.length > 3 ? base.slice(0, 40) : null;
    } catch { return null; }
  }

  function scoreImage(img) {
    if (!rule) return 0;
    let score = 0;
    if (rule.src && img.src && img.src.includes(rule.src)) score += 40;
    if (rule.alt && img.alt && img.alt.trim().startsWith(rule.alt.slice(0, 20))) score += 30;
    if (rule.cls && img.className && img.className.includes(rule.cls)) score += 20;
    const w = Math.round(img.naturalWidth || img.offsetWidth);
    const h = Math.round(img.naturalHeight || img.offsetHeight);
    if (rule.w && rule.h && Math.abs(w - rule.w) < 20 && Math.abs(h - rule.h) < 20) score += 10;
    return score;
  }

  function findBestImage() {
    const imgs = Array.from(document.images);
    let best = null, bestScore = 0;
    for (const img of imgs) {
      const s = scoreImage(img);
      if (s > bestScore) { bestScore = s; best = img; }
    }
    return bestScore > 0 ? best : null;
  }

  /* ── Ana tıklama + kapatma ── */
  function runAutoClick() {
    if (!active || !rule || alreadyRan) return;
    alreadyRan = true; // bu sekmede bir kez çalışsın

    const img = findBestImage();
    if (!img) {
      log('Eşleşen resim bulunamadı.');
      alreadyRan = false;
      return;
    }

    log('Tıklanıyor...');
    setStatus('<b style="color:#facc15">⚡ Tıklandı! Kapatılıyor...</b>', '#ccc');

    img.click();
    img.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    setTimeout(() => GM_windowClose(), closeDelay);
  }

  /* ── Sekme aktif olunca otomatik başlat ── */
  function onFocus() {
    if (!active || !rule || alreadyRan) return;
    log(`Sekme aktif, ${waitDelay/1000}s sonra tıklanacak...`);
    setStatus(`<b style="color:#f59e0b">⏳ ${waitDelay/1000}s bekleniyor...</b>`, '#ccc');
    setTimeout(runAutoClick, waitDelay);
  }

  window.addEventListener('focus', onFocus);

  /* Sayfa zaten aktifse ve yeni yüklendiyse de çalış */
  if (document.hasFocus()) {
    setTimeout(onFocus, 500);
  }

  /* ── Butonlar ── */
  document.getElementById('rsk-btn-select').addEventListener('click', () => { if (!selectMode) startSelectMode(); });

  document.getElementById('rsk-btn-toggle').addEventListener('click', () => {
    active = !active;
    GM_setValue(ACTIVE_KEY, active);
    updateUI();
    if (active) {
      log('Aktif — sekme açılınca otomatik başlar.');
      alreadyRan = false;
      onFocus(); // şu an aktif sekmedeyse hemen başlat
    } else {
      log('Durduruldu.');
    }
  });

  document.getElementById('rsk-btn-clear').addEventListener('click', () => {
    rule = null; active = false; alreadyRan = false;
    GM_setValue(RULE_KEY, null); GM_setValue(ACTIVE_KEY, false);
    updateUI(); log('Seçim silindi.');
  });

  updateUI();

})();
