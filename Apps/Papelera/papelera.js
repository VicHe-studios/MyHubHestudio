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

  // Lectura de datos (la escritura la hace SIEMPRE el lobby, para no pisarse)
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

  const lobby = () => (window.parent && window.parent !== window ? window.parent.MyHub : null);

  // ================= MODAL DE CONFIRMACIÓN =================
  const showConfirm = (title, message) => {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-confirm-overlay';

      const box = document.createElement('div');
      box.className = 'modal-confirm-box';
      box.innerHTML = `
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="modal-confirm-actions">
          <button class="modal-confirm-btn cancel">Cancelar</button>
          <button class="modal-confirm-btn confirm">Aceptar</button>
        </div>
      `;

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      void overlay.offsetWidth;
      overlay.classList.add('active');

      const close = (result) => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 200);
        resolve(result);
      };

      box.querySelector('.cancel').onclick = () => close(false);
      box.querySelector('.confirm').onclick = () => close(true);
      overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    });
  };

  let appsObj = {};
  let carpetasObj = {};
  let searchQuery = '';
  let selectedItems = new Set(); // "app:id" o "folder:id"

  const cargarDatos = async () => {
    appsObj = (await kvGet('apps_instaladas')) || {};
    carpetasObj = (await kvGet('carpetas')) || {};
    render();
  };

  // Borra UN elemento a través del lobby y espera a que termine de guardar
  const borrarItem = async (type, id) => {
    const M = lobby();
    if (!M) return;
    if (type === 'app') await M.eliminarApp(id);
    else if (M.eliminarCarpeta) await M.eliminarCarpeta(id);
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

  window.toggleSelect = toggleSelect;

  window.eliminarIndividual = async (type, id) => {
    const ok = await showConfirm('Eliminar elemento', '¿Estás seguro que deseas eliminarlo permanentemente?');
    if (!ok) return;

    selectedItems.delete(`${type}:${id}`);
    await borrarItem(type, id);

    updateSelectionUI();
    await cargarDatos();
  };

  btnBorrarSeleccion.onclick = async () => {
    if (selectedItems.size === 0) return;

    const ok = await showConfirm('Eliminar seleccionados', `¿Eliminar los ${selectedItems.size} elementos seleccionados permanentemente?`);
    if (!ok) return;

    const pendientes = [...selectedItems];
    for (const item of pendientes) {
      const [type, id] = item.split(':');
      await borrarItem(type, id);
    }

    selectedItems.clear();
    if (lobby()) lobby().toast('Elementos eliminados');
    updateSelectionUI();
    await cargarDatos();
  };

  btnVaciar.onclick = async () => {
    const ok = await showConfirm('Vaciar Papelera', '¿Seguro que quieres eliminar TODAS las apps y carpetas permanentemente?');
    if (!ok) return;

    // Lectura fresca justo antes de borrar, para no perder apps instaladas después de abrir la Papelera
    const apps = (await kvGet('apps_instaladas')) || {};
    const carpetas = (await kvGet('carpetas')) || {};
    const todos = [
      ...Object.keys(apps).map(id => ['app', id]),
      ...Object.keys(carpetas).map(id => ['folder', id])
    ];
    for (const [type, id] of todos) await borrarItem(type, id);

    selectedItems.clear();
    updateSelectionUI();
    await cargarDatos();
    if (lobby()) lobby().toast('Papelera vaciada');
  };

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    render();
  });

  cargarDatos();
})();
