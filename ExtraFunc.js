// ============================================================================
// ExtraFunc.js — Almacenamiento, controles de ventana y animación de inicio
// ============================================================================

(function() {
  'use strict';

  const esperar = (ms) => new Promise(r => setTimeout(r, ms));
  const DURACION_INICIO = 2200; // ms: duración mínima de la animación

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

  // ================= Nuevos botones de ventana (recargar y agrandar) =================
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

            // Botón Agrandar: el sistema de ventanas decide el espacio (2 columnas)
            const expandBtn = document.createElement('button');
            expandBtn.className = 'close expand-btn';
            expandBtn.title = 'Agrandar (2 espacios)';
            expandBtn.innerHTML = '<i data-lucide="maximize-2"></i>';
            expandBtn.onclick = (e) => {
              e.stopPropagation();
              if (!window.MyHub.alternarExpansion(appId)) return;
              const expandida = window.MyHub.estaExpandida(appId);
              expandBtn.innerHTML = `<i data-lucide="${expandida ? 'minimize-2' : 'maximize-2'}"></i>`;
              expandBtn.title = expandida ? 'Restaurar tamaño' : 'Agrandar (2 espacios)';
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

  // ================= Animación de inicio (al abrir y al recargar) =================
  // Totalmente opaca: se tapa el escritorio mientras se reinician los widgets.

  // La pantalla de inicio vive en index.html (se pinta antes que todo).
  // Aquí solo se aplican los colores actuales y se guardan para la próxima carga.
  const prepararPantalla = (tema) => {
    const root = document.documentElement;
    const oscuro = tema.modo === 'oscuro';
    root.style.setProperty('--mh-acc', tema.color || '#2563eb');
    root.style.setProperty('--mh-fondo', oscuro ? '#0b0b10' : '#f4f6fb');
    root.style.setProperty('--mh-texto', oscuro ? '#f4f4f6' : '#0b1220');
    root.style.setProperty('--mh-pista', oscuro ? '#ffffff1f' : '#00000014');
    root.style.setProperty('--mh-pct', oscuro ? '45%' : '28%');
    try { localStorage.setItem('myhub_tema', JSON.stringify({ color: tema.color, modo: tema.modo })); } catch (e) {}
    return document.getElementById('myhub-inicio');
  };

  // Espera a que los widgets terminen de cargar (con tope de tiempo)
  const esperarWidgets = () => new Promise(resolve => {
    const frames = [...document.querySelectorAll('.widget-container iframe')];
    if (frames.length === 0) return resolve();
    let pendientes = frames.length;
    const hecho = () => { if (--pendientes <= 0) resolve(); };
    frames.forEach(f => f.addEventListener('load', hecho, { once: true }));
    setTimeout(resolve, 2000);
  });

  const esperarLobby = () => new Promise(resolve => {
    let intentos = 0;
    const t = setInterval(() => {
      intentos++;
      if (document.getElementById('menu-nueva-carpeta') || intentos > 100) {
        clearInterval(t);
        resolve();
      }
    }, 50);
  });

  const iniciarAnimacion = async () => {
    await esperarLobby();

    // Sin pantalla de bloqueo: la sesión se abre sola al arrancar
    if (typeof cuentaActual !== 'undefined' && cuentaActual && !sesionActiva) {
      sesionActiva = true;
      await kvSet('sesion', true);
    }
    if (typeof refrescarEstado === 'function') refrescarEstado();

    const pantalla = prepararPantalla(window.MyHub.tema());
    if (!pantalla) { document.body.classList.remove('cargando'); return; }

    const inicio = Date.now();

    // Reiniciar los widgets para que sus iframes carguen siempre limpios
    if (window.renderWidgets) window.renderWidgets();
    await esperarWidgets();

    const transcurrido = Date.now() - inicio;
    if (transcurrido < DURACION_INICIO) await esperar(DURACION_INICIO - transcurrido);

    document.body.classList.remove('cargando');

    pantalla.classList.add('salir');
    await esperar(700);
    pantalla.remove();
  };

  // ================= Init =================
  const init = () => {
    if (!window.MyHub) { setTimeout(init, 100); return; }

    inyectarEstilosStorage();
    setupStoragePanel();
    setupWindowControls();

    iniciarAnimacion();

    console.log('%c[ExtraFunc] Extensiones cargadas al 100%', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();
