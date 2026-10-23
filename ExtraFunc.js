// ============================================================================
// ExtraFunc.js - Motor de Widgets y DocWidgets para MyHub
// ============================================================================

(function() {
  'use strict';

  const getReg = () => window.registro || (typeof registro !== 'undefined' ? registro : null);
  const refrescarIconos = () => { if (window.lucide) window.lucide.createIcons(); };

  // 1. Inyectar estilos base para el modal y FIX del Toast
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

      .extrafunc-modal-overlay { position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.2s; }
      .extrafunc-modal-overlay.active { opacity: 1; pointer-events: auto; }
      .extrafunc-modal { background: var(--glass, #fff); border: 2px solid var(--accent, #2563eb); border-radius: 16px; padding: 24px; width: 340px; max-width: 90vw; box-shadow: 0 20px 40px rgba(0,0,0,0.3); transform: scale(0.95); transition: transform 0.2s; color: var(--text, #000); }
      .extrafunc-modal-overlay.active .extrafunc-modal { transform: scale(1); }
      .extrafunc-modal h3 { margin: 0 0 10px; font-size: 16px; font-weight: 700; color: var(--text, #000); }
      .extrafunc-modal p { margin: 0 0 20px; font-size: 13px; color: var(--muted, #666); line-height: 1.4; }
      .extrafunc-modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
      .extrafunc-modal-btn { padding: 8px 16px; border-radius: 8px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: transform 0.15s, filter 0.15s; }
      .extrafunc-modal-btn:active { transform: scale(0.95); }
      .extrafunc-modal-btn.cancel { background: var(--field, #f0f0f0); color: var(--text, #000); border: 1px solid var(--line, #ccc); }
      .extrafunc-modal-btn.cancel:hover { background: var(--card, #fff); }
      .extrafunc-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: none; border-radius: 7px; background: transparent; color: var(--text, #000); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; text-align: left; transition: background 0.15s, color 0.15s; }
      .extrafunc-btn:hover { background: var(--accent, #2563eb); color: #fff; }
    `;
    document.head.appendChild(style);
  };

  let widgetsActivos = []; 
  
  // 2. Motor de Widgets
  const cargarWidgets = async () => {
    const data = await kvGet('widgets_activos') || [];
    widgetsActivos = data;
    renderWidgets();
  };

  const guardarWidgets = async () => {
    await kvSet('widgets_activos', widgetsActivos);
  };

  const renderWidgets = () => {
    let layer = document.getElementById('widgets-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'widgets-layer';
      layer.style.cssText = 'position:absolute; inset:0; pointer-events:none; z-index:0;';
      document.getElementById('desktop').appendChild(layer);
    }
    layer.innerHTML = '';

    widgetsActivos.forEach(w => {
      const el = document.createElement('div');
      el.className = 'widget-container';
      const wSize = w.size === '2x2' ? '200px' : (w.size === '2x1' ? '200px' : '100px');
      const hSize = w.size === '2x2' ? '220px' : (w.size === '2x1' ? '110px' : '110px');
      
      el.style.cssText = `
        position: absolute; left: ${w.pos?.left || '300px'}; top: ${w.pos?.top || '16px'};
        width: ${wSize}; height: ${hSize}; pointer-events: auto;
        border-radius: 16px; background: var(--glass); backdrop-filter: blur(20px);
        border: 1.5px solid var(--accent-line); box-shadow: var(--shadow-md);
        overflow: hidden; transition: transform .2s, box-shadow .2s;
        cursor: grab;
      `;

      // CONTEXTO PARA BORRAR WIDGET
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
      iframe.style.cssText = 'width:100%; height:100%; border:none; background:transparent; pointer-events: none;';
      
      const app = getReg().get(w.id);
      if (app && app.archivos && app.archivos[w.file]) {
        const blob = app.archivos[w.file];
        const reader = new FileReader();
        reader.onload = (e) => {
          let html = e.target.result;
          
          // INYECCIÓN: Lucide por CDN + Tema + Accent-Soft
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
        iframe.srcdoc = `<div style="padding:10px; color:red; font-size:12px; text-align:center;">Error: Widget no encontrado</div>`;
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
    void overlay.offsetWidth; 
    overlay.classList.add('active');
    refrescarIconos();

    const cerrarPanel = () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
    };

    modal.querySelector('.cancel').onclick = cerrarPanel;
    
    modal.querySelectorAll('.extrafunc-btn').forEach(btn => {
      btn.onclick = () => {
        const w = appsConWidgets[btn.dataset.index];
        // Posición por defecto lejos de los iconos iniciales
        widgetsActivos.push({ id: w.appId, file: w.file, size: w.size, pos: { left: '300px', top: '16px' } });
        guardarWidgets();
        renderWidgets();
        cerrarPanel();
        window.MyHub.toast('Widget añadido al escritorio');
      };
    });
  };

  document.addEventListener('contextmenu', (e) => {
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

  const descargarDocWidgets = () => {
    const doc = `
==================================================
MYHUBHESTUDIO - GUÍA DE WIDGETS
==================================================

Los widgets son pequeñas piezas de información que viven en el escritorio.
A diferencia de las apps, no se abren en ventanas, sino que se quedan fijas.

1. ¿CÓMO CREAR UN WIDGET?
Debes añadir una carpeta "Widgets" dentro de tu app (junto al index.html).
Dentro de esa carpeta, coloca un archivo .html o .js.

2. EL MANIFEST.JSON
Añade el array "widgets" a tu manifest para declararlos:
{
  "id": "clim-he",
  "titulo": "Clim-He",
  "icono": "cloud-sun",
  "main": "index.html",
  "widgets": [
    { "file": "Widgets/Clim-He.html", "size": "2x2" }
  ]
}
Tamaños permitidos: "1x1", "2x1", "2x2".

3. CREANDO EL WIDGET (HTML)
Puedes usar HTML, CSS y JS. El sistema inyectará automáticamente las variables
CSS (--accent, --text, etc.), el modo oscuro y la librería Lucide.

Ejemplo de Widget/Clim-He.html:
<div style="padding:20px; text-align:center;">
  <i data-lucide="cloud-sun" style="width:32px; height:32px;"></i>
  <h2 id="temp">--°C</h2>
  <p id="desc">Cargando clima...</p>
</div>
<script>
  // Tu lógica aquí
</script>

4. CONSEJOS DE DISEÑO
- Usa colores transparentes o hereda las variables CSS.
- No pongas fondos sólidos (el sistema ya añade el efecto cristal).
- Sé conciso. Un widget no es una app completa.

==================================================
¡Feliz creación!
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

  const init = () => {
    if (!window.MyHub || !getReg()) {
      setTimeout(init, 100);
      return;
    }
    inyectarEstilosWidgets();
    cargarWidgets();
    setupMenuWidgetsDocs();
    console.log('%c[ExtraFunc] Motor de Widgets cargado', 'color: #16a34a; font-weight: bold;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }

})();
