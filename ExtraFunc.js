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

  // ================= Zoom Dinámico (El Escritorio como una foto) =================
  const setupDynamicZoom = () => {
    // Tamaño "ideal" base para el que está diseñado MyHub
    const BASE_WIDTH = 1200;
    const BASE_HEIGHT = 800;

    const applyZoom = () => {
      // Si estamos en PWA, calculamos el tamaño de la ventana. Si no, usamos el viewport.
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      // Calculamos cuánto tiene que escalar (achicar o agrandar) para encajar
      const scaleX = w / BASE_WIDTH;
      const scaleY = h / BASE_HEIGHT;
      
      // Usamos el menor para que nada se corte (siempre entra todo)
      const scale = Math.min(scaleX, scaleY);

      // Aplicamos el zoom al body (afecta a todo el OS: iconos, ventanas, barra)
      document.body.style.zoom = scale;
      
      // Ajuste extra: forzamos al body a ocupar el 100% del espacio virtual escalado
      // para que el fondo no quede con bordes blancos.
      document.body.style.width = (100 / scale) + '%';
      document.body.style.height = (100 / scale) + '%';
    };

    // Aplicar al iniciar y al redimensionar
    applyZoom();
    window.addEventListener('resize', applyZoom);
  };

  // ================= Iniciar al abrir (Pantalla Completa sin romper) =================
  const setupWindowBehavior = () => {
    if (!window.matchMedia('(display-mode: standalone)').matches) return;

    // Al abrir, maximizamos la ventana nativa
    setTimeout(() => {
      try {
        window.moveTo(0, 0);
        window.resizeTo(screen.availWidth, screen.availHeight);
      } catch (e) {}
    }, 200);
  };

  // ================= Init =================
  const init = () => {
    if (!window.MyHub) { setTimeout(init, 100); return; }

    setupPWA();
    hookThemeColor();
    inyectarEstilosStorage();
    setupStoragePanel();
    setupWindowBehavior();
    setupDynamicZoom(); // <--- LA SOLUCIÓN

    console.log('%c[ExtraFunc] Zoom Dinámico + PWA cargados', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();
