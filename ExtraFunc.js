// ================= Descarga de Documentación para Apps =================
window.descargarDocApps = function() {
  const doc = `
==================================================
MYHUBHESTUDIO - GUÍA DEFINITIVA DE DESARROLLO
==================================================

Bienvenido al entorno de desarrollo de MyHubHestudio. 
Has creado el Web OS definitivo para la productividad y la rapidez.
Aquí aprenderás a crear aplicaciones que se integren perfectamente.

--------------------------------------------------
1. FORMAS DE CREAR UNA APP
--------------------------------------------------
Existen 3 formas principales de integrar una app:

A) APP INSTANTÁNEA (JavaScript puro):
Ideal para apps rápidas que no necesitan un archivo HTML propio.
window.MyHub.registrarApp({
  id: 'mi-app',             // Identificador único
  titulo: 'Mi App',         // Nombre visible
  icono: 'layout',          // Icono de Lucide (https://lucide.dev/)
  contenido: (el) => {      // Función que retorna el HTML o nodo de la app
    const div = document.createElement('div');
    div.innerHTML = '<h1>Hola mundo</h1>';
    return div;
  }
});

B) APP LOCAL (Archivo HTML físico):
Ideal si tienes una carpeta con tu app. Se carga mediante un iframe.
window.MyHub.registrarApp({
  id: 'mi-app-local',
  titulo: 'Mi App Local',
  icono: 'folder',
  url: 'Apps/MiApp/index.html' // Ruta relativa desde Lobby.html
});

C) APP INSTALABLE (Archivo ZIP) - RECOMENDADO PARA DISTRIBUIR:
El usuario la instala usando "Forge" o "Stor-He".

--------------------------------------------------
2. REGLA DE ORO: 1 SOLO ARCHIVO HTML + MANIFEST
--------------------------------------------------
¡ATENCIÓN! Para garantizar que tu app cargue de forma instantánea y sin 
errores de rutas (Error 404) dentro del sistema, la app instalable 
DEBE constar únicamente de 2 archivos:

MiApp.zip
 ┣ 📜 manifest.json  (Obligatorio)
 ┗ 📜 index.html     (Obligatorio, contiene TODO el HTML, CSS y JS)

NO uses archivos separados como style.css, app.js o carpetas de imágenes.
En su lugar, integra todo dentro del index.html usando las etiquetas 
<style> para el diseño y <script> para la lógica.

--- EL MANIFEST.JSON EXPLICADO ---
{
  "id": "mi-app",             // (Obligatorio) ID único, sin espacios ni mayúsculas. Ej: "calculadora".
  "titulo": "Mi App",         // (Obligatorio) El nombre que aparecerá debajo del icono.
  "icono": "layout",          // (Obligatorio) El nombre del icono de Lucide (ej: "clock", "settings").
  "main": "index.html",       // (Obligatorio) El archivo HTML principal que se cargará.
  
  // --- CAMPOS OPCIONALES (Mejoran la vista en la tienda Stor-He) ---
  "autor": "Tu Nombre",       // (Opcional) Creador de la app.
  "descripcion": "Una app que hace cosas increíbles." // (Opcional) Breve descripción.
}

--- EJEMPLO DE INDEX.HTML TODO-EN-UNO ---
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    /* Todo tu CSS va aquí adentro */
    body { margin: 0; background: var(--card); color: var(--text); font-family: sans-serif; }
  </style>
</head>
<body>
  <h1>Mi Súper App</h1>
  <script>
    /* Todo tu JS va aquí adentro */
    console.log('App cargada correctamente');
  </script>
</body>
</html>

--------------------------------------------------
3. TAMAÑO DE PANTALLA Y LAYOUT
--------------------------------------------------
MyHubHestudio utiliza un sistema de 3 ventanas fijas (Izquierda, Centro, Derecha).
Esto significa que tu app NO ocupará toda la pantalla, sino 1/3 de ella.

- Resolución aproximada: En un monitor de 1920x1080, tu app tendrá unos ~600px de ancho.
- Tu HTML y CSS DEBEN ser responsivos. Usa siempre:
  html, body { height: 100vh; width: 100%; margin: 0; overflow: hidden; }
- Si tu app tiene muchos elementos, usa contenedores con overflow-y: auto; para que el usuario pueda hacer scroll dentro de tu app.

--------------------------------------------------
4. ESTILOS, TEMAS Y COLORES (¡OPCIONAL!)
--------------------------------------------------
Los colores y modos son mecánicas opcionales. ¡Puedes usarlas a tu placer!
Si decides adaptarte al sistema, MyHub expone variables CSS globales:

- var(--accent)     -> Color principal actual (azul, rojo, morado, etc.)
- var(--text)       -> Color del texto (se adapta a claro/oscuro)
- var(--card)       -> Color de fondo principal (blanco o gris oscuro)
- var(--field)      -> Color de inputs y áreas de texto
- var(--line)       -> Color de los bordes sutiles
- var(--muted)      -> Color del texto secundario

Para que tu app detecte el modo oscuro, MyHub le inyecta el atributo 
data-modo="oscuro" a la etiqueta <html>. Úsalo así en tu CSS:

html[data-modo="oscuro"] {
  /* Tus estilos oscuros aquí */
  background: #1a1a1a;
}

--------------------------------------------------
5. COMUNICACIÓN CON EL LOBBY (PostMessage)
--------------------------------------------------
Como tu app corre dentro de un iframe, si necesitas datos del usuario o del sistema,
debes usar window.parent.postMessage.

--- Obtener el Perfil del Usuario ---
window.parent.postMessage({ type: 'myhub:perfil' }, '*');

window.addEventListener('message', (e) => {
  if (e.data?.type === 'myhub:perfil:res') {
    console.log('Datos:', e.data.data);
    // Retorna: { nombre, apellido, nacimiento, genero, pais, idioma, foto (Base64) }
  }
});

--- Obtener el Tema Actual ---
window.parent.postMessage({ type: 'myhub:get-tema' }, '*');

window.addEventListener('message', (e) => {
  if (e.data?.type === 'myhub:tema:res') {
    console.log('Color:', e.data.color); // Ej: '#2563eb'
    console.log('Modo:', e.data.modo);   // 'claro' u 'oscuro'
  }
});

--------------------------------------------------
6. API GLOBAL ÚTIL
--------------------------------------------------
- window.MyHub.toast('Mensaje');  // Muestra una notificación flotante en el sistema
- window.MyHub.cerrar('mi-app');  // Cierra la ventana de tu app por su ID

==================================================
Hecho con amor para MyHubHestudio. ¡Feliz código!
`;

  const blob = new Blob([doc], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'DocApps_MyHub.txt';
  document.body.appendChild(a);
  a.click();
  
  // Limpieza
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};


/* ============================================================================
   ============ EXTRAS: Carpetas, Minimizar, Quick Launch, Status Pill ========
   ============================================================================ */
(function() {
  'use strict';

  let carpetas = {};
  let pinnedApps = [];
  const minimized = new Set();
  let ready = false;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const refrescarIconos = () => { if (window.lucide) window.lucide.createIcons(); };

  // Puente para capturar variables de JsLobby
  const exposeGlobals = setInterval(() => {
    if (typeof registro !== 'undefined' && !window.registro) {
      window.registro = registro;
      window.orden = orden;
      window.win = win;
      window.posicionesIconos = posicionesIconos;
      window.hacerArrastrable = hacerArrastrable;
      window.renderIconos = renderIconos;
      window.abrir = abrir;
      window.cerrar = cerrar;
      window.renderTareas = renderTareas;
      console.log('[Extras] Variables de JsLobby capturadas.');
    }
  }, 50);

  /* ---------- IndexedDB ---------- */
  let dbPromise = null;
  const getDB = () => {
    if (!dbPromise) {
      dbPromise = new Promise((res, rej) => {
        const req = indexedDB.open('myhub-lobby', 1);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
    }
    return dbPromise;
  };
  async function kvGet(k) {
    const db = await getDB();
    return new Promise((res, rej) => {
      const r = db.transaction('kv').objectStore('kv').get(k);
      r.onsuccess = () => res(r.result ?? null);
      r.onerror = () => rej(r.error);
    });
  }
  async function kvSet(k, v) {
    const db = await getDB();
    return new Promise((res, rej) => {
      const t = db.transaction('kv', 'readwrite');
      t.objectStore('kv').put(v, k);
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
    });
  }
  const guardarCarpetas = () => kvSet('carpetas', carpetas);
  const guardarPinned  = () => kvSet('pinned_apps', pinnedApps);

  /* ---------- Helpers ---------- */
  function appsEnCarpetas() {
    const s = new Set();
    Object.values(carpetas).forEach(c => c.apps.forEach(id => s.add(id)));
    return s;
  }
  function limpiarCarpetasHuerfanas() {
    if (typeof window.registro === 'undefined') return;
    let changed = false;
    Object.values(carpetas).forEach(f => {
      const orig = f.apps.length;
      f.apps = f.apps.filter(id => window.registro.has(id));
      if (f.apps.length !== orig) changed = true;
    });
    if (changed) guardarCarpetas();
  }

  /* ---------- Inyección de CSS ---------- */
  function injectStyles() {
    if (document.getElementById('myhub-extras-style')) return;
    const style = document.createElement('style');
    style.id = 'myhub-extras-style';
    style.textContent = `
      /* ===== Quick Launch ===== */
      #quicklaunch {
        display: flex; gap: 4px; padding: 0 6px; margin: 0 2px;
        border-right: 1px solid var(--line); align-items: center;
      }
      #quicklaunch:empty { display: none; }
      .quick-btn {
        width: 38px; height: 38px; border: none; border-radius: 10px;
        background: transparent; color: var(--text); cursor: pointer; padding: 0;
        display: flex; align-items: center; justify-content: center;
        transition: background .15s, color .15s, transform .15s var(--ease-spring);
      }
      .quick-btn:hover { background: var(--accent-soft); color: var(--accent); }
      .quick-btn:active { transform: scale(.9); }
      .quick-btn svg { width: 20px; height: 20px; }

      /* ===== Status Pill (Batería + Fecha + Reloj) ===== */
      .status-pill {
        display: flex; align-items: center; gap: 12px;
        background: var(--accent-soft); border: 1px solid var(--accent-line);
        border-radius: 12px; padding: 6px 14px;
        font-size: 13px; font-weight: 600; color: var(--accent);
        margin-left: auto; font-variant-numeric: tabular-nums;
      }
      .status-item { display: flex; align-items: center; gap: 6px; }
      .status-item svg { width: 16px; height: 16px; color: currentColor; }
      .status-item.low { color: #ef4444; }
      #clock {
        margin: 0 !important; padding: 0 !important;
        background: transparent !important; color: inherit !important;
        font-size: inherit !important; font-weight: inherit !important;
      }
      @media (max-width: 860px) { .status-item.date { display: none; } }
      @media (max-width: 680px) { .status-item.battery { display: none; } }

      /* ===== Botón minimizar ===== */
      .close.minimize:hover { background: #f59e0b; color: #fff; }
      .task.minimized { opacity: 0.55; }
      .task.minimized.active { opacity: 0.75; }

      /* ===== Icono de carpeta ===== */
      .icon.folder-icon .ico { position: relative; overflow: hidden; }
      .folder-previews {
        display: flex; flex-wrap: wrap; gap: 2px;
        width: 74%; height: 74%; align-items: center; justify-content: center;
      }
      .folder-mini {
        width: calc(50% - 1px); height: calc(50% - 1px);
        display: flex; align-items: center; justify-content: center;
        background: var(--field); border-radius: 3px; color: var(--accent);
        border: 1px solid var(--line); overflow: hidden; flex-shrink: 0;
      }
      .folder-mini svg { width: 60%; height: 60%; }
      .folder-mini[data-single] { width: 82%; height: 82%; border-radius: 6px; }

      /* ===== Modal Carpeta ===== */
      .folder-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
        gap: 12px; padding: 8px 0;
      }
      .folder-item {
        display: flex; flex-direction: column; align-items: center; gap: 6px;
        padding: 10px 6px; border-radius: 10px; cursor: pointer;
        transition: background .15s; color: var(--text);
      }
      .folder-item:hover { background: var(--accent-soft); }
      .folder-item .ico {
        width: 46px; height: 46px; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        background: var(--card); border: 1.5px solid var(--accent-line); color: var(--accent);
      }
      .folder-item .ico svg { width: 22px; height: 22px; }
      .folder-item span {
        font-size: 12px; font-weight: 600; text-align: center;
        max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  /* =========================================================================
     FEATURE 1: CARPETAS
     ========================================================================= */
  function overrideRenderIconos() {
    window.renderIconos = function renderIconosExt() {
      const iconsEl = document.getElementById('icons');
      const desktopEl = document.getElementById('desktop');
      if (!iconsEl || !desktopEl) return;
      iconsEl.innerHTML = '';

      const MARGEN = 16, GX = 100, GY = 110;
      const deskH = desktopEl.clientHeight || window.innerHeight - 90;
      const maxRows = Math.max(1, Math.floor((deskH - MARGEN) / GY));
      const maxY = MARGEN + (maxRows - 1) * GY;
      const inFolder = appsEnCarpetas();

      inFolder.forEach(id => { delete window.posicionesIconos[id]; });

      const items = [];
      (typeof window.orden !== 'undefined' ? window.orden : []).forEach(id => {
        if (inFolder.has(id)) return;
        const app = window.registro.get(id);
        if (app) items.push({ kind: 'app', id, app });
      });
      Object.values(carpetas).forEach(f => items.push({ kind: 'folder', id: f.id, folder: f }));

      const used = new Set();
      const posUpdates = {};

      items.forEach((item) => {
        let savedPos = item.kind === 'app' ? window.posicionesIconos[item.id] : item.folder.pos;
        let tx = -1, ty = -1;

        if (savedPos) {
          const sx = parseFloat(savedPos.left), sy = parseFloat(savedPos.top);
          const key = `${sx}-${sy}`;
          if (!used.has(key) && sy <= maxY && !isNaN(sx) && !isNaN(sy)) {
            tx = sx; ty = sy; used.add(key);
          }
        }
        if (tx === -1) {
          let col = 0, row = 0, found = false;
          while (!found) {
            const x = MARGEN + col * GX, y = MARGEN + row * GY;
            const key = `${x}-${y}`;
            if (!used.has(key)) { tx = x; ty = y; used.add(key); found = true; }
            else { row++; if (row >= maxRows) { row = 0; col++; } }
          }
        }

        if (item.kind === 'app') {
          posUpdates[item.id] = { left: tx + 'px', top: ty + 'px' };
        } else {
          item.folder.pos = { left: tx + 'px', top: ty + 'px' };
        }

        const el = document.createElement('div');
        el.className = 'icon';
        el.style.left = tx + 'px';
        el.style.top = ty + 'px';

        if (item.kind === 'app') {
          el.dataset.appId = item.id;
          el.innerHTML = `<div class="ico"><i data-lucide="${esc(item.app.icono || 'app-window')}"></i></div><span>${esc(item.app.titulo)}</span>`;
          el.addEventListener('contextmenu', (e) => { e.stopPropagation(); contextoApp(e, item.id); });
          window.hacerArrastrable(el, item.id, maxRows, maxY);
        } else {
          el.classList.add('folder-icon');
          el.dataset.folderId = item.id;
          const apps = item.folder.apps.slice(0, 4);
          let previews;
          if (apps.length === 1) {
            const a = window.registro.get(apps[0]);
            previews = a ? `<div class="folder-mini" data-single><i data-lucide="${esc(a.icono || 'app-window')}"></i></div>` : '';
          } else {
            previews = apps.map(aid => {
              const a = window.registro.get(aid);
              return a ? `<div class="folder-mini"><i data-lucide="${esc(a.icono || 'app-window')}"></i></div>` : '';
            }).join('');
          }
          el.innerHTML = `<div class="ico"><div class="folder-previews">${previews}</div></div><span>${esc(item.folder.nombre)}</span>`;
          el.addEventListener('contextmenu', (e) => { e.stopPropagation(); contextoCarpeta(e, item.id); });
          hacerArrastrableCarpeta(el, item.id, maxRows, maxY);
        }

        iconsEl.appendChild(el);
      });

      window.posicionesIconos = Object.assign(window.posicionesIconos, posUpdates);
      kvSet('posiciones_iconos', window.posicionesIconos);
      if (Object.keys(carpetas).length > 0) guardarCarpetas();

      refrescarIconos();
    };
  }

  function hacerArrastrableCarpeta(el, folderId, maxRows, maxY) {
    const MARGEN = 16, GX = 100, GY = 110;
    let isDragging = false, startX, startY, startLeft, startTop;

    el.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      isDragging = false;
      el.setPointerCapture(e.pointerId);
      const parentRect = el.parentElement.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startLeft = rect.left - parentRect.left;
      startTop = rect.top - parentRect.top;
      el.classList.add('dragging');

      const mover = ev => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging = true;
        if (!isDragging) return;
        const maxLeft = el.parentElement.clientWidth - el.clientWidth - MARGEN;
        let nl = Math.max(MARGEN, Math.min(startLeft + dx, maxLeft));
        let nt = Math.max(MARGEN, Math.min(startTop + dy, maxY));
        el.style.left = nl + 'px'; el.style.top = nt + 'px';
      };
      const soltar = () => {
        window.removeEventListener('pointermove', mover);
        window.removeEventListener('pointerup', soltar);
        el.classList.remove('dragging');

        if (isDragging) {
          let cl = parseFloat(el.style.left) || MARGEN;
          let ct = parseFloat(el.style.top) || MARGEN;
          let sx = Math.round((cl - MARGEN) / GX) * GX + MARGEN;
          let sy = Math.round((ct - MARGEN) / GY) * GY + MARGEN;
          const maxLeft = el.parentElement.clientWidth - el.clientWidth - MARGEN;
          sx = Math.max(MARGEN, Math.min(sx, maxLeft));

          let invalid = sy > maxY;
          document.querySelectorAll('.icon').forEach(iconEl => {
            if (iconEl === el) return;
            if (parseFloat(iconEl.style.left) === sx && parseFloat(iconEl.style.top) === sy) invalid = true;
          });

          if (invalid) {
            el.style.left = startLeft + 'px'; el.style.top = startTop + 'px';
            window.MyHub.toast('Posición inválida u ocupada');
          } else {
            el.style.left = sx + 'px'; el.style.top = sy + 'px';
            if (carpetas[folderId]) {
              carpetas[folderId].pos = { left: sx + 'px', top: sy + 'px' };
              guardarCarpetas();
            }
          }
        } else {
          abrirCarpeta(folderId);
        }
      };
      window.addEventListener('pointermove', mover);
      window.addEventListener('pointerup', soltar);
    });
  }

  function setupDragDetection() {
    const iconsEl = document.getElementById('icons');
    if (!iconsEl) return;

    let dragTracking = null;

    iconsEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const icon = e.target.closest('.icon[data-app-id]');
      if (!icon) return;
      dragTracking = { appId: icon.dataset.appId, startX: e.clientX, startY: e.clientY, moved: false };
    }, true);

    window.addEventListener('pointermove', (e) => {
      if (!dragTracking) return;
      const dx = e.clientX - dragTracking.startX;
      const dy = e.clientY - dragTracking.startY;
      if (Math.hypot(dx, dy) > 5) dragTracking.moved = true;
    });

    window.addEventListener('pointerup', (e) => {
      if (!dragTracking) return;
      const { appId, moved } = dragTracking;
      dragTracking = null;
      if (!moved) return;
      const folder = getFolderAtPoint(e.clientX, e.clientY);
      if (folder) moverAppACarpeta(appId, folder.id);
    });
  }

  function getFolderAtPoint(x, y) {
    const folders = document.querySelectorAll('.icon.folder-icon');
    for (const el of folders) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return { id: el.dataset.folderId, el };
      }
    }
    return null;
  }

  async function crearCarpeta(nombre, appsIniciales = []) {
    try {
      const id = 'folder_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      carpetas[id] = { id, nombre: nombre || 'Nueva carpeta', apps: appsIniciales.slice(), pos: null };
      appsIniciales.forEach(a => { delete window.posicionesIconos[a]; });
      await guardarCarpetas();
      await kvSet('posiciones_iconos', window.posicionesIconos);
      window.renderIconos();
      window.MyHub.toast(`Carpeta "${carpetas[id].nombre}" creada`);
    } catch (err) {
      console.error(err);
      window.MyHub.toast('Error al guardar la carpeta');
    }
  }

  async function eliminarCarpeta(folderId, eliminarApps = false) {
    const folder = carpetas[folderId];
    if (!folder) return;
    if (eliminarApps && window.MyHub?.eliminarApp) {
      folder.apps.forEach(id => window.MyHub.eliminarApp(id));
    }
    delete carpetas[folderId];
    await guardarCarpetas();
    window.renderIconos();
    window.MyHub.toast('Carpeta eliminada');
  }

  async function moverAppACarpeta(appId, folderId) {
    const folder = carpetas[folderId];
    if (!folder || folder.apps.includes(appId)) return;
    folder.apps.push(appId);
    delete window.posicionesIconos[appId];
    await guardarCarpetas();
    await kvSet('posiciones_iconos', window.posicionesIconos);
    window.renderIconos();
    window.MyHub.toast(`App movida a "${folder.nombre}"`);
  }

  function abrirCarpeta(folderId) {
    const folder = carpetas[folderId];
    if (!folder) return;
    window.abrirModal(folder.nombre, vistaCarpetaContenido(folderId));
  }

  function vistaCarpetaContenido(folderId) {
    return (recargar) => {
      const d = document.createElement('div');
      const folder = carpetas[folderId];
      if (!folder) return d;

      if (folder.apps.length === 0) {
        d.innerHTML = `<p style="text-align:center;color:var(--muted);padding:26px 12px;font-size:14px;line-height:1.5;">
          Esta carpeta está vacía.<br><small>Arrastra apps del escritorio sobre el icono de la carpeta.</small>
        </p>`;
        return d;
      }

      const grid = document.createElement('div');
      grid.className = 'folder-grid';

      folder.apps.forEach(appId => {
        const app = window.registro.get(appId);
        if (!app) return;
        const item = document.createElement('div');
        item.className = 'folder-item';
        item.innerHTML = `<div class="ico"><i data-lucide="${esc(app.icono || 'app-window')}"></i></div><span>${esc(app.titulo)}</span>`;
        item.onclick = () => { window.cerrarModal(); window.abrir(appId); };
        item.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          mostrarContexto(e.clientX, e.clientY, [
            { icon: 'play', text: 'Abrir', fn: () => { window.cerrarModal(); window.abrir(appId); } },
            { separator: true },
            { icon: 'folder-minus', text: 'Sacar de la carpeta', fn: async () => {
              folder.apps = folder.apps.filter(a => a !== appId);
              await guardarCarpetas();
              window.renderIconos();
              window.MyHub.toast('App sacada de la carpeta');
              recargar();
            }}
          ]);
        });
        grid.appendChild(item);
      });

      d.appendChild(grid);
      return d;
    };
  }

  // Modal propio con estilos en línea (100% a prueba de fallos)
  function promptCarpeta(titulo, defaultValue, callback) {
    console.log('[Extras] Abriendo modal de carpeta');
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
    `;
    const box = document.createElement('div');
    box.style.cssText = `
      background: var(--card, #fff); color: var(--text, #000);
      padding: 24px; border-radius: 16px;
      border: 2px solid var(--accent, #2563eb);
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      width: 320px; max-width: 90vw;
      display: flex; flex-direction: column; gap: 12px;
    `;
    box.innerHTML = `
      <h3 style="margin:0;font-size:16px;font-weight:700;">${esc(titulo)}</h3>
      <input type="text" id="prompt-input" value="${esc(defaultValue)}" maxlength="24" style="
        padding: 10px; border-radius: 8px; border: 1.5px solid var(--line, #ccc);
        background: var(--field, #f0f0f0); color: var(--text, #000); font: inherit; outline: none;
      ">
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
        <button id="prompt-cancel" style="padding:8px 16px;border-radius:8px;border:1px solid var(--line, #ccc);background:transparent;color:inherit;cursor:pointer;">Cancelar</button>
        <button id="prompt-ok" style="padding:8px 16px;border-radius:8px;border:none;background:var(--accent, #2563eb);color:#fff;cursor:pointer;font-weight:600;">Aceptar</button>
      </div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const input = box.querySelector('#prompt-input');
    input.focus();
    input.select();

    const close = () => overlay.remove();
    
    box.querySelector('#prompt-cancel').onclick = close;
    box.querySelector('#prompt-ok').onclick = () => {
      const val = input.value.trim();
      close();
      if (val) callback(val);
    };
    input.onkeydown = (e) => {
      if (e.key === 'Enter') box.querySelector('#prompt-ok').click();
      if (e.key === 'Escape') close();
    };
  }

  /* =========================================================================
     FEATURE 2: MINIMIZAR VENTANAS
     ========================================================================= */
  function setupMinimize() {
    const origAbrir = window.abrir;
    window.abrir = async function (id) {
      const wasOpen = !!window.win[id];
      await origAbrir.call(this, id);
      if (!wasOpen && window.win[id]) addMinimizeButton(id);
    };

    const origCerrar = window.cerrar;
    window.cerrar = function (id) {
      minimized.delete(id);
      return origCerrar.call(this, id);
    };

    // Observar el taskbar para aplicar estilos visuales sin reescribir renderTareas
    const tasksContainer = document.getElementById('tasks');
    if (tasksContainer) {
      const observer = new MutationObserver(() => {
        Array.from(tasksContainer.children).forEach((t, i) => {
          const id = Object.keys(window.win)[i];
          if (id && minimized.has(id)) {
            t.classList.add('minimized');
          } else {
            t.classList.remove('minimized');
          }
        });
      });
      observer.observe(tasksContainer, { childList: true, subtree: true });

      // Interceptar clic para restaurar ventanas minimizadas
      tasksContainer.addEventListener('pointerdown', (e) => {
        const task = e.target.closest('.task');
        if (!task) return;
        const index = Array.from(tasksContainer.children).indexOf(task);
        const id = Object.keys(window.win)[index];
        if (id && minimized.has(id)) {
          e.stopPropagation();
          e.preventDefault();
          restaurar(id);
        }
      }, true);
    }
  }

  function addMinimizeButton(id) {
    const w = window.win[id];
    if (!w || w.el.querySelector('.minimize')) return;
    const closeBtn = w.el.querySelector('.close');
    if (!closeBtn) return;
    const btn = document.createElement('button');
    btn.className = 'close minimize';
    btn.setAttribute('aria-label', 'Minimizar');
    btn.title = 'Minimizar';
    btn.innerHTML = '<i data-lucide="minus"></i>';
    btn.onclick = (e) => { e.stopPropagation(); minimizar(id); };
    closeBtn.parentNode.insertBefore(btn, closeBtn);
    refrescarIconos();
  }

  function minimizar(id) {
    const w = window.win[id];
    if (!w) return;
    minimized.add(id);
    w.el.style.display = 'none';
    
    // Forzar actualización del taskbar
    const tasksContainer = document.getElementById('tasks');
    if (tasksContainer) {
      Array.from(tasksContainer.children).forEach((t, i) => {
        const tid = Object.keys(window.win)[i];
        if (tid === id) t.classList.add('minimized');
      });
    }
  }

  function restaurar(id) {
    const w = window.win[id];
    if (!w) { minimized.delete(id); return; }
    minimized.delete(id);
    w.el.style.display = '';
    
    // Simular un clic en el taskbar para que JsLobby lo enfoque
    const tasksContainer = document.getElementById('tasks');
    if (tasksContainer) {
      const index = Object.keys(window.win).indexOf(id);
      if (index !== -1 && tasksContainer.children[index]) {
        Array.from(tasksContainer.children).forEach((t, i) => {
          if (i === index) t.classList.remove('minimized');
        });
        // Enfocar la ventana
        window.win[id].el.style.zIndex = 5;
        window.win[id].el.classList.add('focused');
      }
    }
  }

  /* =========================================================================
     FEATURE 3: ACCESOS RÁPIDOS (Quick Launch)
     ========================================================================= */
  function renderQuickLaunch() {
    const taskbar = document.getElementById('taskbar');
    const inicio = document.getElementById('inicio');
    if (!taskbar || !inicio) return;

    let ql = document.getElementById('quicklaunch');
    if (!ql) {
      ql = document.createElement('div');
      ql.id = 'quicklaunch';
      inicio.parentNode.insertBefore(ql, inicio.nextSibling);
    }

    ql.innerHTML = '';
    pinnedApps.forEach(appId => {
      const app = window.registro.get(appId);
      if (!app) return;
      const btn = document.createElement('button');
      btn.className = 'quick-btn';
      btn.title = app.titulo;
      btn.innerHTML = `<i data-lucide="${esc(app.icono || 'app-window')}"></i>`;
      btn.onclick = () => window.abrir(appId);
      ql.appendChild(btn);
    });
    refrescarIconos();
  }

  async function togglePinned(appId) {
    const i = pinnedApps.indexOf(appId);
    if (i > -1) pinnedApps.splice(i, 1);
    else pinnedApps.push(appId);
    await guardarPinned();
    renderQuickLaunch();
    window.MyHub.toast(pinnedApps.includes(appId) ? 'Fijado a la barra' : 'Quitado de la barra');
  }

  /* =========================================================================
     FEATURE 4 y 5: STATUS PILL (Batería + Fecha + Reloj)
     ========================================================================= */
  function setupStatusPill() {
    const clock = document.getElementById('clock');
    if (!clock || document.getElementById('status-pill')) return;

    const pill = document.createElement('div');
    pill.id = 'status-pill';
    pill.className = 'status-pill';
    
    clock.parentNode.insertBefore(pill, clock);
    pill.appendChild(clock);

    const batteryEl = document.createElement('div');
    batteryEl.className = 'status-item battery';
    pill.insertBefore(batteryEl, clock);
    
    const updateBattery = (battery) => {
      if (!battery) {
        batteryEl.innerHTML = `<i data-lucide="battery"></i>`;
        refrescarIconos();
        return;
      }
      const level = Math.round(battery.level * 100);
      const charging = battery.charging;
      
      let icon = 'battery';
      if (charging) icon = 'battery-charging';
      else if (level >= 90) icon = 'battery-full';
      else if (level >= 60) icon = 'battery-medium';
      else if (level >= 30) icon = 'battery-low';
      else icon = 'battery-warning';
      
      batteryEl.innerHTML = `<i data-lucide="${icon}"></i><span>${level}%</span>`;
      refrescarIconos();
      
      if (level <= 20 && !charging) batteryEl.classList.add('low');
      else batteryEl.classList.remove('low');
    };

    if (navigator.getBattery) {
      navigator.getBattery().then(battery => {
        updateBattery(battery);
        battery.addEventListener('levelchange', () => updateBattery(battery));
        battery.addEventListener('chargingchange', () => updateBattery(battery));
      }).catch(() => { batteryEl.style.display = 'none'; });
    } else {
      batteryEl.style.display = 'none';
    }

    const dateEl = document.createElement('div');
    dateEl.className = 'status-item date';
    pill.insertBefore(dateEl, clock);

    const updateDate = () => {
      const now = new Date();
      const wd = now.toLocaleDateString('es', { weekday: 'short' });
      const day = now.getDate();
      const mo = now.toLocaleDateString('es', { month: 'short' });
      dateEl.innerHTML = `<i data-lucide="calendar"></i><span>${wd} ${day} ${mo}`.replace(/\./g, '') + '</span>';
      refrescarIconos();
    };
    updateDate();
    setInterval(updateDate, 60000);
  }

  /* =========================================================================
     MENÚS CONTEXTUALES (Estilos en línea para evitar fallos)
     ========================================================================= */
  let ctxMenu = null;

  function mostrarContexto(x, y, items) {
    console.log('[Extras] Mostrando menú contextual en', x, y);
    cerrarContexto();
    
    // Backdrop invisible para detectar clics fuera
    const backdrop = document.createElement('div');
    backdrop.style.cssText = 'position:fixed;inset:0;z-index:499;';
    backdrop.addEventListener('pointerdown', (e) => {
      if (e.button === 0) cerrarContexto();
    });

    ctxMenu = document.createElement('div');
    ctxMenu.style.cssText = `
      position: fixed;
      left: ${Math.min(x, window.innerWidth - 220)}px;
      top: ${Math.min(y, window.innerHeight - 60 - items.length * 36)}px;
      background: var(--glass, rgba(255,255,255,0.95));
      backdrop-filter: blur(20px);
      border: 1.5px solid var(--accent-line, #ccc);
      border-radius: 10px;
      padding: 6px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      z-index: 500;
      min-width: 190px;
      color: var(--text, #000);
      display: flex;
      flex-direction: column;
    `;

    items.forEach(item => {
      if (item.separator) {
        const hr = document.createElement('hr');
        hr.style.cssText = 'border:none;border-top:1px solid var(--line, #eee);margin:4px 2px;';
        ctxMenu.appendChild(hr);
        return;
      }
      const b = document.createElement('button');
      b.style.cssText = `
        display: flex; align-items: center; gap: 10px;
        width: 100%; padding: 9px 12px; border: none; border-radius: 7px;
        background: transparent; color: inherit;
        font: inherit; font-size: 13px; font-weight: 500;
        cursor: pointer; text-align: left;
        transition: background 0.15s, color 0.15s;
      `;
      b.onmouseover = () => { b.style.background = 'var(--accent, #2563eb)'; b.style.color = '#fff'; };
      b.onmouseout = () => { b.style.background = 'transparent'; b.style.color = 'inherit'; };
      
      b.innerHTML = `<i data-lucide="${item.icon || 'circle'}"></i><span>${esc(item.text)}</span>`;
      b.onclick = () => { cerrarContexto(); item.fn(); };
      ctxMenu.appendChild(b);
    });

    document.body.appendChild(backdrop);
    document.body.appendChild(ctxMenu);
    ctxMenu._backdrop = backdrop;
    refrescarIconos();
  }

  function cerrarContexto() {
    if (ctxMenu) {
      if (ctxMenu._backdrop) ctxMenu._backdrop.remove();
      ctxMenu.remove();
      ctxMenu = null;
    }
  }

  function contextoApp(e, appId) {
    e.preventDefault();
    const app = window.registro.get(appId);
    if (!app) return;
    const pinned = pinnedApps.includes(appId);

    const items = [
      { icon: 'play', text: 'Abrir', fn: () => window.abrir(appId) },
      { separator: true },
      { icon: pinned ? 'pin-off' : 'pin', text: pinned ? 'Quitar de la barra' : 'Fijar a la barra', fn: () => togglePinned(appId) },
      { icon: 'folder-plus', text: 'Nueva carpeta con esta app', fn: () => {
        promptCarpeta('Nueva carpeta con esta app', 'Nueva carpeta', (nombre) => crearCarpeta(nombre, [appId]));
      }}
    ];

    if (Object.keys(carpetas).length > 0) {
      items.push({ separator: true });
      Object.values(carpetas).forEach(f => {
        if (f.apps.includes(appId)) return;
        items.push({ icon: 'folder', text: `Mover a: ${f.nombre}`, fn: () => moverAppACarpeta(appId, f.id) });
      });
    }
    mostrarContexto(e.clientX, e.clientY, items);
  }

  function contextoDesktop(e) {
    console.log('[Extras] Click derecho detectado en el escritorio');
    if (e.target.closest('.icon') || e.target.closest('.win') || e.target.closest('.menu') || e.target.closest('#taskbar')) return;
    e.preventDefault();
    mostrarContexto(e.clientX, e.clientY, [
      { icon: 'folder-plus', text: 'Nueva carpeta', fn: () => {
        promptCarpeta('Nueva carpeta', 'Nueva carpeta', (nombre) => crearCarpeta(nombre));
      }}
    ]);
  }

  function contextoCarpeta(e, folderId) {
    e.preventDefault();
    const folder = carpetas[folderId];
    if (!folder) return;
    mostrarContexto(e.clientX, e.clientY, [
      { icon: 'folder-open', text: 'Abrir', fn: () => abrirCarpeta(folderId) },
      { separator: true },
      { icon: 'pencil', text: 'Renombrar', fn: () => {
        promptCarpeta('Renombrar carpeta', folder.nombre, (nuevo) => {
          if (nuevo && nuevo.trim()) {
            folder.nombre = nuevo.trim();
            guardarCarpetas();
            window.renderIconos();
          }
        });
      }},
      { icon: 'folder-minus', text: 'Vaciar (sacar todas las apps)', fn: async () => {
        folder.apps.forEach(a => { delete window.posicionesIconos[a]; });
        folder.apps = [];
        await guardarCarpetas();
        await kvSet('posiciones_iconos', window.posicionesIconos);
        window.renderIconos();
        window.MyHub.toast('Carpeta vaciada');
      }},
      { icon: 'trash-2', text: 'Eliminar carpeta', fn: () => {
        if (confirm('¿Eliminar esta carpeta? Las apps volverán al escritorio.')) {
          eliminarCarpeta(folderId, false);
        }
      }}
    ]);
  }

  /* =========================================================================
     NUEVA CARPETA EN EL MENÚ DE INICIO
     ========================================================================= */
  function setupMenuOption() {
    const menuOps = document.getElementById('menuOps');
    if (!menuOps) return;
    
    const injectButton = () => {
      if (document.getElementById('menu-nueva-carpeta')) return;
      const docBtn = Array.from(menuOps.children).find(el => el.textContent.includes('DocApps'));
      if (!docBtn) return;

      const btn = document.createElement('button');
      btn.id = 'menu-nueva-carpeta';
      btn.className = 'menu-op';
      btn.innerHTML = `<i data-lucide="folder-plus"></i><span>Nueva carpeta</span>`;
      btn.onclick = (e) => {
        e.stopPropagation();
        const menu = document.getElementById('menu');
        if (menu) menu.classList.add('hidden');
        promptCarpeta('Nueva carpeta', 'Nueva carpeta', (nombre) => crearCarpeta(nombre));
      };
      menuOps.insertBefore(btn, docBtn.nextSibling);
      refrescarIconos();
      console.log('[Extras] Botón "Nueva carpeta" inyectado en el menú de inicio');
    };

    injectButton();
    const observer = new MutationObserver(injectButton);
    observer.observe(menuOps, { childList: true });
  }

  /* =========================================================================
     SETUP
     ========================================================================= */
  async function setup() {
    if (ready) return;
    ready = true;
    console.log('[Extras] Setup iniciado');

    carpetas = (await kvGet('carpetas')) || {};
    pinnedApps = (await kvGet('pinned_apps')) || [];

    injectStyles();
    limpiarCarpetasHuerfanas();
    overrideRenderIconos();
    setupMinimize();
    
    setupStatusPill();
    renderQuickLaunch();
    setupDragDetection();
    setupMenuOption();

    const desktopEl = document.getElementById('desktop');
    if (desktopEl) {
      desktopEl.addEventListener('contextmenu', contextoDesktop);
      console.log('[Extras] Evento contextmenu asociado');
    }

    window.renderIconos();
  }

  function waitForLobby() {
    if (window.MyHub && window.registro && window.renderIconos && window.abrir) {
      setup().catch(err => console.error('[Extras] Error en setup:', err));
    } else {
      setTimeout(waitForLobby, 50);
    }
  }
  setTimeout(waitForLobby, 0);
})();
