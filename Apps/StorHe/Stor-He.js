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

  // 3. Obtener lista de carpetas (Apps) desde la API de GitHub
  const fetchApps = async () => {
    appsList.innerHTML = '<p style="text-align: center; color: var(--muted); margin-top: 20px;">Buscando apps en el repositorio...</p>';
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/`);
      if (!res.ok) throw new Error('Error al conectar con GitHub');
      
      const data = await res.json();
      // Filtrar solo carpetas
      const folders = data.filter(item => item.type === 'dir' && !item.name.startsWith('.'));

      if (folders.length === 0) {
        appsList.innerHTML = '<p style="text-align: center; color: var(--muted); margin-top: 20px;">No hay apps disponibles en el repositorio.</p>';
        return;
      }

      const installedApps = await kvGet('apps_instaladas') || {};

      appsList.innerHTML = '';
      folders.forEach(folder => {
        const isInstalled = !!installedApps[folder.name];
        
        const card = document.createElement('div');
        card.className = 'app-card';
        card.innerHTML = `
          <div class="app-icon"><i data-lucide="box"></i></div>
          <div class="app-info">
            <h3 class="app-title">${folder.name}</h3>
            <p class="app-id">ID: ${folder.name}</p>
          </div>
          <button class="btn-install" data-id="${folder.name}" ${isInstalled ? 'disabled' : ''}>
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

  // 4. Instalar app (Descarga individual de archivos)
  const instalarApp = async (appId, btnElement) => {
    const originalText = btnElement.textContent;
    btnElement.textContent = 'Instalando...';
    btnElement.disabled = true;

    try {
      const archivos = {};
      let manifest = null;

      // Buscar archivos dentro de la carpeta de la app en GitHub
      const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${appId}`);
      if (!res.ok) throw new Error('No se pudo leer la carpeta de la app');
      
      const fileList = await res.json();

      // Descargar cada archivo de la carpeta usando jsDelivr (sin bloqueos CORS)
      for (const file of fileList) {
        if (file.type === 'file') {
          // jsDelivr lee directamente el archivo desde tu repo de GitHub
          const jsDelivrUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}@${BRANCH}/${file.path}`;
          const fileRes = await fetch(jsDelivrUrl);
          if (!fileRes.ok) continue; // Si falla un archivo, pasamos al siguiente
          
          const blob = await fileRes.blob();
          archivos[file.name] = blob;

          // Leer el manifest si existe
          if (file.name === 'manifest.json') {
            const text = await blob.text();
            manifest = JSON.parse(text);
          }
        }
      }

      // Si no hay manifest, crear uno por defecto
      if (!manifest) {
        manifest = { id: appId, titulo: appId, icono: 'box', main: 'index.html' };
      }
      manifest.id = appId;

      // Guardar en IndexedDB
      const apps = await kvGet('apps_instaladas') || {};
      apps[appId] = { manifest, archivos };
      await kvSet('apps_instaladas', apps);

      // Notificar al Lobby
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

  // 5. Eventos
  btnRefresh.onclick = fetchApps;

  // Iniciar
  fetchApps();
})();
