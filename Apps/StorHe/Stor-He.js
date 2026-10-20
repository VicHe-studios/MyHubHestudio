(async function() {
  const appsList = document.getElementById('apps-list');
  const btnRefresh = document.getElementById('btn-refresh');

  // Constantes del repositorio
  const REPO_OWNER = 'VicHe-studios';
  const REPO_NAME = 'MyHubHestudio';
  const BRANCH = 'main';
  const ZIP_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/heads/${BRANCH}.zip`;

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

  // 3. Obtener lista de apps desde la API de GitHub
  const fetchApps = async () => {
    appsList.innerHTML = '<p style="text-align: center; color: var(--muted); margin-top: 20px;">Buscando apps en el repositorio...</p>';
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/`);
      if (!res.ok) throw new Error('Error al conectar con GitHub');
      
      const data = await res.json();
      // Filtrar solo carpetas y excluir carpetas del sistema si las hubiera (ej. .github)
      const folders = data.filter(item => item.type === 'dir' && !item.name.startsWith('.'));

      if (folders.length === 0) {
        appsList.innerHTML = '<p style="text-align: center; color: var(--muted); margin-top: 20px;">No hay apps disponibles en el repositorio.</p>';
        return;
      }

      // Obtener apps ya instaladas para saber cuáles deshabilitar
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

      // Asignar eventos a los botones
      document.querySelectorAll('.btn-install').forEach(btn => {
        btn.onclick = () => instalarApp(btn.dataset.id, btn);
      });

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error(err);
      appsList.innerHTML = `<p style="text-align: center; color: #ef4444; margin-top: 20px;">Error: ${err.message}</p>`;
    }
  };

  // 4. Instalar app (Descargar ZIP de GitHub y extraer solo la carpeta)
  const instalarApp = async (appId, btnElement) => {
    const originalText = btnElement.textContent;
    btnElement.textContent = 'Descargando...';
    btnElement.disabled = true;

    try {
      // Descargar el ZIP completo del repositorio
      const res = await fetch(ZIP_URL);
      if (!res.ok) throw new Error('Error al descargar el ZIP del repositorio');
      const zipBlob = await res.blob();

      // Cargar el ZIP con JSZip
      const zip = await JSZip.loadAsync(zipBlob);
      
      // El ZIP de GitHub crea una carpeta raíz como "MyHubHestudio-main/"
      const rootFolder = `${REPO_NAME}-${BRANCH}/`;
      
      const archivos = {};
      let manifest = null;

      // Extraer solo los archivos de la carpeta específica de la app
      const promises = [];
      zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return;

        // Si el archivo está dentro de la carpeta de la app
        if (relativePath.startsWith(`${rootFolder}${appId}/`)) {
          // Obtener la ruta relativa quitando la raíz y el nombre de la app
          const pathInApp = relativePath.replace(`${rootFolder}${appId}/`, '');
          
          promises.push(zipEntry.async('blob').then(blob => {
            archivos[pathInApp] = blob;
          }));
        }
      });
      await Promise.all(promises);

      // Verificar si hay manifest.json dentro de la app
      if (archivos['manifest.json']) {
        const manifestText = await archivos['manifest.json'].text();
        manifest = JSON.parse(manifestText);
      } else {
        // Si no hay manifest, creamos uno por defecto
        manifest = {
          id: appId,
          titulo: appId,
          icono: 'box',
          main: 'index.html'
        };
      }

      // Asegurar que el ID sea el nombre de la carpeta para evitar conflictos
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