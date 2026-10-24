// ============================================================================
// ExtraFunc.js — Almacenamiento, controles de ventana y pantalla de entrada
// ============================================================================

(function() {
  'use strict';

  const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const esperar = (ms) => new Promise(r => setTimeout(r, ms));

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

  // ================= Pantalla de entrada: animación + contraseña =================
  // Solo aparece al ABRIR la página. Si es una recarga (F5, Ctrl+R o el atajo
  // de recargar), no hay animación ni contraseña.

  const esRecarga = () => {
    const nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    return !!nav && nav.type === 'reload';
  };

  // Espera a que el lobby termine de arrancar (ya existe el botón de "Nueva carpeta" del menú)
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

  const inyectarEstilosEntrada = () => {
    if (document.getElementById('myhub-entrada-style')) return;
    const style = document.createElement('style');
    style.id = 'myhub-entrada-style';
    style.textContent = `
      @keyframes mhLogo { from { transform: scale(.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      @keyframes mhFadeUp { from { transform: translateY(14px); opacity: 0; } to { transform: none; opacity: 1; } }
      @keyframes mhBar { from { width: 0; } to { width: 100%; } }
      @keyframes mhShake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
    `;
    document.head.appendChild(style);
  };

  const crearOverlay = (tema, nombre) => {
    const oscuro = tema.modo === 'oscuro';
    const acc = tema.color || '#2563eb';
    const ov = document.createElement('div');
    ov.id = 'myhub-entrada';
    ov.style.cssText = `
      position: fixed; inset: 0; z-index: 100000;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
      transition: opacity .6s ease; --mh-acc: ${acc};
      color: ${oscuro ? '#f4f4f6' : '#0b1220'};
      background-color: ${oscuro ? '#0b0b10' : '#f4f6fb'};
      background: ${oscuro
        ? `radial-gradient(ellipse at 30% 20%, ${acc}66, #0b0b10 70%)`
        : `radial-gradient(ellipse at 30% 20%, ${acc}40, #f4f6fb 70%)`};
      font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif;
    `;
    ov.innerHTML = `
      <div style="width:84px;height:84px;border-radius:24px;display:flex;align-items:center;justify-content:center;background:var(--mh-acc);box-shadow:0 18px 40px ${acc}66;animation:mhLogo .7s cubic-bezier(.2,.9,.3,1.15) both;">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 11 12 3l9 8"/><path d="M5 9.5V21h14V9.5"/><path d="M9 17v-5M15 17v-5M9 14.5h6"/>
        </svg>
      </div>
      <div style="font-size:22px;font-weight:700;letter-spacing:-.01em;animation:mhFadeUp .6s .3s both;">MyHubHestudio</div>
      <div class="mh-sub" style="font-size:13px;opacity:.7;animation:mhFadeUp .6s .45s both;">Iniciando…</div>
      <div class="mh-barra" style="width:220px;height:4px;border-radius:4px;overflow:hidden;background:${oscuro ? '#ffffff22' : '#00000018'};animation:mhFadeUp .4s .5s both;">
        <div style="height:100%;background:var(--mh-acc);animation:mhBar 1.2s .5s ease-in-out both;"></div>
      </div>
      <div class="mh-gate" style="display:none;flex-direction:column;align-items:center;gap:12px;width:280px;margin-top:8px;"></div>
    `;
    return ov;
  };

  const pedirContrasena = (ov, nombre) => new Promise(resolve => {
    const gate = ov.querySelector('.mh-gate');
    const inicial = (nombre || '?').trim().charAt(0).toUpperCase();
    gate.innerHTML = `
      <div style="width:64px;height:64px;border-radius:50%;background:var(--mh-acc);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;">${escHtml(inicial)}</div>
      <div style="font-size:15px;font-weight:600;">${escHtml(nombre)}</div>
      <input id="mh-pass" type="password" placeholder="Contraseña" autocomplete="current-password"
        style="width:100%;padding:11px 13px;border-radius:10px;border:1.5px solid #8884;background:#8881;color:inherit;font:inherit;font-size:14px;outline:none;text-align:center;">
      <button id="mh-entrar"
        style="width:100%;padding:11px;border:none;border-radius:10px;background:var(--mh-acc);color:#fff;font:inherit;font-weight:600;cursor:pointer;">Entrar</button>
      <div id="mh-error" style="min-height:18px;font-size:12px;color:#ef4444;"></div>
    `;
    const sub = ov.querySelector('.mh-sub'); if (sub) sub.style.display = 'none';
    const barra = ov.querySelector('.mh-barra'); if (barra) barra.style.display = 'none';
    gate.style.display = 'flex';
    gate.style.animation = 'mhFadeUp .5s both';

    const input = gate.querySelector('#mh-pass');
    const boton = gate.querySelector('#mh-entrar');
    const err = gate.querySelector('#mh-error');
    setTimeout(() => input.focus(), 50);

    const intentar = async () => {
      const pass = input.value;
      if (!pass) { err.textContent = 'Escribe tu contraseña'; return; }
      boton.disabled = true;
      const ok = await iniciarSesion(pass); // función del lobby: valida y reabre la sesión
      if (ok) { resolve(true); return; }
      err.textContent = 'Contraseña incorrecta';
      input.value = '';
      input.focus();
      boton.disabled = false;
      gate.style.animation = 'mhShake .45s';
      setTimeout(() => { gate.style.animation = ''; }, 500);
    };

    boton.onclick = intentar;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') intentar(); });
  });

  const cerrarOverlay = async (ov) => {
    ov.style.opacity = '0';
    await esperar(600);
    ov.remove();
  };

  const iniciarEntrada = async () => {
    await esperarLobby();

    const tieneCuenta = typeof cuentaActual !== 'undefined' && !!cuentaActual;
    const nombre = tieneCuenta ? cuentaActual.nombre : '';
    const tema = window.MyHub.tema();

    inyectarEstilosEntrada();

    // Con cuenta, el escritorio queda bloqueado hasta validar la contraseña
    if (tieneCuenta) {
      sesionActiva = false;
      refrescarEstado();
    }

    const ov = crearOverlay(tema, nombre);
    document.body.appendChild(ov);
    await esperar(1900);

    if (tieneCuenta) await pedirContrasena(ov, nombre);

    // Escritorio listo: se reconstruyen los widgets para que sus iframes carguen limpios
    if (window.renderWidgets) window.renderWidgets();
    refrescarEstado();
    await cerrarOverlay(ov);
    window.MyHub.toast(tieneCuenta ? `Bienvenido, ${nombre}` : 'Bienvenido a MyHubHestudio');
  };

  // ================= Init =================
  const init = () => {
    if (!window.MyHub) { setTimeout(init, 100); return; }

    inyectarEstilosStorage();
    setupStoragePanel();
    setupWindowControls();

    if (!esRecarga()) iniciarEntrada();

    console.log('%c[ExtraFunc] Extensiones cargadas al 100%', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();
