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

  // ================= Ocultar botón de Cerrar Sesión =================
  const ocultarCerrarSesion = () => {
    const modalEl = document.getElementById('modal');
    const mTitulo = document.getElementById('mTitulo');
    if (!modalEl || !mTitulo) return;
    
    const observer = new MutationObserver(() => {
      if (mTitulo.textContent === 'Mi cuenta') {
        const perfil = modalEl.querySelector('.perfil');
        if (perfil) {
          const btnSalir = Array.from(perfil.querySelectorAll('button')).find(b => b.textContent.includes('Cerrar sesión'));
          if (btnSalir) btnSalir.style.display = 'none';
        }
      }
    });
    observer.observe(modalEl, { subtree: true, childList: true, characterData: true });
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
    ocultarCerrarSesion();

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
// ExtraFunc v9.0 — Snap Preview y Sistema de Backup (con FIX 2 integrado)
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
    if (document.getElementById('extrafunc-v9-style')) return;
    const style = document.createElement('style');
    style.id = 'extrafunc-v9-style';
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

  // ==================== MOTOR DE WIDGETS (CON FIX 2) ====================
  const MARGEN = (typeof MARGEN_ICONOS !== 'undefined') ? MARGEN_ICONOS : 16;
  const GX = (typeof GRID_X !== 'undefined') ? GRID_X : 82;
  const GY = (typeof GRID_Y !== 'undefined') ? GRID_Y : 108;
  const GRID_COLS = (typeof window.GRID_COLS !== 'undefined') ? window.GRID_COLS : 16;
  const GRID_ROWS = (typeof window.GRID_ROWS !== 'undefined') ? window.GRID_ROWS : 5;
  const WIDGET_SIZES = (typeof window.WIDGET_SIZES !== 'undefined') ? window.WIDGET_SIZES : {
    '1x1': { w: GX - 2, h: GY - 8, cols: 1, rows: 1 },
    '2x1': { w: GX * 2 - 2, h: GY - 8, cols: 2, rows: 1 },
    '2x2': { w: GX * 2 - 2, h: GY * 2 - 8, cols: 2, rows: 2 }
  };

  const guardarWidgets = async () => {
    if (typeof window.kvSet === 'function') await window.kvSet('widgets_activos', window.widgetsActivos);
  };

  const findClosestFreeSpot = (size, targetLeft, targetTop, excludeWidget) => {
    const ws = WIDGET_SIZES[size] || WIDGET_SIZES['1x1'];
    const maxRows = GRID_ROWS, maxCols = GRID_COLS;

    const ocupadas = new Set();
    
    // Leer del DOM las celdas ocupadas por iconos (apps y carpetas)
    document.querySelectorAll('.icon').forEach(icon => {
      const l = parseFloat(icon.style.left);
      const t = parseFloat(icon.style.top);
      if (!isNaN(l) && !isNaN(t)) {
        const c = Math.round((l - MARGEN) / GX);
        const r = Math.round((t - MARGEN) / GY);
        ocupadas.add(`${c}-${r}`);
      }
    });

    if (typeof carpetas !== 'undefined' && carpetas) {
      Object.values(carpetas).forEach(f => {
        if (!f || !f.pos) return;
        const c = Math.round((parseFloat(f.pos.left) - MARGEN) / GX);
        const r = Math.round((parseFloat(f.pos.top) - MARGEN) / GY);
        if (!isNaN(c) && !isNaN(r)) ocupadas.add(`${c}-${r}`);
      });
    }

    if (typeof posicionesIconos !== 'undefined') {
      Object.values(posicionesIconos).forEach(pos => {
        if (!pos) return;
        const c = Math.round((parseFloat(pos.left) - MARGEN) / GX);
        const r = Math.round((parseFloat(pos.top) - MARGEN) / GY);
        if (!isNaN(c) && !isNaN(r)) ocupadas.add(`${c}-${r}`);
      });
    }

    window.widgetsActivos.forEach(w => {
      if (w === excludeWidget) return;
      if (!w.pos) return;
      const wc = Math.round((parseFloat(w.pos.left) - MARGEN) / GX);
      const wr = Math.round((parseFloat(w.pos.top) - MARGEN) / GY);
      const wsize = WIDGET_SIZES[w.size] || WIDGET_SIZES['1x1'];
      for (let i = 0; i < wsize.cols; i++) {
        for (let j = 0; j < wsize.rows; j++) {
          ocupadas.add(`${wc + i}-${wr + j}`);
        }
      }
    });

    const targetCol = Math.round((targetLeft - MARGEN) / GX);
    const targetRow = Math.round((targetTop - MARGEN) / GY);

    let bestSpot = null;
    let minDist = Infinity;

    for (let r = 0; r + ws.rows <= maxRows; r++) {
      for (let c = 0; c + ws.cols <= maxCols; c++) {
        let libre = true;
        for (let i = 0; i < ws.cols; i++) {
          for (let j = 0; j < ws.rows; j++) {
            if (ocupadas.has(`${c + i}-${r + j}`)) { libre = false; break; }
          }
          if (!libre) break;
        }
        if (libre) {
          const dist = Math.abs(c - targetCol) + Math.abs(r - targetRow);
          if (dist < minDist) {
            minDist = dist;
            bestSpot = { left: `${c * GX + MARGEN}px`, top: `${r * GY + MARGEN}px` };
          }
        }
      }
    }
    return bestSpot || null;
  };

  const checkCollision = (rect1, rect2) => {
    return !(rect1.right <= rect2.left || rect1.left >= rect2.right || rect1.bottom <= rect2.top || rect1.top >= rect2.bottom);
  };

  const buscarArchivo = (archivos, ruta) => {
    if (!archivos) return null;
    if (archivos[ruta] !== undefined) return archivos[ruta];
    const norm = s => String(s).split(String.fromCharCode(92)).join('/').replace(/^[.]?[/]/, '').toLowerCase();
    const objetivo = norm(ruta);
    const base = objetivo.split('/').pop();
    const claves = Object.keys(archivos);
    const exacta = claves.find(k => norm(k) === objetivo);
    if (exacta) return archivos[exacta];
    const porNombre = claves.find(k => norm(k).split('/').pop() === base);
    return porNombre ? archivos[porNombre] : null;
  };

  const toBlobSeguro = (v) => {
    if (v instanceof Blob) return v;
    if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) return new Blob([v], { type: 'text/html' });
    if (typeof v === 'string') return new Blob([v], { type: 'text/html' });
    return null;
  };

  const refrescarArchivosApp = async (id) => {
    const apps = (await window.kvGet('apps_instaladas')) || {};
    const guardada = apps[id];
    const app = registro.get(id);
    if (!guardada || !guardada.archivos || !app) return false;
    app.archivos = guardada.archivos;
    return true;
  };

  window.renderWidgets = () => {
    let layer = document.getElementById('widgets-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'widgets-layer';
      layer.style.cssText = 'position:absolute; inset:0; pointer-events:none;';
      document.getElementById('desktop').prepend(layer);
    }
    layer.innerHTML = '';

    window.widgetsActivos.forEach(w => {
     try {
      const el = document.createElement('div');
      el.className = 'widget-container';

      const ws = WIDGET_SIZES[w.size] || WIDGET_SIZES['1x1'];

      const topeW = MARGEN + (GRID_ROWS - ws.rows) * GY;
      const topRaw = parseFloat(w.pos?.top);
      const topFinal = Math.max(MARGEN, Math.min(isNaN(topRaw) ? 16 : topRaw, topeW));
      el.style.cssText = `
        position: absolute; left: ${w.pos?.left || '116px'}; top: ${topFinal}px;
        width: ${ws.w}px; height: ${ws.h}px; pointer-events: auto;
        border-radius: 16px; background: var(--glass); backdrop-filter: blur(20px);
        border: 1.5px solid var(--accent-line); box-shadow: var(--shadow-md);
        overflow: hidden; transition: transform .2s, box-shadow .2s;
        cursor: grab; user-select: none; -webkit-user-select: none;
      `;

      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof mostrarContexto === 'function') {
          mostrarContexto(e.clientX, e.clientY, [
            { icon: 'trash-2', text: 'Eliminar Widget', danger: true, fn: () => {
              window.widgetsActivos = window.widgetsActivos.filter(item => item !== w);
              guardarWidgets();
              window.renderWidgets();
              window.MyHub.toast('Widget eliminado');
            }}
          ]);
        }
      });

      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:100%; height:100%; border:none; background:transparent; pointer-events: none; user-select: none; -webkit-user-drag: none;';

      const app = registro.get(w.id);
      const blobWidget = app && app.archivos ? toBlobSeguro(buscarArchivo(app.archivos, w.file)) : null;
      if (blobWidget) {
        const blob = blobWidget;
        const reader = new FileReader();
        reader.onload = (e) => {
          let html = e.target.result;

          const themeInjection = `
            <script src="https://unpkg.com/lucide@latest"><\/script>
            <script>
              (function() {
                function applyTheme(color, modo) {
                  document.documentElement.dataset.modo = modo || 'claro';
                  document.documentElement.style.setProperty('--accent', color || '#2563eb');
                  const hex = (color || '#2563eb').replace('#', '');
                  if (hex.length === 6) {
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    document.documentElement.style.setProperty('--accent-soft', 'rgba(' + r + ', ' + g + ', ' + b + ', 0.15)');
                  }
                }
                applyTheme(
                  '${(typeof COLORES !== 'undefined' && COLORES[ajustes.color]) || '#2563eb'}',
                  '${ajustes.modo || 'claro'}'
                );
                window.addEventListener('message', function(ev) {
                  if (ev.data && ev.data.type === 'myhub:tema:res') {
                    applyTheme(ev.data.color, ev.data.modo);
                  }
                });
              })();
            <\/script>
          `;

          if (w.file.endsWith('.js')) {
            html = `<html><head><style>body{margin:0;color:var(--text);font-family:sans-serif;}</style>${themeInjection}</head><body><script>${html}<\/script></body></html>`;
          } else {
            html = html.replace('</head>', `${themeInjection}</head>`);
          }
          iframe.srcdoc = html;
        };
        reader.readAsText(blob);
      } else {
        if (app && app.instalada) {
          window._reintentoWidget = window._reintentoWidget || {};
          if (!window._reintentoWidget[w.id]) {
            window._reintentoWidget[w.id] = true;
            refrescarArchivosApp(w.id).then(ok => { if (ok) window.renderWidgets(); });
          }
        }
        iframe.srcdoc = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#ef4444; font-size:12px; text-align:center; padding:10px; box-sizing:border-box;"><b>Error: Widget no encontrado</b><br><small style="opacity:0.7">${w.file}</small></div>`;
      }

      iframe.addEventListener('load', () => {
        try {
          iframe.contentWindow.postMessage({
            type: 'myhub:tema:res',
            color: (typeof COLORES !== 'undefined' && COLORES[ajustes.color]) || '#2563eb',
            modo: ajustes.modo || 'claro'
          }, '*');
        } catch(e) {}
      });

      el.appendChild(iframe);
      hacerArrastrableWidget(el, w);
      layer.appendChild(el);
     } catch (err) {
      console.error('[Widget] no se pudo dibujar', w.id, w.file, err);
     }
    });
  };

  const hacerArrastrableWidget = (el, widgetData) => {
    let isDragging = false, startX, startY, startLeft, startTop;

    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();

      isDragging = false;
      el.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY;
      startLeft = parseFloat(el.style.left); startTop = parseFloat(el.style.top);

      el.style.transition = 'none';
      el.style.zIndex = '999';
      el.style.transform = 'scale(1.02)';
      el.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';

      const mover = (ev) => {
        if (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3) isDragging = true;
        if (!isDragging) return;
        el.style.left = (startLeft + ev.clientX - startX) + 'px';
        el.style.top = (startTop + ev.clientY - startY) + 'px';
      };

      const soltar = () => {
        window.removeEventListener('pointermove', mover);
        window.removeEventListener('pointerup', soltar);

        if (isDragging) {
          let snapX = Math.round((parseFloat(el.style.left) - MARGEN) / GX) * GX + MARGEN;
          let snapY = Math.round((parseFloat(el.style.top) - MARGEN) / GY) * GY + MARGEN;

          const deskEl = document.getElementById('desktop');
          const wW = el.offsetWidth;
          const wH = el.offsetHeight;

          const wsDrop = WIDGET_SIZES[widgetData.size] || WIDGET_SIZES['1x1'];
          snapX = Math.max(MARGEN, Math.min(snapX, MARGEN + (GRID_COLS - wsDrop.cols) * GX));
          const topeFila = MARGEN + (GRID_ROWS - wsDrop.rows) * GY;
          snapY = Math.max(MARGEN, Math.min(snapY, topeFila));

          el.style.left = snapX + 'px';
          el.style.top = snapY + 'px';

          const snapRect = el.getBoundingClientRect();
          let colision = false;

          // Comprobar colisión con .icon (apps y carpetas)
          document.querySelectorAll('.icon').forEach(icon => {
            if (checkCollision(snapRect, icon.getBoundingClientRect())) colision = true;
          });

          // Comprobar colisión con otros widgets
          if (!colision) {
            document.querySelectorAll('.widget-container').forEach(other => {
              if (other === el) return;
              if (checkCollision(snapRect, other.getBoundingClientRect())) colision = true;
            });
          }

          if (colision) {
            // Igual que en las apps: rechazar movimiento y volver al origen
            el.style.transition = 'left .3s var(--ease-spring), top .3s var(--ease-spring)';
            el.style.left = startLeft + 'px';
            el.style.top = startTop + 'px';
            widgetData.pos = { left: el.style.left, top: el.style.top };
            guardarWidgets();
            window.MyHub.toast('Posición inválida u ocupada');
          } else {
            widgetData.pos = { left: el.style.left, top: el.style.top };
            guardarWidgets();
          }
        }

        el.style.zIndex = '';
        el.style.transform = '';
        el.style.boxShadow = '';

        setTimeout(() => {
          if (el.isConnected) el.style.transition = '';
        }, 350);
      };

      window.addEventListener('pointermove', mover);
      window.addEventListener('pointerup', soltar);
    });
  };

  window.abrirPanelWidgets = () => {
    const appsConWidgets = [];
    registro.forEach((app, id) => {
      if (app.manifest && app.manifest.widgets) {
        app.manifest.widgets.forEach(w => {
          appsConWidgets.push({ appId: id, titulo: app.titulo, file: w.file, size: w.size || '1x1' });
        });
      }
    });

    if (appsConWidgets.length === 0) {
      window.MyHub.toast('No hay widgets instalados. ¡Descarga apps de Stor-He!');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'extrafunc-modal-overlay';
    const m = document.createElement('div');
    m.className = 'extrafunc-modal';
    m.style.width = '400px';

    m.innerHTML = `
      <h3>Añadir Widget</h3>
      <p>Elige un widget para colocarlo en tu escritorio.</p>
      <div style="display:flex; flex-direction:column; gap:10px; max-height:240px; overflow-y:auto; padding: 8px; margin: -8px; box-sizing: border-box;">
        ${appsConWidgets.map((w, i) => `
          <button class="widget-list-item" data-index="${i}">
            <i data-lucide="layout-grid"></i>
            <div class="widget-list-info">
                <span class="widget-list-title">${String(w.titulo ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span>
                <span class="widget-list-size">Tamaño: ${w.size}</span>
            </div>
          </button>
        `).join('')}
      </div>
      <div class="extrafunc-modal-actions">
        <button class="extrafunc-modal-btn cancel">Cerrar</button>
      </div>
    `;

    overlay.appendChild(m);
    document.body.appendChild(overlay);
    void overlay.offsetWidth;
    overlay.classList.add('active');
    refrescar();

    const cerrarPanel = () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
    };

    m.querySelector('.cancel').onclick = cerrarPanel;

    m.querySelectorAll('.widget-list-item').forEach(btn => {
      btn.onclick = async () => {
        const w = appsConWidgets[btn.dataset.index];
        await refrescarArchivosApp(w.appId);
        const pos = findClosestFreeSpot(w.size, 116, 16, null);
        if (!pos) {
          window.MyHub.toast('No hay espacio libre en el escritorio para este widget');
          return;
        }
        window.widgetsActivos.push({ id: w.appId, file: w.file, size: w.size, pos });
        guardarWidgets();
        window.renderWidgets();
        cerrarPanel();
        window.MyHub.toast('Widget añadido al escritorio');
      };
    });
  };

  // ==================== INIT ====================
  const init = () => {
    if (!window.MyHub) { setTimeout(init, 100); return; }

    inyectarEstilos();

    try { setupSnapPreview(); }       catch (e) { console.error(e); }
    try { setupRestoreOption(); }     catch (e) { console.error(e); }
    try { setupBackupIntercept(); }   catch (e) { console.error(e); }

    console.log('%c[ExtraFunc v9.0] Snap Preview y Sistema de Backup listos', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();


// ============================================================================
// ExtraFunc v10.0 — FIX 1: Presignado de posición para apps nuevas
// ============================================================================
(function() {
  'use strict';

  const getGrid = () => {
    try {
      return {
        MARGEN: (typeof MARGEN_ICONOS !== 'undefined') ? MARGEN_ICONOS : 16,
        GX:     (typeof GRID_X !== 'undefined')       ? GRID_X       : 82,
        GY:     (typeof GRID_Y !== 'undefined')       ? GRID_Y       : 108,
        COLS:   (typeof GRID_COLS !== 'undefined')    ? GRID_COLS    : 16,
        ROWS:   (typeof GRID_ROWS !== 'undefined')    ? GRID_ROWS    : 5
      };
    } catch (e) {
      return { MARGEN: 16, GX: 82, GY: 108, COLS: 16, ROWS: 5 };
    }
  };

  const findFreeCell = (excludeId) => {
    const { MARGEN, GX, GY, COLS, ROWS } = getGrid();
    const ocupadas = new Set();

    // Leer del DOM para máxima precisión con carpetas
    document.querySelectorAll('.icon').forEach(icon => {
      const l = parseFloat(icon.style.left);
      const t = parseFloat(icon.style.top);
      if (!isNaN(l) && !isNaN(t)) {
        const c = Math.round((l - MARGEN) / GX);
        const r = Math.round((t - MARGEN) / GY);
        ocupadas.add(`${c}-${r}`);
      }
    });

    if (typeof carpetas !== 'undefined' && carpetas) {
      Object.values(carpetas).forEach(f => {
        if (!f || !f.pos) return;
        const c = Math.round((parseFloat(f.pos.left) - MARGEN) / GX);
        const r = Math.round((parseFloat(f.pos.top) - MARGEN) / GY);
        if (!isNaN(c) && !isNaN(r)) ocupadas.add(`${c}-${r}`);
      });
    }

    if (typeof posicionesIconos !== 'undefined' && posicionesIconos) {
      Object.entries(posicionesIconos).forEach(([id, p]) => {
        if (id === excludeId || !p) return;
        const c = Math.round((parseFloat(p.left) - MARGEN) / GX);
        const r = Math.round((parseFloat(p.top) - MARGEN) / GY);
        if (!isNaN(c) && !isNaN(r)) ocupadas.add(`${c}-${r}`);
      });
    }

    if (typeof WIDGET_SIZES !== 'undefined' && window.widgetsActivos) {
      window.widgetsActivos.forEach(w => {
        if (!w || !w.pos) return;
        const ws = WIDGET_SIZES[w.size] || WIDGET_SIZES['1x1'];
        const c0 = Math.round((parseFloat(w.pos.left) - MARGEN) / GX);
        const r0 = Math.round((parseFloat(w.pos.top) - MARGEN) / GY);
        if (isNaN(c0) || isNaN(r0)) return;
        for (let i = 0; i < ws.cols; i++) {
          for (let j = 0; j < ws.rows; j++) {
            ocupadas.add(`${c0 + i}-${r0 + j}`);
          }
        }
      });
    }

    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        if (!ocupadas.has(`${col}-${row}`)) {
          return { left: (MARGEN + col * GX) + 'px', top: (MARGEN + row * GY) + 'px' };
        }
      }
    }
    return null;
  };

  const presignApp = (app) => {
    if (!app || !app.id) return;
    if (typeof posicionesIconos === 'undefined' || !posicionesIconos) return;
    if (posicionesIconos[app.id]) return;
    if (typeof appsEnCarpetas === 'function' && appsEnCarpetas().has(app.id)) return;
    const pos = findFreeCell(app.id);
    if (pos) posicionesIconos[app.id] = pos;
  };

  const presignAllMissing = () => {
    if (typeof registro === 'undefined' || typeof posicionesIconos === 'undefined') return;
    const inFolder = (typeof appsEnCarpetas === 'function') ? appsEnCarpetas() : new Set();
    registro.forEach((app, id) => {
      if (inFolder.has(id)) return;
      if (posicionesIconos[id]) return;
      const pos = findFreeCell(id);
      if (pos) posicionesIconos[id] = pos;
    });
  };

  const instalarWrappers = () => {
    if (typeof window.registrarApp === 'function' && !window.registrarApp.__mhPresign) {
      const orig = window.registrarApp;
      window.registrarApp = function (app) {
        try { presignApp(app); }
        catch (e) { console.error('[ExtraFunc v10] presignApp:', e); }
        return orig.call(this, app);
      };
      window.registrarApp.__mhPresign = true;

      if (window.MyHub && window.MyHub.registrarApp === orig) {
        window.MyHub.registrarApp = window.registrarApp;
      }
    }

    if (typeof window.renderIconos === 'function' && !window.renderIconos.__mhPresign) {
      const orig = window.renderIconos;
      window.renderIconos = function () {
        try { presignAllMissing(); }
        catch (e) { console.error('[ExtraFunc v10] presignAll:', e); }
        return orig.call(this);
      };
      window.renderIconos.__mhPresign = true;
    }
  };

  const init = () => {
    if (!window.MyHub || typeof registro === 'undefined') {
      setTimeout(init, 100);
      return;
    }
    try { instalarWrappers(); }
    catch (e) { console.error('[ExtraFunc v10] instalarWrappers:', e); }
    console.log('%c[ExtraFunc v10.0] Fix apps nuevas listo', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();
