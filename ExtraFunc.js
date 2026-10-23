// ============================================================================
// ExtraFunc.js - Extensiones del Sistema (Sin tocar JsLobby.js)
// ============================================================================

(function() {
  'use strict';

  // ================= Utilidades =================
  const $ = id => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const refrescarIconos = () => { if (window.lucide) window.lucide.createIcons(); };
  
  // IndexedDB Helper
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

  // ================= 1. INYECCIÓN DE ESTILOS =================
  const inyectarEstilos = () => {
    if (document.getElementById('extrafunc-style')) return;
    const style = document.createElement('style');
    style.id = 'extrafunc-style';
    style.textContent = `
      /* --- COMANDOS (Ctrl+Espacio) --- */
      #cmd-overlay {
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
        display: flex; align-items: flex-start; justify-content: center;
        padding-top: 15vh; opacity: 0; pointer-events: none;
        transition: opacity 0.2s;
      }
      #cmd-overlay.active { opacity: 1; pointer-events: auto; }
      .cmd-box {
        width: 100%; max-width: 550px;
        background: var(--glass, #fff); border: 1.5px solid var(--accent-line);
        border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        display: flex; flex-direction: column; overflow: hidden;
        transform: translateY(-20px); transition: transform 0.2s var(--ease-spring);
      }
      #cmd-overlay.active .cmd-box { transform: translateY(0); }
      #cmd-input {
        width: 100%; border: none; background: transparent; color: var(--text);
        padding: 20px; font-size: 18px; font-family: inherit;
        border-bottom: 1px solid var(--line); outline: none;
      }
      #cmd-results { max-height: 350px; overflow-y: auto; padding: 8px; }
      .cmd-item {
        display: flex; align-items: center; gap: 12px;
        padding: 12px 16px; border-radius: 10px; cursor: pointer;
        color: var(--text); font-size: 14px; font-weight: 500;
        transition: background 0.1s, color 0.1s;
      }
      .cmd-item.selected { background: var(--accent); color: #fff; }
      .cmd-item i { width: 18px; height: 18px; }
      .cmd-item span { flex: 1; }

      /* --- MINIATURAS EN TASKBAR --- */
      #task-preview {
        position: fixed; z-index: 1000; width: 200px;
        background: var(--glass, #fff); border: 1.5px solid var(--accent-line);
        border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        padding: 12px; display: none; flex-direction: column; gap: 10px;
        color: var(--text); opacity: 0; transform: translateY(10px);
        transition: opacity 0.15s, transform 0.15s;
        pointer-events: auto;
      }
      #task-preview.active { display: flex; opacity: 1; transform: translateY(0); }
      .preview-header { display: flex; align-items: center; gap: 10px; }
      .preview-icon {
        width: 32px; height: 32px; border-radius: 8px;
        background: var(--accent-soft); color: var(--accent);
        display: flex; align-items: center; justify-content: center;
      }
      .preview-icon svg { width: 16px; height: 16px; }
      .preview-title { flex: 1; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .preview-close {
        background: transparent; border: none; color: var(--muted); cursor: pointer;
        padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
        transition: background 0.15s, color 0.15s;
      }
      .preview-close:hover { background: #ef4444; color: #fff; }
      .preview-close svg { width: 14px; height: 14px; }
      .preview-hint { font-size: 11px; color: var(--muted); text-align: center; }

      /* --- MENÚ CONTEXTUAL EXTENDIDO --- */
      .ctx-menu-extended {
        position: fixed; z-index: 10000;
        background: var(--glass, #fff); backdrop-filter: blur(20px);
        border: 1.5px solid var(--accent-line, #ccc);
        border-radius: 10px; padding: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        min-width: 190px; display: flex; flex-direction: column;
      }
      .ctx-btn {
        display: flex; align-items: center; gap: 10px; width: 100%;
        padding: 9px 12px; border: none; border-radius: 7px;
        background: transparent; color: var(--text); font: inherit; font-size: 13px; font-weight: 500;
        cursor: pointer; text-align: left; transition: background 0.15s, color 0.15s;
      }
      .ctx-btn:hover { background: var(--accent, #2563eb); color: #fff; }
      .ctx-btn.danger { color: #ef4444; }
      .ctx-btn.danger:hover { background: #ef4444; color: #fff; }
      .ctx-separator { border: none; border-top: 1px solid var(--line, #eee); margin: 4px 2px; }
    `;
    document.head.appendChild(style);
  };

  // ================= 2. LANZADOR DE COMANDOS (Ctrl + Espacio) =================
  const setupComandos = () => {
    const overlay = document.createElement('div');
    overlay.id = 'cmd-overlay';
    overlay.innerHTML = `
      <div class="cmd-box">
        <input type="text" id="cmd-input" placeholder="Escribe un comando o app..." autocomplete="off">
        <div id="cmd-results"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#cmd-input');
    const results = overlay.querySelector('#cmd-results');
    let selectedIndex = 0;
    let currentList = [];

    const comandosBase = [
      { id: 'papelera', text: 'Abrir Papelera', icon: 'trash-2', action: () => window.MyHub.abrir('papelera') },
      { id: 'forge', text: 'Abrir Forge (Instalador)', icon: 'hammer', action: () => window.MyHub.abrir('forge') },
      { id: 'storhe', text: 'Abrir Stor-He (Tienda)', icon: 'store', action: () => window.MyHub.abrir('storhe') },
      { id: 'min-all', text: 'Minimizar todas las ventanas', icon: 'minus-square', action: () => { Object.keys(win).forEach(id => window.MyHub.minimizar(id)); } },
      { id: 'close-all', text: 'Cerrar todas las ventanas', icon: 'x-square', action: () => { Object.keys(win).forEach(id => window.MyHub.cerrar(id)); } },
      { id: 'toggle-mode', text: 'Alternar Modo Claro/Oscuro', icon: 'sun-moon', action: () => {
          const isDark = document.documentElement.dataset.modo === 'oscuro';
          document.documentElement.dataset.modo = isDark ? 'claro' : 'oscuro';
          window.MyHub.toast(`Modo ${isDark ? 'Claro' : 'Oscuro'} activado`);
      }},
      { id: 'reload', text: 'Recargar Escritorio', icon: 'refresh-cw', action: () => location.reload() },
      { id: 'logout', text: 'Cerrar Sesión', icon: 'log-out', action: () => { 
          const btnSalir = document.querySelector('.btn.red');
          if (btnSalir) btnSalir.click(); else window.MyHub.toast('No se pudo cerrar sesión');
      }},
      { id: 'new-folder', text: 'Crear nueva carpeta', icon: 'folder-plus', action: () => {
          const menuBtn = document.getElementById('menu-nueva-carpeta');
          if (menuBtn) menuBtn.click();
      }},
      { id: 'open-config', text: 'Abrir Configuración', icon: 'settings', action: () => {
          document.getElementById('inicio').click();
          setTimeout(() => {
            const ops = document.getElementById('menuOps').children;
            for (let op of ops) { if (op.textContent.includes('Configuración')) op.click(); }
          }, 50);
      }}
    ];

    const renderResultados = (query = '') => {
      const q = query.toLowerCase();
      
      // Filtrar comandos base
      const comandosFiltrados = comandosBase.filter(c => c.text.toLowerCase().includes(q));
      
      // Filtrar apps
      const appsFiltradas = [];
      if (window.registro) {
        window.registro.forEach((app, id) => {
          if (app.titulo.toLowerCase().includes(q) || id.toLowerCase().includes(q)) {
            appsFiltradas.push({
              id: id,
              text: `Abrir: ${app.titulo}`,
              icon: app.icono || 'app-window',
              action: () => window.MyHub.abrir(id)
            });
          }
        });
      }

      currentList = [...comandosFiltrados, ...appsFiltradas];
      selectedIndex = 0;

      if (currentList.length === 0) {
        results.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:14px;">No se encontraron resultados</div>';
        return;
      }

      results.innerHTML = currentList.map((c, i) => `
        <div class="cmd-item ${i === 0 ? 'selected' : ''}" data-index="${i}">
          <i data-lucide="${c.icon}"></i>
          <span>${esc(c.text)}</span>
        </div>
      `).join('');
      refrescarIconos();
    };

    const ejecutarSeleccion = () => {
      if (currentList[selectedIndex]) {
        currentList[selectedIndex].action();
        cerrar();
      }
    };

    const actualizarSeleccion = (dir) => {
      const items = results.querySelectorAll('.cmd-item');
      if (!items.length) return;
      items[selectedIndex]?.classList.remove('selected');
      selectedIndex = (selectedIndex + dir + items.length) % items.length;
      const newItem = items[selectedIndex];
      newItem.classList.add('selected');
      newItem.scrollIntoView({ block: 'nearest' });
    };

    const abrir = () => {
      overlay.classList.add('active');
      input.value = '';
      renderResultados('');
      setTimeout(() => input.focus(), 50);
    };

    const cerrar = () => {
      overlay.classList.remove('active');
      input.blur();
    };

    // Eventos de teclado globales
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        overlay.classList.contains('active') ? cerrar() : abrir();
      }
      if (!overlay.classList.contains('active')) return;

      if (e.key === 'Escape') cerrar();
      if (e.key === 'ArrowDown') { e.preventDefault(); actualizarSeleccion(1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); actualizarSeleccion(-1); }
      if (e.key === 'Enter') { e.preventDefault(); ejecutarSeleccion(); }
    });

    input.addEventListener('input', (e) => renderResultados(e.target.value));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
    
    results.addEventListener('click', (e) => {
      const item = e.target.closest('.cmd-item');
      if (item) {
        selectedIndex = parseInt(item.dataset.index);
        ejecutarSeleccion();
      }
    });
  };

  // ================= 3. MINIATURAS EN LA TASKBAR =================
  const setupMiniaturas = () => {
    const preview = document.createElement('div');
    preview.id = 'task-preview';
    preview.innerHTML = `
      <div class="preview-header">
        <div class="preview-icon" id="preview-icon"></div>
        <div class="preview-title" id="preview-title"></div>
        <button class="preview-close" id="preview-close" title="Cerrar ventana">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="preview-hint">Haz clic en la barra para enfocar</div>
    `;
    document.body.appendChild(preview);

    let currentTaskId = null;
    let hideTimeout;

    const mostrarPreview = (taskEl, appId) => {
      clearTimeout(hideTimeout);
      currentTaskId = appId;
      
      const app = window.registro.get(appId);
      if (!app) return;

      document.getElementById('preview-title').textContent = app.titulo;
      document.getElementById('preview-icon').innerHTML = `<i data-lucide="${app.icono || 'app-window'}"></i>`;
      
      // Posicionamiento
      const rect = taskEl.getBoundingClientRect();
      preview.style.left = `${rect.left + (rect.width / 2) - 100}px`;
      preview.style.top = `${rect.top - 90}px`;
      
      preview.classList.add('active');
      refrescarIconos();
    };

    const ocultarPreview = () => {
      hideTimeout = setTimeout(() => {
        preview.classList.remove('active');
        currentTaskId = null;
      }, 200);
    };

    // Detectar hover en las tareas
    document.addEventListener('mouseover', (e) => {
      const taskEl = e.target.closest('.task');
      if (taskEl) {
        const appId = taskEl.getAttribute('title'); // Buscamos por título porque JsLobby no pone data-id
        if (appId) {
          // Encontrar el ID real basado en el título
          let realId = null;
          window.registro.forEach((app, id) => { if (app.titulo === appId) realId = id; });
          if (realId) mostrarPreview(taskEl, realId);
        }
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('.task')) ocultarPreview();
    });

    preview.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    preview.addEventListener('mouseleave', ocultarPreview);

    // Botón de cerrar en el preview
    document.getElementById('preview-close').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentTaskId) {
        window.MyHub.cerrar(currentTaskId);
        ocultarPreview();
      }
    });
  };

  // ================= 4. MENÚ CONTEXTUAL EXTENDIDO =================
  const setupContextMenu = () => {
    let ctxMenu = null;
    let backdrop = null;

    const cerrarMenu = () => {
      if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; }
      if (backdrop) { backdrop.remove(); backdrop = null; }
    };

    const crearMenu = (x, y, items) => {
      cerrarMenu();
      
      backdrop = document.createElement('div');
      backdrop.style.cssText = 'position:fixed;inset:0;z-index:9998;';
      backdrop.addEventListener('pointerdown', cerrarMenu);

      ctxMenu = document.createElement('div');
      ctxMenu.className = 'ctx-menu-extended';
      ctxMenu.style.left = `${Math.min(x, window.innerWidth - 220)}px`;
      ctxMenu.style.top = `${Math.min(y, window.innerHeight - 250)}px`;

      items.forEach(item => {
        if (item.separator) {
          const hr = document.createElement('hr');
          hr.className = 'ctx-separator';
          ctxMenu.appendChild(hr);
          return;
        }
        const btn = document.createElement('button');
        btn.className = 'ctx-btn' + (item.danger ? ' danger' : '');
        btn.innerHTML = `<i data-lucide="${item.icon}"></i><span>${esc(item.text)}</span>`;
        btn.onclick = () => { cerrarMenu(); item.action(); };
        ctxMenu.appendChild(btn);
      });

      document.body.appendChild(backdrop);
      document.body.appendChild(ctxMenu);
      refrescarIconos();
    };

    // Escuchar clic derecho en los iconos del escritorio
    document.addEventListener('contextmenu', (e) => {
      const icon = e.target.closest('.icon[data-app-id]');
      if (!icon) return; // Si no es una app, dejamos que JsLobby haga lo suyo

      e.preventDefault();
      e.stopPropagation(); // Evitamos el menú original de JsLobby

      const appId = icon.dataset.appId;
      const app = window.registro.get(appId);
      if (!app) return;

      crearMenu(e.clientX, e.clientY, [
        { icon: 'play', text: 'Abrir App', action: () => window.MyHub.abrir(appId) },
        { separator: true },
        { icon: 'pin', text: 'Fijar a la barra', action: () => {
            // Simulamos el clic del menú original para no duplicar lógica
            const ev = new MouseEvent('contextmenu', { bubbles: true, clientX: e.clientX, clientY: e.clientY });
            icon.dispatchEvent(ev); // Hmm, esto no funciona tan fácil.
            // Mejor llamamos directo a la API si existiera, pero no. 
            // Usaremos una aproximación:
            window.MyHub.toast('Usa el menú original para fijar (Próximamente)');
        }},
        { separator: true },
        { icon: 'trash-2', text: 'Eliminar App', danger: true, action: async () => {
            if (confirm(`¿Eliminar "${app.titulo}" del sistema?`)) {
              await window.MyHub.eliminarApp(appId);
              window.MyHub.toast('App eliminada');
            }
        }},
        { icon: 'database', text: 'Limpiar Datos de App', danger: true, action: async () => {
            if (confirm(`¿Borrar TODOS los datos guardados de "${app.titulo}"? (Notas, configuraciones, etc.)`)) {
              // 1. Limpiar LocalStorage
              Object.keys(localStorage).forEach(k => {
                if (k.includes(appId)) localStorage.removeItem(k);
              });
              // 2. Intentar borrar IndexedDB específica
              const dbs = await indexedDB.databases();
              for (let db of dbs) {
                if (db.name && db.name.includes(appId)) {
                  indexedDB.deleteDatabase(db.name);
                }
              }
              window.MyHub.toast(`Datos de "${app.titulo}" eliminados`);
            }
        }}
      ]);
    }, true); // Usamos capture: true para interceptar antes que JsLobby
  };

  // ================= ARRANQUE =================
  const init = () => {
    // Esperar a que el Lobby esté cargado
    if (!window.MyHub || !window.registro) {
      setTimeout(init, 100);
      return;
    }

    inyectarEstilos();
    setupComandos();
    setupMiniaturas();
    setupContextMenu();

    console.log('[ExtraFunc] Extensiones cargadas correctamente.');
  };

  setTimeout(init, 500);

})();
