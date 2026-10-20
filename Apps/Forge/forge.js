(async function() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const btnFile = document.getElementById('btn-file');
  const appsList = document.getElementById('apps-list');

  // Tema
  if (window.parent !== window) window.parent.postMessage({ type: 'myhub:get-tema' }, '*');
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'myhub:tema:res') {
      document.documentElement.dataset.modo = e.data.modo;
      document.documentElement.style.setProperty('--accent', e.data.color);
    }
  });

  // IndexedDB
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

  // Renderizar lista de instaladas (SIN BOTÓN DE ELIMINAR)
  const renderInstaladas = async () => {
    const apps = await kvGet('apps_instaladas') || {};
    appsList.innerHTML = '';
    
    if (Object.keys(apps).length === 0) {
      appsList.innerHTML = '<p style="color: var(--muted); font-size: 13px; text-align: center;">No hay apps instaladas.</p>';
      return;
    }

    for (const [id, data] of Object.entries(apps)) {
      const div = document.createElement('div');
      div.className = 'app-item';
      div.innerHTML = `
        <div class="app-item-icon"><i data-lucide="${data.manifest.icono || 'box'}"></i></div>
        <div class="app-item-info">
          <div class="app-item-title">${data.manifest.titulo}</div>
          <div class="app-item-id">ID: ${data.manifest.id}</div>
        </div>
      `;
      appsList.appendChild(div);
    }
    if (window.lucide) lucide.createIcons();
  };

  // Procesar ZIP
  const procesarZIP = async (file) => {
    try {
      const zip = await JSZip.loadAsync(file);
      
      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) return alert('El ZIP debe contener un manifest.json');
      const manifestStr = await manifestFile.async('string');
      const manifest = JSON.parse(manifestStr);

      if (!manifest.id || !manifest.titulo) return alert('El manifest.json debe tener id y titulo.');

      const archivos = {};
      const promises = [];
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          promises.push(zipEntry.async('blob').then(blob => {
            archivos[relativePath] = blob;
          }));
        }
      });
      await Promise.all(promises);

      // Guardar en IndexedDB
      const apps = await kvGet('apps_instaladas') || {};
      apps[manifest.id] = { manifest, archivos };
      await kvSet('apps_instaladas', apps);

      // Avisar al Lobby
      if (window.parent && window.parent.MyHub) {
        window.parent.MyHub.registrarApp({
          id: manifest.id,
          titulo: manifest.titulo,
          icono: manifest.icono || 'box',
          instalada: true,
          archivos: archivos,
          manifest: manifest
        });
        window.parent.MyHub.toast(`App "${manifest.titulo}" instalada`);
      }

      renderInstaladas();
      alert('¡Instalación exitosa!');
      
    } catch (err) {
      console.error(err);
      alert('Error al procesar el ZIP. Asegúrate de que es válido.');
    }
  };

  dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragover'); };
  dropZone.ondragleave = () => dropZone.classList.remove('dragover');
  dropZone.ondrop = (e) => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) procesarZIP(e.dataTransfer.files[0]);
  };
  
  btnFile.onclick = () => fileInput.click();
  fileInput.onchange = () => {
    if (fileInput.files.length) procesarZIP(fileInput.files[0]);
  };

  renderInstaladas();
})();