// ============================================================================
// ExtraFunc.js - Extensiones del Sistema (Blindado y sin errores)
// ============================================================================

(function() {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const refrescarIconos = () => { if (window.lucide) window.lucide.createIcons(); };
  
  // Accesores seguros a las variables globales de JsLobby
  const getReg = () => window.registro || (typeof registro !== 'undefined' ? registro : null);
  const getWin = () => window.win || (typeof win !== 'undefined' ? win : null);

  const init = () => {
    // Esperamos a que MyHub esté listo
    if (!window.MyHub || !getReg()) {
      setTimeout(init, 100);
      return;
    }

    inyectarEstilos();
    setupComandos();
    setupMiniaturas();
    setupContextMenu();
    console.log('[ExtraFunc] Extensiones cargadas correctamente.');
  };

  const inyectarEstilos = () => {
    if (document.getElementById('extrafunc-style')) return;
    const style = document.createElement('style');
    style.id = 'extrafunc-style';
    style.textContent = `
      #cmd-overlay { position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: flex; align-items: flex-start; justify-content: center; padding-top: 15vh; opacity: 0; pointer-events: none; transition: opacity 0.2s; }
      #cmd-overlay.active { opacity: 1; pointer-events: auto; }
      .cmd-box { width: 100%; max-width: 550px; background: var(--glass, #fff); border: 1.5px solid var(--accent-line); border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.3); display: flex; flex-direction: column; overflow: hidden; transform: translateY(-20px); transition: transform 0.2s; }
      #cmd-overlay.active .cmd-box { transform: translateY(0); }
      #cmd-input { width: 100%; border: none; background: transparent; color: var(--text); padding: 20px; font-size: 18px; font-family: inherit; border-bottom: 1px solid var(--line); outline: none; }
      #cmd-results { max-height: 350px; overflow-y: auto; padding: 8px; }
      .cmd-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 10px; cursor: pointer; color: var(--text); font-size: 14px; font-weight: 500; transition: background 0.1s, color 0.1s; }
      .cmd-item.selected { background: var(--accent); color: #fff; }
      .cmd-item i { width: 18px; height: 18px; }
      .cmd-item span { flex: 1; }
      
      #task-preview { position: fixed; z-index: 1000; width: 200px; background: var(--glass, #fff); border: 1.5px solid var(--accent-line); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); padding: 12px; display: none; flex-direction: column; gap: 10px; color: var(--text); opacity: 0; transform: translateY(10px); transition: opacity 0.15s, transform 0.15s; pointer-events: auto; }
      #task-preview.active { display: flex; opacity: 1; transform: translateY(0); }
      .preview-header { display: flex; align-items: center; gap: 10px; }
      .preview-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; }
      .preview-icon svg { width: 16px; height: 16px; }
      .preview-title { flex: 1; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .preview-close { background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s; }
      .preview-close:hover { background: #ef4444; color: #fff; }
      .preview-close svg { width: 14px; height: 14px; }
      .preview-hint { font-size: 11px; color: var(--muted); text-align: center; }
      
      .ctx-menu-extended { position: fixed; z-index: 10000; background: var(--glass, #fff); backdrop-filter: blur(20px); border: 1.5px solid var(--accent-line, #ccc); border-radius: 10px; padding: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); min-width: 190px; display: flex; flex-direction: column; }
      .ctx-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; border-radius: 7px; background: transparent; color: var(--text); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; text-align: left; transition: background 0.15s, color 0.15s; }
      .ctx-btn:hover { background: var(--accent, #2563eb); color: #fff; }
      .ctx-btn.danger { color: #ef4444; }
      .ctx-btn.danger:hover { background: #ef4444; color: #fff; }
      .ctx-separator { border: none; border-top: 1px solid var(--line, #eee); margin: 4px 2px; }
    `;
    document.head.appendChild(style);
  };

  const setupComandos = () => {
    if (document.getElementById('cmd-overlay')) return;
    const reg = getReg();

    const overlay = document.createElement('div');
    overlay.id = 'cmd-overlay';
    overlay.innerHTML = `<div class="cmd-box"><input type="text" id="cmd-input" placeholder="Escribe un comando o app..." autocomplete="off"><div id="cmd-results"></div></div>`;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#cmd-input');
    const results = overlay.querySelector('#cmd-results');
    let selectedIndex = 0, currentList = [];

    const baseCmds = [
      { text: 'Abrir Papelera', icon: 'trash-2', action: () => window.MyHub.abrir('papelera') },
      { text: 'Abrir Forge', icon: 'hammer', action: () => window.MyHub.abrir('forge') },
      { text: 'Abrir Stor-He', icon: 'store', action: () => window.MyHub.abrir('storhe') },
      { text: 'Minimizar todas', icon: 'minus-square', action: () => { Object.keys(getWin()).forEach(id => window.MyHub.minimizar(id)); } },
      { text: 'Alternar Modo Claro/Oscuro', icon: 'sun-moon', action: () => {
          const isDark = document.documentElement.dataset.modo === 'oscuro';
          document.documentElement.dataset.modo = isDark ? 'claro' : 'oscuro';
          window.MyHub.toast(`Modo ${isDark ? 'Claro' : 'Oscuro'} activado`);
      }},
      { text: 'Crear nueva carpeta', icon: 'folder-plus', action: () => { const b = document.getElementById('menu-nueva-carpeta'); if(b) b.click(); }}
    ];

    const render = (q = '') => {
      const query = q.toLowerCase();
      const filteredCmds = baseCmds.filter(c => c.text.toLowerCase().includes(query));
      const filteredApps = [];
      if (reg) {
        reg.forEach((app, id) => {
          if (app.titulo.toLowerCase().includes(query) || id.toLowerCase().includes(query)) {
            filteredApps.push({ text: `Abrir: ${app.titulo}`, icon: app.icono || 'app-window', action: () => window.MyHub.abrir(id) });
          }
        });
      }
      currentList = [...filteredCmds, ...filteredApps];
      selectedIndex = 0;
      results.innerHTML = currentList.length === 0 ? '<div style="padding:20px;text-align:center;color:var(--muted);">No hay resultados</div>' : currentList.map((c, i) => `<div class="cmd-item ${i===0?'selected':''}" data-index="${i}"><i data-lucide="${c.icon}"></i><span>${esc(c.text)}</span></div>`).join('');
      refrescarIconos();
    };

    const cerrar = () => overlay.classList.remove('active');

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.code === 'Space') { e.preventDefault(); overlay.classList.contains('active') ? cerrar() : (overlay.classList.add('active'), input.value='', render(''), setTimeout(()=>input.focus(),50)); }
      if (!overlay.classList.contains('active')) return;
      if (e.key === 'Escape') cerrar();
      if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = (selectedIndex + 1) % currentList.length; render(input.value); }
      if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = (selectedIndex - 1 + currentList.length) % currentList.length; render(input.value); }
      if (e.key === 'Enter') { e.preventDefault(); if(currentList[selectedIndex]) { currentList[selectedIndex].action(); cerrar(); } }
    });

    input.addEventListener('input', (e) => render(e.target.value));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
    results.addEventListener('click', (e) => { const item = e.target.closest('.cmd-item'); if (item) { selectedIndex = parseInt(item.dataset.index); currentList[selectedIndex].action(); cerrar(); } });
  };

  const setupMiniaturas = () => {
    if (document.getElementById('task-preview')) return;
    const reg = getReg();

    const preview = document.createElement('div');
    preview.id = 'task-preview';
    preview.innerHTML = `<div class="preview-header"><div class="preview-icon" id="preview-icon"></div><div class="preview-title" id="preview-title"></div><button class="preview-close" id="preview-close"><i data-lucide="x"></i></button></div><div class="preview-hint">Clic para enfocar</div>`;
    document.body.appendChild(preview);

    let currentTaskId = null, hideTimeout;

    document.addEventListener('mouseover', (e) => {
      const taskEl = e.target.closest('.task');
      if (taskEl) {
        clearTimeout(hideTimeout);
        const title = taskEl.getAttribute('title');
        let realId = null;
        if (reg) reg.forEach((app, id) => { if (app.titulo === title) realId = id; });
        
        if (realId) {
          currentTaskId = realId;
          const app = reg.get(realId);
          document.getElementById('preview-title').textContent = app.titulo;
          document.getElementById('preview-icon').innerHTML = `<i data-lucide="${app.icono || 'app-window'}"></i>`;
          const rect = taskEl.getBoundingClientRect();
          preview.style.left = `${Math.max(10, rect.left + (rect.width / 2) - 100)}px`;
          preview.style.top = `${rect.top - 90}px`;
          preview.classList.add('active');
          refrescarIconos();
        }
      }
    });

    document.addEventListener('mouseout', (e) => { if (e.target.closest('.task')) hideTimeout = setTimeout(() => preview.classList.remove('active'), 200); });
    preview.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    preview.addEventListener('mouseleave', () => hideTimeout = setTimeout(() => preview.classList.remove('active'), 200));
    document.getElementById('preview-close').addEventListener('click', (e) => { e.stopPropagation(); if (currentTaskId) { window.MyHub.cerrar(currentTaskId); preview.classList.remove('active'); } });
  };

  const setupContextMenu = () => {
    let ctxMenu = null, backdrop = null;
    const cerrarCtx = () => { if(ctxMenu) ctxMenu.remove(); if(backdrop) backdrop.remove(); ctxMenu = null; backdrop = null; };

    document.addEventListener('contextmenu', (e) => {
      const icon = e.target.closest('.icon[data-app-id]');
      if (!icon) return;
      e.preventDefault(); e.stopPropagation();
      
      const appId = icon.dataset.appId;
      const reg = getReg();
      const app = reg ? reg.get(appId) : null;
      if (!app) return;

      cerrarCtx();
      backdrop = document.createElement('div'); backdrop.style.cssText = 'position:fixed;inset:0;z-index:9998;'; backdrop.addEventListener('pointerdown', cerrarCtx);
      ctxMenu = document.createElement('div'); ctxMenu.className = 'ctx-menu-extended';
      ctxMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 220)}px`; ctxMenu.style.top = `${Math.min(e.clientY, window.innerHeight - 200)}px`;

      const items = [
        { icon: 'play', text: 'Abrir App', action: () => window.MyHub.abrir(appId) },
        { separator: true },
        { icon: 'trash-2', text: 'Eliminar App', danger: true, action: async () => {
            if (confirm(`¿Eliminar "${app.titulo}" del sistema?`)) {
              await window.MyHub.eliminarApp(appId);
              window.MyHub.toast('App eliminada');
            }
        }},
        { icon: 'database', text: 'Limpiar Datos de App', danger: true, action: async () => {
            if (confirm(`¿Borrar TODOS los datos guardados de "${app.titulo}"?`)) {
              Object.keys(localStorage).forEach(k => { if (k.includes(appId)) localStorage.removeItem(k); });
              const dbs = await indexedDB.databases();
              for (let db of dbs) { if (db.name && db.name.includes(appId)) indexedDB.deleteDatabase(db.name); }
              window.MyHub.toast(`Datos de "${app.titulo}" eliminados`);
            }
        }}
      ];

      items.forEach(item => {
        if (item.separator) { const hr = document.createElement('hr'); hr.className = 'ctx-separator'; ctxMenu.appendChild(hr); return; }
        const btn = document.createElement('button'); btn.className = `ctx-btn ${item.danger ? 'danger' : ''}`;
        btn.innerHTML = `<i data-lucide="${item.icon}"></i><span>${esc(item.text)}</span>`;
        btn.onclick = () => { cerrarCtx(); item.action(); };
        ctxMenu.appendChild(btn);
      });

      document.body.appendChild(backdrop); document.body.appendChild(ctxMenu);
      refrescarIconos();
    }, true);
  };

  // Iniciar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }

})();
