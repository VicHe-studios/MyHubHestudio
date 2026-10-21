(async function() {
  // Tema
  if (window.parent !== window) window.parent.postMessage({ type: 'myhub:get-tema' }, '*');
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'myhub:tema:res') {
      document.documentElement.dataset.modo = e.data.modo;
      document.documentElement.style.setProperty('--accent', e.data.color);
      document.documentElement.style.setProperty('--accent-soft', e.data.color + '26');
    }
  });

  // Base de datos
  const dbP = new Promise((resolve) => {
    const req = indexedDB.open('myhub-lobby', 1);
    req.onsuccess = () => resolve(req.result);
  });
  const kvGet = async (k) => {
    const db = await dbP;
    return new Promise((res) => {
      const r = db.transaction('kv').objectStore('kv').get(k);
      r.onsuccess = () => res(r.result ?? null);
    });
  };
  const kvSet = async (k, v) => {
    const db = await dbP;
    return new Promise((res) => {
      const t = db.transaction('kv', 'readwrite');
      t.objectStore('kv').put(v, k);
      t.oncomplete = () => res();
    });
  };
  const kvDelete = async (k) => {
    const db = await dbP;
    return new Promise((res) => {
      const t = db.transaction('kv', 'readwrite');
      t.objectStore('kv').delete(k);
      t.oncomplete = () => res();
    });
  };

  let appsObj = {};
  let carpetasObj = {};
  let currentView = 'root';
  let draggedAppId = null;

  const systemApps = [
    { id: 'papelera', titulo: 'Papelera', icono: 'trash-2' },
    { id: 'forge', titulo: 'Forge', icono: 'hammer' },
    { id: 'storhe', titulo: 'Stor-He', icono: 'store' },
    { id: 'filhe', titulo: 'Fil-He', icono: 'hard-drive' }
  ];

  const init = async () => {
    appsObj = await kvGet('apps_instaladas') || {};
    carpetasObj = await kvGet('carpetas') || {};
    renderSidebar();
    renderView();
    if (window.lucide) lucide.createIcons();
  };

  const renderSidebar = () => {
    const foldersContainer = document.getElementById('sidebar-folders');
    foldersContainer.innerHTML = '';
    
    Object.values(carpetasObj).forEach(folder => {
      const div = document.createElement('div');
      div.className = `menu-item ${currentView === folder.id ? 'active' : ''}`;
      div.onclick = () => switchView(folder.id);
      div.innerHTML = `<i data-lucide="folder"></i> ${folder.nombre}`;
      
      // Drop en barra lateral
      div.ondragover = (e) => { e.preventDefault(); div.classList.add('drop-target'); };
      div.ondragleave = () => div.classList.remove('drop-target');
      div.ondrop = async (e) => {
        e.preventDefault();
        div.classList.remove('drop-target');
        if (draggedAppId) await moverAppACarpeta(draggedAppId, folder.id);
      };
      foldersContainer.appendChild(div);
    });
    
    document.querySelectorAll('.menu-item[data-view]').forEach(el => {
      el.classList.toggle('active', el.dataset.view === currentView);
    });
    document.getElementById('nav-root').classList.toggle('active', currentView === 'root');
  };

  const renderView = () => {
    const listView = document.getElementById('view-files');
    const dbView = document.getElementById('view-db');
    const storageView = document.getElementById('view-storage');
    const breadcrumb = document.getElementById('breadcrumb');
    const btnNew = document.getElementById('btn-new-folder');
    const filesContainer = document.getElementById('files-container');

    listView.style.display = 'none';
    dbView.style.display = 'none';
    storageView.style.display = 'none';
    btnNew.style.display = 'flex';
    filesContainer.innerHTML = '';

    if (currentView === 'storage') {
      storageView.style.display = 'flex';
      btnNew.style.display = 'none';
      breadcrumb.innerHTML = `<i data-lucide="pie-chart" style="width:16px;height:16px;color:var(--muted)"></i> Almacenamiento`;
      updateStorageInfo();
      return;
    }

    if (currentView === 'db') {
      dbView.style.display = 'flex';
      btnNew.style.display = 'none';
      breadcrumb.innerHTML = `<i data-lucide="database" style="width:16px;height:16px;color:var(--muted)"></i> Archivos de Datos`;
      renderDBView();
      return;
    }

    listView.style.display = 'flex';
    let itemsToRender = [];
    
    if (currentView === 'root') {
      breadcrumb.innerHTML = `<i data-lucide="home" style="width:16px;height:16px;color:var(--muted)"></i> Inicio`;
      
      // Carpetas
      Object.values(carpetasObj).forEach(f => {
        itemsToRender.push({ type: 'folder', id: f.id, name: f.nombre, icon: 'folder' });
      });

      // Apps Instaladas
      const appsInFolders = new Set();
      Object.values(carpetasObj).forEach(f => f.apps.forEach(id => appsInFolders.add(id)));
      Object.values(appsObj).forEach(a => {
        if (!appsInFolders.has(a.manifest.id)) {
          itemsToRender.push({ type: 'app', id: a.manifest.id, name: a.manifest.titulo, icon: a.manifest.icono || 'box' });
        }
      });

      // Apps del Sistema
      systemApps.forEach(a => {
        itemsToRender.push({ type: 'system', id: a.id, name: a.titulo, icon: a.icono });
      });

    } else {
      const folder = carpetasObj[currentView];
      if (!folder) return switchView('root');
      breadcrumb.innerHTML = `<i data-lucide="folder" style="width:16px;height:16px;color:var(--muted)"></i> ${folder.nombre}`;
      
      folder.apps.forEach(appId => {
        const app = appsObj[appId];
        if (app) itemsToRender.push({ type: 'app', id: appId, name: app.manifest.titulo, icon: app.manifest.icono || 'box' });
      });
    }

    if (itemsToRender.length === 0) {
      filesContainer.innerHTML = `<div style="text-align:center; color:var(--muted); padding:40px; font-size:13px;">Esta carpeta está vacía.</div>`;
    }

    itemsToRender.forEach(item => {
      const row = document.createElement('div');
      row.className = 'file-row';
      
      // Configurar Drag & Drop (solo apps)
      if (item.type === 'app') {
        row.draggable = true;
        row.ondragstart = (e) => {
          draggedAppId = item.id;
          row.classList.add('dragging');
          e.dataTransfer.setData('text/plain', item.id);
          e.dataTransfer.effectAllowed = 'move';
        };
        row.ondragend = () => {
          draggedAppId = null;
          row.classList.remove('dragging');
        };
      }

      // Configurar Drop (solo carpetas)
      if (item.type === 'folder') {
        row.ondragover = (e) => { e.preventDefault(); row.classList.add('drag-over'); };
        row.ondragleave = () => row.classList.remove('drag-over');
        row.ondrop = async (e) => {
          e.preventDefault();
          e.stopPropagation();
          row.classList.remove('drag-over');
          if (draggedAppId) await moverAppACarpeta(draggedAppId, item.id);
        };
      }

      let lockHtml = item.type === 'system' ? `<div class="lock-icon"><i data-lucide="lock" style="width:14px;height:14px;"></i></div>` : '';
      let actionHtml = '';
      
      if (item.type === 'app') {
        actionHtml = `
          <button class="action-btn delete" onclick="deleteApp('${item.id}', event)" title="Desinstalar">
            <i data-lucide="trash-2"></i>
          </button>
        `;
      } else if (item.type === 'folder') {
        actionHtml = `
          <button class="action-btn delete" onclick="deleteFolder('${item.id}', event)" title="Eliminar Carpeta">
            <i data-lucide="trash-2"></i>
          </button>
        `;
      }

      row.innerHTML = `
        <div class="col-name" style="display:flex; align-items:center;">
          <div class="row-icon"><i data-lucide="${item.icon}"></i></div>
          <span class="row-name">${item.name}</span>
          ${lockHtml}
        </div>
        <div class="col-type">${item.type === 'folder' ? 'Carpeta' : (item.type === 'system' ? 'Sistema' : 'App')}</div>
        <div class="col-actions">${actionHtml}</div>
      `;

      row.onclick = (e) => {
        if (e.target.closest('.action-btn')) return;
        if (item.type === 'folder') switchView(item.id);
        else if (window.parent && window.parent.MyHub) window.parent.MyHub.abrir(item.id);
      };

      filesContainer.appendChild(row);
    });

    if (window.lucide) lucide.createIcons();
  };

  // --- DRAG & DROP GLOBAL ---
  window.dropToRoot = async (e) => {
    e.preventDefault();
    if (draggedAppId) {
      Object.values(carpetasObj).forEach(f => {
        f.apps = f.apps.filter(id => id !== draggedAppId);
      });
      await kvSet('carpetas', carpetasObj);
      if (window.parent && window.parent.MyHub) {
        window.parent.MyHub.toast('App movida a Inicio');
        if (window.parent.renderIconos) window.parent.renderIconos();
      }
      draggedAppId = null;
      init();
    }
  };

  const moverAppACarpeta = async (appId, folderId) => {
    Object.values(carpetasObj).forEach(f => f.apps = f.apps.filter(id => id !== appId));
    if (carpetasObj[folderId]) carpetasObj[folderId].apps.push(appId);
    
    await kvSet('carpetas', carpetasObj);
    
    const pos = await kvGet('posiciones_iconos') || {};
    delete pos[appId];
    await kvSet('posiciones_iconos', pos);

    if (window.parent && window.parent.MyHub) {
      window.parent.MyHub.toast('App movida a carpeta');
      if (window.parent.renderIconos) window.parent.renderIconos();
    }
    init();
  };

  // --- VISTA DE DATOS (SIN EL JSON GIGANTE) ---
  const renderDBView = async () => {
    const dbList = document.getElementById('db-list');
    dbList.innerHTML = '<div style="padding:16px; text-align:center; font-size:12px; color:var(--muted);">Buscando archivos...</div>';
    
    const files = [];
    const coreKeys = ['cuenta', 'ajustes', 'sesion', 'carpetas', 'apps_instaladas', 'posiciones_iconos']; 
    
    // LocalStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!coreKeys.includes(key)) {
        files.push({ type: 'ls', key, value: localStorage.getItem(key) });
      }
    }

    // IndexedDB
    try {
      const db = await dbP;
      const tx = db.transaction('kv', 'readonly');
      const store = tx.objectStore('kv');
      const req = store.getAllKeys();
      
      await new Promise((resolve) => {
        req.onsuccess = () => {
          const allKeys = req.result;
          let count = 0;
          if (allKeys.length === 0) return resolve();
          
          allKeys.forEach(k => {
            if (!coreKeys.includes(k)) {
              const valReq = store.get(k);
              valReq.onsuccess = () => {
                let strVal = valReq.result;
                if (typeof strVal === 'object') strVal = JSON.stringify(strVal);
                files.push({ type: 'idb', key: k, value: strVal });
                count++;
                if (count === allKeys.length) resolve();
              };
            } else {
              count++;
              if (count === allKeys.length) resolve();
            }
          });
        };
      });
    } catch(e) { console.error(e); }

    dbList.innerHTML = '';
    if (files.length === 0) {
      dbList.innerHTML = '<div style="padding:16px; text-align:center; font-size:12px; color:var(--muted);">No hay archivos guardados por las apps.</div>';
      return;
    }

    files.sort((a, b) => String(a.key).localeCompare(String(b.key)));

    files.forEach(item => {
      const row = document.createElement('div');
      row.className = 'file-row';
      
      const safeVal = encodeURIComponent(item.value || '');

      row.innerHTML = `
        <div class="col-name" style="display:flex; align-items:center;">
          <div class="row-icon"><i data-lucide="file-json"></i></div>
          <span class="row-name">${item.key}</span>
        </div>
        <div class="col-type">${item.type === 'ls' ? 'LocalStorage' : 'IndexedDB'}</div>
        <div class="col-actions" style="width: 100px;">
          <button class="action-btn" onclick="editDBKey('${item.type}', '${item.key}', '${safeVal}')" title="Ver/Editar">
            <i data-lucide="pencil"></i>
          </button>
          <button class="action-btn delete" onclick="deleteDBKey('${item.type}', '${item.key}')" title="Borrar">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `;
      dbList.appendChild(row);
    });

    if (window.lucide) lucide.createIcons();
  };

  window.editDBKey = async (type, key, encodedValue) => {
    const currentValue = decodeURIComponent(encodedValue);
    const newValue = prompt(`Editar contenido de "${key}":\n(Cuidado con el formato JSON)`, currentValue);
    if (newValue === null) return;

    if (type === 'ls') {
      localStorage.setItem(key, newValue);
    } else {
      try {
        let valToSave = newValue;
        if (newValue.startsWith('{') || newValue.startsWith('[')) {
          try { valToSave = JSON.parse(newValue); } catch(e) {}
        }
        await kvSet(key, valToSave);
      } catch(e) { alert('Error: ' + e.message); }
    }
    if (window.parent && window.parent.MyHub) window.parent.MyHub.toast('Archivo actualizado');
    renderDBView();
  };

  window.deleteDBKey = async (type, key) => {
    if (!confirm(`¿Borrar el archivo de datos "${key}"?`)) return;
    if (type === 'ls') {
      localStorage.removeItem(key);
    } else {
      await kvDelete(key);
    }
    if (window.parent && window.parent.MyHub) window.parent.MyHub.toast('Archivo borrado');
    renderDBView();
  };

  // --- OTRAS FUNCIONES ---
  window.switchView = (view) => {
    currentView = view;
    renderSidebar();
    renderView();
  };

  window.openNewFolderModal = () => {
    document.getElementById('folder-name-input').value = '';
    document.getElementById('modal-folder').classList.add('active');
    setTimeout(() => document.getElementById('folder-name-input').focus(), 50);
  };

  window.createFolder = async () => {
    const nombre = document.getElementById('folder-name-input').value.trim();
    if (!nombre) return;
    const id = 'folder_' + Date.now();
    carpetasObj[id] = { id, nombre, apps: [], pos: null };
    await kvSet('carpetas', carpetasObj);
    document.getElementById('modal-folder').classList.remove('active');
    if (window.parent && window.parent.MyHub) {
      window.parent.MyHub.toast(`Carpeta "${nombre}" creada`);
      if (window.parent.renderIconos) window.parent.renderIconos(); 
    }
    init();
  };

  window.deleteApp = async (appId, e) => {
    e.stopPropagation();
    if (!confirm(`¿Desinstalar la app permanentemente?`)) return;
    delete appsObj[appId];
    await kvSet('apps_instaladas', appsObj);
    Object.values(carpetasObj).forEach(f => f.apps = f.apps.filter(id => id !== appId));
    await kvSet('carpetas', carpetasObj);
    if (window.parent && window.parent.MyHub) {
      window.parent.MyHub.eliminarApp(appId); 
      window.parent.MyHub.toast('App desinstalada');
    }
    init();
  };

  window.deleteFolder = async (folderId, e) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar carpeta? Las apps volverán a Inicio.`)) return;
    delete carpetasObj[folderId];
    await kvSet('carpetas', carpetasObj);
    if (window.parent && window.parent.MyHub) {
      window.parent.MyHub.toast('Carpeta eliminada');
      if (window.parent.renderIconos) window.parent.renderIconos();
    }
    if (currentView === folderId) currentView = 'root';
    init();
  };

  const updateStorageInfo = async () => {
    if (!navigator.storage || !navigator.storage.estimate) return;
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0, quota = estimate.quota || 1;
      const percent = Math.min(100, (usage / quota) * 100);
      const formatBytes = (b) => {
        if (!b) return '0 B';
        const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
      };
      document.getElementById('storage-fill').style.width = percent + '%';
      document.getElementById('storage-percent').textContent = percent.toFixed(1) + '%';
      document.getElementById('storage-text').textContent = `Usado: ${formatBytes(usage)} de ${formatBytes(quota)}`;
    } catch (e) {}
  };

  window.wipeData = async () => {
    if (!confirm('¡ADVERTENCIA! Se borrarán TODAS las apps y carpetas. ¿Continuar?')) return;
    appsObj = {}; carpetasObj = {};
    await kvSet('apps_instaladas', appsObj);
    await kvSet('carpetas', carpetasObj);
    await kvSet('posiciones_iconos', {});
    if (window.parent && window.parent.MyHub) {
      window.parent.MyHub.toast('Datos borrados');
      setTimeout(() => window.parent.location.reload(), 1000); 
    }
  };

  init();
})();
