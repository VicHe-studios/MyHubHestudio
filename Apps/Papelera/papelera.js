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

  let appsObj = {};
  let carpetasObj = {};

  const cargarDatos = async () => {
    appsObj = await kvGet('apps_instaladas') || {};
    carpetasObj = await kvGet('carpetas') || {};
    render();
  };

  const render = () => {
    const appKeys = Object.keys(appsObj);
    const carpetasKeys = Object.keys(carpetasObj);
    const totalItems = appKeys.length + carpetasKeys.length;

    if (totalItems === 0) {
      btnVaciar.style.display = 'none';
      lista.innerHTML = `
        <div class="papelera-vacia">
          <div class="icono-vacio"><i data-lucide="trash-2"></i></div>
          <p>No hay apps ni carpetas para eliminar</p>
        </div>
      `;
    } else {
      btnVaciar.style.display = 'inline-flex';
      
      let html = '';

      // Renderizar Carpetas primero
      html += carpetasKeys.map(id => {
        const c = carpetasObj[id];
        return `
        <div class="papelera-item">
          <div class="papelera-item-icono" style="color: var(--text);"><i data-lucide="folder"></i></div>
          <div class="papelera-item-info">
            <span class="papelera-item-nombre">${c.nombre}</span>
            <span class="papelera-item-meta">Carpeta • ${c.apps.length} apps dentro</span>
          </div>
          <div class="papelera-item-acciones">
            <button class="btn-icono" title="Eliminar carpeta" onclick="eliminarCarpeta('${id}')">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
        `;
      }).join('');

      // Renderizar Apps
      html += appKeys.map(id => {
        const app = appsObj[id];
        return `
        <div class="papelera-item">
          <div class="papelera-item-icono"><i data-lucide="${app.manifest.icono || 'box'}"></i></div>
          <div class="papelera-item-info">
            <span class="papelera-item-nombre">${app.manifest.titulo}</span>
            <span class="papelera-item-meta">Aplicación • ID: ${id}</span>
          </div>
          <div class="papelera-item-acciones">
            <button class="btn-icono" title="Desinstalar app" onclick="desinstalar('${id}')">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      `}).join('');

      lista.innerHTML = html;
    }
    if (window.lucide) lucide.createIcons();
  };

  // Desinstalar una app
  window.desinstalar = async (id) => {
    if (!confirm('¿Eliminar esta app permanentemente? Se borrarán todos sus archivos.')) return;
    
    delete appsObj[id];
    await kvSet('apps_instaladas', appsObj);
    
    // Avisar al Lobby
    if (window.parent && window.parent.MyHub) {
      window.parent.MyHub.eliminarApp(id);
      window.parent.MyHub.toast('App desinstalada');
    }
    
    // Recargar datos para actualizar el conteo de apps en carpetas
    await cargarDatos();
  };

  // Eliminar una carpeta
  window.eliminarCarpeta = async (id) => {
    if (!confirm('¿Eliminar esta carpeta permanentemente? Las apps volverán al escritorio.')) return;
    
    delete carpetasObj[id];
    await kvSet('carpetas', carpetasObj);
    
    // Avisar al Lobby
    if (window.parent && window.parent.MyHub && window.parent.MyHub.eliminarCarpetaLobby) {
      window.parent.MyHub.eliminarCarpetaLobby(id);
      window.parent.MyHub.toast('Carpeta eliminada');
    }
    
    await cargarDatos();
  };

  // Vaciar Todo
  btnVaciar.onclick = async () => {
    if (confirm('¿Seguro que quieres eliminar TODAS las apps y carpetas permanentemente?')) {
      
      if (window.parent && window.parent.MyHub) {
        // Avisar de carpetas
        Object.keys(carpetasObj).forEach(id => {
          if (window.parent.MyHub.eliminarCarpetaLobby) window.parent.MyHub.eliminarCarpetaLobby(id);
        });
        // Avisar de apps
        Object.keys(appsObj).forEach(id => {
          window.parent.MyHub.eliminarApp(id);
        });
      }
      
      appsObj = {};
      carpetasObj = {};
      await kvSet('apps_instaladas', appsObj);
      await kvSet('carpetas', carpetasObj);
      
      await cargarDatos();
      
      if (window.parent && window.parent.MyHub) {
        window.parent.MyHub.toast('Papelera vaciada por completo');
      }
    }
  };

  cargarDatos();
})();
