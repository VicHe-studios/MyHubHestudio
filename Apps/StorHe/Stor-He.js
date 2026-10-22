(async function() {
  const appsList = document.getElementById('apps-list');
  const paginationEl = document.getElementById('pagination');
  const btnRefresh = document.getElementById('btn-refresh');
  const searchInput = document.getElementById('search-input');
  const authorFilter = document.getElementById('author-filter'); // NUEVO

  const REPO_OWNER = 'VicHe-studios';
  const REPO_NAME = 'MyHubHestudio-StorHe';
  const BRANCH = 'main';

  const ITEMS_PER_PAGE = 5; 
  let currentPage = 1;
  let allAppsData = []; 
  let filteredAppsData = []; 
  let currentInstalledApps = {};

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

  const fetchApps = async (forceRefresh = false) => {
    appsList.innerHTML = '<p style="text-align: center; color: var(--muted); margin-top: 20px;">Buscando apps...</p>';
    paginationEl.innerHTML = '';
    
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/?t=${Date.now()}`);
      if (!res.ok) throw new Error('Error al conectar con GitHub');
      
      const data = await res.json();
      const folders = data.filter(item => item.type === 'dir' && !item.name.startsWith('.'));

      if (folders.length === 0) {
        appsList.innerHTML = '<p style="text-align: center; color: var(--muted); margin-top: 20px;">No hay apps disponibles.</p>';
        return;
      }

      currentInstalledApps = await kvGet('apps_instaladas') || {};

      let manifestCache = {};
      if (!forceRefresh) {
        manifestCache = JSON.parse(localStorage.getItem('storhe_manifest_cache') || '{}');
      }

      let cacheModificado = false;

      const appsData = await Promise.all(folders.map(async (folder) => {
        if (manifestCache[folder.name]) return manifestCache[folder.name];

        let titulo = folder.name;
        let icono = 'box';
        let autor = null;
        let descripcion = null;
        
        try {
          const manifestUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${folder.name}/manifest.json?t=${Date.now()}`;
          const mRes = await fetch(manifestUrl);
          if (mRes.ok) {
            const manifest = await mRes.json();
            titulo = manifest.titulo || folder.name;
            icono = manifest.icono || 'box';
            autor = manifest.autor || null;
            descripcion = manifest.descripcion || null;
          }
        } catch (e) {}

        const appData = { id: folder.name, titulo, icono, autor, descripcion };
        manifestCache[folder.name] = appData;
        cacheModificado = true;
        return appData;
      }));

      if (cacheModificado) {
        localStorage.setItem('storhe_manifest_cache', JSON.stringify(manifestCache));
      }

      allAppsData = appsData;
      
      // Llenar el select de autores
      populateAuthorFilter();

      applyFilter(); 

    } catch (err) {
      console.error(err);
      appsList.innerHTML = `<p style="text-align: center; color: #ef4444; margin-top: 20px;">Error: ${err.message}</p>`;
    }
  };

  const populateAuthorFilter = () => {
    // Extraer autores únicos y no nulos
    const authors = [...new Set(allAppsData.map(app => app.autor).filter(Boolean))];
    
    // Guardar el valor actual para no perderlo si se refresca
    const currentVal = authorFilter.value;

    authorFilter.innerHTML = '<option value="">Todos los creadores</option>';
    authors.forEach(author => {
      const opt = document.createElement('option');
      opt.value = author;
      opt.textContent = author;
      authorFilter.appendChild(opt);
    });

    // Restaurar valor si aún existe
    if (authors.includes(currentVal)) authorFilter.value = currentVal;
  };

  const applyFilter = async () => {
    const query = searchInput.value.toLowerCase().trim();
    const selectedAuthor = authorFilter.value;
    
    filteredAppsData = allAppsData.filter(app => {
      // 1. Coincidencia de texto (Título, ID, Autor o Descripción)
      const matchText = app.titulo.toLowerCase().includes(query) || 
                        app.id.toLowerCase().includes(query) ||
                        (app.autor && app.autor.toLowerCase().includes(query)) ||
                        (app.descripcion && app.descripcion.toLowerCase().includes(query));
      
      // 2. Coincidencia de creador seleccionado
      const matchAuthor = selectedAuthor ? app.autor === selectedAuthor : true;

      return matchText && matchAuthor;
    });

    const maxPage = Math.ceil(filteredAppsData.length / ITEMS_PER_PAGE) || 1;
    if (currentPage > maxPage) currentPage = 1;

    renderUI();
  };

  const renderUI = () => {
    appsList.innerHTML = '';
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginatedApps = filteredAppsData.slice(start, end);

    if (paginatedApps.length === 0) {
      appsList.innerHTML = `<p style="text-align: center; color: var(--muted); margin-top: 20px;">No se encontraron apps.</p>`;
      paginationEl.innerHTML = '';
      return;
    }

    paginatedApps.forEach(app => {
      const isInstalled = !!currentInstalledApps[app.id];
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

    paginationEl.innerHTML = '';
    const totalPages = Math.ceil(filteredAppsData.length / ITEMS_PER_PAGE);
    if (totalPages > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.className = 'page-btn'; prevBtn.textContent = 'Anterior'; prevBtn.disabled = currentPage === 1;
      prevBtn.onclick = () => { currentPage--; renderUI(); };

      const nextBtn = document.createElement('button');
      nextBtn.className = 'page-btn'; nextBtn.textContent = 'Siguiente'; nextBtn.disabled = currentPage === totalPages;
      nextBtn.onclick = () => { currentPage++; renderUI(); };

      const info = document.createElement('span');
      info.className = 'page-info'; info.textContent = `Página ${currentPage} de ${totalPages}`;

      paginationEl.appendChild(prevBtn); paginationEl.appendChild(info); paginationEl.appendChild(nextBtn);
    }

    document.querySelectorAll('.btn-install').forEach(btn => {
      btn.onclick = () => instalarApp(btn.dataset.id, btn);
    });

    if (window.lucide) lucide.createIcons();
  };

  const instalarApp = async (appId, btnElement) => {
    const originalText = btnElement.textContent;
    btnElement.textContent = 'Instalando...';
    btnElement.disabled = true;

    try {
      const archivos = {};
      let manifest = null;
      const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${appId}?t=${Date.now()}`);
      if (!res.ok) throw new Error('No se pudo leer la carpeta');
      const fileList = await res.json();

      for (const file of fileList) {
        if (file.type === 'file') {
          const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${file.path}?t=${Date.now()}`;
          const fileRes = await fetch(rawUrl);
          if (!fileRes.ok) continue; 
          const blob = await fileRes.blob();
          archivos[file.name] = blob;
          if (file.name === 'manifest.json') manifest = JSON.parse(await blob.text());
        }
      }

      if (!manifest) manifest = { id: appId, titulo: appId, icono: 'box', main: 'index.html' };
      manifest.id = appId;

      const apps = await kvGet('apps_instaladas') || {};
      apps[appId] = { manifest, archivos };
      await kvSet('apps_instaladas', apps);
      
      currentInstalledApps[appId] = true;

      if (window.parent && window.parent.MyHub) {
        window.parent.MyHub.registrarApp({
          id: manifest.id, titulo: manifest.titulo, icono: manifest.icono || 'box',
          instalada: true, archivos: archivos, manifest: manifest
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

  // Event Listeners
  btnRefresh.onclick = () => {
    localStorage.removeItem('storhe_manifest_cache');
    fetchApps(true);
  };
  
  searchInput.addEventListener('input', () => { currentPage = 1; applyFilter(); });
  authorFilter.addEventListener('change', () => { currentPage = 1; applyFilter(); }); // NUEVO

  fetchApps();
})();
