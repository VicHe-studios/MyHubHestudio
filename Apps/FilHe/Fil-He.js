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
      
      // Drag & Drop en la barra lateral
      div.ondragover = (e) => { e.preventDefault(); div.classList.add('drop-target'); };
      div.ondragleave = () => div.classList.remove('drop-target');
      div.ondrop = async (e) => {
        e.preventDefault();
        div.classList.remove('drop-target');
        if (draggedAppId) {
          await moverAppACarpeta(draggedAppId, folder.id);
        }
      };
      foldersContainer.appendChild(div);
    });
    
    document.querySelectorAll('.menu-item[data-view]').forEach(el => {
      el.classList.toggle('active', el.dataset.view === currentView);
    });
  };

  const renderView = () => {
    const fileGrid = document.getElementById('view-files');
    const dbView = document.getElementById('view-db');
    const storageView = document.getElementById('view-storage');
    const breadcrumb = document.getElementById('breadcrumb');
    const btnNew = document.getElementById('btn-new-folder');

    fileGrid.innerHTML = '';
    fileGrid.style.display = 'none';
    dbView.style.display = 'none';
    storageView.style.display = 'none';
    btnNew.style.display = 'flex';

    if (currentView === 'storage') {
      storageView.style.display = 'flex';
      btnNew.style.display = 'none';
      breadcrumb.innerHTML = `<i data-lucide="pie-chart" style="width:18px;height:18px;color:var(--muted)"></i> Almacenamiento`;
      updateStorageInfo();
      return;
    }

    if (currentView === 'db') {
      dbView.style.display = 'flex';
      btnNew.style.display = 'none';
      breadcrumb.innerHTML = `<i data-lucide="database" style="width:18px;height:18px;color:var(--muted)"></i> Archivos de Datos`;
      renderDBView();
      return;
    }

    fileGrid.style.display = 'grid';
    let itemsToRender = [];
    
    if (currentView === 'root') {
      breadcrumb.innerHTML = `<i data-lucide="home" style="width:18px;height:18px;color:var(--muted)"></i> Inicio`;
      
      // 1. Carpetas
      Object.values(carpetasObj).forEach(f => {
        itemsToRender.push({ type: 'folder', id: f.id, name: f.nombre, icon: 'folder' });
      });

      // 2. Apps Instaladas (que no estén en carpetas)
      const appsInFolders = new Set();
      Object.values(carpetasObj).forEach(f => f.apps.forEach(id => appsInFolders.add(id)));
      Object.values(appsObj).forEach(a => {
        if (!appsInFolders.has(a.manifest.id)) {
          itemsToRender.push({ type: 'app', id: a.manifest.id, name: a.manifest.titulo, icon: a.manifest.icono || 'box' });
        }
      });

      // 3. Apps del Sistema
      systemApps.forEach(a => {
        itemsToRender.push({ type: 'system', id: a.id, name: a.titulo, icon: a.icono });
      });

    } else {
      // Dentro de una carpeta
      const folder = carpetasObj[currentView];
      if (!folder) return switchView('root');
      breadcrumb.innerHTML = `<i data-lucide="folder" style="width:18px;height:18px;color:var(--muted)"></i> ${folder.nombre}`;
      
      folder.apps.forEach(appId => {
        const app = appsObj[appId];
        if (app) itemsToRender.push({ type: 'app', id: appId, name: app.manifest.titulo, icon: app.manifest.icono || 'box' });
      });
    }

    if (itemsToRender.length === 0) {
      fileGrid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:var(--muted); padding:40px; font-size:14px;">No hay elementos aquí.</div>`;
    }

    itemsToRender.forEach(item => {
      const div = document.createElement('div');
      div.className = 'file-item';
      div.draggable = item.type === 'app'; // Solo las apps se pueden arrastrar
      
      let lockHtml = item.type === 'system' ? `<div class="lock-icon"><i data-lucide="lock"></i></div>` : '';
      let iconHtml = `<div class="file-icon"><i data-lucide="${item.icon}"></i>${lockHtml}</div>`;
      let actionsHtml = '';

      // Acciones (Borrar)
      if (item.type === 'app') {
        actionsHtml = `
          <div class="file-actions">
            <button class="action-btn" onclick="deleteApp('${item.id}', event)" title="Desinstalar">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        `;
      } else if (item.type === 'folder') {
        actionsHtml = `
          <div class="file-actions">
            <button class="action-btn" onclick="deleteFolder('${item.id}', event)" title="Eliminar Carpeta">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        `;
      }

      div.innerHTML = `${actionsHtml}${iconHtml}<span class="file-name">${item.name}</span>`;

      // Drag events
      if (item.type === 'app') {
        div.ondragstart = (e) => {
          draggedAppId = item.id;
          div.classList.add('dragging');
          e.dataTransfer.setData('text/plain', item.id);
        };
        div.ondragend = () => {
          draggedAppId = null;
          div.classList.remove('dragging');
        };
      }

      // Drop events (para carpetas)
      if (item.type === 'folder') {
        div.ondragover = (e) => {
          e.preventDefault();
          div.classList.add('drag-over');
        };
        div.ondragleave = () => {
          div.classList.remove('drag-over');
        };
        div.ondrop = async (e) => {
          e.preventDefault();
          e.stopPropagation(); // Evita que se propague al fondo (root)
          div.classList.remove('drag-over');
          if (draggedAppId) {
            await moverAppACarpeta(draggedAppId, item.id);
          }
        };
      }

      // Clic normal
      div.onclick = (e) => {
        if (e.target.closest('.file-actions')) return;
        if (item.type === 'folder') switchView(item.id);
        else if (window.parent && window.parent.MyHub) window.parent.MyHub.abrir(item.id);
      };

      fileGrid.appendChild(div);
    });

    if (window.lucide) lucide.createIcons();
  };

  // --- DRAG & DROP FUNCTIONS ---
  
  // Soltar en el fondo (Root) para sacar de una carpeta
  window.dropToRoot = async (e) => {
    e.preventDefault();
    if (draggedAppId) {
      // Quitar de cualquier carpeta
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
    // 1. Quitar de cualquier carpeta actual
    Object.values(carpetasObj).forEach(f => {
      f.apps = f.apps.filter(id => id !== appId);
    });
    
    // 2. Añadir a la nueva
    if (carpetasObj[folderId]) {
      carpetasObj[folderId].apps.push(appId);
    }
    
    await kvSet('carpetas', carpetasObj);
    
    // Limpiar su posición en el escritorio principal
    const pos = await kvGet('posiciones_iconos') || {};
    delete pos[appId];
    await kvSet('posiciones_iconos', pos);

    if (window.parent && window.parent.MyHub) {
      window.parent.MyHub.toast('App movida a carpeta');
      if (window.parent.renderIconos) window.parent.renderIconos();
    }
    init();
  };

  // --- VISTA DE DATOS (INDEXEDDB) ---
  const renderDBView = async () => {
    const dbList = document.getElementById('db-list');
    dbList.innerHTML = '<p style="text-align:center;font-size:12px;color:var(--muted);">Buscando archivos...</p>';
    
    const files = [];
    const coreKeys = ['cuenta', 'ajustes', 'sesion', 'carpetas', 'apps_instaladas', 'posiciones_iconos']; 
    
    // 1. Leer LocalStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!coreKeys.includes(key)) {
        files.push({ type: 'ls', key, value: localStorage.getItem(key) });
      }
    }

    // 2. Leer IndexedDB
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
      dbList.innerHTML = '<p style="text-align:center;font-size:12px;color:var(--muted);padding:20px;">No hay archivos de datos guardados por las apps.</p>';
      return;
    }

    files.sort((a, b) => String(a.key).localeCompare(String(b.key)));

    files.forEach(item => {
      const div = document.createElement('div');
      div.className = 'db-item';
      
      const shortVal = item.value && item.value.length > 80 ? item.value.substring(0, 80) + '...' : (item.value || 'null');
      const safeVal = encodeURIComponent(item.value || '');

      div.innerHTML = `
        <div class="db-key">
          <span>${item.key}</span>
          <span style="font-size:10px;color:var(--muted);background:var(--line);padding:2px 4px;border-radius:4px;">${item.type === 'ls' ? 'LocalStorage' : 'IndexedDB'}</span>
        </div>
        <div class="db-value">${shortVal}</div>
        <div class="db-actions">
          <button class="btn gray small" onclick="editDBKey('${item.type}', '${item.key}', '${safeVal}')">Editar</button>
          <button class="btn gray small" style="color:var(--danger)" onclick="deleteDBKey('${item.type}', '${item.key}')">Borrar</button>
        </div>
      `;
      dbList.appendChild(div);
    });
  };

  window.editDBKey = async (type, key, encodedValue) => {
    const currentValue = decodeURIComponent(encodedValue);
    const newValue = prompt(`Editar "${key}":\n(Nota: si es JSON, cuida las comillas)`, currentValue);
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
