  // ================= SISTEMA DE WIDGETS =================
  let widgetsActivos = []; // Guarda { id, file, size, pos: {left, top} }
  
  // 1. Cargar posiciones guardadas
  const cargarWidgets = async () => {
    const data = await kvGet('widgets_activos') || [];
    widgetsActivos = data;
    renderWidgets();
  };

  const guardarWidgets = async () => {
    await kvSet('widgets_activos', widgetsActivos);
  };

  // 2. Renderizar en el escritorio
  const renderWidgets = () => {
    let layer = document.getElementById('widgets-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'widgets-layer';
      layer.style.cssText = 'position:absolute; inset:0; pointer-events:none; z-index:0;'; // Z-index 0 para estar debajo de los iconos (z-index 1)
      document.getElementById('desktop').appendChild(layer);
    }
    layer.innerHTML = '';

    widgetsActivos.forEach(w => {
      const el = document.createElement('div');
      el.className = 'widget-container';
      // Asignamos tamaño según 'size' (1x1, 2x1, 2x2)
      const wSize = w.size === '2x2' ? '200px' : (w.size === '2x1' ? '200px' : '100px');
      const hSize = w.size === '2x2' ? '220px' : (w.size === '2x1' ? '110px' : '110px');
      
      el.style.cssText = `
        position: absolute; left: ${w.pos?.left || '20px'}; top: ${w.pos?.top || '20px'};
        width: ${wSize}; height: ${hSize}; pointer-events: auto;
        border-radius: 16px; background: var(--glass); backdrop-filter: blur(20px);
        border: 1.5px solid var(--accent-line); box-shadow: var(--shadow-md);
        overflow: hidden; transition: transform .2s, box-shadow .2s;
        cursor: grab;
      `;
      
      // Crear iframe para aislar el HTML/JS del widget
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:100%; height:100%; border:none; background:transparent;';
      
      // Buscar la app y el archivo del widget
      const app = getReg().get(w.id);
      if (app && app.archivos && app.archivos[w.file]) {
        const blob = app.archivos[w.file];
        const reader = new FileReader();
        reader.onload = (e) => {
          // Inyectar el tema al widget
          let html = e.target.result;
          const themeInjection = `
            <script>
              document.documentElement.dataset.modo = '${document.documentElement.dataset.modo}';
              document.documentElement.style.setProperty('--accent', '${getComputedStyle(document.documentElement).getPropertyValue('--accent')}');
            </script>
          `;
          // Si es HTML, lo inyectamos directo. Si es JS, lo envolvemos.
          if (w.file.endsWith('.js')) {
             html = `<html><head><style>body{margin:0;color:var(--text);font-family:sans-serif;}</style></head><body><script>${html}<\/script></body></html>`;
          } else {
             html = html.replace('</head>', `${themeInjection}</head>`);
          }
          iframe.srcdoc = html;
        };
        reader.readAsText(blob);
      } else {
        iframe.srcdoc = `<div style="padding:10px; color:red; font-size:12px;">Error: Widget no encontrado</div>`;
      }

      el.appendChild(iframe);
      
      // Lógica de arrastre de Widgets
      hacerArrastrableWidget(el, w);
      layer.appendChild(el);
    });
  };

  // 3. Lógica de arrastre (Snap al grid de 100x110)
  const hacerArrastrableWidget = (el, widgetData) => {
    let isDragging = false, startX, startY, startLeft, startTop;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('iframe')) { /* Permitir clics en el iframe pero no arrastrar desde ahí */ }
      isDragging = false;
      el.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY;
      startLeft = parseFloat(el.style.left); startTop = parseFloat(el.style.top);
      
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
          // Snap a la cuadrícula (MARGEN 16, GX 100, GY 110)
          const snapX = Math.round((parseFloat(el.style.left) - 16) / 100) * 100 + 16;
          const snapY = Math.round((parseFloat(el.style.top) - 16) / 110) * 110 + 16;
          el.style.left = snapX + 'px';
          el.style.top = snapY + 'px';
          
          widgetData.pos = { left: el.style.left, top: el.style.top };
          guardarWidgets();
        }
      };
      window.addEventListener('pointermove', mover);
      window.addEventListener('pointerup', soltar);
    });
  };

  // 4. Panel para elegir qué widgets añadir
  const abrirPanelWidgets = () => {
    // Buscar todas las apps que tengan widgets en su manifest
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

    // Crear modal
    const overlay = document.createElement('div');
    overlay.className = 'extrafunc-modal-overlay active';
    const modal = document.createElement('div');
    modal.className = 'extrafunc-modal';
    modal.style.width = '400px';
    
    modal.innerHTML = `
      <h3>Añadir Widget</h3>
      <p>Elige un widget para colocarlo en tu escritorio.</p>
      <div style="display:flex; flex-direction:column; gap:8px; max-height:200px; overflow-y:auto;">
        ${appsConWidgets.map((w, i) => `
          <button class="extrafunc-btn" data-index="${i}" style="border:1px solid var(--line); background:var(--field);">
            <i data-lucide="layout-grid"></i>
            <span>${w.titulo} (${w.size})</span>
          </button>
        `).join('')}
      </div>
      <div class="extrafunc-modal-actions">
        <button class="extrafunc-modal-btn cancel">Cerrar</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    refrescarIconos();

    modal.querySelector('.cancel').onclick = () => overlay.remove();
    modal.querySelectorAll('.extrafunc-btn').forEach(btn => {
      btn.onclick = () => {
        const w = appsConWidgets[btn.dataset.index];
        widgetsActivos.push({ id: w.appId, file: w.file, size: w.size, pos: { left: '20px', top: '20px' } });
        guardarWidgets();
        renderWidgets();
        overlay.remove();
        window.MyHub.toast('Widget añadido al escritorio');
      };
    });
  };

  // 5. Inyectar opción en el menú contextual (clic derecho en escritorio)
  document.addEventListener('contextmenu', (e) => {
    // Solo en el escritorio, no en iconos ni ventanas
    if (e.target.closest('.icon') || e.target.closest('.win') || e.target.closest('#taskbar')) return;
    
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

  // Inicializar sistema
  cargarWidgets();
