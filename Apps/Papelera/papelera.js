(async function() {
  const lista = document.getElementById('lista');
  const btnVaciar = document.getElementById('btn-vaciar');
  const btnBorrarSeleccion = document.getElementById('btn-borrar-seleccion');
  const contadorSel = document.getElementById('contador-sel');
  const searchInput = document.getElementById('search-input');

  if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'myhub:get-tema' }, '*');
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'myhub:tema:res') {
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

  let appsObj = {};
  let carpetasObj = {};
  let searchQuery = '';
  let selectedItems = new Set(); // Guarda strings tipo "app:id" o "folder:id"

  const cargarDatos = async () => {
    appsObj = await kvGet('apps_instaladas') || {};
    carpetasObj = await kvGet('carpetas') || {};
    render();
  };

  const updateSelectionUI = () => {
    const count = selectedItems.size;
    contadorSel.textContent = count;
    btnBorrarSeleccion.style.display = count > 0 ? 'inline-flex' : 'none';
  };

  const toggleSelect = (type, id) => {
    const key = `${type}:${id}`;
    if (selectedItems.has(key)) selectedItems.delete(key);
    else selectedItems.add(key);
    updateSelectionUI();
    render();
  };

  const render = () => {
    const q = searchQuery.toLowerCase().trim();
    
    // Filtrar por búsqueda
    const filteredCarpetas = Object.keys(carpetasObj).filter(id => {
      const c = carpetasObj[id];
      return c.nombre.toLowerCase().includes(q);
    });
    
    const filteredApps = Object.keys(appsObj).filter(id => {
      const app = appsObj[id];
      return app.manifest.titulo.toLowerCase().includes(q) || id.toLowerCase().includes(q);
    });

    const totalItems = filteredApps.length + filteredCarpetas.length;

    if (totalItems === 0) {
      btnVaciar.style.display = (Object.keys(appsObj).length + Object.keys(carpetasObj).length) > 0 ? 'inline-flex' : 'none';
      lista.innerHTML = `
        <div class="papelera-vacia">
          <div class="icono-vacio"><i data-lucide="${searchQuery ? 'search' : 'trash-2'}"></i></div>
          <p>${searchQuery ? 'No se encontraron resultados' : 'No hay apps ni carpetas para eliminar'}</p>
        </div>
      `;
    } else {
      btnVaciar.style.display = 'inline-flex';
      
      let html = '';

      // Renderizar Carpetas
      html += filteredCarpetas.map(id => {
        const c = carpetasObj[id];
        const isSelected = selectedItems.has(`folder:${id}`);
        return `
        <div class="papelera-item ${isSelected ? 'seleccionado' : ''}">
          <input type="checkbox" class="item-checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSelect('folder', '${id}')">
          <div class="papelera-item-icono" style="color: var(--text);"><i data-lucide="folder"></i></div>
          <div class="papelera-item-info" onclick="toggleSelect('folder', '${id}')">
            <span class="papelera-item-nombre">${c.nombre}</span>
            <span class="papelera-item-meta">Carpeta • ${c.apps.length} apps dentro</span>
          </div>
          <div class="papelera-item-acciones">
            <button class="btn-icono" title="Eliminar carpeta" onclick="eliminarIndividual('folder', '${id}')">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
        `;
      }).join('');

      // Renderizar Apps
      html += filteredApps.map(id => {
        const app = appsObj[id];
        const isSelected = selectedItems.has(`app:${id}`);
        return `
        <div class="papelera-item ${isSelected ? 'seleccionado' : ''}">
          <input type="checkbox" class="item-checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSelect('app', '${id}')">
          <div class="papelera-item-icono"><i data-lucide="${app.manifest.icono || 'box'}"></i></div>
          <div class="papelera-item-info" onclick="toggleSelect('app', '${id}')">
            <span class="papelera-item-nombre">${app.manifest.titulo}</span>
            <span class="papelera-item-meta">Aplicación • ID: ${id}</span>
          </div>
          <div class="papelera-item-acciones">
            <button class="btn-icono" title="Desinstalar app" onclick="eliminarIndividual('app', '${id}')">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      `}).join('');

      lista.innerHTML = html;
    }
    if (window.lucide) lucide.createIcons();
  };

  // Exponer funciones al DOM para los onclick
  window.toggleSelect = toggleSelect;

  window.eliminarIndividual = async (type, id) => {
    if (!confirm('¿Eliminar permanentemente?')) return;
    selectedItems.delete(`${type}:${id}`);
    
    if (type === 'app') {
      delete appsObj[id];
      await kvSet('apps_instaladas', appsObj);
      if (window.parent && window.parent.MyHub) window.parent.MyHub.eliminarApp(id);
    } else {
      delete carpetasObj[id];
      await kvSet('carpetas', carpetasObj);
      if (window.parent && window.parent.MyHub && window.parent.MyHub.eliminarCarpetaLobby) window.parent.MyHub.eliminarCarpetaLobby(id);
    }
    
    updateSelectionUI();
    await cargarDatos();
  };

  // Borrar Seleccionados
  btnBorrarSeleccion.onclick = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`¿Eliminar los ${selectedItems.size} elementos seleccionados permanentemente?`)) return;

    for (const item of selectedItems) {
      const [type, id] = item.split(':');
      if (type === 'app') {
        delete appsObj[id];
        if (window.parent && window.parent.MyHub) window.parent.MyHub.eliminarApp(id);
      } else {
        delete carpetasObj[id];
        if (window.parent && window.parent.MyHub && window.parent.MyHub.eliminarCarpetaLobby) window.parent.MyHub.eliminarCarpetaLobby(id);
      }
    }
    
    await kvSet('apps_instaladas', appsObj);
    await kvSet('carpetas', carpetasObj);
    selectedItems.clear();
    
    if (window.parent && window.parent.MyHub) window.parent.MyHub.toast('Elementos eliminados');
    updateSelectionUI();
    await cargarDatos();
  };

  btnVaciar.onclick = async () => {
    if (confirm('¿Seguro que quieres eliminar TODAS las apps y carpetas permanentemente?')) {
      if (window.parent && window.parent.MyHub) {
        Object.keys(carpetasObj).forEach(id => { if (window.parent.MyHub.eliminarCarpetaLobby) window.parent.MyHub.eliminarCarpetaLobby(id); });
        Object.keys(appsObj).forEach(id => window.parent.MyHub.eliminarApp(id));
      }
      appsObj = {}; carpetasObj = {}; selectedItems.clear();
      await kvSet('apps_instaladas', appsObj);
      await kvSet('carpetas', carpetasObj);
      updateSelectionUI();
      await cargarDatos();
      if (window.parent && window.parent.MyHub) window.parent.MyHub.toast('Papelera vaciada');
    }
  };

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    render();
  });

  cargarDatos();
})();
