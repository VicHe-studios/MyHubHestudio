// ============================================================================
// ExtraFunc.js - Extensiones del Sistema (Atajos + Menú + Miniaturas)
// ============================================================================

(function() {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const refrescarIconos = () => { if (window.lucide) window.lucide.createIcons(); };
  
  // Accesores seguros a las variables internas de JsLobby
  const getReg = () => window.registro || (typeof registro !== 'undefined' ? registro : null);
  const getWin = () => window.win || (typeof win !== 'undefined' ? win : null);

  const init = () => {
    if (!window.MyHub || !getReg()) {
      setTimeout(init, 100);
      return;
    }

    inyectarEstilos();
    setupAtajosTeclado();
    setupMiniaturas();
    setupContextMenuExtendido();
    
    console.log('%c[ExtraFunc] Extensiones cargadas', 'color: #16a34a; font-weight: bold;');
  };

  const inyectarEstilos = () => {
    if (document.getElementById('extrafunc-style')) return;
    const style = document.createElement('style');
    style.id = 'extrafunc-style';
    style.textContent = `
      /* --- MINIATURAS EN TASKBAR --- */
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
    `;
    document.head.appendChild(style);
  };

  // ================= 1. ATAJOS DE TECLADO =================
  const setupAtajosTeclado = () => {
    document.addEventListener('keydown', (e) => {
      // Solo si se presiona Alt y no hay otros modificadores
      if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        const reg = getReg();
        const winObj = getWin();

        switch (key) {
          case '1':
            e.preventDefault(); window.MyHub.abrir('papelera'); break;
          case '2':
            e.preventDefault(); window.MyHub.abrir('forge'); break;
          case '3':
            e.preventDefault(); window.MyHub.abrir('storhe'); break;
          case 'm': // Minimize all
            e.preventDefault(); 
            if (winObj) Object.keys(winObj).forEach(id => window.MyHub.minimizar(id)); 
            break;
          case 'c': // Close all
            e.preventDefault(); 
            if (winObj) Object.keys(winObj).forEach(id => window.MyHub.cerrar(id)); 
            break;
          case 'd': // Dark mode
            e.preventDefault();
            if (typeof ajustes !== 'undefined' && typeof guardarAjustes !== 'undefined' && typeof aplicarAjustes !== 'undefined') {
              ajustes.modo = ajustes.modo === 'oscuro' ? 'claro' : 'oscuro';
              guardarAjustes();
              aplicarAjustes();
              window.MyHub.toast(`Modo ${ajustes.modo} activado`);
            }
            break;
          case 'r': // Reload
            e.preventDefault(); location.reload(); break;
          case 'n': // New Folder
            e.preventDefault(); 
            const btnCarpeta = document.getElementById('menu-nueva-carpeta');
            if (btnCarpeta) btnCarpeta.click();
            break;
          case 's': // Settings
            e.preventDefault();
            document.getElementById('inicio').click();
            setTimeout(() => {
              const ops = document.getElementById('menuOps').children;
              for (let op of ops) { if (op.textContent.includes('Configuración')) op.click(); }
            }, 50);
            break;
          case 'f': // Fullscreen
            e.preventDefault();
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(err => console.log(err));
            } else {
              if (document.exitFullscreen) document.exitFullscreen();
            }
            break;
        }
      }
    });
  };

  // ================= 2. MINIATURAS EN LA TASKBAR =================
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

    document.addEventListener('mouseout', (e) => { 
      if (e.target.closest('.task')) hideTimeout = setTimeout(() => preview.classList.remove('active'), 200); 
    });
    preview.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    preview.addEventListener('mouseleave', () => hideTimeout = setTimeout(() => preview.classList.remove('active'), 200));
    
    document.getElementById('preview-close').addEventListener('click', (e) => { 
      e.stopPropagation(); 
      if (currentTaskId) { 
        window.MyHub.cerrar(currentTaskId); 
        preview.classList.remove('active'); 
      } 
    });
  };

  // ================= 3. MENÚ CONTEXTUAL EXTENDIDO =================
  const setupContextMenuExtendido = () => {
    const reg = getReg();

    // Usamos captura (true) para interceptar el clic antes que JsLobby
    document.addEventListener('contextmenu', (e) => {
      const icon = e.target.closest('.icon[data-app-id]');
      if (!icon) return; // Si no es una app, ignoramos

      const appId = icon.dataset.appId;
      const app = reg ? reg.get(appId) : null;
      if (!app) return;

      // NO hacemos preventDefault ni stopPropagation.
      // Dejamos que JsLobby cree su menú original.
      
      // Esperamos un instante a que JsLobby termine de dibujar su menú en el DOM
      setTimeout(() => {
        // Buscamos el menú que acaba de crear JsLobby (tiene z-index 500)
        const menus = document.querySelectorAll('div[style*="z-index: 500"]');
        const menu = menus[menus.length - 1];
        
        // Si lo encontramos y no le hemos añadido nuestras cosas, lo hacemos
        if (menu && !menu.querySelector('.extrafunc-btn')) {
          
          // Añadir un separador visual
          const hr = document.createElement('hr');
          hr.style.cssText = 'border:none;border-top:1px solid var(--line, #eee);margin:4px 2px;';
          menu.appendChild(hr);

          // Función para crear los botones idénticos a los de JsLobby
          const addBtn = (iconName, text, isDanger, action) => {
            const b = document.createElement('button');
            b.className = 'extrafunc-btn';
            b.style.cssText = `
              display: flex; align-items: center; gap: 10px;
              width: 100%; padding: 9px 12px; border: none; border-radius: 7px;
              background: transparent; color: ${isDanger ? '#ef4444' : 'inherit'};
              font: inherit; font-size: 13px; font-weight: 500;
              cursor: pointer; text-align: left;
              transition: background 0.15s, color 0.15s;
            `;
            b.onmouseover = () => { b.style.background = isDanger ? '#ef4444' : 'var(--accent, #2563eb)'; b.style.color = '#fff'; };
            b.onmouseout = () => { b.style.background = 'transparent'; b.style.color = isDanger ? '#ef4444' : 'inherit'; };
            b.innerHTML = `<i data-lucide="${iconName}"></i><span>${esc(text)}</span>`;
            
            b.onclick = async () => {
              // Cerramos el menú
              if (typeof cerrarContexto === 'function') cerrarContexto();
              else {
                const backdrop = document.querySelector('div[style*="z-index: 499"]');
                if (backdrop) backdrop.remove();
                menu.remove();
              }
              await action();
            };
            menu.appendChild(b);
          };

          // Agregamos nuestras dos opciones destructivas
          addBtn('trash-2', 'Eliminar App', true, async () => {
            if (confirm(`¿Eliminar "${app.titulo}" del sistema?`)) {
              await window.MyHub.eliminarApp(appId);
              window.MyHub.toast('App eliminada');
            }
          });

          addBtn('database', 'Limpiar Datos de App', true, async () => {
            if (confirm(`¿Borrar TODOS los datos guardados de "${app.titulo}"?`)) {
              Object.keys(localStorage).forEach(k => { if (k.includes(appId)) localStorage.removeItem(k); });
              const dbs = await indexedDB.databases();
              for (let db of dbs) { if (db.name && db.name.includes(appId)) indexedDB.deleteDatabase(db.name); }
              window.MyHub.toast(`Datos de "${app.titulo}" eliminados`);
            }
          });

          refrescarIconos();
        }
      }, 10); // Un pequeño delay para asegurar que JsLobby ya lo creó
    }, true);
  };

  // Iniciar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }

})();
