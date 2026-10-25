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

  // NUEVA FUNCIÓN: Analiza qué hay dentro del registro para encontrar archivos ocultos
  const analyzeRecord = (val) => {
    let blobs = [];
    let totalSize = 0;
    let isFile = false;

    // Si es un Blob directo
    if (val instanceof Blob) {
      return { type: 'blob', size: val.size, blobs: [{ key: 'file', blob: val }], value: val };
    }

    // Si es un Objeto (como los de Vid-He o Spoti-vic)
    if (typeof val === 'object' && val !== null) {
      for (const [k, v] of Object.entries(val)) {
        if (v instanceof Blob) {
          blobs.push({ key: k, blob: v });
          totalSize += v.size;
          isFile = true;
        } else if (typeof v === 'string' && v.startsWith('data:image/')) {
          // Soporte para Galeria-He si guardara base64 (aunque usa localStorage)
          const size = v.length * 0.75;
          totalSize += size;
          isFile = true;
        }
      }
      
      if (!isFile) {
        totalSize = new Blob([JSON.stringify(val)]).size;
      }
      return { type: isFile ? 'object_with_blob' : 'json', size: totalSize, blobs, value: val };
    }

    // Textos o números
    return { type: 'data', size: new Blob([String(val)]).size, blobs: [], value: val };
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
    if (!indexedDB.databases) return;
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
        
        const analysis = analyzeRecord(val);
        totalSize += analysis.size;
        items.push({ key, ...analysis });
      }
      db.close();

      fileListEl.innerHTML = '';
      if (items.length === 0) {
        fileListEl.innerHTML = '<div class="empty-state"><i data-lucide="folder-open"></i><p>Esta tabla está vacía.</p></div>';
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
        let descText = 'Objeto JSON';
        
        if (item.type === 'blob' || item.type === 'object_with_blob') {
          iconName = 'file-video'; // Icono de archivo
          descText = 'Archivo multimedia';
        } else if (item.type === 'data') {
          iconName = 'file-text';
          descText = 'Texto / Valor';
        }

        // Si contiene un Blob, mostrar botón de descarga
        const downloadBtn = item.blobs.length > 0 
          ? `<button class="btn-download" title="Descargar archivo"><i data-lucide="download"></i></button>` 
          : '';

        // Si es un objeto con título (como en Vid-He), mostrarlo
        let displayName = String(item.key);
        if (item.value && typeof item.value === 'object' && item.value.title) {
          displayName = item.value.title;
        }

        itemEl.innerHTML = `
          <div class="file-icon ${item.type}"><i data-lucide="${iconName}"></i></div>
          <div class="file-info">
            <div class="file-name" title="${displayName}">${displayName}</div>
            <div class="file-desc">${descText}</div>
          </div>
          <div class="file-size">${formatBytes(item.size)}</div>
          ${downloadBtn}
          <button class="btn-delete" title="Eliminar registro"><i data-lucide="trash-2"></i></button>
        `;

        if (downloadBtn) {
          itemEl.querySelector('.btn-download').onclick = () => {
            const mainBlob = item.blobs.find(b => b.key === 'blob' || b.key === 'file') || item.blobs[0];
            if (!mainBlob) return;

            const blob = mainBlob.blob;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            let ext = '.bin';
            if (blob.type.includes('video')) ext = '.mp4';
            else if (blob.type.includes('audio')) ext = '.mp3';
            else if (blob.type.includes('image')) ext = '.png';
            else if (blob.type.includes('json')) ext = '.json';
            else if (blob.type.includes('pdf')) ext = '.pdf';

            a.download = displayName + ext;
            window.open(url, '_blank'); 
            a.click();
            URL.revokeObjectURL(url);
            if (window.parent && window.parent.MyHub) window.parent.MyHub.toast('Abriendo archivo...');
          };
        }

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
    mainHeaderEl.innerHTML = '<span class="path"><i data-lucide="database"></i> Selecciona una tabla</span>';
    fileListEl.innerHTML = '<div class="empty-state"><i data-lucide="folder-open"></i><p>Selecciona una base de datos y una tabla para ver su contenido.</p></div>';
    if (window.lucide) window.lucide.createIcons();
  };

  loadDatabases();
  updateStorageInfo();
  if (window.lucide) window.lucide.createIcons();
})();
