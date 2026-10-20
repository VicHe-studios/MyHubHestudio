(async function() {
  const lista = document.getElementById('lista');
  const btnVaciar = document.getElementById('btn-vaciar');

  // 1. Pedir el tema al Lobby apenas inicia
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'myhub:get-tema' }, '*');
  }

  // 2. Escuchar los cambios de tema que envíe el Lobby
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'myhub:tema:res') {
      document.documentElement.dataset.modo = e.data.modo;
      document.documentElement.style.setProperty('--accent', e.data.color);
    }
  });

  // Base de Datos Local (IndexedDB)
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

  // 3. Cargar APPS INSTALADAS
  let appsObj = await kvGet('apps_instaladas') || {};
  
  const render = () => {
    const appKeys = Object.keys(appsObj);
    
    if (appKeys.length === 0) {
      btnVaciar.style.display = 'none';
      lista.innerHTML = `
        <div class="papelera-vacia">
          <div class="icono-vacio"><i data-lucide="trash-2"></i></div>
          <p>No hay apps para desinstalar</p>
        </div>
      `;
    } else {
      btnVaciar.style.display = 'inline-flex';
      lista.innerHTML = appKeys.map(id => {
        const app = appsObj[id];
        return `
        <div class="papelera-item">
          <div class="papelera-item-icono"><i data-lucide="${app.manifest.icono || 'box'}"></i></div>
          <div class="papelera-item-info">
            <span class="papelera-item-nombre">${app.manifest.titulo}</span>
            <span class="papelera-item-meta">Aplicación • ID: ${id}</span>
          </div>
          <div class="papelera-item-acciones">
            <button class="btn-icono" title="Desinstalar permanentemente" onclick="desinstalar('${id}')">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      `}).join('');
    }
    if (window.lucide) lucide.createIcons();
  };

  // Desinstalar una app
  window.desinstalar = async (id) => {
    if (!confirm('¿Eliminar esta app permanentemente? Se borrarán todos sus archivos.')) return;
    
    delete appsObj[id];
    await kvSet('apps_instaladas', appsObj);
    
    // Avisar al Lobby para que borre el icono
    if (window.parent && window.parent.MyHub) {
      window.parent.MyHub.eliminarApp(id);
      window.parent.MyHub.toast('App desinstalada');
    }
    render();
  };

  // Vaciar: Borra todas las apps instaladas
  btnVaciar.onclick = async () => {
    if (confirm('¿Seguro que quieres desinstalar TODAS las apps permanentemente?')) {
      // Avisar al Lobby por cada app antes de borrar
      if (window.parent && window.parent.MyHub) {
        Object.keys(appsObj).forEach(id => {
          window.parent.MyHub.eliminarApp(id);
        });
      }
      
      appsObj = {};
      await kvSet('apps_instaladas', appsObj);
      render();
      
      if (window.parent && window.parent.MyHub) {
        window.parent.MyHub.toast('Todas las apps fueron desinstaladas');
      }
    }
  };

  render();
})();