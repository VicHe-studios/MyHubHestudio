// ============================================================================
// ExtraFunc.js — Capa de extensiones incrementales
// ============================================================================

(function() {
  'use strict';

  // ================= PWA: Service Worker + persistencia =================
  const setupPWA = async () => {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('./sw.js', { scope: './' });
      } catch (err) {}
    }
    if (navigator.storage && navigator.storage.persist) {
      try {
        const already = await navigator.storage.persisted();
        if (!already) await navigator.storage.persist();
      } catch (e) {}
    }
  };

  // ================= theme-color dinámico =================
  const hookThemeColor = () => {
    if (typeof window.aplicarAjustes !== 'function' || window.aplicarAjustes._pwaHook) return;
    const original = window.aplicarAjustes;
    window.aplicarAjustes = function() {
      original.apply(this, arguments);
      const color = (typeof COLORES !== 'undefined' && typeof ajustes !== 'undefined' && COLORES[ajustes.color]) || '#2563eb';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', color);
    };
    window.aplicarAjustes._pwaHook = true;
  };

  // ================= Panel de almacenamiento en Configuración =================
  const inyectarEstilosStorage = () => {
    if (document.getElementById('pwa-storage-style')) return;
    const style = document.createElement('style');
    style.id = 'pwa-storage-style';
    style.textContent = `
      .storage-bar-wrap { background: var(--field); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; margin-top: 8px; }
      .storage-bar-bg { width: 100%; height: 8px; background: var(--line); border-radius: 6px; overflow: hidden; }
      .storage-bar-fill { height: 100%; background: var(--accent); border-radius: 6px; transition: width .4s var(--ease-out); }
      .storage-bar-label { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--muted); margin-top: 6px; }
      .storage-bar-label b { color: var(--text); font-weight: 600; }
    `;
    document.head.appendChild(style);
  };

  const setupStoragePanel = () => {
    const modalEl = document.getElementById('modal');
    const mTitulo = document.getElementById('mTitulo');
    const mBody = document.getElementById('mBody');
    if (!modalEl || !mBody || !mTitulo) return;
    const observer = new MutationObserver(() => {
      if (mTitulo.textContent === 'Configuración' && !document.getElementById('pwa-storage-panel')) {
        const container = document.createElement('div');
        container.id = 'pwa-storage-panel';
        container.innerHTML = `
          <div class="sec" style="margin-top: 20px;">Almacenamiento</div>
          <div class="storage-bar-wrap">
            <div class="storage-bar-bg"><div class="storage-bar-fill" id="storage-fill" style="width:0%"></div></div>
            <div class="storage-bar-label">
              <span id="storage-text">Calculando...</span>
              <b id="storage-pct">0%</b>
            </div>
          </div>
          <p class="nota">Tus apps y datos viven en este navegador. Instalá MyHub como PWA para que el navegador no los borre automáticamente.</p>
        `;
        mBody.appendChild(container);
        if (navigator.storage && navigator.storage.estimate) {
          navigator.storage.estimate().then(({ usage, quota }) => {
            const pct = quota > 0 ? Math.min(100, (usage / quota) * 100) : 0;
            const fmt = (b) => b >= 1024 * 1024 * 1024 ? (b / 1024 / 1024 / 1024).toFixed(1) + ' GB' : b >= 1024 * 1024 ? (b / 1024 / 1024).toFixed(1) + ' MB' : (b / 1024).toFixed(0) + ' KB';
            const fill = document.getElementById('storage-fill');
            const text = document.getElementById('storage-text');
            const pctEl = document.getElementById('storage-pct');
            if (fill) fill.style.width = pct.toFixed(1) + '%';
            if (text) text.textContent = `${fmt(usage)} de ${fmt(quota)} usados`;
            if (pctEl) pctEl.textContent = pct.toFixed(1) + '%';
          }).catch(() => {});
        }
      }
    });
    observer.observe(modalEl, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  };

  // ================= Zoom Dinámico =================
  const setupDynamicZoom = () => {
    const BASE_WIDTH = 1000; 
    const BASE_HEIGHT = 650;

    const applyZoom = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      const scaleX = w / BASE_WIDTH;
      const scaleY = h / BASE_HEIGHT;
      
      const scale = Math.min(scaleX, scaleY);

      document.body.style.zoom = scale;
      
      // Calcula el espacio virtual para evitar los espacios en blanco (letterboxing)
      const virtualW = Math.max(BASE_WIDTH, w / scale);
      const virtualH = Math.max(BASE_HEIGHT, h / scale);

      document.body.style.width = virtualW + 'px';
      document.body.style.height = virtualH + 'px';
    };

    applyZoom();
    window.addEventListener('resize', applyZoom);
  };

  // ================= Iniciar al abrir =================
  const setupWindowBehavior = () => {
    if (!window.matchMedia('(display-mode: standalone)').matches) return;
    setTimeout(() => {
      try {
        window.moveTo(0, 0);
        window.resizeTo(screen.availWidth, screen.availHeight);
      } catch (e) {}
    }, 200);
  };

  // ================= Nuevos Botones de Ventana (Recargar y Agrandar) =================
  const setupWindowControls = () => {
    if (!document.getElementById('win-controls-style')) {
      const style = document.createElement('style');
      style.id = 'win-controls-style';
      style.textContent = `
        .close.reload-btn:hover { background: var(--accent); color: #fff; transform: scale(1.05); }
        .close.expand-btn:hover { background: #16a34a; color: #fff; transform: scale(1.05); }
      `;
      document.head.appendChild(style);
    }

    window.expandedWins = window.expandedWins || {};

    // Hookear la función acomodar de JsLobby
    if (!window._origAcomodar) {
      window._origAcomodar = window.acomodar;
      window.acomodar = function() {
        if (typeof window._origAcomodar === 'function') window._origAcomodar();
        
        for (const id in window.expandedWins) {
          // Evaluamos si las variables globales de JsLobby existen para evitar errores
          const _win = typeof win !== 'undefined' ? win : window.win;
          const _minimized = typeof minimized !== 'undefined' ? minimized : window.minimized;
          
          if (!_win || !_win[id] || (_minimized && _minimized.has(id))) continue;
          
          const appWin = _win[id];
          const slot = window.expandedWins[id];
          
          const G = 18, W = desk.clientWidth, H = desk.clientHeight;
          const w = (W - G * 4) / 3;
          
          if (slot === 'left') {
            Object.assign(appWin.el.style, { left: G + 'px', top: G + 'px', width: (w * 2 + G) + 'px', height: (H - G * 2) + 'px' });
          } else if (slot === 'center') {
            Object.assign(appWin.el.style, { left: (G * 2 + w) + 'px', top: G + 'px', width: (w * 2 + G) + 'px', height: (H - G * 2) + 'px' });
          } else if (slot === 'right') {
            Object.assign(appWin.el.style, { left: (G * 2 + w) + 'px', top: G + 'px', width: (w * 2 + G) + 'px', height: (H - G * 2) + 'px' });
          }
        }
      };
    }

    const deskEl = document.getElementById('desktop');
    if (!deskEl) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList.contains('win')) {
            const titlebar = node.querySelector('.titlebar');
            if (!titlebar || titlebar.dataset.controlsAdded) return;
            titlebar.dataset.controlsAdded = 'true';

            const titleSpan = titlebar.querySelector('span');
            let appId = null;
            const _registro = typeof registro !== 'undefined' ? registro : window.registro;
            
            if (_registro && titleSpan) {
              const title = titleSpan.textContent;
              _registro.forEach((app, id) => { if (app.titulo === title) appId = id; });
            }
            if (!appId) return;

            // Botón Recargar
            const reloadBtn = document.createElement('button');
            reloadBtn.className = 'close reload-btn';
            reloadBtn.title = 'Recargar ventana';
            reloadBtn.innerHTML = '<i data-lucide="refresh-cw"></i>';
            reloadBtn.onclick = (e) => {
              e.stopPropagation();
              const body = node.querySelector('.body');
              const iframe = body.querySelector('iframe');
              if (iframe) {
                if (iframe.srcdoc) {
                  iframe.srcdoc = iframe.srcdoc;
                } else {
                  try { iframe.contentWindow.location.reload(); } catch(err) { iframe.src = iframe.src; }
                }
              } else {
                window.MyHub.cerrar(appId);
                setTimeout(() => window.MyHub.abrir(appId), 50);
              }
              window.MyHub.toast('Ventana recargada');
            };

            // Botón Agrandar
            const expandBtn = document.createElement('button');
            expandBtn.className = 'close expand-btn';
            expandBtn.title = 'Agrandar (2 espacios)';
            expandBtn.innerHTML = '<i data-lucide="maximize-2"></i>';
            expandBtn.onclick = (e) => {
              e.stopPropagation();
              
              const _win = typeof win !== 'undefined' ? win : window.win;
              const _slots = typeof slots !== 'undefined' ? slots : window.slots;
              
              if (!_win || !_win[appId]) return;
              const appWin = _win[appId];
              
              if (window.expandedWins[appId]) {
                delete window.expandedWins[appId];
                window.acomodar();
                expandBtn.innerHTML = '<i data-lucide="maximize-2"></i>';
                expandBtn.title = 'Agrandar (2 espacios)';
              } else {
                window.expandedWins[appId] = appWin.slot;
                
                if (_slots) {
                  if (appWin.slot === 'left' && _slots.center) window.MyHub.minimizar(_slots.center);
                  if (appWin.slot === 'center' && _slots.right) window.MyHub.minimizar(_slots.right);
                  if (appWin.slot === 'right' && _slots.center) window.MyHub.minimizar(_slots.center);
                  if (appWin.slot === 'center' && !_slots.right && _slots.left) window.MyHub.minimizar(_slots.left);
                }

                window.acomodar();
                expandBtn.innerHTML = '<i data-lucide="minimize-2"></i>';
                expandBtn.title = 'Restaurar tamaño';
              }
              if (window.lucide) window.lucide.createIcons();
            };

            const minimizeBtn = titlebar.querySelector('.minimize');
            titlebar.insertBefore(expandBtn, minimizeBtn);
            titlebar.insertBefore(reloadBtn, expandBtn);

            if (window.lucide) window.lucide.createIcons();
          }
        });
        
        const _win = typeof win !== 'undefined' ? win : window.win;
        if (_win) {
          for (const id in window.expandedWins) {
            if (!_win[id]) delete window.expandedWins[id];
          }
        }
      });
    });

    observer.observe(deskEl, { childList: true });
  };

  // ================= Init =================
  const init = () => {
    if (!window.MyHub) { setTimeout(init, 100); return; }

    setupPWA();
    hookThemeColor();
    inyectarEstilosStorage();
    setupStoragePanel();
    setupWindowBehavior();
    setupDynamicZoom();
    setupWindowControls();

    console.log('%c[ExtraFunc] Sistema cargado al 100%', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();
