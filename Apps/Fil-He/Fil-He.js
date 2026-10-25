(async function() {
  const dbListEl = document.getElementById('db-list');
  const fileListEl = document.getElementById('file-list');
  const mainHeaderEl = document.getElementById('main-header');
  const storageInfoEl = document.getElementById('storage-info');
  const btnRefresh = document.getElementById('btn-refresh');

  // Sincronización de tema
  if (window.parent !== window) window.parent.postMessage({ type: 'myhub:get-tema' }, '*');
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'myhub:tema:res') {
      document.documentElement.dataset.modo = e.data.modo;
      document.documentElement.style.setProperty('--accent', e.data.color);
    }
  });

  // Utilidad para formatear bytes
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Calcular el peso real de un registro
  const getItemSize = (value) => {
    if (value instanceof Blob) return value.size;
    if (typeof value === 'string') return new Blob([value]).size;
    if (value instanceof ArrayBuffer) return value.byteLength;
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch (e) {
      return 0;
    }
  };

  // Modal de confirmación
  const showConfirm = (title, message) => {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
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
      void overlay.offsetWidth;
      overlay.classList.add('active');

      const close = (res) => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 200);
        resolve(res);
      };

      overlay.querySelector('.cancel').onclick = () => close(false);
      overlay.querySelector('.confirm').onclick = () => close(true);
      overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    });
  };

  const updateStorageInfo = async () => {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      storageInfoEl.textContent = `Uso: ${formatBytes(usage)} / ${formatBytes(quota)}`;
    } else {
      storageInfoEl.textContent = 'Almacenamiento: N/D';
    }
  };

  // Escanear y pintar las bases de datos
  const loadDatabases = async () => {
    dbListEl.innerHTML = '';
    if (!indexedDB.databases) {
      dbListEl.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--danger)">Tu navegador no soporta indexedDB.databases()</div>';
      return;
    }

    const dbs = await indexedDB.databases();
    
    for (const dbInfo of dbs) {
      const group = document.createElement('div');
      group.className = 'db-group';
      
      // LÓGICA DE ADVERTENCIA: Si no contiene "hub" (ignorando mayúsculas/minúsculas)
      const dbNameLower = dbInfo.name.toLowerCase();
      const isLikelyMyHub = dbNameLower.includes('hub');
      
      const warningIcon = !isLikelyMyHub 
        ? `<i data-lucide="alert-triangle" class="warn-icon" title="Se desconoce si esta BD le pertenece a MyHubHestudio, precaución."></i>` 
        : '';

      const dbNameEl = document.createElement('div');
      dbNameEl.className = 'db-name';
      dbNameEl.innerHTML = `
        <i data-lucide="database"></i> 
        <span>${dbInfo.name}</span>
        ${warningIcon}
      `;
      group.appendChild(dbNameEl);

      const db = await new Promise((resolve) => {
        const req = indexedDB.open(dbInfo.name);
        req.onsuccess = () => resolve(req.result);
      });

      for (let i = 0; i < db.objectStoreNames.length; i++) {
        const storeName = db.objectStoreNames[i];
        const storeEl = document.createElement('div');
        storeEl.className = 'store-item';
        storeEl.innerHTML = `<i data-lucide="table"></i> ${storeName}`;
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
    
    if (window.lucide) window.lucide.createIcons();
  };

  // Cargar el contenido de una tabla
  const loadStoreContent = async (dbName, storeName) => {
    mainHeaderEl.innerHTML = `<span class="path"><i data-lucide="database"></i> ${dbName} <i data-lucide="chevron-right"></i></span> ${storeName}`;
    fileListEl.innerHTML = '<div class="empty-state"><i data-lucide="loader"></i><p>Cargando datos...</p></div>';
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
        
        const size = getItemSize(val);
        totalSize += size;
        
        let type = 'json';
        if (val instanceof Blob) type = 'blob';
        else if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') type = 'data';

        items.push({ key, size, type, value: val });
      }
      db.close();

      fileListEl.innerHTML = '';
      if (items.length === 0) {
        fileListEl.innerHTML = '<div class="empty-state"><i data-lucide="folder-open"></i><p>Esta tabla está vacía.</p></div>';
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      // Cabecera con el total
      const headerTotal = document.createElement('div');
      headerTotal.className = 'file-list-header';
      headerTotal.innerHTML = `
        <span>${items.length} registros</span>
        <span>Peso total: ${formatBytes(totalSize)}</span>
      `;
      fileListEl.appendChild(headerTotal);

      items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'file-item';

        let iconName = 'file-json';
        if (item.type === 'blob') iconName = 'image';
        if (item.type === 'data') iconName = 'file-text';

        itemEl.innerHTML = `
          <div class="file-icon ${item.type}"><i data-lucide="${iconName}"></i></div>
          <div class="file-info">
            <div class="file-name" title="${String(item.key)}">${String(item.key)}</div>
            <div class="file-desc">${item.type === 'blob' ? 'Blob / Archivo' : item.type === 'json' ? 'Objeto JSON' : 'Texto / Valor'}</div>
          </div>
          <div class="file-size">${formatBytes(item.size)}</div>
          <button class="btn-delete" title="Eliminar registro"><i data-lucide="trash-2"></i></button>
        `;

        itemEl.querySelector('.btn-delete').onclick = async () => {
          const isCritical = dbName === 'myhub-lobby' && ['apps_instaladas', 'carpetas', 'cuenta', 'ajustes', 'posiciones_iconos'].includes(item.key);
          const msg = isCritical 
            ? `¡ADVERTENCIA! Estás a punto de borrar "${item.key}", que es una clave crítica del sistema. Podrías perder apps o configuraciones. ¿Seguro?`
            : `¿Seguro que quieres eliminar el registro "${item.key}"? Esta acción no se puede deshacer.`;

          const ok = await showConfirm('Eliminar Registro', msg);
          if (!ok) return;

          const db2 = await new Promise((resolve) => {
            const req = indexedDB.open(dbName);
            req.onsuccess = () => resolve(req.result);
          });
          const tx2 = db2.transaction(storeName, 'readwrite');
          tx2.objectStore(storeName).delete(item.key);
          tx2.oncomplete = () => {
            db2.close();
            if (window.parent && window.parent.MyHub) window.parent.MyHub.toast('Registro eliminado');
            loadStoreContent(dbName, storeName);
            updateStorageInfo();
          };
        };

        fileListEl.appendChild(itemEl);
      });

      if (window.lucide) window.lucide.createIcons();
      updateStorageInfo();

    } catch (err) {
      console.error(err);
      fileListEl.innerHTML = `<div class="empty-state" style="color:var(--danger)"><p>Error: ${err.message}</p></div>`;
    }
  };

  btnRefresh.onclick = () => {
    loadDatabases();
    updateStorageInfo();
    mainHeaderEl.innerHTML = '<span class="path"><i data-lucide="chevron-right"></i> Selecciona una tabla</span>';
    fileListEl.innerHTML = '<div class="empty-state"><i data-lucide="folder-open"></i><p>Selecciona una base de datos y una tabla para ver su contenido.</p></div>';
    if (window.lucide) window.lucide.createIcons();
  };

  // Init
  loadDatabases();
  updateStorageInfo();
  if (window.lucide) window.lucide.createIcons();
})();
