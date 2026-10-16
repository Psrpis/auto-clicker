// ==UserScript==
// @name         Auto Clicker
// @namespace    http://tampermonkey.net/
// @version      2.7
// @description  Sekmeye geçince otomatik resme tıklar. Sayfaları sen kapatıyorsun (Ctrl+W).
// @author       Psrpis
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
  'use strict';

  var PANEL_KEY  = 'rsk_panel_pos';
  var RULE_KEY   = 'rsk_rule';
  var ACTIVE_KEY = 'rsk_active';
  var WAIT_KEY   = 'rsk_wait';

  var selectMode  = false;
  var rule        = GM_getValue(RULE_KEY,   null);
  var active      = GM_getValue(ACTIVE_KEY, false);
  var waitDelay   = GM_getValue(WAIT_KEY,   1500);
  var alreadyRan  = false;

  var panel = document.createElement('div');
  panel.id = 'rsk-panel';
  panel.style.position = 'fixed';
  panel.style.zIndex = '2147483647';
  panel.style.top = '20px';
  panel.style.right = '20px';
  panel.style.width = '240px';
  panel.style.background = '#1a1a1a';
  panel.style.color = '#f0f0f0';
  panel.style.borderRadius = '10px';
  panel.style.fontFamily = 'system-ui, sans-serif';
  panel.style.fontSize = '13px';
  panel.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
  panel.style.userSelect = 'none';
  panel.style.overflow = 'hidden';

  panel.innerHTML = '<div id="rsk-header" style="padding:10px 14px;background:#111;cursor:move;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #333;"><span style="font-weight:600;font-size:13px;">Auto Clicker</span><div style="display:flex;align-items:center;gap:10px;"><span id="rsk-minimize" style="cursor:pointer;opacity:.6;font-size:16px;">−</span><span id="rsk-close" style="cursor:pointer;opacity:.6;font-size:18px;">×</span></div></div><div id="rsk-body" style="padding:12px 14px;"><div id="rsk-status" style="padding:7px 10px;border-radius:6px;margin-bottom:10px;font-size:12px;background:#2a2a2a;color:#aaa;min-height:32px;">Henüz resim seçilmedi.</div><div style="display:flex;flex-direction:column;gap:7px;"><button id="rsk-btn-select" style="padding:8px;border-radius:6px;border:none;background:#3b82f6;color:#fff;cursor:pointer;font-size:12px;font-weight:600;">Sayfadan Resim Seç</button><button id="rsk-btn-toggle" style="padding:8px;border-radius:6px;border:1px solid #444;background:#2a2a2a;color:#f0f0f0;cursor:pointer;font-size:12px;font-weight:600;">Oto-Tıklamayı Başlat</button><button id="rsk-btn-clear" style="padding:8px;border-radius:6px;border:1px solid #333;background:transparent;color:#888;cursor:pointer;font-size:12px;">Seçimi Sil</button></div><div style="margin-top:12px;border-top:1px solid #333;padding-top:10px;"><label style="font-size:11px;color:#666;display:block;margin-bottom:4px;">Sekme bekleme süresi (sn)</label><div style="display:flex;align-items:center;gap:8px;"><input id="rsk-wait" type="range" min="0.5" max="10" step="0.5" style="flex:1;accent-color:#f59e0b;"/><span id="rsk-wait-label" style="font-size:12px;min-width:28px;">1.5s</span></div></div><div id="rsk-log" style="margin-top:10px;font-size:11px;color:#666;min-height:14px;"></div></div>';

  document.documentElement.appendChild(panel);

  var waitSlider = document.getElementById('rsk-wait');
  waitSlider.value = (waitDelay/1000);

  waitSlider.addEventListener('input', function() {
    waitDelay = parseFloat(this.value) * 1000;
    GM_setValue(WAIT_KEY, waitDelay);
    document.getElementById('rsk-wait-label').textContent = this.value + 's';
  });

  function log(msg) {
    document.getElementById('rsk-log').textContent = msg;
  }

  function setStatus(html) {
    document.getElementById('rsk-status').innerHTML = html;
  }

  function describeRule(r) {
    if (!r) return 'Seçim yok';
    var parts = [];
    if (r.alt) parts.push('alt: ' + r.alt);
    if (r.cls) parts.push('class: ' + r.cls);
    if (r.src) parts.push('src: ' + r.src);
    if (r.w) parts.push(r.w + 'x' + r.h + 'px');
    return parts.length ? parts.join(' · ') : '(genel)';
  }

  function updateUI() {
    if (rule) {
      setStatus('<b style="color:#4ade80;">✔ Seçili:</b><br>' + describeRule(rule));
    } else {
      setStatus('Henüz resim seçilmedi.');
    }
    var btn = document.getElementById('rsk-btn-toggle');
    if (active) {
      btn.textContent = 'Durdur';
      btn.style.background = '#16a34a';
    } else {
      btn.textContent = 'Oto-Tıklamayı Başlat';
      btn.style.background = '#2a2a2a';
    }
  }

  var overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '2147483640';
  overlay.style.cursor = 'crosshair';
  overlay.style.background = 'rgba(59,130,246,0.08)';
  overlay.style.display = 'none';
  document.documentElement.appendChild(overlay);

  var overlayLabel = document.createElement('div');
  overlayLabel.style.position = 'fixed';
  overlayLabel.style.top = '50%';
  overlayLabel.style.left = '50%';
  overlayLabel.style.transform = 'translate(-50%,-50%)';
  overlayLabel.style.background = 'rgba(0,0,0,0.75)';
  overlayLabel.style.color = '#fff';
  overlayLabel.style.padding = '12px 24px';
  overlayLabel.textContent = 'Resmin üzerine gel ve tıkla (ESC = iptal)';
  overlay.appendChild(overlayLabel);

  function startSelectMode() {
    selectMode = true;
    overlay.style.display = 'block';
  }

  function stopSelectMode() {
    selectMode = false;
    overlay.style.display = 'none';
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && selectMode) stopSelectMode();
  });

  overlay.addEventListener('click', function(e) {
    overlay.style.pointerEvents = 'none';
    var el = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = 'all';
    
    if (!el || el.tagName !== 'IMG') {
      log('Resim değil');
      return;
    }

    var src = el.src ? el.src.split('/').pop().split('.')[0] : null;
    var alt = el.alt ? el.alt.slice(0,30) : null;
    var w = Math.round(el.naturalWidth || el.offsetWidth);
    var h = Math.round(el.naturalHeight || el.offsetHeight);

    rule = { src: src, alt: alt, w: w, h: h };
    GM_setValue(RULE_KEY, rule);
    stopSelectMode();
    updateUI();
    log('Seçim kaydedildi!');
  });

  function scoreImage(img) {
    if (!rule) return 0;
    var score = 0;
    if (rule.src && img.src && img.src.indexOf(rule.src) > -1) score += 40;
    if (rule.alt && img.alt && img.alt.indexOf(rule.alt) === 0) score += 30;
    var w = Math.round(img.naturalWidth || img.offsetWidth);
    var h = Math.round(img.naturalHeight || img.offsetHeight);
    if (rule.w && rule.h && Math.abs(w - rule.w) < 20) score += 10;
    return score;
  }

  function findBestImage() {
    var imgs = document.querySelectorAll('img');
    var best = null, bestScore = 0;
    for (var i = 0; i < imgs.length; i++) {
      var s = scoreImage(imgs[i]);
      if (s > bestScore) { bestScore = s; best = imgs[i]; }
    }
    return bestScore > 0 ? best : null;
  }

  function runAutoClick() {
    if (!active || !rule || alreadyRan) return;
    alreadyRan = true;

    var img = findBestImage();
    if (!img) {
      log('Resim bulunamadı');
      alreadyRan = false;
      return;
    }

    log('Tıklandı - Ctrl+W ile kapat');
    setStatus('<b style="color:#4ade80;">✓ Tıklandı!</b><br>İndirme başladı.');
    img.click();
  }

  function onFocus() {
    if (!active || !rule || alreadyRan) return;
    log('Bekleniyor...');
    setTimeout(runAutoClick, waitDelay);
  }

  window.addEventListener('focus', onFocus);

  document.getElementById('rsk-btn-select').addEventListener('click', function() {
    startSelectMode();
  });

  document.getElementById('rsk-btn-toggle').addEventListener('click', function() {
    active = !active;
    GM_setValue(ACTIVE_KEY, active);
    updateUI();
    if (active) {
      alreadyRan = false;
      onFocus();
    }
  });

  document.getElementById('rsk-btn-clear').addEventListener('click', function() {
    rule = null;
    active = false;
    alreadyRan = false;
    GM_setValue(RULE_KEY, null);
    GM_setValue(ACTIVE_KEY, false);
    updateUI();
  });

  document.getElementById('rsk-minimize').addEventListener('click', function() {
    var body = document.getElementById('rsk-body');
    body.style.display = body.style.display === 'none' ? 'block' : 'none';
  });

  updateUI();
  if (active && rule) {
    setTimeout(onFocus, 1000);
  }

})();
