// ============================================================================
// ExtraFunc.js - Extensiones del Sistema (Atajos, Sonidos, Backup, Config)
// ============================================================================

(function() {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const refrescarIconos = () => { if (window.lucide) window.lucide.createIcons(); };
  
  const getReg = () => window.registro || (typeof registro !== 'undefined' ? registro : null);
  const getWin = () => window.win || (typeof win !== 'undefined' ? win : null);

  // ================= ESTADO Y CONFIGURACIÓN =================
  let sonidosActivos = localStorage.getItem('myhub_sounds') !== 'false';
  let hotkeys = JSON.parse(localStorage.getItem('myhub_hotkeys') || '{}');
  const defaultHotkeys = {
    'Digit1': 'papelera',
    'Digit2': 'forge',
    'Digit3': 'storhe',
    'Digit4': 'cmdhe',
    'KeyM': 'minimize',
    'KeyC': 'close',
    'KeyD': 'theme',
    'KeyR': 'reload',
    'KeyN': 'newfolder',
    'KeyS': 'settings',
    'KeyF': 'fullscreen'
  };

  // ================= SISTEMA DE SONIDO (Web Audio API) =================
  const playSound = (type) => {
    if (!sonidosActivos) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now); // Empezar en 0 para evitar clics fuertes

      if (type === 'open') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
      } else if (type === 'close') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
      } else if (type === 'minimize') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.linearRampToValueAtTime(400, now + 0.1);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
      } else if (type === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.linearRampToValueAtTime(350, now + 0.12);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
      } else if (type === 'move') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        gain.gain.linearRampToValueAtTime(0.02, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
      }
    } catch(e) {}
  };

  // ================= INYECCIÓN DE ESTILOS =================
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
      .extrafunc-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; border-radius: 7px; background: transparent; color: var(--text); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; text-align: left; transition: background 0.15s, color 0.15s; }
      .extrafunc-btn:hover { background: var(--accent, #2563eb); color: #fff; }
      .extrafunc-btn.danger { color: #ef4444; }
      .extrafunc-btn.danger:hover { background: #ef4444; color: #fff; }
      .extrafunc-btn.locked { color: var(--muted); cursor: not-allowed; }
      .extrafunc-btn.locked:hover { background: transparent; color: var(--muted); }

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

      /* --- CONFIGURACIÓN EXTRA (Hotkeys simétricos) --- */
      .cfg-toggle { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--line); }
      .cfg-toggle span { font-size: 13px; font-weight: 500; }
      .cfg-toggle input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--accent); cursor: pointer; }
      
      .hotkey-list { max-height: 180px; overflow-y: auto; padding-right: 8px; margin-top: 8px; }
      .hotkey-row { display: grid; grid-template-columns: 1fr 110px; gap: 12px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); }
      .hotkey-row:last-child { border-bottom: none; }
      .hotkey-label { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
      .hotkey-key { width: 100%; text-align: center; background: var(--field); border: 1px solid var(--line); padding: 6px; border-radius: 6px; font-family: monospace; font-size: 12px; cursor: pointer; transition: 0.2s; outline: none; color: var(--text); }
      .hotkey-key:focus { border-color: var(--accent); background: var(--card); box-shadow: 0 0 0 3px var(--accent-soft); }
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
      void overlay.offsetWidth; overlay.classList.add('active');

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

  // ================= ATAJOS DE TECLADO =================
  const setupAtajosTeclado = () => {
    document.addEventListener('keydown', (e) => {
      if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const code = e.code;
        const winObj = getWin();
        const action = hotkeys[code] || defaultHotkeys[code];

        if (!action) return;

        switch (action) {
          case 'papelera': e.preventDefault(); window.MyHub.abrir('papelera'); break;
          case 'forge': e.preventDefault(); window.MyHub.abrir('forge'); break;
          case 'storhe': e.preventDefault(); window.MyHub.abrir('storhe'); break;
          case 'cmdhe': e.preventDefault(); window.MyHub.abrir('cmdhe'); break;
          case 'minimize': e.preventDefault(); if (winObj) Object.keys(winObj).forEach(id => window.MyHub.minimizar(id)); break;
          case 'close': e.preventDefault(); if (winObj) Object.keys(winObj).forEach(id => window.MyHub.cerrar(id)); break;
          case 'theme': 
            e.preventDefault();
            if (typeof ajustes !== 'undefined' && typeof guardarAjustes !== 'undefined' && typeof aplicarAjustes !== 'undefined') {
              ajustes.modo = ajustes.modo === 'oscuro' ? 'claro' : 'oscuro';
              guardarAjustes(); aplicarAjustes();
              window.MyHub.toast(`Modo ${ajustes.modo} activado`);
            }
            break;
          case 'reload': e.preventDefault(); location.reload(); break;
          case 'newfolder': 
            e.preventDefault(); 
            const btnCarpeta = document.getElementById('menu-nueva-carpeta');
            if (btnCarpeta) btnCarpeta.click();
            break;
          case 'settings':
            e.preventDefault();
            document.getElementById('inicio').click();
            setTimeout(() => {
              const ops = document.getElementById('menuOps').children;
              for (let op of ops) { if (op.textContent.includes('Configuración')) op.click(); }
            }, 50);
            break;
          case 'fullscreen':
            e.preventDefault();
            if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
            else document.exitFullscreen();
            break;
        }
      }
    }, true);
  };

  // ================= MINIATURAS TASKBAR =================
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

  // ================= MENÚ CONTEXTUAL =================
  const setupContextMenuExtendido = () => {
    let targetAppId = null;

    document.addEventListener('contextmenu', (e) => {
      targetAppId = null;
      const deskIcon = e.target.closest('.icon[data-app-id]');
      if (deskIcon) targetAppId = deskIcon.dataset.appId;
      else {
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

            const esAppSistema = ['papelera', 'forge', 'storhe', 'cmdhe'].includes(targetAppId) || app.url;

            if (esAppSistema) {
              const btnLocked = document.createElement('button');
              btnLocked.className = 'extrafunc-btn locked';
              btnLocked.innerHTML = `<i data-lucide="lock"></i><span>App de Sistema</span>`;
              btnLocked.onclick = async () => {
                if (typeof cerrarContexto === 'function') cerrarContexto();
                else { document.querySelector('div[style*="z-index: 499"]')?.remove(); menu.remove(); }
                window.MyHub.toast('Las apps base no se pueden borrar desde aquí. Usa CMD-HE.');
              };
              menu.appendChild(btnLocked);
            } else {
              const btnDelete = createBtn('trash-2', 'Eliminar App', true, async () => {
                const ok = await showConfirm('Eliminar Aplicación', `¿Estás seguro que deseas eliminar "${app.titulo}" del sistema?`);
                if (ok) {
                  await window.MyHub.eliminarApp(targetAppId);
                  window.MyHub.toast('App eliminada');
                }
              });
              menu.appendChild(btnDelete);
            }
            refrescarIconos();
          }
        }, 20);
      }
    }, true);
  };

  // ================= INYECCIÓN EN CONFIGURACIÓN =================
  const setupConfigInjection = () => {
    const modal = document.getElementById('modal');
    const mTitulo = document.getElementById('mTitulo');
    const mBody = document.getElementById('mBody');
    if (!modal || !mBody) return;

    const observer = new MutationObserver(() => {
      if (mTitulo.textContent === 'Configuración' && !document.getElementById('extrafunc-config-injected')) {
        const container = document.createElement('div');
        container.id = 'extrafunc-config-injected';
        container.style.marginTop = '20px';

        // --- 1. NUEVOS COLORES ---
        const swatches = mBody.querySelector('.swatches');
        if (swatches) {
          const nuevosColores = { 'cafe': '#8b4513', 'rosado': '#ec4899', 'morado': '#7c3aed' };
          
          // Usamos eval para inyectar los colores en el objeto COLORES de JsLobby
          try {
            for (const [nombre, hex] of Object.entries(nuevosColores)) {
              eval(`COLORES['${nombre}'] = '${hex}';`);
            }
          } catch(e) {}

          for (const [nombre, hex] of Object.entries(nuevosColores)) {
            if (!Array.from(swatches.children).some(c => c.style.background.includes(hex) || c.style.backgroundColor.includes(hex))) {
              const b = document.createElement('div');
              b.className = 'swatch';
              b.style.background = hex;
              b.title = nombre;
              if (window.ajustes && window.ajustes.color === nombre) b.classList.add('on');
              
              b.onclick = async () => {
                // Guardamos directamente en la DB y actualizamos la UI
                try {
                  const db = await new Promise(res => { const req = indexedDB.open('myhub-lobby', 1); req.onsuccess = () => res(req.result); });
                  const tx = db.transaction('kv', 'readwrite');
                  const store = tx.objectStore('kv');
                  const getReq = store.get('ajustes');
                  getReq.onsuccess = () => {
                    const a = getReq.result || {};
                    a.color = nombre;
                    store.put(a, 'ajustes');
                  };
                  tx.oncomplete = () => {
                    document.documentElement.style.setProperty('--accent', hex);
                    swatches.querySelectorAll('.swatch').forEach(s => s.classList.remove('on'));
                    b.classList.add('on');
                    if (window.MyHub) window.MyHub.toast('Color actualizado');
                  };
                } catch(e) {
                  if (window.MyHub) window.MyHub.toast('Error al guardar color');
                }
              };
              swatches.appendChild(b);
            }
          }
        }

        // --- 2. SECCIÓN DE SONIDO ---
        container.innerHTML += `
          <div class="sec" style="margin-top: 20px;">Efectos de Sonido</div>
          <div class="cfg-toggle">
            <span>Sonidos del sistema</span>
            <input type="checkbox" id="cfg-toggle-sound" ${sonidosActivos ? 'checked' : ''}>
          </div>
        `;

        // --- 3. COPIA DE SEGURIDAD ---
        container.innerHTML += `
          <div class="sec" style="margin-top: 20px;">Copia de Seguridad</div>
          <div class="fila-btns">
            <button class="btn" id="cfg-btn-export"><i data-lucide="download"></i>Exportar Datos</button>
            <button class="btn gray" id="cfg-btn-import"><i data-lucide="upload"></i>Importar Datos</button>
            <input type="file" id="cfg-input-import" accept=".json" hidden>
          </div>
          <p class="nota">Descarga un archivo con todas tus apps, carpetas y ajustes.</p>
        `;

        // --- 4. ATAJOS DE TECLADO ---
        const labels = {
          'papelera': 'Abrir Papelera', 'forge': 'Abrir Forge', 'storhe': 'Abrir Stor-He', 'cmdhe': 'Abrir CMD-HE',
          'minimize': 'Minimizar Ventanas', 'close': 'Cerrar Ventanas', 'theme': 'Alternar Tema',
          'reload': 'Recargar Escritorio', 'newfolder': 'Nueva Carpeta', 'settings': 'Configuración', 'fullscreen': 'Pantalla Completa'
        };

        const hotkeysHTML = Object.entries(defaultHotkeys).map(([code, action]) => {
          const currentCode = Object.keys(hotkeys).find(k => hotkeys[k] === action) || code;
          const displayKey = currentCode.replace('Digit', '').replace('Key', '');
          return `
            <div class="hotkey-row">
              <span class="hotkey-label">${labels[action] || action}</span>
              <input type="text" class="hotkey-key" data-action="${action}" value="Shift + ${displayKey}" readonly>
            </div>
          `;
        }).join('');

        container.innerHTML += `
          <div class="sec" style="margin-top: 20px;">Atajos de Teclado</div>
          <p class="nota" style="margin-bottom: 10px;">Haz clic en un atajo y presiona la nueva combinación (Shift + Tecla).</p>
          <div class="hotkey-list">
            ${hotkeysHTML}
          </div>
        `;

        mBody.appendChild(container);

        // ================= LÓGICA DE LOS ELEMENTOS INYECTADOS =================

        // Toggle de Sonido
        const soundToggle = document.getElementById('cfg-toggle-sound');
        soundToggle.onchange = (e) => {
          sonidosActivos = e.target.checked;
          localStorage.setItem('myhub_sounds', sonidosActivos);
          if (sonidosActivos) playSound('open');
        };

        // Exportar
        document.getElementById('cfg-btn-export').onclick = async () => {
          const data = {
            apps_instaladas: await window.kvGet('apps_instaladas') || {},
            carpetas: await window.kvGet('carpetas') || {},
            ajustes: await window.kvGet('ajustes') || {},
            cuenta: await window.kvGet('cuenta') || null,
            posiciones_iconos: await window.kvGet('posiciones_iconos') || {}
          };
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `MyHub_Backup_${new Date().toISOString().slice(0,10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          window.MyHub.toast('Copia de seguridad descargada');
        };

        // Importar
        const fileInput = document.getElementById('cfg-input-import');
        document.getElementById('cfg-btn-import').onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const data = JSON.parse(ev.target.result);
              if (data.apps_instaladas) await window.kvSet('apps_instaladas', data.apps_instaladas);
              if (data.carpetas) await window.kvSet('carpetas', data.carpetas);
              if (data.ajustes) await window.kvSet('ajustes', data.ajustes);
              if (data.cuenta) await window.kvSet('cuenta', data.cuenta);
              if (data.posiciones_iconos) await window.kvSet('posiciones_iconos', data.posiciones_iconos);
              window.MyHub.toast('Datos importados. Recargando...');
              setTimeout(() => location.reload(), 1500);
            } catch (err) {
              window.MyHub.toast('Error al importar: Archivo inválido');
            }
          };
          reader.readAsText(file);
        };

        // Atajos (Hotkeys)
        document.querySelectorAll('.hotkey-key').forEach(input => {
          input.addEventListener('keydown', (e) => {
            e.preventDefault();
            if (e.key === 'Escape') { input.blur(); return; }
            
            if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && e.code !== 'ShiftLeft' && e.code !== 'ShiftRight') {
              const newCode = e.code;
              const action = input.dataset.action;
              
              for (let k in hotkeys) { if (hotkeys[k] === action) delete hotkeys[k]; }
              hotkeys[newCode] = action;
              localStorage.setItem('myhub_hotkeys', JSON.stringify(hotkeys));
              
              const displayKey = newCode.replace('Digit', '').replace('Key', '');
              input.value = `Shift + ${displayKey}`;
              input.blur();
              window.MyHub.toast('Atajo actualizado');
              playSound('click');
            } else {
              window.MyHub.toast('Debes usar Shift + una tecla');
            }
          });
        });

        refrescarIconos();
      }
    });

    observer.observe(modal, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  };

  // ================= INICIALIZACIÓN =================
  const init = () => {
    if (!window.MyHub || !getReg()) {
      setTimeout(init, 100);
      return;
    }

    inyectarEstilos();
    setupAtajosTeclado();
    setupMiniaturas();
    setupContextMenuExtendido();
    setupConfigInjection();

    // --- ENGANCHE DE SONIDOS A ACCIONES ---
    // 1. Sonido al abrir app
    const origAbrir = window.MyHub.abrir;
    window.MyHub.abrir = function(id) {
      playSound('open');
      return origAbrir.apply(this, arguments);
    };

    // 2. Sonido al cerrar app
    const origCerrar = window.MyHub.cerrar;
    window.MyHub.cerrar = function(id) {
      playSound('close');
      return origCerrar.apply(this, arguments);
    };

    // 3. Sonido al minimizar
    const origMinimizar = window.MyHub.minimizar;
    window.MyHub.minimizar = function(id) {
      playSound('minimize');
      return origMinimizar.apply(this, arguments);
    };

    // 4. Sonido del botón de Inicio
    const btnInicio = document.getElementById('inicio');
    if (btnInicio) {
      btnInicio.addEventListener('pointerdown', () => playSound('start'));
    }

    // 5. Sonido al mover ventana (se activa cuando haces clic en la barra de título)
    document.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.titlebar') && !e.target.closest('.close')) {
        playSound('move');
      }
    }, true);
    
    console.log('%c[ExtraFunc] Extensiones cargadas correctamente', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }

})();
