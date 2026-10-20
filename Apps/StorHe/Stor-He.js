(async function() {
  const appsList = document.getElementById('apps-list');
  const btnRefresh = document.getElementById('btn-refresh');

  // Constantes de tu repositorio de apps
  const REPO_OWNER = 'VicHe-studios';
  const REPO_NAME = 'MyHubHestudio-StorHe';
  const BRANCH = 'main';

  // 1. Pedir tema al Lobby
  if (window.parent !== window) window.parent.postMessage({ type: 'myhub:get-tema' }, '*');
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'myhub:tema:res') {
      document.documentElement.dataset.modo = e.data.modo;
      document.documentElement.style.setProperty('--accent', e.data.color);
    }
  });

  // 2. IndexedDB
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

  // 3. Obtener lista de carpetas y leer sus Manifests
  const fetchApps = async () => {
    appsList.innerHTML = '<p style="text-align: center; color: var(--muted); margin-top: 20px;">Buscando apps y leyendo manifiestos...</p>';
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/`);
      if (!res.ok) throw new Error('Error al conectar con GitHub');
      
      const data = await res.json();
      const folders = data.filter(item => item.type === 'dir' && !item.name.startsWith('.'));

      if (folders.length === 0) {
        appsList.innerHTML = '<p style="text-align: center; color: var(--muted); margin-top: 20px;">No hay apps disponibles en el repositorio.</p>';
        return;
      }

      const installedApps = await kvGet('apps_instaladas') || {};

      // Leer los manifests de cada carpeta usando jsDelivr
      const appsData = await Promise.all(folders.map(async (folder) => {
        let titulo = folder.name;
        let icono = 'box';
        
        try {
          const manifestUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}@${BRANCH}/${folder.name}/manifest.json`;
          const mRes = await fetch(manifestUrl);
          if (mRes.ok) {
            const manifest = await mRes.json();
            titulo = manifest.titulo || folder.name;
            icono = manifest.icono || 'box';
          }
        } catch (e) {
          // Si falla la lectura del manifest, usamos valores por defecto
          console.warn(`No se pudo leer el manifest de ${folder.name}`);
        }

        return { id: folder.name, titulo, icono };
      }));

      // Renderizar la lista con los datos reales
      appsList.innerHTML = '';
      appsData.forEach(app => {
        const isInstalled = !!installedApps[app.id];
        
        const card = document.createElement('div');
        card.className = 'app-card';
        card.innerHTML = `
          <div class="app-icon"><i data-lucide="${app.icono}"></i></div>
          <div class="app-info">
            <h3 class="app-title">${app.titulo}</h3>
            <p class="app-id">ID: ${app.id}</p>
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

  // 4. Instalar app
  const instalarApp = async (appId, btnElement) => {
    const originalText = btnElement.textContent;
    btnElement.textContent = 'Instalando...';
    btnElement.disabled = true;

    try {
      const archivos = {};
      let manifest = null;

      const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${appId}`);
      if (!res.ok) throw new Error('No se pudo leer la carpeta de la app');
      
      const fileList = await res.json();

      for (const file of fileList) {
        if (file.type === 'file') {
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

      if (!manifest) {
        manifest = { id: appId, titulo: appId, icono: 'box', main: 'index.html' };
      }
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
        window.parent.MyHub.toast(`App "${manifest.titulo}" instalada con éxito`);
      }

      btnElement.textContent = 'Instalada';
      
    } catch (err) {
      console.error(err);
      alert(`Error al instalar la app: ${err.message}`);
      btnElement.textContent = originalText;
      btnElement.disabled = false;
    }
  };

  btnRefresh.onclick = fetchApps;
  fetchApps();
})();
