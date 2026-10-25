(async function() {
  const dbListEl = document.getElementById('db-list');
  const fileListEl = document.getElementById('file-list');
  const mainHeaderEl = document.getElementById('main-header');
  const storageInfoEl = document.getElementById('storage-info');
  const btnRefresh = document.getElementById('btn-refresh');
  const sidebarEl = document.getElementById('sidebar');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');

  if (window.parent !== window) window.parent.postMessage({ type: 'myhub:get-tema' }, '*');
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'myhub:tema:res') {
      document.documentElement.dataset.modo = e.data.modo;
      document.documentElement.style.setProperty('--accent', e.data.color);
    }
  });

  btnToggleSidebar.onclick = () => {
    sidebarEl.classList.toggle('collapsed');
    if (window.lucide) window.lucide.createIcons();
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const showConfirm = (title, message) => {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = `
        <div class="modal-box">
          <h3>${title}</h3>
          <p>${message}</p>
          <div class="modal-actions">
            <button class="modal-btn cancel">Cancelar</button>
            <button class="modal-btn confirm">Eliminar</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const close = (res) => { overlay.remove(); resolve(res); };
      overlay.querySelector('.cancel').onclick = () => close(false);
      overlay.querySelector('.confirm').onclick = () => close(true);
    });
  };

  const updateStorageInfo = async () => {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      storageInfoEl.textContent = `Uso: ${formatBytes(usage)} / ${formatBytes(quota)}`;
    }
  };

  const loadDatabases = async () => {
    dbListEl.innerHTML = '';
    
    // 1. IndexedDB
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      for (const dbInfo of dbs) {
        const group = document.createElement('div');
        group.className = 'db-group';
        
        const dbNameLower = dbInfo.name.toLowerCase();
        const isLikelyMyHub = dbNameLower.includes('hub');
        const warningIcon = !isLikelyMyHub 
          ? `<i data-lucide="alert-triangle" class="warn-icon" title="Se desconoce si esta BD le pertenece a MyHubHestudio, precaución."></i>` 
          : '';

        const dbNameEl = document.createElement('div');
        dbNameEl.className = 'db-name';
        dbNameEl.innerHTML = `<i data-lucide="database"></i> <span>${dbInfo.name}</span> ${warningIcon}`;
        group.appendChild(dbNameEl);

        const db = await new Promise((resolve) => {
          const req = indexedDB.open(dbInfo.name);
          req.onsuccess = () => resolve(req.result);
        });

        for (let i = 0; i < db.objectStoreNames.length; i++) {
          const storeName = db.objectStoreNames[i];
          const storeEl = document.createElement('div');
          storeEl.className = 'store-item';
          storeEl.innerHTML = `<i data-lucide="table"></i> <span>${storeName}</span>`;
          storeEl.onclick = () => {
            document.querySelectorAll('.store-item').forEach(el => el.classList.remove('active'));
            storeEl.classList.add('active');
            loadStoreContent(dbInfo.name, storeName);
          };
          group.appendChild(storeEl);
        }
        db.close();
        dbListEl.appendChild(group);
      }
    }

    // 2. LocalStorage
    const lsGroup = document.createElement('div');
    lsGroup.className = 'db-group';
    
    const lsNameEl = document.createElement('div');
    lsNameEl.className = 'db-name';
    lsNameEl.innerHTML = `<i data-lucide="hard-drive"></i> <span>Local Storage</span>`;
    lsGroup.appendChild(lsNameEl);

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const storeEl = document.createElement('div');
      storeEl.className = 'store-item';
      // FIX: Se envuelve la llave en un <span> para que funcione el ellipsis
      storeEl.innerHTML = `<i data-lucide="file-key"></i> <span>${key}</span>`;
      storeEl.onclick = () => {
        document.querySelectorAll('.store-item').forEach(el => el.classList.remove('active'));
        storeEl.classList.add('active');
        loadLocalStorageContent(key);
      };
      lsGroup.appendChild(storeEl);
    }
    dbListEl.appendChild(lsGroup);

    if (window.lucide) window.lucide.createIcons();
  };

  const loadStoreContent = async (dbName, storeName) => {
    mainHeaderEl.innerHTML = `<span class="path"><i data-lucide="database"></i> ${dbName} <i data-lucide="chevron-right"></i></span> ${storeName}`;
    fileListEl.innerHTML = '<div class="empty-state"><i data-lucide="loader"></i><p>Analizando datos...</p></div>';
    if (window.lucide) window.lucide.createIcons();

    try {
      const db = await new Promise((resolve) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => resolve(req.result);
      });

      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      
      const keys = await new Promise((res) => {
        const r = store.getAllKeys();
        r.onsuccess = () => res(r.result);
      });

      const items = [];
      let totalSize = 0;

      for (const key of keys) {
        const val = await new Promise((res) => {
          const r = store.get(key);
          r.onsuccess = () => res(r.result);
        });
        
        let size = 0;
        let type = 'json';
        let blobs = [];

        if (val instanceof Blob) {
          size = val.size;
          type = 'blob';
          blobs.push({ key: 'file', blob: val });
        } else if (typeof val === 'object' && val !== null) {
          for (const [k, v] of Object.entries(val)) {
            if (v instanceof Blob) {
              blobs.push({ key: k, blob: v });
              size += v.size;
              type = 'object_with_blob';
            }
          }
          if (type !== 'object_with_blob') size = new Blob([JSON.stringify(val)]).size;
        } else {
          size = new Blob([String(val)]).size;
          type = 'data';
        }

        totalSize += size;
        items.push({ key, size, type, blobs, value: val });
      }
      db.close();

      renderList(items, totalSize, dbName, storeName);
    } catch (err) {
      console.error(err);
      fileListEl.innerHTML = `<div class="empty-state" style="color:var(--danger)"><p>Error: ${err.message}</p></div>`;
    }
  };

  const loadLocalStorageContent = (key) => {
    mainHeaderEl.innerHTML = `<span class="path"><i data-lucide="hard-drive"></i> Local Storage <i data-lucide="chevron-right"></i></span> ${key}`;
    fileListEl.innerHTML = '';
    
    const val = localStorage.getItem(key);
    if (!val) return;

    if (key === 'myhub_galeria_imagenes') {
      try {
        const images = JSON.parse(val);
        let totalSize = 0;
        const items = images.map((img, idx) => {
          const size = new Blob([img.base64]).size;
          totalSize += size;
          return { key: img.name || `Imagen ${idx+1}`, size, type: 'image', base64: img.base64 };
        });
        renderList(items, totalSize, 'localStorage', key, true);
      } catch (e) {
        fileListEl.innerHTML = `<div class="empty-state" style="color:var(--danger)"><p>Error al leer JSON</p></div>`;
      }
      return;
    }

    const size = new Blob([val]).size;
    const items = [{ key: key, size: size, type: 'data', value: val }];
    renderList(items, size, 'localStorage', key);
  };

  const renderList = (items, totalSize, sourceName, sourceStore, isImageArray = false) => {
    if (items.length === 0) {
      fileListEl.innerHTML = '<div class="empty-state"><i data-lucide="folder-open"></i><p>No hay datos.</p></div>';
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const headerTotal = document.createElement('div');
    headerTotal.className = 'file-list-header';
    headerTotal.innerHTML = `<span>${items.length} REGISTROS</span><span>PESO TOTAL: ${formatBytes(totalSize)}</span>`;
    fileListEl.appendChild(headerTotal);

    items.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'file-item';

      let iconName = 'file-json';
      let descText = 'Objeto / Texto';
      
      if (item.type === 'image' || item.type === 'blob' || item.type === 'object_with_blob') {
        iconName = 'image';
        descText = 'Archivo multimedia';
      }

      let displayName = String(item.key);
      if (item.value && item.value.title) displayName = item.value.title;

      const downloadBtn = `<button class="btn-download" title="Descargar"><i data-lucide="download"></i></button>`;

      itemEl.innerHTML = `
        <div class="file-icon ${item.type}"><i data-lucide="${iconName}"></i></div>
        <div class="file-info">
          <div class="file-name" title="${displayName}">${displayName}</div>
          <div class="file-desc">${descText}</div>
        </div>
        <div class="file-size">${formatBytes(item.size)}</div>
        ${downloadBtn}
        <button class="btn-delete" title="Eliminar"><i data-lucide="trash-2"></i></button>
      `;

      itemEl.querySelector('.btn-download').onclick = () => {
        let blobToDownload = null;
        let fileName = displayName;

        if (item.type === 'image') {
          fetch(item.base64).then(r => r.blob()).then(blob => {
            triggerDownload(blob, fileName);
          });
          return;
        } else if (item.blobs && item.blobs.length > 0) {
          blobToDownload = item.blobs[0].blob;
        } else {
          const valStr = typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value);
          blobToDownload = new Blob([valStr], { type: 'text/plain' });
          fileName += '.json';
        }

        if (blobToDownload) triggerDownload(blobToDownload, fileName);
      };

      itemEl.querySelector('.btn-delete').onclick = async () => {
        const ok = await showConfirm('Eliminar Registro', `¿Seguro que quieres eliminar "${item.key}"?`);
        if (!ok) return;

        if (sourceName === 'localStorage') {
          if (isImageArray) {
            const images = JSON.parse(localStorage.getItem('myhub_galeria_imagenes'));
            const newImages = images.filter(img => (img.name || `Imagen`) !== item.key);
            localStorage.setItem('myhub_galeria_imagenes', JSON.stringify(newImages));
            loadLocalStorageContent('myhub_galeria_imagenes');
          } else {
            localStorage.removeItem(item.key);
            loadDatabases();
          }
        } else {
          const db2 = await new Promise((resolve) => {
            const req = indexedDB.open(sourceName);
            req.onsuccess = () => resolve(req.result);
          });
          const tx2 = db2.transaction(sourceStore, 'readwrite');
          tx2.objectStore(sourceStore).delete(item.key);
          tx2.oncomplete = () => {
            db2.close();
            loadStoreContent(sourceName, sourceStore);
            updateStorageInfo();
          };
        }
      };

      fileListEl.appendChild(itemEl);
    });

    if (window.lucide) window.lucide.createIcons();
    updateStorageInfo();
  };

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (window.parent && window.parent.MyHub) window.parent.MyHub.toast('Descargando...');
  };

  btnRefresh.onclick = () => {
    loadDatabases();
    updateStorageInfo();
    mainHeaderEl.innerHTML = '<span class="path"><i data-lucide="database"></i> Selecciona un origen</span>';
    fileListEl.innerHTML = '<div class="empty-state"><i data-lucide="folder-open"></i><p>Selecciona una base de datos o LocalStorage.</p></div>';
    if (window.lucide) window.lucide.createIcons();
  };

  loadDatabases();
  updateStorageInfo();
  if (window.lucide) window.lucide.createIcons();
})();
