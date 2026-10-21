(async function() {
  'use strict';

  // Tema
  if (window.parent !== window) window.parent.postMessage({ type: 'myhub:get-tema' }, '*');
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'myhub:tema:res') {
      document.documentElement.dataset.modo = e.data.modo;
      document.documentElement.style.setProperty('--accent', e.data.color);
      const c = e.data.color;
      // Ajustar colores claros/oscuros basados en el accent
    }
  });

  // DB
  const dbP = new Promise(res => { const req = indexedDB.open('myhub-lobby', 1); req.onsuccess = () => res(req.result); });
  const kvGet = async (k) => { const db = await dbP; return new Promise(r => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => r(q.result ?? null); }); };
  const kvSet = async (k, v) => { const db = await dbP; return new Promise(r => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => r(); }); };
  const kvDel = async (k) => { const db = await dbP; return new Promise(r => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = () => r(); }); };
  const kvKeys = async () => { const db = await dbP; return new Promise(r => { const q = db.transaction('kv').objectStore('kv').getAllKeys(); q.onsuccess = () => r(q.result); }); };
  const kvAll = async () => {
    const db = await dbP; const keys = await kvKeys();
    const out = [];
    for (const k of keys) out.push({ key: k, value: await kvGet(k) });
    return out;
  };

  // Estado
  let apps = {}, folders = {}, systemApps = [];
  let currentPath = 'root'; // 'root', id_carpeta, 'db', 'storage'
  let historyStack = ['root'];
  let viewMode = 'details'; // 'details' | 'grid'
  let sortMode = 'name-asc';
  let searchQuery = '';
  let selectedIds = new Set();
  let clipboard = { action: null, ids: [] }; // 'copy' | 'cut'
  let draggedId = null;
  let dbShowSystem = false;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const refreshIcons = () => { if (window.lucide) lucide.createIcons(); };
  const toast = (m) => { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2000); };
  const formatBytes = (b) => { if (!b) return '0 B'; const k = 1024, u = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(b) / Math.log(k)); return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + u[i]; };

  function getSystemApps() {
    try { if (window.parent?.RUTAS_APPS) return window.parent.RUTAS_APPS.map(a => ({ id: a.id, titulo: a.titulo, icono: a.icono })); } catch(e){}
    return [{ id: 'papelera', titulo: 'Papelera', icono: 'trash-2' }, { id: 'forge', titulo: 'Forge', icono: 'hammer' }, { id: 'storhe', titulo: 'Stor-He', icono: 'store' }, { id: 'filhe', titulo: 'Fil-He', icono: 'hard-drive' }];
  }
  const isSystemApp = (id) => systemApps.some(a => a.id === id);

  async function loadData() {
    apps = await kvGet('apps_instaladas') || {};
    folders = await kvGet('carpetas') || {};
    systemApps = getSystemApps();
  }

  // Obtener items según ruta
  function getItems() {
    let items = [];
    if (currentPath === 'root') {
      Object.values(folders).forEach(f => items.push({ type: 'folder', id: f.id, name: f.nombre, icon: 'folder' }));
      const inFolders = new Set();
      Object.values(folders).forEach(f => f.apps.forEach(id => inFolders.add(id)));
      Object.values(apps).forEach(a => { if (!inFolders.has(a.manifest.id)) items.push({ type: 'app', id: a.manifest.id, name: a.manifest.titulo, icon: a.manifest.icono || 'box' }); });
      systemApps.forEach(a => items.push({ type: 'system', id: a.id, name: a.titulo, icon: a.icono }));
    } else if (folders[currentPath]) {
      folders[currentPath].apps.forEach(id => {
        const a = apps[id];
        if (a) items.push({ type: 'app', id, name: a.manifest.titulo, icon: a.manifest.icono || 'box' });
      });
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q));
    }
    return items.sort((a, b) => {
      if (sortMode === 'name-asc') return a.name.localeCompare(b.name);
      if (sortMode === 'name-desc') return b.name.localeCompare(a.name);
      if (sortMode === 'type') {
        const tA = a.type === 'folder' ? 0 : 1, tB = b.type === 'folder' ? 0 : 1;
        return tA !== tB ? tA - tB : a.name.localeCompare(b.name);
      }
      return 0;
    });
  }

  // Render Principal
  function render() {
    renderSidebar();
    renderBreadcrumb();
    renderContent();
    updateToolbar();
    refreshIcons();
  }

  function renderSidebar() {
    const sb = document.getElementById('sidebar');
    sb.innerHTML = '';
    
    const addGroup = (title, items) => {
      if (title) { const d = document.createElement('div'); d.className = 'nav-title'; d.textContent = title; sb.appendChild(d); }
      items.forEach(i => sb.appendChild(createNavItem(i.icon, i.label, i.path, i.id)));
    };

    addGroup(null, [
      { icon: 'home', label: 'Inicio', path: 'root' },
      { icon: 'database', label: 'Archivos de Datos', path: 'db' },
      { icon: 'monitor', label: 'Este equipo', path: 'storage' }
    ]);

    addGroup('Carpetas', Object.values(folders).map(f => ({ icon: 'folder', label: f.nombre, path: f.id, id: f.id })));
  }

  function createNavItem(icon, label, path, id = null) {
    const el = document.createElement('div');
    el.className = 'nav-item' + (currentPath === path ? ' active' : '');
    el.innerHTML = `<i data-lucide="${icon}"></i> <span>${esc(label)}</span>`;
    el.onclick = () => navigateTo(path);
    if (id) {
      el.ondragover = (e) => { if (draggedId && !isSystemApp(draggedId)) { e.preventDefault(); el.classList.add('drop-target'); } };
      el.ondragleave = () => el.classList.remove('drop-target');
      el.ondrop = async (e) => { e.preventDefault(); el.classList.remove('drop-target'); if (draggedId) await moveApp(draggedId, id); };
    }
    return el;
  }

  function renderBreadcrumb() {
    const bc = document.getElementById('breadcrumb');
    bc.innerHTML = '';
    const add = (label, path, icon) => {
      const el = document.createElement('div');
      el.className = 'bc-item' + (currentPath === path ? ' current' : '');
      el.innerHTML = `${icon ? `<i data-lucide="${icon}"></i>` : ''} <span>${esc(label)}</span>`;
      if (currentPath !== path) el.onclick = () => navigateTo(path);
      bc.appendChild(el);
    };
    if (currentPath !== 'root' && currentPath !== 'db' && currentPath !== 'storage') {
      add('Inicio', 'root', 'home');
      bc.insertAdjacentHTML('beforeend', '<span class="bc-sep">›</span>');
    }
    if (folders[currentPath]) add(folders[currentPath].nombre, currentPath, 'folder');
    else if (currentPath === 'db') add('Archivos de Datos', 'db', 'database');
    else if (currentPath === 'storage') add('Este equipo', 'storage', 'monitor');
    else if (currentPath === 'root') add('Inicio', 'root', 'home');
  }

  function renderContent() {
    const content = document.getElementById('content');
    content.innerHTML = '';
    selectedIds.clear();

    if (currentPath === 'storage') return renderStorageView(content);
    if (currentPath === 'db') return renderDBView(content);

    const items = getItems();
    document.getElementById('status-text').textContent = `${items.length} elementos`;

    if (items.length === 0) {
      content.innerHTML = `<div class="empty-state">Esta carpeta está vacía.</div>`;
      return;
    }

    if (viewMode === 'details') renderDetailsView(content, items);
    else renderIconsView(content, items);
  }

  function renderDetailsView(container, items) {
    const table = document.createElement('table');
    table.className = 'details-view';
    table.innerHTML = `
      <thead><tr>
        <th style="width: 50%">Nombre</th>
        <th style="width: 20%">Fecha de modificación</th>
        <th style="width: 20%">Tipo</th>
        <th style="width: 10%">Tamaño</th>
      </tr></thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.className = 'row';
      tr.dataset.id = item.id;
      tr.dataset.type = item.type;
      tr.draggable = item.type === 'app';

      const isLock = item.type === 'system';
      const typeStr = item.type === 'folder' ? 'Carpeta de archivos' : (item.type === 'system' ? 'Aplicación del sistema' : 'Aplicación');
      // Tamaño simulado para apps, ya que están en IDB
      const sizeStr = item.type === 'folder' ? '' : (item.type === 'system' ? '—' : 'Calculando...');

      tr.innerHTML = `
        <td class="cell-icon">
          <i data-lucide="${item.icon}"></i>
          <span>${esc(item.name)}</span>
          ${isLock ? `<i data-lucide="lock" class="cell-lock"></i>` : ''}
        </td>
        <td>${new Date().toLocaleDateString()}</td>
        <td>${typeStr}</td>
        <td>${sizeStr}</td>
      `;

      setupRowEvents(tr, item);
      tbody.appendChild(tr);
    });
    container.appendChild(table);
    refreshIcons();
  }

  function renderIconsView(container, items) {
    const grid = document.createElement('div');
    grid.className = 'grid-view';
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'grid-item';
      div.dataset.id = item.id;
      div.draggable = item.type === 'app';
      div.innerHTML = `<div class="grid-icon"><i data-lucide="${item.icon}"></i></div><div class="grid-label">${esc(item.name)}</div>`;
      setupRowEvents(div, item);
      grid.appendChild(div);
    });
    container.appendChild(grid);
    refreshIcons();
  }

  function setupRowEvents(el, item) {
    // Selección
    el.addEventListener('click', (e) => {
      if (e.ctrlKey) {
        if (selectedIds.has(item.id)) selectedIds.delete(item.id);
        else selectedIds.add(item.id);
      } else {
        selectedIds.clear();
        selectedIds.add(item.id);
      }
      updateSelectionUI();
    });

    // Doble clic
    el.addEventListener('dblclick', () => {
      if (item.type === 'folder') navigateTo(item.id);
      else if (window.parent?.MyHub) window.parent.MyHub.abrir(item.id);
    });

    // Drag & Drop
    if (item.type === 'app') {
      el.addEventListener('dragstart', (e) => { draggedId = item.id; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
      el.addEventListener('dragend', () => { draggedId = null; el.classList.remove('dragging'); });
    }
    if (item.type === 'folder') {
      el.addEventListener('dragover', (e) => { if (draggedId) { e.preventDefault(); el.classList.add('drop-target'); } });
      el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
      el.addEventListener('drop', async (e) => { e.preventDefault(); el.classList.remove('drop-target'); if (draggedId) await moveApp(draggedId, item.id); });
    }
  }

  function updateSelectionUI() {
    document.querySelectorAll('.row, .grid-item').forEach(el => {
      el.classList.toggle('selected', selectedIds.has(el.dataset.id));
    });
    updateToolbar();
  }

  function updateToolbar() {
    const hasSel = selectedIds.size > 0;
    document.getElementById('btn-cut').disabled = !hasSel;
    document.getElementById('btn-copy').disabled = !hasSel;
    document.getElementById('btn-paste').disabled = clipboard.ids.length === 0;
    
    // Delete y Rename solo si hay 1 seleccionado y NO es del sistema
    const selArray = Array.from(selectedIds);
    const singleId = selArray.length === 1 ? selArray[0] : null;
    const isSys = singleId && isSystemApp(singleId);
    
    document.getElementById('btn-delete').disabled = !hasSel || isSys;
    document.getElementById('btn-rename').disabled = singleId ? isSystemApp(singleId) : false; // Carpetas sí, apps no (a menos que quieras)
  }

  // Acciones
  function navigateTo(path) {
    currentPath = path;
    searchQuery = '';
    document.getElementById('search-input').value = '';
    document.getElementById('nav-back').disabled = false;
    render();
  }

  async function moveApp(appId, folderId) {
    if (!appId || isSystemApp(appId)) return;
    Object.values(folders).forEach(f => f.apps = f.apps.filter(x => x !== appId));
    if (folderId && folders[folderId]) folders[folderId].apps.push(appId);
    await kvSet('carpetas', folders);
    if (window.parent?.renderIconos) window.parent.renderIconos();
    toast('Movido');
    draggedId = null;
    render();
  }

  async function deleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || ids.some(isSystemApp)) return toast('No se puede eliminar apps del sistema');
    
    showConfirm('Eliminar', `¿Eliminar ${ids.length} elemento(s)?`, async () => {
      for (const id of ids) {
        if (folders[id]) delete folders[id];
        else if (apps[id]) {
          delete apps[id];
          if (window.parent?.MyHub) window.parent.MyHub.eliminarApp(id);
        }
      }
      await kvSet('apps_instaladas', apps);
      await kvSet('carpetas', folders);
      toast('Eliminado');
      if (window.parent?.renderIconos) window.parent.renderIconos();
      render();
    });
  }

  function renameSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length !== 1) return;
    const id = ids[0];
    if (folders[id]) {
      const n = prompt('Nuevo nombre:', folders[id].nombre);
      if (n && n.trim()) {
        folders[id].nombre = n.trim();
        kvSet('carpetas', folders).then(() => {
          if (window.parent?.renderIconos) window.parent.renderIconos();
          render();
        });
      }
    } else {
      toast('Solo se pueden renombrar carpetas por ahora');
    }
  }

  // Vistas Especiales (Este Equipo y DB)
  async function renderStorageView(container) {
    container.innerHTML = '<div style="padding:20px;">Calculando espacio...</div>';
    let usage = 0, quota = 0;
    if (navigator.storage?.estimate) { const est = await navigator.storage.estimate(); usage = est.usage || 0; quota = est.quota || 0; }
    
    const pct = quota ? (usage / quota) * 100 : 0;
    
    // Obtener peso de las claves
    let appsSize = 0;
    const keys = await kvAll();
    keys.forEach(k => {
      if (k.key === 'apps_instaladas' || k.key === 'carpetas') {
        appsSize += (JSON.stringify(k.value) || '').length * 2;
      }
    });

    container.innerHTML = `
      <div class="storage-view">
        <div class="storage-title"><i data-lucide="monitor"></i> Dispositivos y unidades</div>
        <div class="drives">
          <div class="drive-item">
            <div class="drive-icon"><i data-lucide="hard-drive"></i></div>
            <div class="drive-info">
              <div class="drive-name">MyHub (C:)</div>
              <div class="drive-bar-container"><div class="drive-bar safe" style="width: ${pct}%"></div></div>
              <div class="drive-text">
                <span>${formatBytes(quota - usage)} libres de ${formatBytes(quota)}</span>
                <span>${pct.toFixed(1)}% usado</span>
              </div>
            </div>
          </div>
          <div class="drive-item">
            <div class="drive-icon"><i data-lucide="archive"></i></div>
            <div class="drive-info">
              <div class="drive-name">Datos de Apps y Carpetas</div>
              <div class="drive-bar-container"><div class="drive-bar safe" style="width: 100%"></div></div>
              <div class="drive-text">
                <span>Tamaño total en IndexedDB</span>
                <span>${formatBytes(appsSize)}</span>
              </div>
            </div>
          </div>
        </div>
        <div style="margin-top: 24px;">
           <button class="btn danger" id="btn-wipe-apps"><i data-lucide="trash-2"></i> Vaciar Apps y Carpetas</button>
        </div>
      </div>
    `;
    
    document.getElementById('btn-wipe-apps').onclick = () => {
      showConfirm('Borrar todo', 'Se eliminarán todas las apps y carpetas (no tu cuenta ni ajustes).', async () => {
        await kvSet('apps_instaladas', {}); await kvSet('carpetas', {}); await kvSet('posiciones_iconos', {});
        if (window.parent?.location) window.parent.location.reload();
      });
    };
    refreshIcons();
  }

  async function renderDBView(container) {
    container.innerHTML = '<div style="padding:20px;">Cargando registros...</div>';
    const keys = await kvAll();
    const systemKeys = ['cuenta', 'ajustes', 'sesion', 'carpetas', 'apps_instaladas', 'posiciones_iconos'];
    
    const filtered = keys.filter(k => dbShowSystem || !systemKeys.includes(k.key));

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state">No hay registros.</div>`;
      return;
    }

    const table = document.createElement('table');
    table.className = 'details-view';
    table.innerHTML = `
      <thead><tr>
        <th style="width: 50%">Clave (Key)</th>
        <th style="width: 25%">Valor (Preview)</th>
        <th style="width: 15%">Tamaño</th>
        <th style="width: 10%">Acción</th>
      </tr></thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    filtered.forEach(item => {
      const tr = document.createElement('tr');
      tr.className = 'row';
      let valStr = '';
      if (item.value instanceof Blob) valStr = `[Blob: ${formatBytes(item.value.size)}]`;
      else if (typeof item.value === 'object') valStr = JSON.stringify(item.value).substring(0, 30) + '...';
      else valStr = String(item.value).substring(0, 30);

      const size = new Blob([JSON.stringify(item.value)]).size;

      tr.innerHTML = `
        <td class="cell-icon"><i data-lucide="database"></i> <span>${esc(item.key)}</span></td>
        <td style="color:var(--muted); font-family:monospace;">${esc(valStr)}</td>
        <td>${formatBytes(size)}</td>
        <td><button class="btn danger" style="padding:2px 8px; font-size:11px;">Borrar</button></td>
      `;
      
      tr.querySelector('button').onclick = () => {
        showConfirm('Borrar registro', `¿Borrar "${item.key}"?`, async () => {
          await kvDel(item.key); toast('Borrado'); renderDBView(container);
        });
      };
      tbody.appendChild(tr);
    });

    const header = document.createElement('div');
    header.style.marginBottom = '12px';
    header.innerHTML = `<label style="font-size:13px; cursor:pointer;"><input type="checkbox" id="chk-sys" ${dbShowSystem ? 'checked' : ''}> Mostrar claves del sistema</label>`;
    
    container.innerHTML = '';
    container.appendChild(header);
    container.appendChild(table);
    
    document.getElementById('chk-sys').onchange = (e) => { dbShowSystem = e.target.checked; renderDBView(container); };
    refreshIcons();
  }

  // Modales
  function showConfirm(title, msg, cb) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = msg;
    document.getElementById('modal-confirm').classList.add('open');
    document.getElementById('confirm-ok').onclick = () => { document.getElementById('modal-confirm').classList.remove('open'); cb(); };
  }

  // Eventos Globales
  document.getElementById('btn-new-folder').onclick = () => {
    document.getElementById('folder-name').value = '';
    document.getElementById('modal-folder').classList.add('open');
    setTimeout(() => document.getElementById('folder-name').focus(), 50);
  };

  document.getElementById('folder-create').onclick = async () => {
    const name = document.getElementById('folder-name').value.trim();
    if (!name) return;
    const id = 'folder_' + Date.now();
    folders[id] = { id, nombre: name, apps: [], pos: null };
    await kvSet('carpetas', folders);
    document.getElementById('modal-folder').classList.remove('open');
    if (window.parent?.renderIconos) window.parent.renderIconos();
    render();
  };

  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('.modal').classList.remove('open'));

  document.getElementById('btn-delete').onclick = deleteSelected;
  document.getElementById('btn-rename').onclick = renameSelected;
  document.getElementById('btn-copy').onclick = () => { clipboard = { action: 'copy', ids: Array.from(selectedIds) }; toast('Copiado'); updateToolbar(); };
  document.getElementById('btn-cut').onclick = () => { clipboard = { action: 'cut', ids: Array.from(selectedIds) }; toast('Cortado'); updateToolbar(); };
  
  document.getElementById('btn-paste').onclick = async () => {
    if (clipboard.ids.length === 0) return;
    const targetFolder = (folders[currentPath]) ? currentPath : null;
    
    for (const id of clipboard.ids) {
      if (isSystemApp(id)) continue;
      if (clipboard.action === 'copy') {
        // Copiar app a carpeta destino sin borrar origen
        if (targetFolder) {
          if (!folders[targetFolder].apps.includes(id)) folders[targetFolder].apps.push(id);
        }
      } else if (clipboard.action === 'cut') {
        // Mover app a carpeta
        if (targetFolder) {
          Object.values(folders).forEach(f => f.apps = f.apps.filter(x => x !== id));
          if (!folders[targetFolder].apps.includes(id)) folders[targetFolder].apps.push(id);
        } else if (currentPath === 'root') {
          Object.values(folders).forEach(f => f.apps = f.apps.filter(x => x !== id));
        }
      }
    }
    await kvSet('carpetas', folders);
    if (clipboard.action === 'cut') clipboard = { action: null, ids: [] };
    if (window.parent?.renderIconos) window.parent.renderIconos();
    render();
  };

  document.getElementById('btn-view-toggle').onclick = () => {
    viewMode = viewMode === 'details' ? 'grid' : 'details';
    renderContent();
  };

  document.getElementById('search-input').oninput = (e) => { searchQuery = e.target.value.trim(); renderContent(); };
  document.getElementById('sort-select').onchange = (e) => { sortMode = e.target.value; renderContent(); };
  
  document.getElementById('nav-up').onclick = () => navigateTo('root');
  document.getElementById('nav-back').onclick = () => navigateTo('root'); // Simplificado

  // Atajos de teclado
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Delete') deleteSelected();
    if (e.key === 'F2') renameSelected();
    if (e.key === 'Escape') selectedIds.clear(), updateSelectionUI();
    if (e.ctrlKey && e.key === 'c') document.getElementById('btn-copy').click();
    if (e.ctrlKey && e.key === 'x') document.getElementById('btn-cut').click();
    if (e.ctrlKey && e.key === 'v') document.getElementById('btn-paste').click();
  });

  // Inicio
  await loadData();
  render();
})();
