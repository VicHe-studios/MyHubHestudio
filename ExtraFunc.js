// ============================================================================
// ExtraFunc.js — Capa de extensiones incrementales
// ============================================================================

(function() {
  'use strict';

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
          <p class="nota">Tus apps y datos viven de forma local en este navegador.</p>
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
      
      // Piso del zoom (0.75) para que no se vuelva microscópico
      const scale = Math.max(0.75, Math.min(scaleX, scaleY));

      document.body.style.zoom = scale;
      
      // Evita los espacios en blanco (letterboxing) estirando el lienzo virtual
      const virtualW = Math.max(BASE_WIDTH, w / scale);
      const virtualH = Math.max(BASE_HEIGHT, h / scale);

      document.body.style.width = virtualW + 'px';
      document.body.style.height = virtualH + 'px';
    };

    applyZoom();
    window.addEventListener('resize', applyZoom);
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

    // Mapa para rastrear ventanas expandidas y sus observadores de estilo
    const expandedWins = new Map();

    // Función para colapsar todas las ventanas expandidas
    const colapsarExpandidas = () => {
      expandedWins.forEach((data, node) => {
        expandedWins.delete(node);
        if (data.observer) data.observer.disconnect();
        node.style.width = '';
        node.style.left = '';
        
        const btn = node.querySelector('.expand-btn');
        if (btn) {
          btn.innerHTML = '<i data-lucide="maximize-2"></i>';
          btn.title = 'Agrandar (2 espacios)';
        }
      });
      window.dispatchEvent(new Event('resize'));
    };

    // Interceptar la apertura de apps para que no se abran 3 y se pisen
    if (!window._origAbrir) {
      window._origAbrir = window.MyHub.abrir;
      window.MyHub.abrir = function(id) {
        colapsarExpandidas();
        window._origAbrir(id);
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

              if (expandedWins.has(node)) {
                // Restaurar tamaño
                const data = expandedWins.get(node);
                if (data.observer) data.observer.disconnect();
                expandedWins.delete(node);
                node.style.width = '';
                node.style.left = '';
                window.dispatchEvent(new Event('resize'));
                expandBtn.innerHTML = '<i data-lucide="maximize-2"></i>';
                expandBtn.title = 'Agrandar (2 espacios)';
              } else {
                // Expandir a 2 espacios
                const deskW = deskEl.clientWidth;
                const G = 18;
                const w = (deskW - G * 4) / 3;
                const doubleW = w * 2 + G;

                const rect = node.getBoundingClientRect();
                const deskRect = deskEl.getBoundingClientRect();
                const relativeX = rect.left - deskRect.left;

                let newLeft = G;
                if (relativeX > deskW / 2) {
                  newLeft = deskW - doubleW - G;
                }

                const applyExpandedStyle = () => {
                  node.style.left = newLeft + 'px';
                  node.style.width = doubleW + 'px';
                };

                applyExpandedStyle();

                // Observer para evitar que JsLobby sobrescriba el tamaño
                const styleObserver = new MutationObserver(() => {
                  const data = expandedWins.get(node);
                  if (!data) return;
                  if (node.style.left !== data.left + 'px' || node.style.width !== data.width + 'px') {
                    applyExpandedStyle();
                  }
                });
                
                expandedWins.set(node, { left: newLeft, width: doubleW, observer: styleObserver });
                styleObserver.observe(node, { attributes: true, attributeFilter: ['style'] });

                // Si el usuario intenta mover la ventana, cancelamos la expansión automáticamente
                const onDragStart = () => {
                  if (expandedWins.has(node)) {
                    const data = expandedWins.get(node);
                    if (data.observer) data.observer.disconnect();
                    expandedWins.delete(node);
                    node.style.width = '';
                    node.style.left = '';
                    window.dispatchEvent(new Event('resize'));
                  }
                  titlebar.removeEventListener('pointerdown', onDragStart);
                };
                titlebar.addEventListener('pointerdown', onDragStart);

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
      });
    });

    observer.observe(deskEl, { childList: true });
  };

  // ================= Init =================
  const init = () => {
    if (!window.MyHub) { setTimeout(init, 100); return; }

    inyectarEstilosStorage();
    setupStoragePanel();
    setupDynamicZoom();
    setupWindowControls();

    console.log('%c[ExtraFunc] Extensiones cargadas al 100%', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();
