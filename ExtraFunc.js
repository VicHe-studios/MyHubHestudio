// ============================================================================
// ExtraFunc.js - Extensiones del Sistema (Atajos, Miniaturas y Menús)
// ============================================================================

(function() {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const refrescarIconos = () => { if (window.lucide) window.lucide.createIcons(); };
  
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
    
    console.log('%c[ExtraFunc] Extensiones cargadas correctamente', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
  };

  const inyectarEstilos = () => {
    if (document.getElementById('extrafunc-style')) return;
    const style = document.createElement('style');
    style.id = 'extrafunc-style';
    style.textContent = `
      /* --- MINIATURAS EN TASKBAR --- */
      #task-preview { position: fixed; z-index: 1000; width: 200px; background: var(--glass, #fff); border: 1.5px solid var(--accent-line); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); padding: 12px; display: none; flex-direction: column; gap: 10px; color: var(--text); opacity: 0; transform: translateY(10px); transition: opacity 0.15s, transform 0.15s; pointer-events: auto; backdrop-filter: blur(20px); }
      #task-preview.active { display: flex; opacity: 1; transform: translateY(0); }
      .preview-header { display: flex; align-items: center; gap: 10px; }
      .preview-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; }
      .preview-icon svg { width: 16px; height: 16px; }
      .preview-title { flex: 1; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .preview-close { background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s; }
      .preview-close:hover { background: #ef4444; color: #fff; }
      .preview-close svg { width: 14px; height: 14px; }
      .preview-hint { font-size: 11px; color: var(--muted); text-align: center; }

      /* --- BOTONES DEL MENÚ CONTEXTUAL --- */
      .extrafunc-btn {
        display: flex; align-items: center; gap: 10px;
        width: 100%; padding: 9px 12px; border: none; border-radius: 7px;
        background: transparent; color: var(--text);
        font: inherit; font-size: 13px; font-weight: 500;
        cursor: pointer; text-align: left;
        transition: background 0.15s, color 0.15s;
      }
      .extrafunc-btn:hover { background: var(--accent, #2563eb); color: #fff; }
      .extrafunc-btn.danger { color: #ef4444; }
      .extrafunc-btn.danger:hover { background: #ef4444; color: #fff; }

      /* --- MODAL PERSONALIZADO --- */
      .extrafunc-modal-overlay { position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.2s; }
      .extrafunc-modal-overlay.active { opacity: 1; pointer-events: auto; }
      .extrafunc-modal { background: var(--glass, #fff); border: 2px solid var(--accent); border-radius: 16px; padding: 24px; width: 340px; max-width: 90vw; box-shadow: 0 20px 40px rgba(0,0,0,0.3); transform: scale(0.95); transition: transform 0.2s; color: var(--text); }
      .extrafunc-modal-overlay.active .extrafunc-modal { transform: scale(1); }
      .extrafunc-modal h3 { margin: 0 0 10px; font-size: 16px; font-weight: 700; color: var(--text); }
      .extrafunc-modal p { margin: 0 0 20px; font-size: 13px; color: var(--muted); line-height: 1.4; }
      .extrafunc-modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
      .extrafunc-modal-btn { padding: 8px 16px; border-radius: 8px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: transform 0.15s, filter 0.15s; }
      .extrafunc-modal-btn:active { transform: scale(0.95); }
      .extrafunc-modal-btn.cancel { background: var(--field); color: var(--text); border: 1px solid var(--line); }
      .extrafunc-modal-btn.cancel:hover { background: var(--card); }
      .extrafunc-modal-btn.confirm { background: #ef4444; color: #fff; }
      .extrafunc-modal-btn.confirm:hover { filter: brightness(1.1); }
    `;
    document.head.appendChild(style);
  };

  // ================= MODAL PERSONALIZADO =================
  const showConfirm = (title, message) => {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'extrafunc-modal-overlay';
      const modal = document.createElement('div');
      modal.className = 'extrafunc-modal';
      modal.innerHTML = `
        <h3>${esc(title)}</h3>
        <p>${esc(message)}</p>
        <div class="extrafunc-modal-actions">
          <button class="extrafunc-modal-btn cancel">Cancelar</button>
          <button class="extrafunc-modal-btn confirm">Aceptar</button>
        </div>
      `;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      void overlay.offsetWidth; 
      overlay.classList.add('active');

      const close = (result) => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 200);
        resolve(result);
      };

      modal.querySelector('.cancel').onclick = () => close(false);
      modal.querySelector('.confirm').onclick = () => close(true);
      overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    });
  };

  // ================= 1. ATAJOS DE TECLADO (Shift + Tecla) =================
  const setupAtajosTeclado = () => {
    document.addEventListener('keydown', (e) => {
      if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const code = e.code;
        const winObj = getWin();

        switch (code) {
          case 'Digit1': e.preventDefault(); window.MyHub.abrir('papelera'); break;
          case 'Digit2': e.preventDefault(); window.MyHub.abrir('forge'); break;
          case 'Digit3': e.preventDefault(); window.MyHub.abrir('storhe'); break;
          case 'KeyM': e.preventDefault(); if (winObj) Object.keys(winObj).forEach(id => window.MyHub.minimizar(id)); break;
          case 'KeyC': e.preventDefault(); if (winObj) Object.keys(winObj).forEach(id => window.MyHub.cerrar(id)); break;
          case 'KeyD': 
            e.preventDefault();
            if (typeof ajustes !== 'undefined' && typeof guardarAjustes !== 'undefined' && typeof aplicarAjustes !== 'undefined') {
              ajustes.modo = ajustes.modo === 'oscuro' ? 'claro' : 'oscuro';
              guardarAjustes(); aplicarAjustes();
              window.MyHub.toast(`Modo ${ajustes.modo} activado`);
            }
            break;
          case 'KeyR': e.preventDefault(); location.reload(); break;
          case 'KeyN': 
            e.preventDefault(); 
            const btnCarpeta = document.getElementById('menu-nueva-carpeta');
            if (btnCarpeta) btnCarpeta.click();
            break;
          case 'KeyS':
            e.preventDefault();
            document.getElementById('inicio').click();
            setTimeout(() => {
              const ops = document.getElementById('menuOps').children;
              for (let op of ops) { if (op.textContent.includes('Configuración')) op.click(); }
            }, 50);
            break;
          case 'KeyF':
            e.preventDefault();
            if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
            else document.exitFullscreen();
            break;
        }
      }
    }, true);
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
    let targetAppId = null;

    document.addEventListener('contextmenu', (e) => {
      targetAppId = null;
      
      const deskIcon = e.target.closest('.icon[data-app-id]');
      if (deskIcon) {
        targetAppId = deskIcon.dataset.appId;
      } else {
        const folderItem = e.target.closest('.folder-item');
        if (folderItem) {
          const title = folderItem.querySelector('span').textContent;
          const reg = getReg();
          if (reg) reg.forEach((app, id) => { if (app.titulo === title) targetAppId = id; });
        }
      }

      if (targetAppId) {
        setTimeout(() => {
          const menus = document.querySelectorAll('div[style*="z-index: 500"]');
          const menu = menus[menus.length - 1];
          
          if (menu && !menu.querySelector('.extrafunc-btn')) {
            const app = getReg().get(targetAppId);
            if (!app) return;

            const hr = document.createElement('hr');
            hr.style.cssText = 'border:none;border-top:1px solid var(--line, #eee);margin:4px 2px;';
            menu.appendChild(hr);

            const createBtn = (icon, text, isDanger, action) => {
              const btn = document.createElement('button');
              btn.className = `extrafunc-btn ${isDanger ? 'danger' : ''}`;
              btn.innerHTML = `<i data-lucide="${icon}"></i><span>${esc(text)}</span>`;
              btn.onclick = async () => {
                if (typeof cerrarContexto === 'function') cerrarContexto();
                else { document.querySelector('div[style*="z-index: 499"]')?.remove(); menu.remove(); }
                await action();
              };
              return btn;
            };

            // Único botón extra: Eliminar App
            const btnDelete = createBtn('trash-2', 'Eliminar App', true, async () => {
              const ok = await showConfirm('Eliminar Aplicación', `¿Estás seguro que deseas eliminar "${app.titulo}" del sistema?`);
              if (ok) {
                await window.MyHub.eliminarApp(targetAppId);
                window.MyHub.toast('App eliminada');
              }
            });

            menu.appendChild(btnDelete);
            refrescarIconos();
          }
        }, 20);
      }
    }, true);
  };

  // Iniciar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }

})();
