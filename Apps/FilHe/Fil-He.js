(async function() {
  // Sincronización de Tema
  if (window.parent !== window) window.parent.postMessage({ type: 'myhub:get-tema' }, '*');
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'myhub:tema:res') {
      document.documentElement.dataset.modo = e.data.modo;
      document.documentElement.style.setProperty('--accent', e.data.color);
      document.documentElement.style.setProperty('--accent-soft', e.data.color + '26');
    }
  });

  // Base de Datos
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

  // Variables Globales
  let appsObj = {};
  let carpetasObj = {};
  let currentView = 'root';
  let appToMove = null;

  const systemApps = [
    { id: 'papelera', titulo: 'Papelera', icono: 'trash-2' },
    { id: 'forge', titulo: 'Forge', icono: 'hammer' },
    { id: 'storhe', titulo: 'Stor-He', icono: 'store' },
    { id: 'filhe', titulo: 'Fil-He', icono: 'hard-drive' }
  ];

  // Inicialización
  const init = async () => {
    appsObj = await kvGet('apps_instaladas') || {};
    carpetasObj = await kvGet('carpetas') || {};
    
    renderSidebar();
    renderView();
    updateStorageInfo();
    if (window.lucide) lucide.createIcons();
  };

  // Renderizado de UI
  const renderSidebar = () => {
    const foldersContainer = document.getElementById('sidebar-folders');
    foldersContainer.innerHTML = '';
    
    Object.values(carpetasObj).forEach(folder => {
      const div = document.createElement('div');
      div.className = `menu-item ${currentView === folder.id ? 'active' : ''}`;
      div.onclick = () => switchView(folder.id);
      div.innerHTML = `<i data-lucide="folder"></i> ${folder.nombre}`;
      foldersContainer.appendChild(div);
    });
    
    document.querySelectorAll('.menu-item[data-view]').forEach(el => {
      el.classList.toggle('active', el.dataset.view === currentView);
    });
  };

  const renderView = () => {
    const fileGrid = document.getElementById('view-files');
    const storageView = document.getElementById('view-storage');
    const breadcrumb = document.getElementById('breadcrumb');
    const btnNew = document.getElementById('btn-new-folder');

    fileGrid.innerHTML = '';
    
    if (currentView === 'storage') {
      fileGrid.style.display = 'none';
      storageView.style.display = 'flex';
      btnNew.style.display = 'none';
      breadcrumb.innerHTML = `<i data-lucide="database" style="width:18px;height:18px;color:var(--muted)"></i> Almacenamiento`;
      updateStorageInfo();
      return;
    }

    fileGrid.style.display = 'grid';
    storageView.style.display = 'none';
    btnNew.style.display = 'flex';

    let itemsToRender = [];
    
    if (currentView === 'root') {
      breadcrumb.innerHTML = `<i data-lucide="home" style="width:18px;height:18px;color:var(--muted)"></i> Inicio`;
      
      Object.values(carpetasObj).forEach(f => {
        itemsToRender.push({ type: 'folder', data: f, id: f.id, name: f.nombre, icon: 'folder' });
      });

      const appsInFolders = new Set();
      Object.values(carpetasObj).forEach(f => f.apps.forEach(id => appsInFolders.add(id)));
      
      Object.values(appsObj).forEach(a => {
        if (!appsInFolders.has(a.manifest.id)) {
          itemsToRender.push({ type: 'app', data: a, id: a.manifest.id, name: a.manifest.titulo, icon: a.manifest.icono || 'box' });
        }
      });

    } else if (currentView === 'system') {
      breadcrumb.innerHTML = `<i data-lucide="shield" style="width:18px;height:18px;color:var(--muted)"></i> Sistema`;
      
      systemApps.forEach(a => {
        itemsToRender.push({ type: 'system', data: a, id: a.id, name: a.titulo, icon: a.icono });
      });

    } else {
      const folder = carpetasObj[currentView];
      if (!folder) return switchView('root');
      
      breadcrumb.innerHTML = `<i data-lucide="folder" style="width:18px;height:18px;color:var(--muted)"></i> ${folder.nombre}`;
      
      folder.apps.forEach(appId => {
        const app = appsObj[appId];
        if (app) {
          itemsToRender.push({ type: 'app', data: app, id: appId, name: app.manifest.titulo, icon: app.manifest.icono || 'box' });
        }
      });
    }

    if (itemsToRender.length === 0) {
      fileGrid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:var(--muted); padding:40px; font-size:14px;">No hay elementos aquí.</div>`;
    }

    itemsToRender.forEach(item => {
      const div = document.createElement('div');
      div.className = 'file-item';
      
      let iconHtml = `<div class="file-icon"><i data-lucide="${item.icon}"></i></div>`;
      let actionsHtml = '';
      
      if (item.type === 'app') {
        actionsHtml = `
          <div class="file-actions">
            <button class="action-btn" onclick="openMoveModal('${item.id}', event)" title="Mover a carpeta">
              <i data-lucide="folder-input"></i>
            </button>
            <button class="action-btn delete" onclick="deleteApp('${item.id}', event)" title="Eliminar App">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        `;
      } else if (item.type === 'folder') {
        actionsHtml = `
          <div class="file-actions">
            <button class="action-btn delete" onclick="deleteFolder('${item.id}', event)" title="Eliminar Carpeta">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        `;
      }

      div.innerHTML = `${actionsHtml}${iconHtml}<span class="file-name">${item.name}</span>`;

      div.onclick = (e) => {
        if (e.target.closest('.file-actions')) return;
        if (item.type === 'folder') {
          switchView(item.id);
        } else if (item.type === 'app' || item.type === 'system') {
          if (window.parent && window.parent.MyHub) window.parent.MyHub.abrir(item.id);
        }
      };

      fileGrid.appendChild(div);
    });

    if (window.lucide) lucide.createIcons();
  };

  // Navegación
  window.switchView = (view) => {
    currentView = view;
    renderSidebar();
    renderView();
  };

  // Crear Carpeta
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
      // Refrescar iconos del lobby si está expuesto
      if (window.parent.renderIconos) window.parent.renderIconos(); 
    }
    init();
  };

  // Mover App
  window.openMoveModal = (appId, e) => {
    e.stopPropagation();
    appToMove = appId;
    
    const select = document.getElementById('move-select');
    select.innerHTML = '';
    
    if (currentView !== 'root') {
      select.innerHTML += `<option value="root">[Sacar de la carpeta]</option>`;
    }
    
    Object.values(carpetasObj).forEach(f => {
      if (currentView === f.id) return;
      select.innerHTML += `<option value="${f.id}">${f.nombre}</option>`;
    });

    if (select.options.length === 0) {
      alert('No hay otras carpetas para mover. Crea una primero.');
      return;
    }

    document.getElementById('modal-move').classList.add('active');
  };

  window.confirmMove = async () => {
    if (!appToMove) return;
    const targetFolderId = document.getElementById('move-select').value;

    Object.values(carpetasObj).forEach(f => {
      f.apps = f.apps.filter(id => id !== appToMove);
    });

    if (targetFolderId !== 'root') {
      carpetasObj[targetFolderId].apps.push(appToMove);
    }

    await kvSet('carpetas', carpetasObj);
    
    const pos = await kvGet('posiciones_iconos') || {};
    delete pos[appToMove];
    await kvSet('posiciones_iconos', pos);

    document.getElementById('modal-move').classList.remove('active');
    appToMove = null;

    if (window.parent && window.parent.MyHub) {
      window.parent.MyHub.toast('App movida correctamente');
      if (window.parent.renderIconos) window.parent.renderIconos();
    }
    init();
  };

  // Eliminar
  window.deleteApp = async (appId, e) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar la app "${appsObj[appId]?.manifest.titulo}" permanentemente?`)) return;

    delete appsObj[appId];
    await kvSet('apps_instaladas', appsObj);

    Object.values(carpetasObj).forEach(f => {
      f.apps = f.apps.filter(id => id !== appId);
    });
    await kvSet('carpetas', carpetasObj);

    if (window.parent && window.parent.MyHub) {
      window.parent.MyHub.eliminarApp(appId); 
      window.parent.MyHub.toast('App eliminada');
    }
    init();
  };

  window.deleteFolder = async (folderId, e) => {
    e.stopPropagation();
    const folder = carpetasObj[folderId];
    if (!confirm(`¿Eliminar la carpeta "${folder.nombre}"? Las apps volverán a Inicio.`)) return;

    delete carpetasObj[folderId];
    await kvSet('carpetas', carpetasObj);

    if (window.parent && window.parent.MyHub) {
      window.parent.MyHub.toast('Carpeta eliminada');
      if (window.parent.renderIconos) window.parent.renderIconos();
    }

    if (currentView === folderId) currentView = 'root';
    init();
  };

  // Almacenamiento
  const updateStorageInfo = async () => {
    if (!navigator.storage || !navigator.storage.estimate) {
      document.getElementById('storage-text').textContent = 'API no soportada.';
      return;
    }

    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 1;
      const percent = Math.min(100, (usage / quota) * 100);
      
      const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      };

      document.getElementById('storage-fill').style.width = percent + '%';
      document.getElementById('storage-percent').textContent = percent.toFixed(1) + '%';
      document.getElementById('storage-text').textContent = `Usado: ${formatBytes(usage)} de ${formatBytes(quota)}`;
      
      document.getElementById('storage-fill').style.background = percent > 80 ? 'var(--danger)' : 'var(--accent)';
    } catch (e) {
      document.getElementById('storage-text').textContent = 'Error al calcular.';
    }
  };

  // Borrar Datos
  window.wipeData = async () => {
    if (!confirm('¡ADVERTENCIA! Se borrarán TODAS las apps instaladas y carpetas. ¿Continuar?')) return;
    if (!confirm('¿Estás TOTALMENTE seguro?')) return;

    appsObj = {};
    carpetasObj = {};
    
    await kvSet('apps_instaladas', appsObj);
    await kvSet('carpetas', carpetasObj);
    await kvSet('posiciones_iconos', {});

    if (window.parent && window.parent.MyHub) {
      window.parent.MyHub.toast('Todos los datos han sido borrados');
      setTimeout(() => window.parent.location.reload(), 1000); 
    }
    init();
  };

  init();
})();
