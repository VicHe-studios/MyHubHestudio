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

    console.log('%c[ExtraFunc] Extensiones cargadas al 100%', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();


// ============================================================================
// ExtraFunc v5 — Snap Preview · Status Buttons (volumen + captura) · Restore
// ----------------------------------------------------------------------------
// - Snap preview: al arrastrar una ventana, muestra dónde va a caer.
// - Botones de Volumen y Captura inyectados en el #status-pill de la taskbar.
// - Botón "Restaurar desde backup" en la pantalla de bloqueo SOLO si NO hay
//   cuenta creada. Restaura TODO el backup, incluida la cuenta.
// No toca JsLobby: reutiliza kvGet/kvSet/MyHub/registro/ajustes existentes.
// ============================================================================
(function() {
  'use strict';

  const notify = (m) => {
    if (window.MyHub?.toast) window.MyHub.toast(m);
    else if (typeof window.toast === 'function') window.toast(m);
    else console.log('[MyHub]', m);
  };

  const refrescar = () => { if (window.lucide) window.lucide.createIcons(); };

  // ==================== ESTILOS ====================
  const inyectarEstilos = () => {
    if (document.getElementById('extrafunc-v5-style')) return;
    const style = document.createElement('style');
    style.id = 'extrafunc-v5-style';
    style.textContent = `
      /* Snap preview: rectángulo fantasma donde caerá la ventana */
      .extrafunc-snap-preview {
        position: absolute;
        z-index: 4;
        border-radius: 16px;
        background: color-mix(in srgb, var(--accent) 14%, transparent);
        border: 2px dashed var(--accent);
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.15s ease, visibility 0.15s ease,
                    background 0.2s, border-color 0.2s;
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent);
      }
      .extrafunc-snap-preview.visible { opacity: 1; visibility: visible; }
      .extrafunc-snap-preview.occupied {
        background: color-mix(in srgb, #ef4444 14%, transparent);
        border-color: #ef4444;
        box-shadow: 0 0 0 1px color-mix(in srgb, #ef4444 22%, transparent);
      }

      /* Botones en el status-pill */
      .status-item.status-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 3px 5px;
        border-radius: 7px;
        transition: background 0.15s, transform 0.12s;
        user-select: none;
      }
      .status-item.status-btn:hover { background: rgba(255,255,255,0.18); }
      .status-item.status-btn:active { transform: scale(0.92); }
      .status-item.status-btn svg { pointer-events: none; }

      /* Popover de volumen */
      .extrafunc-status-popover {
        position: fixed;
        z-index: 1001;
        min-width: 230px;
        background: var(--glass, rgba(255,255,255,0.95));
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1.5px solid var(--accent-line);
        border-radius: 14px;
        padding: 14px 16px;
        box-shadow: 0 12px 36px rgba(0,0,0,0.25);
        color: var(--text);
        animation: extrafuncFade 0.15s ease;
      }
      .extrafunc-popover-title {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 10px;
      }
      @keyframes extrafuncFade { from { opacity: 0; } to { opacity: 1; } }
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

  // Replica rectCol/inicioDestino de JsLobby (3 columnas, G=18)
  const updateSnapPreview = (cursorX, winEl) => {
    const deskEl = document.getElementById('desktop');
    if (!deskEl) return;

    const G = 18;
    const W = deskEl.clientWidth;
    const H = deskEl.clientHeight;
    const oneColW = (W - G * 4) / 3;

    // Span = 1 o 2 según ancho medido (evita depender de data-lucide)
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

    // ¿Las columnas destino están ocupadas por otra ventana visible?
    const colsDestino = span === 2 ? [start, start + 1] : [start];
    let ocupado = false;
    document.querySelectorAll('.win:not(.dragging)').forEach(w => {
      if (w.style.display === 'none') return; // minimizada
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
      // No mostrar hasta que el usuario realmente empiece a mover
      if (Math.abs(e.clientX - dragStartPt.x) < 5 && Math.abs(e.clientY - dragStartPt.y) < 5) return;
      updateSnapPreview(e.clientX, dragging);
    }, true);

    document.addEventListener('pointerup', () => {
      hideSnapPreview();
      dragStartPt = null;
    }, true);

    document.addEventListener('pointercancel', () => {
      hideSnapPreview();
      dragStartPt = null;
    }, true);
  };

  // ==================== STATUS BUTTONS ====================
  let volumePopover = null;

  const getVolume = () => {
    const v = parseFloat(localStorage.getItem('myhub_volume'));
    return isNaN(v) ? 1 : Math.max(0, Math.min(1, v));
  };

  const updateVolumeIcon = () => {
    const btn = document.getElementById('status-volume-btn');
    if (!btn) return;
    const v = getVolume();
    const icon = v === 0 ? 'volume-x' : v < 0.5 ? 'volume-1' : 'volume-2';
    btn.innerHTML = `<i data-lucide="${icon}"></i>`;
    refrescar();
  };

  const closeVolumeOnOutside = (e) => {
    if (!volumePopover) return;
    if (volumePopover.contains(e.target)) return;
    if (e.target.closest('#status-volume-btn')) return;
    closeVolumePopover();
  };

  const closeVolumePopover = () => {
    if (volumePopover) {
      volumePopover.remove();
      volumePopover = null;
      document.removeEventListener('pointerdown', closeVolumeOnOutside, true);
    }
  };

  const toggleVolumePopover = (btn) => {
    if (volumePopover) { closeVolumePopover(); return; }

    const vol = getVolume();
    const pct = Math.round(vol * 100);
    const icon = vol === 0 ? 'volume-x' : vol < 0.5 ? 'volume-1' : 'volume-2';

    const pop = document.createElement('div');
    pop.className = 'extrafunc-status-popover';
    pop.id = 'extrafunc-volume-popover';
    pop.style.visibility = 'hidden';
    pop.innerHTML = `
      <div class="extrafunc-popover-title">Volumen</div>
      <div style="display:flex;align-items:center;gap:10px;">
        <i data-lucide="${icon}" id="extrafunc-vol-icon" style="width:20px;height:20px;color:var(--accent);flex-shrink:0;"></i>
        <input type="range" id="extrafunc-vol-slider" min="0" max="100" value="${pct}" style="flex:1;accent-color:var(--accent);">
        <span id="extrafunc-vol-value" style="font-size:12px;font-weight:600;min-width:36px;text-align:right;font-variant-numeric:tabular-nums;">${pct}%</span>
      </div>
    `;
    document.body.appendChild(pop);
    volumePopover = pop;
    refrescar();

    const rect = btn.getBoundingClientRect();
    pop.style.left = Math.max(10, Math.min(window.innerWidth - 250, rect.right - 230)) + 'px';
    pop.style.top = Math.max(10, rect.top - pop.offsetHeight - 8) + 'px';
    pop.style.visibility = '';

    const slider = pop.querySelector('#extrafunc-vol-slider');
    const value = pop.querySelector('#extrafunc-vol-value');
    const iconEl = pop.querySelector('#extrafunc-vol-icon');

    slider.oninput = (e) => {
      const v = parseInt(e.target.value, 10);
      localStorage.setItem('myhub_volume', String(v / 100));
      value.textContent = v + '%';
      const ico = v === 0 ? 'volume-x' : v < 50 ? 'volume-1' : 'volume-2';
      if (iconEl) iconEl.setAttribute('data-lucide', ico);
      refrescar();
      updateVolumeIcon();
    };

    setTimeout(() => {
      document.addEventListener('pointerdown', closeVolumeOnOutside, true);
    }, 0);
  };

  const flashScreen = () => {
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:2147483646;pointer-events:none;opacity:0;transition:opacity 0.08s;';
    document.body.appendChild(flash);
    requestAnimationFrame(() => {
      flash.style.opacity = '0.7';
      setTimeout(() => {
        flash.style.opacity = '0';
        setTimeout(() => flash.remove(), 300);
      }, 80);
    });
  };

  const tomarCaptura = async () => {
    flashScreen();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setTimeout(() => notify('Captura simulada (requiere HTTPS)'), 300);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: false
      });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      await new Promise(r => setTimeout(r, 150));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());

      canvas.toBlob(blob => {
        if (!blob) { notify('No se pudo generar la captura'); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'MyHub_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        notify('Captura descargada');
      }, 'image/png');
    } catch (e) {
      // NotAllowedError / AbortError = el usuario canceló el selector
      if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') {
        notify('Captura no soportada en este navegador');
      }
    }
  };

  const injectStatusButtons = () => {
    const pill = document.getElementById('status-pill');
    const clock = document.getElementById('clock');
    if (!pill || !clock || !pill.contains(clock)) return;
    if (pill.querySelector('#status-volume-btn')) return;

    const volBtn = document.createElement('div');
    volBtn.className = 'status-item status-btn';
    volBtn.id = 'status-volume-btn';
    volBtn.title = 'Volumen';
    volBtn.innerHTML = '<i data-lucide="volume-2"></i>';
    volBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleVolumePopover(volBtn);
    });

    const shotBtn = document.createElement('div');
    shotBtn.className = 'status-item status-btn';
    shotBtn.id = 'status-screenshot-btn';
    shotBtn.title = 'Captura de pantalla';
    shotBtn.innerHTML = '<i data-lucide="camera"></i>';
    shotBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      tomarCaptura();
    });

    // Orden final dentro del pill: [battery] [date] [vol] [shot] [clock]
    pill.insertBefore(volBtn, clock);
    pill.insertBefore(shotBtn, clock);

    refrescar();
    updateVolumeIcon();
  };

  const setupStatusButtons = () => {
    injectStatusButtons();
    const taskbar = document.getElementById('taskbar');
    if (!taskbar) return;
    // El #status-pill lo crea JsLobby; observamos para inyectar en cuanto exista
    const obs = new MutationObserver(injectStatusButtons);
    obs.observe(taskbar, { childList: true, subtree: true });
  };

  // ==================== RESTORE (solo si NO hay cuenta) ====================
  // Se muestra como botón secundario en la pantalla de bloqueo cuando
  // cuentaActual === null. Restaura TODO, incluida la cuenta del backup.

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
        if (!data || typeof data !== 'object') throw new Error('Formato inválido');
        if (!window.kvSet) throw new Error('kvSet no disponible');

        // Restauramos TODO (incluida la cuenta, porque no hay una)
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

        if (!data.cuenta) {
          notify('Datos cargados, pero el backup no incluye una cuenta. Crea una para continuar.');
          return;
        }

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

    // Si el bloqueo está oculto, limpiamos y salimos
    if (bloqueo.classList.contains('hidden')) {
      document.getElementById('extrafunc-restore-btn')?.remove();
      return;
    }

    // Si YA hay cuenta, no ofrecer restaurar (esto es "empezar de cero")
    const hayCuenta = typeof cuentaActual !== 'undefined' && !!cuentaActual;
    if (hayCuenta) {
      document.getElementById('extrafunc-restore-btn')?.remove();
      return;
    }

    // Evitar duplicar
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

    // refrescarEstado() en JsLobby cambia la clase 'hidden' del bloqueo
    // y el título según haya/no haya cuenta. Observamos ambos.
    const obs = new MutationObserver(() => inyectarBotonRestaurar());
    obs.observe(bloqueo, {
      attributes: true,
      attributeFilter: ['class']
    });

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

    try { setupSnapPreview(); }   catch (e) { console.error('[ExtraFunc v5] SnapPreview:', e); }
    try { setupStatusButtons(); } catch (e) { console.error('[ExtraFunc v5] StatusButtons:', e); }
    try { setupRestoreOption(); } catch (e) { console.error('[ExtraFunc v5] RestoreOption:', e); }

    console.log('%c[ExtraFunc v5] Snap preview + volumen/captura + restaurar backup cargados', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();
