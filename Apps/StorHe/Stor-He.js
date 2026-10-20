(async function() {
  const appsList = document.getElementById('apps-list');
  const btnRefresh = document.getElementById('btn-refresh');

  const REPO_OWNER = 'VicHe-studios';
  const REPO_NAME = 'MyHubHestudio-StorHe';
  const BRANCH = 'main';

  if (window.parent !== window) window.parent.postMessage({ type: 'myhub:get-tema' }, '*');
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'myhub:tema:res') {
      document.documentElement.dataset.modo = e.data.modo;
      document.documentElement.style.setProperty('--accent', e.data.color);
    }
  });

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

  const fetchApps = async () => {
    appsList.innerHTML = '<p style="text-align: center; color: var(--muted); margin-top: 20px;">Buscando apps...</p>';
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/`);
      if (!res.ok) throw new Error('Error al conectar con GitHub');
      
      const data = await res.json();
      const folders = data.filter(item => item.type === 'dir' && !item.name.startsWith('.'));

      if (folders.length === 0) {
        appsList.innerHTML = '<p style="text-align: center; color: var(--muted); margin-top: 20px;">No hay apps disponibles.</p>';
        return;
      }

      const installedApps = await kvGet('apps_instaladas') || {};

      const appsData = await Promise.all(folders.map(async (folder) => {
        let titulo = folder.name;
        let icono = 'box';
        let autor = null;
        let descripcion = null;
        
        try {
          // Usamos raw.githubusercontent.com en lugar de jsDelivr para evitar el caché
          const manifestUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${folder.name}/manifest.json`;
          const mRes = await fetch(manifestUrl);
          if (mRes.ok) {
            const manifest = await mRes.json();
            titulo = manifest.titulo || folder.name;
            icono = manifest.icono || 'box';
            autor = manifest.autor || null;
            descripcion = manifest.descripcion || null;
          }
        } catch (e) {
          console.warn(`No se pudo leer el manifest de ${folder.name}`);
        }

        return { id: folder.name, titulo, icono, autor, descripcion };
      }));

      appsList.innerHTML = '';
      appsData.forEach(app => {
        const isInstalled = !!installedApps[app.id];
        
        const card = document.createElement('div');
        card.className = 'app-card';
        
        const autorHtml = app.autor ? `<span class="app-author">Por ${app.autor}</span>` : '';
        const descHtml = app.descripcion ? `<span class="app-desc">${app.descripcion}</span>` : '';

        card.innerHTML = `
          <div class="app-icon"><i data-lucide="${app.icono}"></i></div>
          <div class="app-info">
            <h3 class="app-title">${app.titulo}</h3>
            <div class="app-meta">
              <span class="app-id">ID: ${app.id}</span>
              ${autorHtml}
            </div>
            ${descHtml}
          </div>
          <button class="btn-install" data-id="${app.id}" ${isInstalled ? 'disabled' : ''}>
            ${isInstalled ? 'Instalada' : 'Instalar'}
          </button>
        `;
        appsList.appendChild(card);
      });

      document.querySelectorAll('.btn-install').forEach(btn => {
        btn.onclick = () => instalarApp(btn.dataset.id, btn);
      });

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error(err);
      appsList.innerHTML = `<p style="text-align: center; color: #ef4444; margin-top: 20px;">Error: ${err.message}</p>`;
    }
  };

  const instalarApp = async (appId, btnElement) => {
    const originalText = btnElement.textContent;
    btnElement.textContent = 'Instalando...';
    btnElement.disabled = true;

    try {
      const archivos = {};
      let manifest = null;

      const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${appId}`);
      if (!res.ok) throw new Error('No se pudo leer la carpeta');
      
      const fileList = await res.json();

      for (const file of fileList) {
        if (file.type === 'file') {
          // Para los archivos de la app (como el index.html) seguimos usando jsDelivr porque permite CORS
          const jsDelivrUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}@${BRANCH}/${file.path}`;
          const fileRes = await fetch(jsDelivrUrl);
          if (!fileRes.ok) continue; 
          
          const blob = await fileRes.blob();
          archivos[file.name] = blob;

          if (file.name === 'manifest.json') {
            const text = await blob.text();
            manifest = JSON.parse(text);
          }
        }
      }

      if (!manifest) manifest = { id: appId, titulo: appId, icono: 'box', main: 'index.html' };
      manifest.id = appId;

      const apps = await kvGet('apps_instaladas') || {};
      apps[appId] = { manifest, archivos };
      await kvSet('apps_instaladas', apps);

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

      btnElement.textContent = 'Instalada';
      
    } catch (err) {
      console.error(err);
      alert(`Error al instalar: ${err.message}`);
      btnElement.textContent = originalText;
      btnElement.disabled = false;
    }
  };

  btnRefresh.onclick = fetchApps;
  fetchApps();
})();
