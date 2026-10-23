// ============================================================================
// ExtraFunc.js — Capa de extensiones incrementales
// Solo código NUEVO. Lo que ya existe en JsLobby.js no se re-registra acá.
// ============================================================================

(function() {
  'use strict';

  // ================= PWA: Service Worker + persistencia =================
  const setupPWA = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
        console.log('[PWA] SW registrado:', reg.scope);
      } catch (err) {
        console.warn('[PWA] SW no registrado:', err);
      }
    }

    if (navigator.storage && navigator.storage.persist) {
      try {
        const already = await navigator.storage.persisted();
        if (already) {
          console.log('[PWA] Storage ya persistente.');
        } else {
          const granted = await navigator.storage.persist();
          if (granted) console.log('[PWA] Storage persistente concedido.');
          else console.warn('[PWA] Storage NO persistente (instalá como PWA).');
        }
      } catch (e) {
        console.warn('[PWA] Error al pedir persistencia:', e);
      }
    }
  };

  // ================= theme-color dinámico =================
  const hookThemeColor = () => {
    if (typeof window.aplicarAjustes !== 'function' || window.aplicarAjustes._pwaHook) return;

    const original = window.aplicarAjustes;
    window.aplicarAjustes = function() {
      original.apply(this, arguments);
      const color = (typeof COLORES !== 'undefined' && typeof ajustes !== 'undefined' && COLORES[ajustes.color])
        || '#2563eb';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', color);
    };
    window.aplicarAjustes._pwaHook = true;

    const color = (typeof COLORES !== 'undefined' && typeof ajustes !== 'undefined' && COLORES[ajustes.color])
      || '#2563eb';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', color);
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
            const fmt = (b) => b >= 1024 * 1024 * 1024 ? (b / 1024 / 1024 / 1024).toFixed(1) + ' GB'
                            : b >= 1024 * 1024        ? (b / 1024 / 1024).toFixed(1) + ' MB'
                            :                           (b / 1024).toFixed(0) + ' KB';
            const fill = document.getElementById('storage-fill');
            const text = document.getElementById('storage-text');
            const pctEl = document.getElementById('storage-pct');
            if (fill) fill.style.width = pct.toFixed(1) + '%';
            if (text) text.textContent = `${fmt(usage)} de ${fmt(quota)} usados`;
            if (pctEl) pctEl.textContent = pct.toFixed(1) + '%';
          }).catch(() => {});
        } else {
          const text = document.getElementById('storage-text');
          if (text) text.textContent = 'Tu navegador no soporta estimate().';
        }
      }
    });
    observer.observe(modalEl, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  };

  // ================= Comportamiento de Ventana (Maximizar + Tamaño Mínimo) =================
  const setupWindowBehavior = () => {
    // Solo aplicamos esto si está corriendo como PWA instalada
    if (!window.matchMedia('(display-mode: standalone)').matches) return;

    const MIN_WIDTH = 900;
    const MIN_HEIGHT = 600;
    let resizeTimeout;

    // 1. Maximizar al abrir (respetando la barra de tareas)
    // Usamos un pequeño delay para darle tiempo a Windows a crear el marco
    setTimeout(() => {
      try {
        window.moveTo(0, 0);
        // availWidth y availHeight excluyen la barra de tareas del SO
        window.resizeTo(screen.availWidth, screen.availHeight);
      } catch (e) {
        console.warn('El navegador bloqueó el maximizado automático.');
      }
    }, 150);

    // 2. Evitar que se achique más del límite (con rebote suave)
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (window.outerWidth < MIN_WIDTH || window.outerHeight < MIN_HEIGHT) {
          try {
            window.resizeTo(
              Math.max(window.outerWidth, MIN_WIDTH),
              Math.max(window.outerHeight, MIN_HEIGHT)
            );
          } catch (e) {}
        }
      }, 500); // 500ms para que no pelee mientras arrastrás el mouse
    });
  };

  // ================= Init =================
  const init = () => {
    if (!window.MyHub) { setTimeout(init, 100); return; }

    setupPWA();
    hookThemeColor();
    inyectarEstilosStorage();
    setupStoragePanel();
    setupWindowBehavior(); // <--- Función actualizada

    console.log('%c[ExtraFunc] PWA + Storage + Ventana cargados', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();
