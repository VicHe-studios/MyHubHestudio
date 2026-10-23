// ============================================================================
// ExtraFunc.js - Motor de Widgets y DocWidgets para MyHub
// ============================================================================

(function() {
  'use strict';

  const getReg = () => window.registro || (typeof registro !== 'undefined' ? registro : null);
  const refrescarIconos = () => { if (window.lucide) window.lucide.createIcons(); };

  const MARGEN = 16, GX = 100, GY = 110;

  const inyectarEstilosWidgets = () => {
    if (document.getElementById('widgets-style')) return;
    const style = document.createElement('style');
    style.id = 'widgets-style';
    style.textContent = `
      @keyframes dropInFixed {
        0% { opacity: 0; transform: translate(-50%, -10px); }
        100% { opacity: 1; transform: translate(-50%, 0); }
      }
      .toast { animation: dropInFixed .3s var(--ease-out) !important; }

      .widget-container {
        user-select: none;
        -webkit-user-select: none;
      }

      .extrafunc-modal-overlay { position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.2s; }
      .extrafunc-modal-overlay.active { opacity: 1; pointer-events: auto; }
      .extrafunc-modal { background: var(--glass, #fff); border: 2px solid var(--accent, #2563eb); border-radius: 16px; padding: 24px; width: 340px; max-width: 90vw; box-shadow: 0 20px 40px rgba(0,0,0,0.3); transform: scale(0.95); transition: transform 0.2s; color: var(--text, #000); }
      .extrafunc-modal-overlay.active .extrafunc-modal { transform: scale(1); }
      .extrafunc-modal h3 { margin: 0 0 10px; font-size: 18px; font-weight: 700; color: var(--text, #000); letter-spacing: -0.02em; }
      .extrafunc-modal p { margin: 0 0 20px; font-size: 13px; color: var(--muted, #666); line-height: 1.4; }
      .extrafunc-modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
      .extrafunc-modal-btn { padding: 8px 16px; border-radius: 8px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: transform 0.15s, filter 0.15s; }
      .extrafunc-modal-btn:active { transform: scale(0.95); }
      .extrafunc-modal-btn.cancel { background: var(--field, #f0f0f0); color: var(--text, #000); border: 1px solid var(--line, #ccc); }
      .extrafunc-modal-btn.cancel:hover { background: var(--card, #fff); }
      
      .widget-list-item { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 16px; border: 1px solid var(--line); border-radius: 10px; background: var(--field); color: var(--text); font: inherit; cursor: pointer; transition: all 0.15s; text-align: left; box-sizing: border-box; }
      .widget-list-item:hover { background: var(--accent-soft); border-color: var(--accent-line); transform: translateY(-1px); }
      .widget-list-item i { width: 20px; height: 20px; color: var(--accent); flex-shrink: 0; }
      .widget-list-info { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-width: 0; }
      .widget-list-title { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
      .widget-list-size { font-size: 11px; color: var(--muted); text-transform: uppercase; }
    `;
    document.head.appendChild(style);
  };

  let widgetsActivos = []; 
  window.getWidgetsActivos = () => widgetsActivos;
  
  const cargarWidgets = async () => {
    const data = await kvGet('widgets_activos') || [];
    widgetsActivos = data;
    renderWidgets();
  };

  const guardarWidgets = async () => {
    await kvSet('widgets_activos', widgetsActivos);
  };

  const getWidgetCells = (size) => {
    if (size === '2x2') return { cols: 2, rows: 2 };
    if (size === '2x1') return { cols: 2, rows: 1 };
    return { cols: 1, rows: 1 };
  };

  const findClosestFreeSpot = (size, targetLeft, targetTop) => {
    const { cols, rows } = getWidgetCells(size);
    const desk = document.getElementById('desktop');
    const maxRows = Math.max(1, Math.floor((desk.clientHeight - MARGEN) / GY));
    const maxCols = Math.max(1, Math.floor((desk.clientWidth - MARGEN) / GX));

    const ocupadas = new Set();
    if (typeof posicionesIconos !== 'undefined') {
      Object.values(posicionesIconos).forEach(pos => {
        const c = Math.round((parseFloat(pos.left) - MARGEN) / GX);
        const r = Math.round((parseFloat(pos.top) - MARGEN) / GY);
        ocupadas.add(`${c}-${r}`);
      });
    }

    widgetsActivos.forEach(w => {
      if (!w.pos) return;
      const wc = Math.round((parseFloat(w.pos.left) - MARGEN) / GX);
      const wr = Math.round((parseFloat(w.pos.top) - MARGEN) / GY);
      const wsize = getWidgetCells(w.size);
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

    for (let r = 0; r < maxRows; r++) {
      for (let c = 0; c < maxCols; c++) {
        let libre = true;
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            if (ocupadas.has(`${c + i}-${r + j}`)) libre = false;
          }
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
    return bestSpot || { left: `${MARGEN}px`, top: `${MARGEN}px` };
  };

  const checkCollision = (rect1, rect2) => {
    return !(rect1.right <= rect2.left || rect1.left >= rect2.right || rect1.bottom <= rect2.top || rect1.top >= rect2.bottom);
  };

  const renderWidgets = () => {
    let layer = document.getElementById('widgets-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'widgets-layer';
      layer.style.cssText = 'position:absolute; inset:0; pointer-events:none; z-index:2;';
      document.getElementById('desktop').appendChild(layer);
    }
    layer.innerHTML = '';

    widgetsActivos.forEach(w => {
      const el = document.createElement('div');
      el.className = 'widget-container';
      
      const wSize = w.size === '2x2' ? '190px' : (w.size === '2x1' ? '190px' : '90px');
      const hSize = w.size === '2x2' ? '210px' : (w.size === '2x1' ? '100px' : '100px');
      
      el.style.cssText = `
        position: absolute; left: ${w.pos?.left || '116px'}; top: ${w.pos?.top || '16px'};
        width: ${wSize}; height: ${hSize}; pointer-events: auto;
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
            { icon: 'trash-2', text: 'Eliminar Widget', fn: () => {
              widgetsActivos = widgetsActivos.filter(item => item !== w);
              guardarWidgets();
              renderWidgets();
              window.MyHub.toast('Widget eliminado');
            }}
          ]);
        }
      });
      
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:100%; height:100%; border:none; background:transparent; pointer-events: none; user-select: none; -webkit-user-drag: none;';
      
      const app = getReg().get(w.id);
      if (app && app.archivos && app.archivos[w.file]) {
        const blob = app.archivos[w.file];
        const reader = new FileReader();
        reader.onload = (e) => {
          let html = e.target.result;
          
          const themeInjection = `
            <script src="https://unpkg.com/lucide@latest"><\/script>
            <script>
              document.documentElement.dataset.modo = '${document.documentElement.dataset.modo}';
              document.documentElement.style.setProperty('--accent', '${getComputedStyle(document.documentElement).getPropertyValue('--accent')}');
              const hex = '${getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().replace('#', '')}';
              if (hex.length === 6) {
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                document.documentElement.style.setProperty('--accent-soft', 'rgba(' + r + ', ' + g + ', ' + b + ', 0.15)');
              }
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
        iframe.srcdoc = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#ef4444; font-size:12px; text-align:center; padding:10px; box-sizing:border-box;">
          <b>Error: Widget no encontrado</b><br>
          <small style="opacity:0.7">${w.file}</small>
        </div>`;
      }

      el.appendChild(iframe);
      hacerArrastrableWidget(el, w);
      layer.appendChild(el);
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
        
        el.style.zIndex = '';
        el.style.transform = '';
        el.style.boxShadow = '';
        
        if (isDragging) {
          let snapX = Math.round((parseFloat(el.style.left) - MARGEN) / GX) * GX + MARGEN;
          let snapY = Math.round((parseFloat(el.style.top) - MARGEN) / GY) * GY + MARGEN;

          const deskW = document.getElementById('desktop').clientWidth;
          const deskH = document.getElementById('desktop').clientHeight;
          const wW = el.offsetWidth;
          const wH = el.offsetHeight;
          
          snapX = Math.max(MARGEN, Math.min(snapX, deskW - wW - MARGEN));
          snapY = Math.max(MARGEN, Math.min(snapY, deskH - wH - MARGEN));

          el.style.transition = 'none';
          el.style.left = snapX + 'px';
          el.style.top = snapY + 'px';

          const snapRect = el.getBoundingClientRect();
          let colision = false;

          document.querySelectorAll('.icon').forEach(icon => {
            if (checkCollision(snapRect, icon.getBoundingClientRect())) colision = true;
          });

          if (!colision) {
            document.querySelectorAll('.widget-container').forEach(other => {
              if (other === el) return;
              if (checkCollision(snapRect, other.getBoundingClientRect())) colision = true;
            });
          }

          el.style.transition = 'left .3s var(--ease-spring), top .3s var(--ease-spring), transform .2s, box-shadow .2s';

          if (colision) {
            const safeSpot = findClosestFreeSpot(widgetData.size, snapX, snapY);
            el.style.left = safeSpot.left;
            el.style.top = safeSpot.top;
            widgetData.pos = safeSpot;
            guardarWidgets();
            window.MyHub.toast('Espacio ocupado. Reubicando...');
          } else {
            widgetData.pos = { left: el.style.left, top: el.style.top };
            guardarWidgets();
          }
        } else {
          el.style.transition = 'left .2s, top .2s, transform .2s, box-shadow .2s';
        }
      };
      window.addEventListener('pointermove', mover);
      window.addEventListener('pointerup', soltar);
    });
  };

  const abrirPanelWidgets = () => {
    const appsConWidgets = [];
    getReg().forEach((app, id) => {
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
    const modal = document.createElement('div');
    modal.className = 'extrafunc-modal';
    modal.style.width = '400px';
    
    modal.innerHTML = `
      <h3>Añadir Widget</h3>
      <p>Elige un widget para colocarlo en tu escritorio.</p>
      <div style="display:flex; flex-direction:column; gap:10px; max-height:240px; overflow-y:auto; padding: 8px; margin: -8px; box-sizing: border-box;">
        ${appsConWidgets.map((w, i) => `
          <button class="widget-list-item" data-index="${i}">
            <i data-lucide="layout-grid"></i>
            <div class="widget-list-info">
                <span class="widget-list-title">${w.titulo}</span>
                <span class="widget-list-size">Tamaño: ${w.size}</span>
            </div>
          </button>
        `).join('')}
      </div>
      <div class="extrafunc-modal-actions">
        <button class="extrafunc-modal-btn cancel">Cerrar</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    void overlay.offsetWidth; 
    overlay.classList.add('active');
    refrescarIconos();

    const cerrarPanel = () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
    };

    modal.querySelector('.cancel').onclick = cerrarPanel;
    
    modal.querySelectorAll('.widget-list-item').forEach(btn => {
      btn.onclick = () => {
        const w = appsConWidgets[btn.dataset.index];
        const pos = findClosestFreeSpot(w.size, 116, 16);
        widgetsActivos.push({ id: w.appId, file: w.file, size: w.size, pos });
        guardarWidgets();
        renderWidgets();
        cerrarPanel();
        window.MyHub.toast('Widget añadido al escritorio');
      };
    });
  };

  // ================= GESTIÓN DE MENÚ CONTEXTUAL =================
  document.addEventListener('contextmenu', (e) => {
    // 1. EVITAR QUE SE INYECTE SI ESTAMOS EN UNA CARPETA (MODAL)
    if (e.target.closest('#modal')) return;

    // 2. Evitar el menú nativo de Chrome en el escritorio
    e.preventDefault(); 
    
    // 3. No mostrar el menú de widgets si estamos en un icono, ventana o taskbar
    if (e.target.closest('.icon') || e.target.closest('.win') || e.target.closest('#taskbar') || e.target.closest('.widget-container')) return;
    
    setTimeout(() => {
      const menus = document.querySelectorAll('div[style*="z-index: 500"]');
      const menu = menus[menus.length - 1];
      if (menu && !menu.querySelector('.extrafunc-btn-widget')) {
        const hr = document.createElement('hr');
        hr.style.cssText = 'border:none;border-top:1px solid var(--line);margin:4px 2px;';
        menu.appendChild(hr);
        
        const btnWidget = document.createElement('button');
        btnWidget.className = 'extrafunc-btn extrafunc-btn-widget';
        btnWidget.innerHTML = `<i data-lucide="layout-grid"></i><span>Gestión de Widgets</span>`;
        btnWidget.onclick = () => {
          if (typeof cerrarContexto === 'function') cerrarContexto();
          else menu.remove();
          abrirPanelWidgets();
        };
        menu.appendChild(btnWidget);
        refrescarIconos();
      }
    }, 20);
  }, true);

  // ================= INTERCEPTOR DE COLISIONES (APPS SOBRE WIDGETS) =================
  let dragStartIcon = null;
  let dragStartPos = null;

  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const icon = e.target.closest('.icon');
    if (icon) {
      dragStartIcon = icon;
      dragStartPos = { left: icon.style.left, top: icon.style.top };
    }
  }, true);

  window.addEventListener('pointerup', (e) => {
    if (!dragStartIcon) return;
    const icon = dragStartIcon;
    const startPos = dragStartPos;
    dragStartIcon = null;
    dragStartPos = null;

    setTimeout(() => {
      if (!icon.parentElement) return; 
      const rect = icon.getBoundingClientRect();
      let collision = false;

      document.querySelectorAll('.widget-container').forEach(w => {
        const wRect = w.getBoundingClientRect();
        if (!(rect.right <= wRect.left || rect.left >= wRect.right || rect.bottom <= wRect.top || rect.top >= wRect.bottom)) {
          collision = true;
        }
      });

      if (collision) {
        icon.style.left = startPos.left;
        icon.style.top = startPos.top;
        if (icon.dataset.appId) {
          const id = icon.dataset.appId;
          if (typeof posicionesIconos !== 'undefined') {
            posicionesIconos[id] = startPos;
            kvSet('posiciones_iconos', posicionesIconos);
          }
        } else if (icon.dataset.folderId) {
          const folderId = icon.dataset.folderId;
          if (typeof carpetas !== 'undefined' && carpetas[folderId]) {
            carpetas[folderId].pos = startPos;
            guardarCarpetas();
          }
        }
        window.MyHub.toast('No puedes colocar iconos sobre un widget');
      }
    }, 50);
  }, true);

  const descargarDocWidgets = () => {
    const doc = `
==================================================
MYHUBHESTUDIO - GUÍA DE WIDGETS
==================================================
[Los mismos textos de la guía...]
==================================================
`;
    const blob = new Blob([doc], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'DocWidgets.txt';
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  };

  const setupMenuWidgetsDocs = () => {
    const menuOps = document.getElementById('menuOps');
    if (!menuOps) return;

    const injectButton = () => {
      if (document.getElementById('menu-doc-widgets')) return;
      const docBtn = Array.from(menuOps.children).find(el => el.textContent.includes('DocApps'));
      if (!docBtn) return;

      const btn = document.createElement('button');
      btn.id = 'menu-doc-widgets';
      btn.className = 'menu-op';
      btn.innerHTML = `<i data-lucide="layout-dashboard"></i><span>DocWidgets</span>`;
      btn.onclick = (e) => {
        e.stopPropagation();
        const menu = document.getElementById('menu');
        if (menu) menu.classList.add('hidden');
        descargarDocWidgets();
      };
      menuOps.insertBefore(btn, docBtn.nextSibling);
      refrescarIconos();
    };

    injectButton();
    const observer = new MutationObserver(injectButton);
    observer.observe(menuOps, { childList: true });
  };

  const hookEliminarApp = () => {
    if (!window.MyHub || !window.MyHub.eliminarApp || window.MyHub._eliminarAppHook) return;
    
    const origEliminar = window.MyHub.eliminarApp;
    window.MyHub.eliminarApp = function(appId) {
      const widgetsRestantes = widgetsActivos.filter(w => w.id !== appId);
      
      if (widgetsRestantes.length !== widgetsActivos.length) {
        widgetsActivos = widgetsRestantes;
        guardarWidgets();
        renderWidgets();
        if (window.MyHub.toast) window.MyHub.toast('Widgets asociados eliminados');
      }

      return origEliminar.call(this, appId);
    };
    
    window.MyHub._eliminarAppHook = true;
  };

  const init = () => {
    if (!window.MyHub || !getReg()) {
      setTimeout(init, 100);
      return;
    }
    inyectarEstilosWidgets();
    cargarWidgets();
    setupMenuWidgetsDocs();
    hookEliminarApp();
    console.log('%c[ExtraFunc] Motor de Widgets cargado', 'color: #16a34a; font-weight: bold;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }

})();
