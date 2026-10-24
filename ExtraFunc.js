// ============================================================================
// ExtraFunc.js — Almacenamiento, Taskbar Extendida y Controles de Volumen
// ============================================================================

(function() {
  'use strict';

  const esperar = (ms) => new Promise(r => setTimeout(r, ms));
  const DURACION_INICIO = 2200;

  // ================= IndexedDB (Para el Buscador) =================
  const dbP = new Promise((resolve) => {
    const req = indexedDB.open('myhub-lobby', 1);
    req.onsuccess = () => resolve(req.result);
  });
  const kvGet = async (k) => {
    const db = await dbP;
    return new Promise((res) => {
      const r = db.transaction('kv').objectStore('kv').get(k);
      r.onsuccess = () => res(r.result ?? null);
    });
  };

  // ================= Panel de Almacenamiento =================
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

  // ================= Controles de Ventana =================
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
                if (iframe.srcdoc) iframe.srcdoc = iframe.srcdoc;
                else try { iframe.contentWindow.location.reload(); } catch(err) { iframe.src = iframe.src; }
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

  // ================= NUEVO: Lógica Global de Volumen =================
  let _currentVol = parseInt(localStorage.getItem('myhub_volume') || '100', 10);

  const mostrarFeedbackVolumen = (vol) => {
    // Aviso visual flotante (sin CSS externo, todo inline)
    let feed = document.getElementById('vol-feedback');
    if (!feed) {
      feed = document.createElement('div');
      feed.id = 'vol-feedback';
      feed.style.cssText = `
        position: fixed; bottom: 70px; left: 50%; transform: translate(-50%, 10px);
        background: var(--glass); backdrop-filter: blur(10px);
        border: 1.5px solid var(--accent-line); border-radius: 12px;
        padding: 10px 20px; color: var(--accent); font-weight: 700; font-size: 14px;
        z-index: 9999; display: flex; align-items: center; gap: 8px;
        box-shadow: var(--shadow-lg); transition: opacity 0.2s, transform 0.2s;
        pointer-events: none; opacity: 0; font-family: var(--font);
      `;
      document.body.appendChild(feed);
    }
    const icon = vol === 0 ? 'volume-x' : vol < 50 ? 'volume-1' : 'volume-2';
    feed.innerHTML = `<i data-lucide="${icon}" style="width:18px;height:18px;"></i> <span>${vol}%</span>`;
    if (window.lucide) window.lucide.createIcons();

    feed.style.opacity = '1';
    feed.style.transform = 'translate(-50%, 0)';

    clearTimeout(feed._hideTimer);
    feed._hideTimer = setTimeout(() => {
      feed.style.opacity = '0';
      feed.style.transform = 'translate(-50%, 10px)';
    }, 1500);
  };

  const setVolumenGlobal = (nuevoVol, mostrarAviso = true) => {
    _currentVol = Math.max(0, Math.min(100, nuevoVol));
    localStorage.setItem('myhub_volume', _currentVol);

    // 1. Actualizar icono de la barra
    const volBtn = document.getElementById('volume-btn');
    if (volBtn) {
      volBtn.innerHTML = `<i data-lucide="${_currentVol === 0 ? 'volume-x' : _currentVol < 50 ? 'volume-1' : 'volume-2'}"></i>`;
      if (window.lucide) window.lucide.createIcons();
    }

    // 2. Actualizar slider si está abierto
    const slider = document.querySelector('.vol-popup input[type="range"]');
    if (slider) slider.value = _currentVol;

    // 3. Aplicar a todos los audios/videos del Lobby
    document.querySelectorAll('audio, video').forEach(el => {
      el.volume = _currentVol / 100;
    });

    // 4. Avisar a las apps (Iframes) mediante postMessage
    document.querySelectorAll('.appframe').forEach(iframe => {
      try { iframe.contentWindow.postMessage({ type: 'myhub:volume', volume: _currentVol }, '*'); } catch(e) {}
    });

    // 5. Mostrar feedback visual
    if (mostrarAviso) mostrarFeedbackVolumen(_currentVol);
  };

  // API Global para ser llamada desde apps o atajos
  window.MyHub = window.MyHub || {};
  window.MyHub.subirVolumen = () => setVolumenGlobal(_currentVol + 10);
  window.MyHub.bajarVolumen = () => setVolumenGlobal(_currentVol - 10);
  window.MyHub.setVolumen = (v) => setVolumenGlobal(v);
  window.MyHub.mutearVolumen = () => setVolumenGlobal(_currentVol === 0 ? 100 : 0);

  // Atajos de teclado para el volumen (Media Keys + Shift + Flechas)
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    if (e.key === 'AudioVolumeUp' || (e.shiftKey && e.key === 'ArrowUp')) {
      e.preventDefault(); window.MyHub.subirVolumen();
    } else if (e.key === 'AudioVolumeDown' || (e.shiftKey && e.key === 'ArrowDown')) {
      e.preventDefault(); window.MyHub.bajarVolumen();
    } else if (e.key === 'AudioVolumeMute') {
      e.preventDefault(); window.MyHub.mutearVolumen();
    }
  }, true);

  // ================= NUEVO: UI del Control de Volumen en Taskbar =================
  const setupVolume = () => {
    const checkExist = setInterval(() => {
      const pill = document.getElementById('status-pill');
      if (!pill || document.getElementById('volume-btn')) return;

      clearInterval(checkExist);
      pill.style.position = 'relative';

      const volBtn = document.createElement('div');
      volBtn.id = 'volume-btn';
      volBtn.className = 'status-item';
      volBtn.style.cssText = 'cursor:pointer; padding:4px; border-radius:6px; transition:background 0.2s; display:flex; align-items:center; justify-content:center;';
      volBtn.innerHTML = `<i data-lucide="${_currentVol === 0 ? 'volume-x' : _currentVol < 50 ? 'volume-1' : 'volume-2'}"></i>`;
      
      volBtn.onmouseover = () => volBtn.style.background = 'var(--accent-soft)';
      volBtn.onmouseout = () => volBtn.style.background = 'transparent';

      const popup = document.createElement('div');
      popup.className = 'vol-popup';
      popup.innerHTML = `
        <i data-lucide="volume-1"></i>
        <input type="range" min="0" max="100" value="${_currentVol}">
        <i data-lucide="volume-2"></i>
      `;

      const slider = popup.querySelector('input');
      slider.oninput = (e) => setVolumenGlobal(parseInt(e.target.value), false); // false para no saturar el aviso visual con el arrastre
      slider.onchange = () => mostrarFeedbackVolumen(_currentVol); // Mostrar solo al soltar el slider

      volBtn.onclick = (e) => {
        e.stopPropagation();
        popup.classList.toggle('active');
      };

      document.addEventListener('pointerdown', (e) => {
        if (!volBtn.contains(e.target) && !popup.contains(e.target)) {
          popup.classList.remove('active');
        }
      });

      const battery = pill.querySelector('.status-item.battery');
      if (battery) pill.insertBefore(volBtn, battery);
      else pill.prepend(volBtn);

      pill.appendChild(popup);
      if (window.lucide) window.lucide.createIcons();
    }, 200);
  };

  // ================= Buscador en la Taskbar =================
  const setupTaskbarSearch = () => {
    const taskbar = document.getElementById('taskbar');
    const inicioBtn = document.getElementById('inicio');
    if (!taskbar || !inicioBtn || document.querySelector('.taskbar-search-wrap')) return;

    const wrap = document.createElement('div');
    wrap.className = 'taskbar-search-wrap';
    wrap.innerHTML = `
      <i data-lucide="search"></i>
      <input type="text" id="taskbar-search" placeholder="Buscar app..." autocomplete="off">
      <div id="search-results"></div>
    `;
    
    inicioBtn.insertAdjacentElement('afterend', wrap);
    if (window.lucide) window.lucide.createIcons();

    const input = wrap.querySelector('#taskbar-search');
    const results = wrap.querySelector('#search-results');
    let todasLasApps = [];

    const cargarApps = async () => {
      const appsInst = (await kvGet('apps_instaladas')) || {};
      const sistema = window.RUTAS_APPS || [];
      const mapa = new Map();
      
      sistema.forEach(a => mapa.set(a.id, { id: a.id, titulo: a.titulo, icono: a.icono }));
      Object.values(appsInst).forEach(a => mapa.set(a.manifest.id, { 
        id: a.manifest.id, titulo: a.manifest.titulo, icono: a.manifest.icono || 'box' 
      }));
      
      todasLasApps = Array.from(mapa.values());
    };
    cargarApps();

    input.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) { results.classList.remove('active'); return; }

      const matches = todasLasApps.filter(a => a.titulo.toLowerCase().includes(q) || a.id.includes(q));
      results.innerHTML = '';
      
      if (matches.length === 0) {
        results.innerHTML = '<div style="padding: 10px; font-size: 13px; color: var(--muted); text-align: center;">No se encontraron apps</div>';
      } else {
        matches.forEach(app => {
          const el = document.createElement('div');
          el.className = 'search-item';
          el.innerHTML = `<i data-lucide="${app.icono}"></i><span>${app.titulo}</span>`;
          el.onclick = () => {
            if (window.MyHub) window.MyHub.abrir(app.id);
            input.value = '';
            results.classList.remove('active');
          };
          results.appendChild(el);
        });
      }
      results.classList.add('active');
      if (window.lucide) window.lucide.createIcons();
    });

    document.addEventListener('pointerdown', (e) => {
      if (!wrap.contains(e.target)) results.classList.remove('active');
    });
  };

  // ================= Miniaturas Premium en Hover =================
  const setupMiniaturas = () => {
    if (document.getElementById('task-preview')) return;
    const preview = document.createElement('div');
    preview.id = 'task-preview';
    document.body.appendChild(preview);

    let currentTaskId = null, hideTimeout;

    document.addEventListener('mouseover', (e) => {
      const taskEl = e.target.closest('.task');
      if (taskEl) {
        clearTimeout(hideTimeout);
        const title = taskEl.getAttribute('title');
        let realId = null;
        
        const _registro = typeof registro !== 'undefined' ? registro : window.registro;
        if (_registro) _registro.forEach((app, id) => { if (app.titulo === title) realId = id; });
        if (!realId) realId = title; 

        const app = _registro ? _registro.get(realId) : { titulo: title, icono: 'app-window' };
        currentTaskId = realId;
        
        preview.innerHTML = `
          <div class="preview-header">
            <span class="preview-title">${app.titulo}</span>
            <button class="preview-close" id="preview-close-btn"><i data-lucide="x"></i></button>
          </div>
          <div class="preview-body">
            <i data-lucide="${app.icono || 'app-window'}"></i>
            <span style="font-size:11px; color:var(--muted); font-weight:600;">App en ejecución</span>
          </div>
        `;

        const rect = taskEl.getBoundingClientRect();
        preview.style.left = `${Math.max(10, rect.left + (rect.width / 2) - 120)}px`;
        preview.style.top = `${rect.top - 200}px`;

        preview.classList.add('active');
        if (window.lucide) window.lucide.createIcons();

        preview.querySelector('#preview-close-btn').onclick = (ev) => {
          ev.stopPropagation();
          if (window.MyHub) window.MyHub.cerrar(currentTaskId);
          preview.classList.remove('active');
        };
        
        preview.onclick = () => {
          if (window.MyHub) window.MyHub.restaurar(currentTaskId);
          preview.classList.remove('active');
        };
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('.task')) {
        hideTimeout = setTimeout(() => preview.classList.remove('active'), 300);
      }
    });
    
    preview.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    preview.addEventListener('mouseleave', () => {
      hideTimeout = setTimeout(() => preview.classList.remove('active'), 300);
    });
  };

  // ================= Animación de Inicio =================
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
    setupTaskbarSearch();
    setupVolume();
    setupMiniaturas();

    iniciarAnimacion();

    console.log('%c[ExtraFunc] Extensiones y Volumen cargados', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();
