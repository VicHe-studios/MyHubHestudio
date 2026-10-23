(async function() {
  const appsList = document.getElementById('apps-list');
  const paginationEl = document.getElementById('pagination');
  const btnRefresh = document.getElementById('btn-refresh');
  const searchInput = document.getElementById('search-input');
  const authorFilter = document.getElementById('author-filter');

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
        let tieneWidget = false;
        
        try {
          const manifestUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${folder.name}/manifest.json?t=${Date.now()}`;
          const mRes = await fetch(manifestUrl);
          if (mRes.ok) {
            const manifest = await mRes.json();
            titulo = manifest.titulo || folder.name;
            icono = manifest.icono || 'box';
            autor = manifest.autor || null;
            descripcion = manifest.descripcion || null;
            tieneWidget = manifest.widgets && manifest.widgets.length > 0;
          }
        } catch (e) {}

        const appData = { id: folder.name, titulo, icono, autor, descripcion, tieneWidget };
        manifestCache[folder.name] = appData;
        cacheModificado = true;
        return appData;
      }));

      if (cacheModificado) {
        localStorage.setItem('storhe_manifest_cache', JSON.stringify(manifestCache));
      }

      allAppsData = appsData;
      populateAuthorFilter();
      applyFilter(); 

    } catch (err) {
      console.error(err);
      appsList.innerHTML = `<p style="text-align: center; color: #ef4444; margin-top: 20px;">Error: ${err.message}</p>`;
    }
  };

  const populateAuthorFilter = () => {
    const authors = [...new Set(allAppsData.map(app => app.autor).filter(Boolean))];
    const currentVal = authorFilter.value;

    authorFilter.innerHTML = '<option value="">Todos los creadores</option>';
    authors.forEach(author => {
      const opt = document.createElement('option');
      opt.value = author;
      opt.textContent = author;
      authorFilter.appendChild(opt);
    });

    if (authors.includes(currentVal)) authorFilter.value = currentVal;
  };

  const applyFilter = async () => {
    const query = searchInput.value.toLowerCase().trim();
    const selectedAuthor = authorFilter.value;
    
    filteredAppsData = allAppsData.filter(app => {
      const matchText = app.titulo.toLowerCase().includes(query) || 
                        app.id.toLowerCase().includes(query) ||
                        (app.autor && app.autor.toLowerCase().includes(query)) ||
                        (app.descripcion && app.descripcion.toLowerCase().includes(query));
      
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
      
      // Autor sutil (Texto gris en lugar de badge morado)
      const autorHtml = app.autor ? `<span style="color: var(--muted); font-size: 11px; font-weight: 500;">Por ${app.autor}</span>` : '';
      
      // Descripción
      const descHtml = app.descripcion ? `<span class="app-desc">${app.descripcion}</span>` : '';
      
      // Badge de Widget sutil (Icono + Texto acento, sin fondo)
      const widgetBadge = app.tieneWidget ? `
        <span style="display: inline-flex; align-items: center; gap: 4px; color: var(--accent); font-size: 11px; font-weight: 600; margin-left: 2px;">
          <i data-lucide="layout-grid" style="width: 12px; height: 12px;"></i> Widget
        </span>` : '';

      card.innerHTML = `
        <div class="app-icon"><i data-lucide="${app.icono}"></i></div>
        <div class="app-info">
          <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px;">
            <h3 class="app-title" style="margin: 0;">${app.titulo}</h3>
            ${widgetBadge}
          </div>
          <div class="app-meta" style="margin-top: 2px;">
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
      
      // Función auxiliar para descargar archivos y carpetas recursivamente
      const descargarContenido = async (path) => {
        const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?t=${Date.now()}`;
        const res = await fetch(apiUrl);
        if (!res.ok) return;
        const fileList = await res.json();

        for (const item of fileList) {
          if (item.type === 'file') {
            const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${item.path}?t=${Date.now()}`;
            const fileRes = await fetch(rawUrl);
            if (!fileRes.ok) continue; 
            const blob = await fileRes.blob();
            archivos[item.path] = blob;
            if (item.name === 'manifest.json') manifest = JSON.parse(await blob.text());
          } else if (item.type === 'dir') {
            await descargarContenido(item.path);
          }
        }
      };

      await descargarContenido(appId);

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

  btnRefresh.onclick = () => {
    localStorage.removeItem('storhe_manifest_cache');
    fetchApps(true);
  };
  
  searchInput.addEventListener('input', () => { currentPage = 1; applyFilter(); });
  authorFilter.addEventListener('change', () => { currentPage = 1; applyFilter(); });

  fetchApps();
})();
