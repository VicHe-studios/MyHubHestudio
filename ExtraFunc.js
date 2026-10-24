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

  const inyectarEstilosInicio = () => {
    if (document.getElementById('myhub-inicio-style')) return;
    const style = document.createElement('style');
    style.id = 'myhub-inicio-style';
    style.textContent = `
      @keyframes mhPop { 0% { transform: scale(.3) rotate(-14deg); opacity: 0; } 60% { transform: scale(1.08) rotate(3deg); opacity: 1; } 100% { transform: none; opacity: 1; } }
      @keyframes mhSpin { to { transform: rotate(360deg); } }
      @keyframes mhFadeUp { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
      @keyframes mhFill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes mhBreath { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
    `;
    document.head.appendChild(style);
  };

  const crearPantallaInicio = (tema) => {
    const oscuro = tema.modo === 'oscuro';
    const acc = tema.color || '#2563eb';
    const fondo = oscuro ? '#0b0b10' : '#f4f6fb';
    const texto = oscuro ? '#f4f4f6' : '#0b1220';
    // Todo opaco: color-mix mezcla el acento con el fondo sin transparencias
    const centro = `color-mix(in srgb, ${acc} ${oscuro ? '45%' : '28%'}, ${fondo})`;
    const pista = oscuro ? '#ffffff1f' : '#00000014';

    const ov = document.createElement('div');
    ov.id = 'myhub-inicio';
    ov.style.cssText = `
      position: fixed; inset: 0; z-index: 100000;
      display: flex; align-items: center; justify-content: center;
      background-color: ${fondo};
      background-image: radial-gradient(circle at 50% 42%, ${centro} 0%, ${fondo} 62%);
      color: ${texto};
      font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif;
      transition: opacity .7s ease;
    `;
    ov.innerHTML = `
      <div class="mh-nucleo" style="display:flex;flex-direction:column;align-items:center;gap:22px;transition:transform .7s ease;">
        <div style="position:relative;width:128px;height:128px;display:flex;align-items:center;justify-content:center;">
          <svg viewBox="0 0 128 128" style="position:absolute;inset:0;width:128px;height:128px;animation:mhSpin 1.6s linear infinite;">
            <circle cx="64" cy="64" r="60" fill="none" stroke-width="3" stroke-linecap="round"
              stroke-dasharray="95 282" style="stroke:${acc};"/>
          </svg>
          <div style="width:88px;height:88px;border-radius:28px;background:${acc};display:flex;align-items:center;justify-content:center;box-shadow:0 18px 40px ${acc}66;animation:mhPop .8s cubic-bezier(.2,.9,.3,1.15) both, mhBreath 2.4s 1s ease-in-out infinite;">
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 11 12 3l9 8"/><path d="M5 9.5V21h14V9.5"/><path d="M9 17v-5M15 17v-5M9 14.5h6"/>
            </svg>
          </div>
        </div>
        <div style="font-size:22px;font-weight:700;letter-spacing:.02em;animation:mhFadeUp .7s .35s both;">MyHubHestudio</div>
        <div style="width:240px;height:4px;border-radius:4px;overflow:hidden;background:${pista};animation:mhFadeUp .5s .5s both;">
          <div style="height:100%;width:100%;background:${acc};transform-origin:left center;animation:mhFill ${DURACION_INICIO}ms cubic-bezier(.4,0,.2,1) both;"></div>
        </div>
      </div>
    `;
    return ov;
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

    inyectarEstilosInicio();

    // Ocultar el escritorio y la barra mientras dura la animación
    const escritorio = document.getElementById('desktop');
    const barra = document.getElementById('taskbar');
    if (escritorio) escritorio.style.visibility = 'hidden';
    if (barra) barra.style.visibility = 'hidden';

    const pantalla = crearPantallaInicio(window.MyHub.tema());
    document.body.appendChild(pantalla);

    const inicio = Date.now();

    // Reiniciar los widgets para que sus iframes carguen siempre limpios
    if (window.renderWidgets) window.renderWidgets();
    await esperarWidgets();

    const transcurrido = Date.now() - inicio;
    if (transcurrido < DURACION_INICIO) await esperar(DURACION_INICIO - transcurrido);

    if (escritorio) escritorio.style.visibility = '';
    if (barra) barra.style.visibility = '';

    pantalla.style.opacity = '0';
    pantalla.querySelector('.mh-nucleo').style.transform = 'scale(1.05)';
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
