(async function() {
  'use strict';

  // ============ TEMA ============
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'myhub:get-tema' }, '*');
  }
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'myhub:tema:res') {
      document.documentElement.dataset.modo = e.data.modo;
      const c = e.data.color;
      document.documentElement.style.setProperty('--accent', c);
      document.documentElement.style.setProperty('--accent-soft', c + '26');
      document.documentElement.style.setProperty('--accent-line', c + '66');
    }
  });

  // ============ INDEXEDDB ============
  const dbP = new Promise((res, rej) => {
    const req = indexedDB.open('myhub-lobby', 1);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });

  async function kvGet(k) {
    const db = await dbP;
    return new Promise((res, rej) => {
      const r = db.transaction('kv').objectStore('kv').get(k);
      r.onsuccess = () => res(r.result ?? null);
      r.onerror = () => rej(r.error);
    });
  }

  async function kvSet(k, v) {
    const db = await dbP;
    return new Promise((res, rej) => {
      const t = db.transaction('kv', 'readwrite');
      t.objectStore('kv').put(v, k);
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
    });
  }

  async function kvDel(k) {
    const db = await dbP;
    return new Promise((res, rej) => {
      const t = db.transaction('kv', 'readwrite');
      t.objectStore('kv').delete(k);
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
    });
  }

  async function kvGetAll() {
    const db = await dbP;
    return new Promise((res, rej) => {
      const store = db.transaction('kv', 'readonly').objectStore('kv');
      const req = store.getAllKeys();
      req.onsuccess = async () => {
        const out = [];
        for (const k of req.result) {
          const v = await new Promise(r => {
            const g = store.get(k);
            g.onsuccess = () => r(g.result);
          });
          out.push({ key: k, value: v });
        }
        res(out);
      };
      req.onerror = () => rej(req.error);
    });
  }

  // ============ ESTADO ============
  let apps = {};
  let folders = {};
  let favorites = [];
  let systemApps = [];
  let currentView = 'root';
  let searchQuery = '';
  let sortMode = 'name-asc';
  let draggedId = null;
  let dbShowAll = false;

  // ============ HELPERS ============
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const refreshIcons = () => { if (window.lucide) lucide.createIcons(); };

  function toast(msg, ms = 2600) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), ms);
  }

  function formatBytes(b) {
    if (!b) return '0 B';
    const k = 1024, u = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + u[i];
  }

  // ============ APPS DEL SISTEMA ============
  function getSystemApps() {
    try {
      if (window.parent?.RUTAS_APPS) {
        return window.parent.RUTAS_APPS.map(a => ({ id: a.id, titulo: a.titulo, icono: a.icono }));
      }
    } catch(e) {}
    return [
      { id: 'papelera', titulo: 'Papelera', icono: 'trash-2' },
      { id: 'forge', titulo: 'Forge', icono: 'hammer' },
      { id: 'storhe', titulo: 'Stor-He', icono: 'store' },
      { id: 'filhe', titulo: 'Fil-He', icono: 'hard-drive' }
    ];
  }

  const isSystemApp = (id) => systemApps.some(a => a.id === id);

  // ============ CARGA DE DATOS ============
  async function loadData() {
    [apps, folders, favorites] = await Promise.all([
      kvGet('apps_instaladas').then(v => v || {}),
      kvGet('carpetas').then(v => v || {}),
      kvGet('filhe_favoritos').then(v => v || [])
    ]);
    systemApps = getSystemApps();

    // Limpiar huérfanos
    const cleanFavs = favorites.filter(id => apps[id] || folders[id] || isSystemApp(id));
    if (cleanFavs.length !== favorites.length) {
      favorites = cleanFavs;
      await kvSet('filhe_favoritos', favorites);
    }

    let foldersChanged = false;
    Object.values(folders).forEach(f => {
      const cleanApps = f.apps.filter(id => apps[id]);
      if (cleanApps.length !== f.apps.length) {
        f.apps = cleanApps;
        foldersChanged = true;
      }
    });
    if (foldersChanged) await kvSet('carpetas', folders);
  }

  const saveCarpetas = () => kvSet('carpetas', folders);
  const saveFavorites = () => kvSet('filhe_favoritos', favorites);

  // ============ ITEMS PARA VISTA ============
  function getItemsForView() {
    const items = [];

    if (currentView === 'root') {
      Object.values(folders).forEach(f => {
        items.push({ type: 'folder', id: f.id, name: f.nombre, icono: 'folder' });
      });

      const inFolders = new Set();
      Object.values(folders).forEach(f => f.apps.forEach(id => inFolders.add(id)));

      Object.values(apps).forEach(app => {
        if (!inFolders.has(app.manifest.id)) {
          items.push({
            type: 'app', id: app.manifest.id,
            name: app.manifest.titulo,
            icono: app.manifest.icono || 'box'
          });
        }
      });

      systemApps.forEach(a => {
        items.push({ type: 'system', id: a.id, name: a.titulo, icono: a.icono });
      });
    } else if (currentView === 'favs') {
      favorites.forEach(id => {
        if (folders[id]) {
          items.push({ type: 'folder', id, name: folders[id].nombre, icono: 'folder' });
        } else if (apps[id]) {
          items.push({
            type: 'app', id,
            name: apps[id].manifest.titulo,
            icono: apps[id].manifest.icono || 'box'
          });
        } else if (isSystemApp(id)) {
          const s = systemApps.find(a => a.id === id);
          if (s) items.push({ type: 'system', id, name: s.titulo, icono: s.icono });
        }
      });
    } else if (folders[currentView]) {
      folders[currentView].apps.forEach(appId => {
        const app = apps[appId];
        if (app) {
          items.push({
            type: 'app', id: appId,
            name: app.manifest.titulo,
            icono: app.manifest.icono || 'box'
          });
        }
      });
    }

    let result = items;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = items.filter(it => it.name.toLowerCase().includes(q));
    }

    return sortItems(result);
  }

  function sortItems(items) {
    const sorted = [...items];
    const tipo = (t) => t === 'folder' ? 0 : t === 'app' ? 1 : 2;

    switch (sortMode) {
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'type':
        sorted.sort((a, b) => {
          const t = tipo(a.type) - tipo(b.type);
          return t !== 0 ? t : a.name.localeCompare(b.name);
        });
        break;
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }

  // ============ RENDER ============
  function render() {
    renderSidebar();
    renderBreadcrumb();
    renderContent();
    refreshIcons();
  }

  function renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = '';

    nav.appendChild(makeNavItem('home', 'Inicio', 'root'));

    const fav = makeNavItem('star', 'Favoritos', 'favs');
    fav.querySelector('.nav-badge').textContent = favorites.length || '';
    nav.appendChild(fav);

    nav.appendChild(makeSeparator());

    const title = document.createElement('div');
    title.className = 'nav-title';
    title.textContent = 'Carpetas';
    nav.appendChild(title);

    Object.values(folders).forEach(f => {
      const item = makeNavItem('folder', f.nombre, f.id);
      setupSidebarFolderDrop(item, f.id);
      nav.appendChild(item);
    });

    nav.appendChild(makeSeparator());

    nav.appendChild(makeNavItem('database', 'Archivos de Datos', 'db'));
    nav.appendChild(makeNavItem('hard-drive', 'Almacenamiento', 'storage'));
  }

  function makeNavItem(icon, label, viewId) {
    const div = document.createElement('div');
    div.className = 'nav-item' + (currentView === viewId ? ' active' : '');
    div.innerHTML = `
      <i data-lucide="${icon}"></i>
      <span class="nav-label">${esc(label)}</span>
      <span class="nav-badge"></span>
    `;
    div.addEventListener('click', () => switchView(viewId));
    return div;
  }

  function makeSeparator() {
    const d = document.createElement('div');
    d.className = 'nav-sep';
    return d;
  }

  function setupSidebarFolderDrop(el, folderId) {
    el.addEventListener('dragover', (e) => {
      if (!draggedId) return;
      e.preventDefault();
      el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      if (!draggedId) return;
      await moveAppToFolder(draggedId, folderId);
    });
  }

  function renderBreadcrumb() {
    const bc = document.getElementById('breadcrumb');
    bc.innerHTML = '';

    const home = document.createElement('button');
    home.className = 'bc-item';
    home.innerHTML = `<i data-lucide="home"></i><span>Inicio</span>`;
    home.addEventListener('click', () => switchView('root'));
    if (currentView !== 'root' && folders[currentView]) {
      home.classList.add('bc-drop');
      setupBreadcrumbDrop(home);
    }
    bc.appendChild(home);

    if (folders[currentView]) {
      bc.appendChild(makeBcSep());
      const cur = document.createElement('span');
      cur.className = 'bc-item bc-current';
      cur.innerHTML = `<i data-lucide="folder"></i><span>${esc(folders[currentView].nombre)}</span>`;
      bc.appendChild(cur);
    } else if (currentView === 'favs') {
      bc.appendChild(makeBcSep());
      const cur = document.createElement('span');
      cur.className = 'bc-item bc-current';
      cur.innerHTML = `<i data-lucide="star"></i><span>Favoritos</span>`;
      bc.appendChild(cur);
    } else if (currentView === 'db') {
      bc.appendChild(makeBcSep());
      const cur = document.createElement('span');
      cur.className = 'bc-item bc-current';
      cur.innerHTML = `<i data-lucide="database"></i><span>Archivos de Datos</span>`;
      bc.appendChild(cur);
    } else if (currentView === 'storage') {
      bc.appendChild(makeBcSep());
      const cur = document.createElement('span');
      cur.className = 'bc-item bc-current';
      cur.innerHTML = `<i data-lucide="hard-drive"></i><span>Almacenamiento</span>`;
      bc.appendChild(cur);
    }

    refreshIcons();
  }

  function makeBcSep() {
    const s = document.createElement('span');
    s.className = 'bc-sep';
    s.innerHTML = `<i data-lucide="chevron-right"></i>`;
    return s;
  }

  function setupBreadcrumbDrop(el) {
    el.addEventListener('dragover', (e) => {
      if (!draggedId) return;
      e.preventDefault();
      el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      if (!draggedId) return;
      await moveAppToFolder(draggedId, null);
    });
  }

  function renderContent() {
    const content = document.getElementById('content');
    content.innerHTML = '';

    if (currentView === 'db') { renderDBView(content); return; }
    if (currentView === 'storage') { renderStorageView(content); return; }

    const items = getItemsForView();

    if (items.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <i data-lucide="inbox"></i>
          <p>${searchQuery ? 'No se encontraron resultados' : 'Esta carpeta está vacía'}</p>
        </div>`;
      refreshIcons();
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'grid';
    items.forEach(it => grid.appendChild(createTile(it)));
    content.appendChild(grid);
    refreshIcons();
  }

  function createTile(item) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.id = item.id;
    tile.dataset.type = item.type;

    if (item.type === 'app') tile.draggable = true;

    const isFav = favorites.includes(item.id);

    tile.innerHTML = `
      <div class="tile-icon">
        <i data-lucide="${item.icono}"></i>
        ${item.type === 'system' ? `<span class="tile-lock"><i data-lucide="lock"></i></span>` : ''}
        ${isFav ? `<span class="tile-fav"><i data-lucide="star"></i></span>` : ''}
      </div>
      <div class="tile-label" title="${esc(item.name)}">${esc(item.name)}</div>
      <button class="tile-menu" title="Opciones"><i data-lucide="more-vertical"></i></button>
    `;

    if (item.type === 'app') {
      tile.addEventListener('dragstart', (e) => {
        draggedId = item.id;
        tile.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
      });
      tile.addEventListener('dragend', () => {
        tile.classList.remove('dragging');
        draggedId = null;
      });
    }

    if (item.type === 'folder') {
      tile.addEventListener('dragover', (e) => {
        if (!draggedId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        tile.classList.add('drop-target');
      });
      tile.addEventListener('dragleave', () => tile.classList.remove('drop-target'));
      tile.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        tile.classList.remove('drop-target');
        if (!draggedId) return;
        await moveAppToFolder(draggedId, item.id);
      });
    }

    tile.addEventListener('click', (e) => {
      if (e.target.closest('.tile-menu')) return;
      openItem(item);
    });

    tile.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, item);
    });

    tile.querySelector('.tile-menu').addEventListener('click', (e) => {
      e.stopPropagation();
      const r = e.currentTarget.getBoundingClientRect();
      showContextMenu(r.left, r.bottom, item);
    });

    return tile;
  }

  // ============ ACCIONES ============
  function openItem(item) {
    if (item.type === 'folder') {
      switchView(item.id);
    } else if (window.parent?.MyHub) {
      window.parent.MyHub.abrir(item.id);
    } else {
      toast('No se puede abrir');
    }
  }

  async function moveAppToFolder(appId, folderId) {
    if (!appId || isSystemApp(appId)) return;
    const id = appId;
    draggedId = null;

    Object.values(folders).forEach(f => {
      f.apps = f.apps.filter(x => x !== id);
    });
    if (folderId && folders[folderId]) folders[folderId].apps.push(id);

    await saveCarpetas();

    const pos = await kvGet('posiciones_iconos') || {};
    delete pos[id];
    await kvSet('posiciones_iconos', pos);

    if (window.parent?.renderIconos) window.parent.renderIconos();
    if (window.parent?.MyHub) {
      window.parent.MyHub.toast(folderId ? 'App movida a carpeta' : 'App movida a Inicio');
    }

    setTimeout(() => render(), 0);
  }

  async function deleteApp(appId) {
    if (isSystemApp(appId)) return toast('App del sistema: no se puede eliminar');
    const app = apps[appId];
    if (!app) return;

    showConfirm(
      'Desinstalar app',
      `¿Desinstalar "${app.manifest.titulo}"? Esta acción es permanente.`,
      async () => {
        delete apps[appId];
        await kvSet('apps_instaladas', apps);

        Object.values(folders).forEach(f => {
          f.apps = f.apps.filter(x => x !== appId);
        });
        await saveCarpetas();

        favorites = favorites.filter(x => x !== appId);
        await saveFavorites();

        if (window.parent?.MyHub) {
          window.parent.MyHub.eliminarApp(appId);
          window.parent.MyHub.toast('App desinstalada');
        }
        render();
      }
    );
  }

  async function deleteFolder(folderId) {
    const f = folders[folderId];
    if (!f) return;

    showConfirm(
      'Eliminar carpeta',
      `¿Eliminar "${f.nombre}"? Las apps que contiene volverán a Inicio.`,
      async () => {
        delete folders[folderId];
        await saveCarpetas();

        favorites = favorites.filter(x => x !== folderId);
        await saveFavorites();

        if (window.parent?.renderIconos) window.parent.renderIconos();
        if (window.parent?.MyHub) window.parent.MyHub.toast('Carpeta eliminada');

        if (currentView === folderId) currentView = 'root';
        render();
      }
    );
  }

  function renameFolder(folderId) {
    const f = folders[folderId];
    if (!f) return;
    const n = prompt('Nuevo nombre:', f.nombre);
    if (!n || !n.trim() || n.trim() === f.nombre) return;
    f.nombre = n.trim().slice(0, 40);
    saveCarpetas();
    if (window.parent?.renderIconos) window.parent.renderIconos();
    toast('Carpeta renombrada');
    render();
  }

  async function toggleFavorite(id) {
    const i = favorites.indexOf(id);
    if (i > -1) {
      favorites.splice(i, 1);
      toast('Quitado de favoritos');
    } else {
      favorites.push(id);
      toast('Añadido a favoritos');
    }
    await saveFavorites();
    render();
  }

  // ============ NUEVA CARPETA ============
  function openNewFolderModal() {
    document.getElementById('folder-name').value = '';
    document.getElementById('modal-folder').classList.add('open');
    setTimeout(() => document.getElementById('folder-name').focus(), 100);
  }

  async function createFolder() {
    const input = document.getElementById('folder-name');
    const name = input.value.trim();
    if (!name) return toast('Escribe un nombre');

    const id = 'folder_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    folders[id] = { id, nombre: name, apps: [], pos: null };
    await saveCarpetas();

    document.getElementById('modal-folder').classList.remove('open');

    if (window.parent?.renderIconos) window.parent.renderIconos();
    if (window.parent?.MyHub) window.parent.MyHub.toast(`Carpeta "${name}" creada`);
    render();
  }

  // ============ VISTA ============
  function switchView(viewId) {
    currentView = viewId;
    searchQuery = '';
    document.getElementById('search-input').value = '';
    render();
  }

  // ============ CONTEXT MENU ============
  let ctxMenu = null;

  function closeContextMenu() {
    if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; }
    document.removeEventListener('click', outsideClick);
    document.removeEventListener('contextmenu', outsideClick);
  }

  function outsideClick(e) {
    if (ctxMenu && !ctxMenu.contains(e.target)) closeContextMenu();
  }

  function showContextMenu(x, y, item) {
    closeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';

    const add = (icon, label, fn, danger = false) => {
      const b = document.createElement('button');
      b.className = 'ctx-item' + (danger ? ' danger' : '');
      b.innerHTML = `<i data-lucide="${icon}"></i><span>${esc(label)}</span>`;
      b.addEventListener('click', () => { closeContextMenu(); fn(); });
      menu.appendChild(b);
    };
    const sep = () => {
      const s = document.createElement('div');
      s.className = 'ctx-sep';
      menu.appendChild(s);
    };

    if (item.type === 'folder') {
      add('folder-open', 'Abrir', () => switchView(item.id));
      add('pencil', 'Renombrar', () => renameFolder(item.id));
      add('star', favorites.includes(item.id) ? 'Quitar de favoritos' : 'Añadir a favoritos',
        () => toggleFavorite(item.id));
      sep();
      add('trash-2', 'Eliminar carpeta', () => deleteFolder(item.id), true);
    } else if (item.type === 'app') {
      add('play', 'Abrir', () => openItem(item));
      add('star', favorites.includes(item.id) ? 'Quitar de favoritos' : 'Añadir a favoritos',
        () => toggleFavorite(item.id));

      const disponibles = Object.values(folders).filter(f => !f.apps.includes(item.id));
      if (disponibles.length > 0 || folders[currentView]) {
        sep();
        disponibles.forEach(f => {
          add('folder', `Mover a: ${f.nombre}`, () => moveAppToFolder(item.id, f.id));
        });
        if (folders[currentView]) {
          add('home', 'Mover a Inicio', () => moveAppToFolder(item.id, null));
        }
      }

      sep();
      add('trash-2', 'Desinstalar', () => deleteApp(item.id), true);
    } else if (item.type === 'system') {
      add('play', 'Abrir', () => openItem(item));
      add('star', favorites.includes(item.id) ? 'Quitar de favoritos' : 'Añadir a favoritos',
        () => toggleFavorite(item.id));
      sep();
      const info = document.createElement('div');
      info.className = 'ctx-info';
      info.innerHTML = `<i data-lucide="lock"></i><span>App del sistema</span>`;
      menu.appendChild(info);
    }

    menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 60 - menu.children.length * 38) + 'px';

    document.body.appendChild(menu);
    ctxMenu = menu;
    refreshIcons();
    setTimeout(() => {
      document.addEventListener('click', outsideClick);
      document.addEventListener('contextmenu', outsideClick);
    }, 0);
  }

  // ============ CONFIRM MODAL ============
  let confirmCb = null;

  function showConfirm(title, message, onOk) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('modal-confirm').classList.add('open');
    confirmCb = onOk;
  }

  // ============ DB VIEW ============
  async function renderDBView(container) {
    container.innerHTML = '<div class="db-loading">Cargando...</div>';
    const coreKeys = ['cuenta', 'ajustes', 'sesion'];
    const idbData = await kvGetAll();

    const lsItems = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const v = localStorage.getItem(k);
      lsItems.push({ source: 'LocalStorage', key: k, value: v, size: (k + v).length * 2 });
    }

    const idbItems = idbData.map(it => {
      let str = '', size = 0;
      if (it.value instanceof Blob) { str = '[Blob]'; size = it.value.size; }
      else if (typeof it.value === 'object' && it.value !== null) {
        try { str = JSON.stringify(it.value); size = str.length * 2; }
        catch (e) { str = '[Objeto]'; }
      } else { str = String(it.value ?? ''); size = str.length * 2; }
      return { source: 'IndexedDB', key: it.key, value: str, size };
    });

    let allItems = [...lsItems, ...idbItems];
    if (!dbShowAll) allItems = allItems.filter(it => !coreKeys.includes(it.key));
    allItems.sort((a, b) => a.key.localeCompare(b.key));

    container.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'db-header';
    head.innerHTML = `
      <div class="db-info">
        <div class="db-info-item">
          <i data-lucide="database"></i>
          <span>${allItems.length} archivo(s)</span>
        </div>
        <label class="db-toggle">
          <input type="checkbox" id="db-show-all" ${dbShowAll ? 'checked' : ''}>
          <span>Mostrar archivos del sistema</span>
        </label>
      </div>
    `;
    container.appendChild(head);

    head.querySelector('#db-show-all').addEventListener('change', (e) => {
      dbShowAll = e.target.checked;
      renderDBView(container);
    });

    if (allItems.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<i data-lucide="inbox"></i><p>No hay archivos</p>`;
      container.appendChild(empty);
      refreshIcons();
      return;
    }

    const list = document.createElement('div');
    list.className = 'db-list';

    allItems.forEach(it => {
      const row = document.createElement('div');
      row.className = 'db-row';
      const preview = it.value.length > 60 ? it.value.slice(0, 60) + '…' : it.value;

      row.innerHTML = `
        <div class="db-row-icon">
          <i data-lucide="${it.source === 'LocalStorage' ? 'hard-drive' : 'database'}"></i>
        </div>
        <div class="db-row-content">
          <div class="db-row-key">${esc(it.key)}</div>
          <div class="db-row-preview">${esc(preview)}</div>
        </div>
        <div class="db-row-meta">
          <span class="db-row-source">${it.source}</span>
          <span class="db-row-size">${formatBytes(it.size)}</span>
        </div>
        <div class="db-row-actions">
          <button class="icon-btn" title="Borrar"><i data-lucide="trash-2"></i></button>
        </div>
      `;

      row.querySelector('.icon-btn').addEventListener('click', () => {
        showConfirm(
          'Borrar archivo',
          `¿Borrar "${it.key}" de ${it.source}?`,
          async () => {
            if (it.source === 'LocalStorage') localStorage.removeItem(it.key);
            else await kvDel(it.key);
            toast('Archivo borrado');
            renderDBView(container);
          }
        );
      });

      list.appendChild(row);
    });

    container.appendChild(list);
    refreshIcons();
  }

  // ============ STORAGE VIEW ============
  async function renderStorageView(container) {
    container.innerHTML = '<div class="db-loading">Calculando...</div>';
    const data = await kvGetAll();

    let idbSize = 0, appsSize = 0, otherSize = 0;
    for (const it of data) {
      let size = 0;
      if (it.value instanceof Blob) size = it.value.size;
      else if (typeof it.value === 'object' && it.value !== null) {
        try { size = JSON.stringify(it.value).length * 2; } catch (e) {}
      } else size = String(it.value ?? '').length * 2;

      idbSize += size;
      if (it.key === 'apps_instaladas' || it.key === 'carpetas') appsSize += size;
      else otherSize += size;
    }

    let usage = 0, quota = 0;
    try {
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        usage = est.usage || 0;
        quota = est.quota || 0;
      }
    } catch (e) {}

    const pct = quota > 0 ? Math.min(100, (usage / quota) * 100) : 0;

    container.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'storage-wrapper';
    wrap.innerHTML = `
      <div class="storage-card">
        <div class="storage-header">
          <h3>Almacenamiento del navegador</h3>
          <span class="storage-percent">${pct.toFixed(1)}%</span>
        </div>
        <div class="storage-bar">
          <div class="storage-fill" style="width: ${pct}%"></div>
        </div>
        <div class="storage-details">
          <div class="storage-detail">
            <span class="storage-detail-label">Usado</span>
            <span class="storage-detail-value">${formatBytes(usage)}</span>
          </div>
          <div class="storage-detail">
            <span class="storage-detail-label">Límite</span>
            <span class="storage-detail-value">${formatBytes(quota)}</span>
          </div>
          <div class="storage-detail">
            <span class="storage-detail-label">Libre</span>
            <span class="storage-detail-value">${formatBytes(quota - usage)}</span>
          </div>
        </div>
      </div>

      <div class="storage-card">
        <div class="storage-header">
          <h3>Base de datos de MyHub</h3>
          <span class="storage-percent">${formatBytes(idbSize)}</span>
        </div>
        <div class="storage-breakdown">
          <div class="storage-breakdown-item">
            <i data-lucide="package"></i>
            <div>
              <div class="storage-breakdown-label">Apps y carpetas</div>
              <div class="storage-breakdown-value">${formatBytes(appsSize)}</div>
            </div>
          </div>
          <div class="storage-breakdown-item">
            <i data-lucide="file-text"></i>
            <div>
              <div class="storage-breakdown-label">Datos de apps</div>
              <div class="storage-breakdown-value">${formatBytes(otherSize)}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="storage-card storage-danger">
        <div class="storage-header"><h3>Zona de peligro</h3></div>
        <p class="storage-danger-text">Acciones irreversibles. Úsalas con cuidado.</p>
        <div class="storage-danger-actions">
          <button class="btn btn-danger" id="danger-apps">
            <i data-lucide="trash-2"></i>
            <span>Borrar apps instaladas</span>
          </button>
          <button class="btn btn-danger" id="danger-all">
            <i data-lucide="alert-triangle"></i>
            <span>Borrar TODO</span>
          </button>
        </div>
      </div>
    `;
    container.appendChild(wrap);

    wrap.querySelector('#danger-apps').addEventListener('click', () => {
      showConfirm(
        'Borrar apps instaladas',
        'Se eliminarán todas las apps instaladas y carpetas. Las apps del sistema y tu cuenta NO se verán afectadas.',
        async () => {
          apps = {}; folders = {}; favorites = [];
          await Promise.all([
            kvSet('apps_instaladas', {}),
            kvSet('carpetas', {}),
            kvSet('posiciones_iconos', {}),
            kvSet('filhe_favoritos', [])
          ]);
          if (window.parent?.MyHub) {
            window.parent.MyHub.toast('Apps y carpetas eliminadas');
            setTimeout(() => window.parent.location.reload(), 800);
          }
        }
      );
    });

    wrap.querySelector('#danger-all').addEventListener('click', () => {
      showConfirm(
        'BORRAR TODO',
        'Se eliminarán TODOS los datos de MyHub en este navegador. Esta acción no se puede deshacer.',
        async () => {
          const db = await dbP;
          await new Promise((res) => {
            const t = db.transaction('kv', 'readwrite');
            t.objectStore('kv').clear();
            t.oncomplete = () => res();
          });
          if (window.parent?.location) window.parent.location.reload();
        }
      );
    });

    refreshIcons();
  }

  // ============ EVENTOS GLOBALES ============
  function setupEvents() {
    document.getElementById('btn-new-folder').addEventListener('click', openNewFolderModal);
    document.getElementById('folder-create').addEventListener('click', createFolder);
    document.getElementById('folder-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') createFolder();
    });

    document.querySelectorAll('[data-close]').forEach(b => {
      b.addEventListener('click', () => b.closest('.modal').classList.remove('open'));
    });

    document.getElementById('confirm-ok').addEventListener('click', () => {
      const cb = confirmCb;
      confirmCb = null;
      document.getElementById('modal-confirm').classList.remove('open');
      if (cb) cb();
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderContent();
    });

    document.getElementById('sort-select').addEventListener('change', (e) => {
      sortMode = e.target.value;
      renderContent();
    });

    const content = document.getElementById('content');
    content.addEventListener('dragover', (e) => {
      if (draggedId) e.preventDefault();
    });
    content.addEventListener('drop', async (e) => {
      if (!draggedId) return;
      e.preventDefault();
      if (folders[currentView]) await moveAppToFolder(draggedId, null);
    });

    document.querySelectorAll('.modal').forEach(m => {
      m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); });
    });

    document.addEventListener('scroll', closeContextMenu, true);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeContextMenu();
        document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
      }
    });
  }

  // ============ INICIO ============
  async function init() {
    await loadData();
    setupEvents();
    render();
  }

  init();
})();
