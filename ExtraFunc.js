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

  // ================= Reparador de contraseña (Salt) =================
  const repararSalt = () => {
    if (typeof cuentaActual !== 'undefined' && cuentaActual && cuentaActual.salt) {
      if (!(cuentaActual.salt instanceof Uint8Array)) {
        try {
          let values = [];
          if (Array.isArray(cuentaActual.salt)) {
            values = cuentaActual.salt;
          } else if (typeof cuentaActual.salt === 'object') {
            values = Object.values(cuentaActual.salt);
          }
          if (values.length > 0) {
            cuentaActual.salt = new Uint8Array(values);
            if (typeof kvSet === 'function') kvSet('cuenta', cuentaActual);
            console.log('%c[ExtraFunc] Salt reparado automáticamente', 'color: #f59e0b; font-weight: bold;');
          }
        } catch (e) {
          console.error('[ExtraFunc] Error reparando salt:', e);
        }
      }
    }
  };

  // ================= Animación de inicio =================
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
    repararSalt();

    if (typeof cuentaActual !== 'undefined' && cuentaActual && !sesionActiva) {
      sesionActiva = true;
      await kvSet('sesion', true);
    }
    if (typeof refrescarEstado === 'function') refrescarEstado();

    const pantalla = prepararPantalla(window.MyHub.tema());
    if (!pantalla) { document.body.classList.remove('cargando'); return; }

    const inicio = Date.now();

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

    console.log('%c[ExtraFunc] Extensiones base cargadas', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();


// ============================================================================
// ExtraFunc v7.0 — Snap Preview y Sistema de Backup
// ============================================================================
(function() {
  'use strict';

  const notify = (m) => {
    if (window.MyHub?.toast) window.MyHub.toast(m);
    else if (typeof window.toast === 'function') window.toast(m);
    else console.log('[MyHub]', m);
  };

  const refrescar = () => { if (window.lucide) window.lucide.createIcons(); };

  const inyectarEstilos = () => {
    if (document.getElementById('extrafunc-v7-style')) return;
    const style = document.createElement('style');
    style.id = 'extrafunc-v7-style';
    style.textContent = `
      /* Snap preview */
      .extrafunc-snap-preview {
        position: absolute; z-index: 4; border-radius: 16px;
        background: color-mix(in srgb, var(--accent) 14%, transparent);
        border: 2px dashed var(--accent); pointer-events: none;
        opacity: 0; visibility: hidden;
        transition: opacity 0.15s ease, visibility 0.15s ease, background 0.2s, border-color 0.2s;
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent);
      }
      .extrafunc-snap-preview.visible { opacity: 1; visibility: visible; }
      .extrafunc-snap-preview.occupied {
        background: color-mix(in srgb, #ef4444 14%, transparent);
        border-color: #ef4444;
        box-shadow: 0 0 0 1px color-mix(in srgb, #ef4444 22%, transparent);
      }
    `;
    document.head.appendChild(style);
  };

  // ==================== SNAP PREVIEW ====================
  let snapGhost = null;
  let dragStartPt = null;

  const getOrCreateGhost = () => {
    if (snapGhost && snapGhost.isConnected) return snapGhost;
    const deskEl = document.getElementById('desktop');
    if (!deskEl) return null;
    snapGhost = document.createElement('div');
    snapGhost.className = 'extrafunc-snap-preview';
    snapGhost.id = 'extrafunc-snap-preview';
    deskEl.appendChild(snapGhost);
    return snapGhost;
  };

  const updateSnapPreview = (cursorX, winEl) => {
    const deskEl = document.getElementById('desktop');
    if (!deskEl) return;

    const G = 18;
    const W = deskEl.clientWidth;
    const H = deskEl.clientHeight;
    const oneColW = (W - G * 4) / 3;

    const span = winEl.offsetWidth > oneColW * 1.5 ? 2 : 1;
    const dr = deskEl.getBoundingClientRect();
    const relX = cursorX - dr.left;

    let start;
    if (span === 2) start = relX < W / 2 ? 0 : 1;
    else start = Math.min(2, Math.max(0, Math.floor(relX / (W / 3))));

    const left = G + start * (oneColW + G);
    const width = span === 2 ? oneColW * 2 + G : oneColW;
    const top = G;
    const height = H - G * 2;

    const colsDestino = span === 2 ? [start, start + 1] : [start];
    let ocupado = false;
    document.querySelectorAll('.win:not(.dragging)').forEach(w => {
      if (w.style.display === 'none') return;
      const wLeft = parseFloat(w.style.left);
      if (isNaN(wLeft)) return;
      const wSpan = w.offsetWidth > oneColW * 1.5 ? 2 : 1;
      const wStart = Math.round((wLeft - G) / (oneColW + G));
      const wCols = wSpan === 2 ? [wStart, wStart + 1] : [wStart];
      if (wCols.some(c => colsDestino.includes(c))) ocupado = true;
    });

    const ghost = getOrCreateGhost();
    if (!ghost) return;
    ghost.style.left = left + 'px';
    ghost.style.top = top + 'px';
    ghost.style.width = width + 'px';
    ghost.style.height = height + 'px';
    ghost.classList.toggle('occupied', ocupado);
    ghost.classList.add('visible');
  };

  const hideSnapPreview = () => {
    if (snapGhost) snapGhost.classList.remove('visible');
  };

  const setupSnapPreview = () => {
    document.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.titlebar') && !e.target.closest('.close')) {
        dragStartPt = { x: e.clientX, y: e.clientY };
      }
    }, true);

    document.addEventListener('pointermove', (e) => {
      const dragging = document.querySelector('.win.dragging');
      if (!dragging || !dragStartPt) { hideSnapPreview(); return; }
      if (Math.abs(e.clientX - dragStartPt.x) < 5 && Math.abs(e.clientY - dragStartPt.y) < 5) return;
      updateSnapPreview(e.clientX, dragging);
    }, true);

    document.addEventListener('pointerup', () => { hideSnapPreview(); dragStartPt = null; }, true);
    document.addEventListener('pointercancel', () => { hideSnapPreview(); dragStartPt = null; }, true);
  };

  // ==================== BACKUP INTERCEPTOR ====================
  const serializeBlobs = async (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof Blob) {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(obj);
      });
      return { __type: 'blob', data: base64, mime: obj.type };
    }
    if (obj instanceof Uint8Array) {
      return { __type: 'uint8array', data: Array.from(obj) };
    }
    if (Array.isArray(obj)) {
      const arr = [];
      for (const item of obj) arr.push(await serializeBlobs(item));
      return arr;
    }
    if (typeof obj === 'object') {
      const newObj = {};
      for (const [k, v] of Object.entries(obj)) {
        newObj[k] = await serializeBlobs(v);
      }
      return newObj;
    }
    return obj;
  };

  const deserializeBlobs = async (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (obj.__type === 'blob' && obj.data) {
      try {
        const res = await fetch(obj.data);
        return await res.blob();
      } catch (e) { return null; }
    }
    if (obj.__type === 'uint8array' && obj.data) {
      return new Uint8Array(obj.data);
    }
    if (Array.isArray(obj)) {
      const arr = [];
      for (const item of obj) arr.push(await deserializeBlobs(item));
      return arr;
    }
    if (typeof obj === 'object') {
      const newObj = {};
      for (const [k, v] of Object.entries(obj)) {
        newObj[k] = await deserializeBlobs(v);
      }
      return newObj;
    }
    return obj;
  };

  const procesarBackup = async (rawData) => {
    const data = await deserializeBlobs(rawData);
    
    if (data.cuenta && data.cuenta.salt) {
      try {
        if (Array.isArray(data.cuenta.salt)) {
          data.cuenta.salt = new Uint8Array(data.cuenta.salt);
        } else if (typeof data.cuenta.salt === 'object' && !(data.cuenta.salt instanceof Uint8Array)) {
          data.cuenta.salt = new Uint8Array(Object.values(data.cuenta.salt));
        }
      } catch (e) {
        console.error('Error al reparar salt en importación:', e);
      }
    }

    const imports = [
      ['apps_instaladas',   data.apps_instaladas],
      ['carpetas',          data.carpetas],
      ['ajustes',           data.ajustes],
      ['cuenta',            data.cuenta],
      ['posiciones_iconos', data.posiciones_iconos],
      ['widgets_activos',   data.widgets_activos],
      ['pinned_apps',       data.pinned_apps]
    ];

    for (const [key, value] of imports) {
      if (value !== undefined && value !== null) {
        await window.kvSet(key, value);
      }
    }
  };

  const setupBackupIntercept = () => {
    const modalEl = document.getElementById('modal');
    if (!modalEl) return;

    const intercept = () => {
      const btnExport = document.getElementById('cfg-btn-export');
      if (btnExport && !btnExport.dataset.intercepted) {
        btnExport.dataset.intercepted = 'true';
        btnExport.onclick = async (e) => {
          e.preventDefault();
          e.stopPropagation();
          notify('Empaquetando datos...');
          
          try {
            const apps = await window.kvGet('apps_instaladas') || {};
            const carpetas = await window.kvGet('carpetas') || {};
            const ajustes = await window.kvGet('ajustes') || {};
            const cuenta = await window.kvGet('cuenta') || null;
            const posiciones = await window.kvGet('posiciones_iconos') || {};
            const widgets = window.widgetsActivos || [];
            const pinned = await window.kvGet('pinned_apps') || [];

            const backup = {
              _myhub_version: 2,
              apps_instaladas: await serializeBlobs(apps),
              carpetas: await serializeBlobs(carpetas),
              ajustes: await serializeBlobs(ajustes),
              cuenta: await serializeBlobs(cuenta),
              posiciones_iconos: await serializeBlobs(posiciones),
              widgets_activos: await serializeBlobs(widgets),
              pinned_apps: await serializeBlobs(pinned)
            };

            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `MyHub_Backup_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            notify('Copia de seguridad guardada');
          } catch (err) {
            console.error('[Export]', err);
            notify('Error al exportar');
          }
        };
      }

      const fileInputImport = document.getElementById('cfg-input-import');
      if (fileInputImport && !fileInputImport.dataset.intercepted) {
        fileInputImport.dataset.intercepted = 'true';
        fileInputImport.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              notify('Restaurando...');
              const rawData = JSON.parse(ev.target.result);
              await procesarBackup(rawData);
              notify('Datos importados. Recargando...');
              setTimeout(() => location.reload(), 1500);
            } catch (err) {
              console.error('[Import]', err);
              notify('Error al importar: Archivo inválido');
            }
          };
          reader.readAsText(file);
        };
      }
    };

    const obs = new MutationObserver(intercept);
    obs.observe(modalEl, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  };

  // ==================== RESTORE (Sin cuenta) ====================
  const abrirRestaurar = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await procesarBackup(data);
        notify('Datos restaurados. Reiniciando...');
        setTimeout(() => location.reload(), 1000);
      } catch (err) {
        console.error('[Restore] Error:', err);
        notify('Archivo inválido o error al cargar');
      }
    };
    input.click();
  };

  const inyectarBotonRestaurar = () => {
    const bloqueo = document.getElementById('bloqueo');
    if (!bloqueo) return;

    if (bloqueo.classList.contains('hidden')) {
      document.getElementById('extrafunc-restore-btn')?.remove();
      return;
    }

    const hayCuenta = typeof cuentaActual !== 'undefined' && !!cuentaActual;
    if (hayCuenta) {
      document.getElementById('extrafunc-restore-btn')?.remove();
      return;
    }

    if (document.getElementById('extrafunc-restore-btn')) return;

    const caja = bloqueo.querySelector('.bloqueo-caja');
    const bloqueoBtn = document.getElementById('bloqueoBtn');
    if (!caja || !bloqueoBtn) return;

    const restoreBtn = document.createElement('button');
    restoreBtn.id = 'extrafunc-restore-btn';
    restoreBtn.className = 'btn gray';
    restoreBtn.style.cssText = 'width:100%;margin-top:4px;';
    restoreBtn.innerHTML = '<i data-lucide="upload"></i>Restaurar desde backup';
    restoreBtn.onclick = abrirRestaurar;

    bloqueoBtn.insertAdjacentElement('afterend', restoreBtn);
    refrescar();
  };

  const setupRestoreOption = () => {
    const bloqueo = document.getElementById('bloqueo');
    if (!bloqueo) { setTimeout(setupRestoreOption, 200); return; }

    inyectarBotonRestaurar();

    const obs = new MutationObserver(() => inyectarBotonRestaurar());
    obs.observe(bloqueo, { attributes: true, attributeFilter: ['class'] });

    const btn = document.getElementById('bloqueoBtn');
    if (btn) {
      const obsBtn = new MutationObserver(() => inyectarBotonRestaurar());
      obsBtn.observe(btn, { childList: true, characterData: true, subtree: true });
    }
  };

  // ==================== INIT ====================
  const init = () => {
    if (!window.MyHub) { setTimeout(init, 100); return; }

    inyectarEstilos();

    try { setupSnapPreview(); }       catch (e) { console.error(e); }
    try { setupRestoreOption(); }     catch (e) { console.error(e); }
    try { setupBackupIntercept(); }   catch (e) { console.error(e); }

    console.log('%c[ExtraFunc v7.0] Snap Preview y Sistema de Backup listos', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();


// ============================================================================
// ExtraFunc v8.0 — MODO BLOQUEO (Lock Screen)
// ----------------------------------------------------------------------------
// Cuando el usuario cierra sesión (o recarga la página con la sesión cerrada),
// en lugar de mostrar un simple cartel de "Iniciar sesión", el sistema se
// transforma en una auténtica Pantalla de Bloqueo (estilo Windows/macOS).
// Muestra el avatar, el nombre y permite desbloquear sin abrir ventanas modales.
// ============================================================================
(function() {
  'use strict';

  const notify = (m) => { if (window.MyHub?.toast) window.MyHub.toast(m); };
  const refrescar = () => { if (window.lucide) window.lucide.createIcons(); };

  const inyectarEstilosLock = () => {
    if (document.getElementById('extrafunc-lock-style')) return;
    const style = document.createElement('style');
    style.id = 'extrafunc-lock-style';
    style.textContent = `
      /* Estilos para la Pantalla de Bloqueo */
      .bloqueo-caja.lock-mode {
        background: var(--glass);
        border: 2px solid var(--accent);
        border-radius: 26px;
        padding: 38px 40px 34px;
        box-shadow: var(--shadow-xl);
        backdrop-filter: blur(24px) saturate(1.6);
        -webkit-backdrop-filter: blur(24px) saturate(1.6);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        width: 340px;
        max-width: 90vw;
        animation: scaleIn .3s var(--ease-out);
      }
      .lock-avatar {
        width: 86px; height: 86px; border-radius: 50%;
        object-fit: cover;
        border: 3px solid var(--accent);
        box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 40%, transparent);
        margin-bottom: 6px;
        background: var(--field);
        display: flex; align-items: center; justify-content: center;
        color: var(--muted);
      }
      .lock-avatar svg { width: 36px; height: 36px; }
      .lock-input-wrap {
        display: flex; gap: 8px; width: 100%; margin-top: 10px;
      }
      .lock-input-wrap input {
        flex: 1; margin: 0 !important;
        padding: 10px 14px !important;
        border-radius: 10px !important;
        border: 1.5px solid var(--line) !important;
        background: var(--field) !important;
        color: var(--text) !important;
        font-size: 14px !important;
      }
      .lock-input-wrap input:focus {
        border-color: var(--accent) !important;
        box-shadow: 0 0 0 3px var(--accent-soft) !important;
      }
      .lock-input-wrap button {
        padding: 0 16px; border-radius: 10px; border: none;
        background: var(--accent); color: #fff;
        cursor: pointer; font-weight: 600; font-size: 13px;
        transition: filter 0.2s, transform 0.1s;
        display: flex; align-items: center; justify-content: center;
      }
      .lock-input-wrap button:hover { filter: brightness(1.1); }
      .lock-input-wrap button:active { transform: scale(0.95); }
      .lock-error {
        color: #ef4444; font-size: 12px; font-weight: 600;
        margin-top: 4px; min-height: 18px;
        opacity: 0; transition: opacity 0.2s;
      }
      .lock-error.show { opacity: 1; }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
        20%, 40%, 60%, 80% { transform: translateX(4px); }
      }
      .shake { animation: shake 0.4s ease; }
    `;
    document.head.appendChild(style);
  };

  const setupLockScreen = () => {
    const bloqueo = document.getElementById('bloqueo');
    if (!bloqueo) return;

    const checkAndInject = () => {
      if (bloqueo.classList.contains('hidden')) return;
      
      const hasAccount = typeof cuentaActual !== 'undefined' && !!cuentaActual;
      if (!hasAccount) return; // Es un "Crear cuenta", no hacemos nada.

      const caja = bloqueo.querySelector('.bloqueo-caja');
      if (!caja) return;

      // Si ya está inyectado, solo enfocamos
      if (document.getElementById('lock-pass')) {
        document.getElementById('lock-pass').focus();
        return;
      }

      caja.classList.add('lock-mode');

      const iconoDefault = caja.querySelector('.bloqueo-icono');
      if (iconoDefault) iconoDefault.style.display = 'none';

      const titulo = caja.querySelector('#bloqueoTitulo');
      const texto = caja.querySelector('#bloqueoTexto');
      const btnDefault = caja.querySelector('#bloqueoBtn');

      if (btnDefault) btnDefault.style.display = 'none';

      if (titulo) titulo.textContent = 'Pantalla Bloqueada';
      if (texto) texto.innerHTML = `Hola, <b>${cuentaActual.nombre}</b>.<br>Introduce tu contraseña para desbloquear.`;

      let avatarHTML = `<div class="lock-avatar"><i data-lucide="user-round"></i></div>`;
      if (cuentaActual.foto instanceof Blob) {
        const url = URL.createObjectURL(cuentaActual.foto);
        avatarHTML = `<img src="${url}" class="lock-avatar" alt="Avatar">`;
      }

      const avatarWrap = document.createElement('div');
      avatarWrap.innerHTML = avatarHTML;
      const avatarEl = avatarWrap.firstElementChild;
      if (titulo) caja.insertBefore(avatarEl, titulo);
      else caja.insertBefore(avatarEl, caja.firstChild);

      const inputWrap = document.createElement('div');
      inputWrap.className = 'lock-input-wrap';
      inputWrap.innerHTML = `
        <input type="password" id="lock-pass" placeholder="Contraseña" autocomplete="current-password">
        <button id="lock-btn"><i data-lucide="unlock"></i></button>
      `;
      caja.appendChild(inputWrap);

      const errorEl = document.createElement('div');
      errorEl.className = 'lock-error';
      errorEl.id = 'lock-error';
      errorEl.textContent = 'Contraseña incorrecta';
      caja.appendChild(errorEl);

      refrescar();

      const passInput = inputWrap.querySelector('#lock-pass');
      const unlockBtn = inputWrap.querySelector('#lock-btn');

      const intentarDesbloquear = async () => {
        const pass = passInput.value;
        if (!pass) return;

        unlockBtn.innerHTML = '<i data-lucide="loader-2" style="animation: spin 1s linear infinite;"></i>';
        refrescar();

        const fnIniciar = window.iniciarSesion || iniciarSesion;
        const ok = await fnIniciar(pass);

        if (ok) {
          caja.classList.remove('lock-mode');
          bloqueo.classList.add('hidden');
          if (typeof refrescarEstado === 'function') refrescarEstado();
          notify('Sesión desbloqueada');
          passInput.value = '';
        } else {
          errorEl.classList.add('show');
          inputWrap.classList.add('shake');
          setTimeout(() => inputWrap.classList.remove('shake'), 400);
          unlockBtn.innerHTML = '<i data-lucide="unlock"></i>';
          refrescar();
          passInput.value = '';
          passInput.focus();
        }
      };

      unlockBtn.addEventListener('click', intentarDesbloquear);
      passInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') intentarDesbloquear();
      });

      setTimeout(() => passInput.focus(), 100);
    };

    checkAndInject();
    const observer = new MutationObserver(checkAndInject);
    observer.observe(bloqueo, { attributes: true, attributeFilter: ['class'] });
  };

  const init = () => {
    if (!window.MyHub) { setTimeout(init, 100); return; }
    
    inyectarEstilosLock();
    
    const interval = setInterval(() => {
      if (typeof cuentaActual !== 'undefined' && typeof sesionActiva !== 'undefined') {
        clearInterval(interval);
        setupLockScreen();
        console.log('%c[ExtraFunc v8.0] Modo Bloqueo (Lock Screen) inyectado correctamente', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
      }
    }, 100);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();
