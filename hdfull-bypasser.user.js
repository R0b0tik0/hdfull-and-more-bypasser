// ==UserScript==
// @name         HDFull/Powvideo Bypasser
// @namespace    hdfull-bypasser
// @version      2.2.0
// @description  HDFull: "Enlace externo" va directo al enlace limpio sin captcha. Powvideo: menú "¿Qué quieres hacer?" con Ver sin anuncios / Cancelar, con aviso "Resuelve el captcha" mientras se detecta el stream.
// @author       you
// @match        *://hdfull.love/*
// @match        *://hdfull.sbs/*
// @match        *://hdfull.tv/*
// @match        *://powvideo.org/*
// @match        *://powwideo.org/*
// @match        *://powvideo.net/*
// @match        *://powwideo.net/*
// @include      *://hdfull.*/*
// @include      *://*.hdfull.*/*
// @include      *://powvideo.*/*
// @include      *://powwideo.*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const HOST = location.hostname.toLowerCase();
  const IS_HDFULL = /(^|\.)hdfull\./.test(HOST);
  const IS_POWVIDEO = /(^|\.)pow(w)?ideo\./.test(HOST);
  const IS_TOP = (() => { try { return window.top === window; } catch (e) { return true; } })();

  /* ------------------------------------------------------------------ *
   * Utilidades compartidas
   * ------------------------------------------------------------------ */

  /** Enlace limpio a partir de un embed de proveedor:
   *  https://powvideo.org/embed-abc123-920x560.html  ->  https://powvideo.org/abc123
   */
  function cleanEmbedUrl(src) {
    if (!src) return null;
    try {
      const u = new URL(src);
      const m = u.pathname.match(/^\/embed-([a-z0-9_-]+?)(?:-\d+x\d+)?\.html?$/i);
      if (!m) return null;
      return u.origin + '/' + m[1];
    } catch (e) {
      return null;
    }
  }

  /** De una URL de stream pkcdn extrae el enlace directo (sin /dash):
   *  .../dash/<token>/init-v1-x3.mp4       -> quitar /dash
   *  .../dash/<token>/fragment-1-v1-x3.m4s -> derivar init-v1-x3.mp4
   */
  function parsePkUrl(u) {
    try {
      const url = new URL(u);
      const m = url.pathname.match(/^\/dash\/([a-z0-9_-]+)\/(.+)$/i);
      if (!m || !/pkcdn\.org/i.test(url.hostname)) return null;
      const token = m[1];
      const file = m[2];
      let repId = null;
      const vi = file.match(/^init-v([a-z0-9_-]+)\.mp4$/i);
      const fr = file.match(/^fragment-\d+-v([a-z0-9_-]+)\.m4s$/i);
      if (vi) repId = 'v' + vi[1];
      else if (fr) repId = 'v' + fr[1];
      if (!repId) return null;
      return { clean: url.origin + '/' + token + '/init-' + repId + '.mp4' };
    } catch (e) {
      return null;
    }
  }

  /* ------------------------------------------------------------------ *
   * PASO 1 — HDFull: "Enlace externo" directo sin captcha
   * ------------------------------------------------------------------ */

  function initHdfull() {
    function activeIframeSrc() {
      const f = document.querySelector('#embed-movie iframe[src], .embed-movie iframe[src]');
      return (f && f.src) || null;
    }

    function blockIframeSrc(block) {
      const id = block && (block.dataset.id || ((block.id || '').match(/\d+/) || [])[0]);
      if (!id) return null;
      const cont = document.getElementById('embed-container-' + id);
      const f = cont && cont.querySelector('iframe[src]');
      return (f && f.src) || null;
    }

    function activateBlock(block) {
      const header = block.querySelector('h5') || block.querySelector('.provider') || block;
      header.click();
    }

    function rewriteVisible() {
      document.querySelectorAll('a[href*="/ext/"]').forEach((a) => {
        if (!a.dataset.hdbOrig) a.dataset.hdbOrig = a.href;
        const block = a.closest('.embed-selector');
        const src = blockIframeSrc(block);
        const clean = cleanEmbedUrl(src);
        if (clean) {
          a.href = clean;
          a.title = 'Ver directamente (bypass captcha): ' + clean;
        } else {
          a.href = a.dataset.hdbOrig;
          a.title = '';
        }
      });
    }

    document.addEventListener('click', async (e) => {
      const a = e.target.closest('a[href*="/ext/"]');
      if (!a) return;

      const block = a.closest('.embed-selector');
      let src = block ? blockIframeSrc(block) : null;

      if (!src && block && !document.getElementById('embed-container-' + (block.dataset.id || ''))) {
        activateBlock(block);
        for (let i = 0; i < 20 && !src; i++) {
          await new Promise((r) => setTimeout(r, 300));
          src = blockIframeSrc(block);
        }
      }
      if (!src) src = activeIframeSrc();

      const clean = cleanEmbedUrl(src);
      if (!clean) return;

      e.preventDefault();
      e.stopPropagation();
      a.href = clean;
      window.open(clean, '_blank', 'noopener');
    });

    const ro = new MutationObserver(rewriteVisible);
    if (document.body) ro.observe(document.body, { childList: true, subtree: true });
    else document.addEventListener('DOMContentLoaded', () => ro.observe(document.body, { childList: true, subtree: true }));
    if (document.readyState !== 'loading') setTimeout(rewriteVisible, 300);
    else document.addEventListener('DOMContentLoaded', () => setTimeout(rewriteVisible, 300));
  }

  /* ------------------------------------------------------------------ *
   * PASO 2 — Powvideo: menú estilo BypassTools
   *    - Cabecera: "¿Qué quieres hacer?"
   *    - Aviso "Resuelve el captcha" mientras no haya stream detectado
   *    - Botones: Ver el contenido sin anuncios / Cancelar
   * ------------------------------------------------------------------ */

  const BT_CSS = String.raw`
    :host { all: initial; }
    .hdb-root {
      --hdb-bg: #090b0f; --hdb-surface: #11141a; --hdb-raised: #171b22;
      --hdb-border: #272d38; --hdb-text: #f4f6f8; --hdb-muted: #c3c9d1;
      --hdb-subtle: #8b93a1; --hdb-brand: #8758f5; --hdb-brand2: #9b75f7;
      --hdb-success: #4fc89b; --hdb-warning: #f6c453; --hdb-error: #ff6b75;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 15px; line-height: 1.5; color: var(--hdb-text);
      position: fixed; top: 0; right: 0; bottom: 0; z-index: 2147483647;
      display: flex; align-items: center; justify-content: flex-end;
      padding: 16px;
      pointer-events: none; /* el contenedor no bloquea; se puede usar la página */
    }
    .hdb-panel {
      pointer-events: auto;
      width: min(100%, 360px);
      max-height: calc(100vh - 32px);
      background: var(--hdb-surface);
      border: 1px solid var(--hdb-border);
      border-radius: 18px;
      box-shadow: 0 24px 70px rgba(0, 0, 0, .5);
      overflow: hidden;
    }
    .hdb-header { display: flex; gap: 12px; padding: 20px 20px 16px; border-bottom: 1px solid var(--hdb-border); }
    .hdb-brand {
      width: 42px; height: 28px; flex: none; display: flex; align-items: center; justify-content: center;
      font: 900 italic 22px/1 Arial, sans-serif; letter-spacing: -5px; transform: skew(-7deg);
      color: var(--hdb-brand); user-select: none;
    }
    .hdb-heading { min-width: 0; flex: 1; }
    .hdb-eyebrow { margin: 0 0 2px; color: var(--hdb-brand); font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    .hdb-title { margin: 0; font-size: 20px; line-height: 1.25; font-weight: 760; letter-spacing: -.02em; }
    .hdb-subtitle { margin: 4px 0 0; color: var(--hdb-muted); font-size: 12.5px; }
    .hdb-build { flex: none; align-self: flex-start; border: 1px solid var(--hdb-border); border-radius: 6px; padding: 3px 7px; color: var(--hdb-muted); background: var(--hdb-raised); font: 650 10px/1.2 ui-monospace, Consolas, monospace; white-space: nowrap; }
    .hdb-body { padding: 18px; display: grid; gap: 14px; }
    .hdb-status {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 13px 14px; border-left: 3px solid var(--hdb-brand);
      border-radius: 2px 10px 10px 2px; background: var(--hdb-raised);
    }
    .hdb-status[data-tone="success"] { border-left-color: var(--hdb-success); }
    .hdb-status[data-tone="error"] { border-left-color: var(--hdb-error); }
    .hdb-status-icon { flex: none; width: 22px; height: 22px; margin-top: 2px; color: var(--hdb-brand2); }
    .hdb-status[data-tone="success"] .hdb-status-icon { color: var(--hdb-success); }
    .hdb-status[data-tone="error"] .hdb-status-icon { color: var(--hdb-error); }
    .hdb-spinner { animation: hdb-spin 900ms linear infinite; }
    @keyframes hdb-spin { to { transform: rotate(360deg); } }
    .hdb-status-title { margin: 0; font-size: 13.5px; font-weight: 650; }
    .hdb-status-msg { margin: 3px 0 0; color: var(--hdb-muted); font-size: 12.5px; word-break: break-word; }
    .hdb-url { margin-top: 8px; font: 550 11px/1.4 ui-monospace, Consolas, monospace; color: var(--hdb-subtle); word-break: break-all; background: var(--hdb-bg); border: 1px solid var(--hdb-border); border-radius: 6px; padding: 7px 9px; user-select: all; }
    .hdb-actions { padding: 0 18px 18px; display: grid; gap: 9px; }
    .hdb-btn {
      min-height: 42px; border: 1px solid var(--hdb-border); border-radius: 9px;
      padding: 9px 14px; background: var(--hdb-raised); color: var(--hdb-text);
      font: 650 13px/1.2 system-ui, sans-serif; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 9px;
      transition: background 120ms ease, border-color 120ms ease, filter 120ms ease, transform 120ms ease;
    }
    .hdb-btn:hover { border-color: var(--hdb-subtle); background: var(--hdb-surface); }
    .hdb-btn:active { transform: translateY(1px); }
    .hdb-btn svg { width: 15px; height: 15px; flex: none; }
    .hdb-btn[data-variant="primary"] { border-color: var(--hdb-brand); background: var(--hdb-brand); color: #fff; box-shadow: 0 6px 18px rgba(135, 88, 245, .22); }
    .hdb-btn[data-variant="primary"]:hover { background: var(--hdb-brand2); filter: brightness(1.05); }
    .hdb-btn[data-variant="danger"] { border-color: var(--hdb-error); color: var(--hdb-error); background: transparent; }
    .hdb-btn[data-variant="danger"]:hover { background: rgba(255, 107, 117, .08); }
    .hdb-btn[disabled] { opacity: .45; cursor: not-allowed; transform: none; filter: none; }
    .hdb-meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 18px; border-top: 1px solid var(--hdb-border); color: var(--hdb-subtle); font: 550 10px/1.3 ui-monospace, Consolas, monospace; }
  `;

  const BT_ICONS = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    captcha: '<svg class="hdb-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 2a10 10 0 1 0 10 10"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 5 5L20 6"/></svg>',
    cancel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  };

  function initPowvideo() {
    // Solo en la página principal (no dentro del iframe de hdfull) y solo en fichas de vídeo
    if (!IS_TOP) return;
    const path = location.pathname;
    if (!/^\/[a-z0-9_-]{1,60}$/i.test(path)) return;

    let cleanUrl = null;
    let opened = false;        // ya abrimos el reproductor limpio
    let submitting = false;    // ya enviamos el formulario del captcha
    let playing = false;       // ya intentamos arrancar el reproductor
    let dismissed = false;     // el usuario canceló (modo manual)
    let hostEl = null;
    let shadow = null;

    const isCaptchaPage = () => !!document.querySelector('input[name="g-recaptcha-response"], #g-recaptcha-response');
    const isPlayerPage = () => !!document.querySelector('video, .jwplayer, jwplayer');

    /* ---------- Captura del stream ---------- */

    function setClean(u) {
      if (cleanUrl || !u) return;
      const p = parsePkUrl(u);
      if (p) {
        cleanUrl = p.clean;
        paint();
        autoOpen();
      }
    }

    function autoOpen() {
      if (opened || dismissed || !cleanUrl) return;
      opened = true;
      window.setTimeout(() => {
        const w = window.open(cleanUrl, '_blank');
        if (!w) location.href = cleanUrl; // popup bloqueado: navegar en la misma pestaña
      }, 500);
    }

    /* ---------- Automatización: captcha -> continuar ---------- */
    // Cuando la página tiene el formulario con reCAPTCHA, espera a que el usuario
    // resuelva el captcha (el token aparece en el input) y envía el formulario solo.
    function autoContinue() {
      if (dismissed || submitting) return;
      const iv = window.setInterval(() => {
        if (dismissed) { window.clearInterval(iv); return; }
        if (cleanUrl) { window.clearInterval(iv); return; }
        // recaptcha-v2 rellena su textarea; la web copia el token a su input oculto
        const inp =
          document.querySelector('form input[name="g-recaptcha-response"]') ||
          document.querySelector('#g-recaptcha-response');
        if (inp && inp.value && inp.value.length > 20) {
          window.clearInterval(iv);
          submitting = true;
          const btn = document.querySelector('#btn_download') ||
            document.querySelector('form input[type="submit"], form button[type="submit"]');
          if (btn) btn.click();
        }
      }, 400);
    }

    /* ---------- Automatización: reproducir ---------- */
    // En la página del reproductor arranca la reproducción automáticamente.
    function autoPlay() {
      if (dismissed || playing) return;
      playing = true;
      const tryPlay = () => {
        if (cleanUrl || dismissed) return;
        try {
          if (typeof jwplayer === 'function') {
            const p = jwplayer();
            if (p && typeof p.play === 'function') { p.play(); return; }
          }
        } catch (e) { /* noop */ }
        const sel =
          '.jw-icon-display, .jw-icon-playback, [aria-label*="Start playback" i], ' +
          '[aria-label*="Reproducir" i], #d0ac button';
        const btn = document.querySelector(sel);
        if (btn) btn.click();
      };
      window.setTimeout(tryPlay, 300);
      window.setTimeout(tryPlay, 900);
      window.setTimeout(tryPlay, 2000);
      window.setTimeout(tryPlay, 4000);
    }

    const _xopen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      setClean(String(url));
      return _xopen.apply(this, arguments);
    };
    const _fetch = window.fetch;
    window.fetch = function (input, init) {
      const u = typeof input === 'string' ? input : input && input.url;
      setClean(u);
      return _fetch.apply(this, arguments);
    };

    const sweeper = window.setInterval(() => {
      try {
        const entries = performance.getEntriesByType('resource');
        for (let i = entries.length - 1; i >= 0; i--) setClean(entries[i].name);
      } catch (e) { /* noop */ }
      if (cleanUrl) window.clearInterval(sweeper);
    }, 1200);

    /* ---------- UI ---------- */

    function el(tag, attrs, children) {
      const n = document.createElement(tag);
      for (const k in attrs || {}) {
        if (k === 'style') n.style.cssText = attrs[k];
        else n.setAttribute(k, attrs[k]);
      }
      (children || []).forEach((c) => { n.appendChild(c); });
      return n;
    }

    function iconHTML(name) {
      const span = document.createElement('span');
      span.innerHTML = BT_ICONS[name];
      return span.firstChild;
    }

    function build() {
      if (hostEl || dismissed) return;
      hostEl = document.createElement('div');
      shadow = hostEl.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = BT_CSS;
      shadow.appendChild(style);

      const root = el('div', { class: 'hdb-root' });
      shadow.appendChild(root);

      const panel = el('div', { class: 'hdb-panel' });
      root.appendChild(panel);

      // Cabecera
      const header = el('div', { class: 'hdb-header' }, [
        el('div', { class: 'hdb-brand' }, [document.createTextNode('HD')]),
        el('div', { class: 'hdb-heading' }, [
          el('p', { class: 'hdb-eyebrow' }, [document.createTextNode('HDFull Bypass')]),
          el('h1', { class: 'hdb-title' }, [document.createTextNode('¿Qué quieres hacer?')]),
          el('p', { class: 'hdb-subtitle' }, [document.createTextNode(path)]),
        ]),
        el('span', { class: 'hdb-build' }, [document.createTextNode('DB 2.2.0')]),
      ]);
      panel.appendChild(header);

      // Cuerpo: estado
      const statusBox = el('div', { class: 'hdb-status', 'data-tone': 'wait' });
      const statusIcon = el('div', { class: 'hdb-status-icon' });
      const statusTitle = el('p', { class: 'hdb-status-title' });
      const statusMsg = el('p', { class: 'hdb-status-msg' });
      const urlBox = el('div', { class: 'hdb-url' });
      statusBox.appendChild(statusIcon);
      const statusText = el('div', {}, [statusTitle, statusMsg, urlBox]);
      statusBox.appendChild(statusText);

      const body = el('div', { class: 'hdb-body' }, [statusBox]);
      panel.appendChild(body);

      // Acciones
      const btnWatch = el('button', { class: 'hdb-btn', 'data-variant': 'primary', type: 'button' }, [
        iconHTML('play'), document.createTextNode('Ver el contenido sin anuncios'),
      ]);
      const btnCancel = el('button', { class: 'hdb-btn', 'data-variant': 'danger', type: 'button' }, [
        iconHTML('cancel'), document.createTextNode('Cancelar'),
      ]);
      const actions = el('div', { class: 'hdb-actions' }, [btnWatch, btnCancel]);
      panel.appendChild(actions);

      // Pie
      const meta = el('div', { class: 'hdb-meta' }, [
        document.createTextNode('HOST ' + HOST),
        document.createTextNode('AWAITING STREAM'),
      ]);
      panel.appendChild(meta);

      btnWatch.addEventListener('click', () => {
        if (!cleanUrl) return;
        opened = true;
        window.open(cleanUrl, '_blank', 'noopener');
      });
      btnCancel.addEventListener('click', () => {
        dismissed = true;
        hide();
      });

      document.documentElement.appendChild(hostEl);
      paint();
    }

    function paint() {
      if (dismissed) return;
      build();
      if (!shadow) return;

      const statusBox = shadow.querySelector('.hdb-status');
      const statusIcon = shadow.querySelector('.hdb-status-icon');
      const statusTitle = shadow.querySelector('.hdb-status-title');
      const statusMsg = shadow.querySelector('.hdb-status-msg');
      const urlBox = shadow.querySelector('.hdb-url');
      const btnWatch = shadow.querySelector('.hdb-btn[data-variant="primary"]');
      const meta = shadow.querySelector('.hdb-meta');

      if (!cleanUrl) {
        statusBox.setAttribute('data-tone', 'wait');
        statusIcon.innerHTML = BT_ICONS.captcha;
        if (isCaptchaPage()) {
          statusTitle.textContent = 'Resuelve el captcha de la página';
          statusMsg.textContent = 'Al resolverlo continuaré automáticamente: envío, reproducción y apertura del stream limpio.';
        } else if (isPlayerPage()) {
          statusTitle.textContent = 'Iniciando reproducción…';
          statusMsg.textContent = 'Arrancando el reproductor y detectando el stream directo automáticamente.';
        } else {
          statusTitle.textContent = 'Buscando…';
          statusMsg.textContent = 'Marca el captcha y pulsa "Continuar al vídeo" si la página lo pide.';
        }
        urlBox.style.display = 'none';
        btnWatch.disabled = true;
        if (meta && meta.lastChild) meta.lastChild.textContent = 'AWAITING STREAM';
        return;
      }

      // Stream detectado
      statusBox.setAttribute('data-tone', 'success');
      statusIcon.innerHTML = BT_ICONS.check;
      statusTitle.textContent = 'Enlace directo detectado';
      statusMsg.textContent = opened
        ? 'Abriendo el reproductor limpio…'
        : 'El stream se cargó sin pasar por el reproductor con anuncios.';
      urlBox.textContent = cleanUrl;
      urlBox.style.display = 'block';
      btnWatch.disabled = false;
      if (meta && meta.lastChild) meta.lastChild.textContent = opened ? 'OPENED' : 'STREAM DETECTED';
    }

    function hide() {
      if (hostEl && hostEl.parentNode) hostEl.parentNode.removeChild(hostEl);
      hostEl = null;
      shadow = null;
    }

    // Montar la UI en cuanto el DOM esté listo
    function boot() {
      build();
      if (dismissed) return;
      if (isCaptchaPage() && !cleanUrl) autoContinue();
      if (isPlayerPage() && !cleanUrl) autoPlay();
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
    // Re-pintar cuando aparezca/reemplace el DOM (vuelta a cargar tras el captcha)
    const ro = new MutationObserver(() => {
      if (dismissed) return;
      if (!hostEl) build();
      else if (cleanUrl) paint();
      // Si el DOM revela la página del reproductor tras el envío, arrancar el play
      if (!cleanUrl && !dismissed) {
        if (isCaptchaPage() && !submitting) autoContinue();
        if (isPlayerPage() && !playing) autoPlay();
      }
    });
    if (document.body) ro.observe(document.body, { childList: true, subtree: true });
    else document.addEventListener('DOMContentLoaded', () => ro.observe(document.body, { childList: true, subtree: true }));
  }

  /* ------------------------------------------------------------------ */

  if (IS_HDFULL) initHdfull();
  if (IS_POWVIDEO) initPowvideo();
})();