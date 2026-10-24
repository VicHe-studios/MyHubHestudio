// forge.js — Instalador de apps (canonicaliza widgets al formato oficial)
(async function() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const btnFile = document.getElementById('btn-file');
  const appsList = document.getElementById('apps-list');

  // ================= Tema =================
  if (window.parent !== window) window.parent.postMessage({ type: 'myhub:get-tema' }, '*');
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'myhub:tema:res') {
      document.documentElement.dataset.modo = e.data.modo;
      document.documentElement.style.setProperty('--accent', e.data.color);
    }
  });

  // ================= IndexedDB =================
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

  // ================= Widgets: normalización =================
  // Formato CANÓNICO final: { file: "Widgets/X.html", size: "1x1"|"2x1"|"2x2" }
  // Formatos aceptados en ENTRADA (compatibilidad):
  //   - "Widgets/X.html"  (string suelto)
  //   - { file: "...", size?: "..." }       ← formato oficial Stor-He / ExtraFunc
  //   - { archivo: "...", size?: "..." }    ← formato legacy
  //   - { id: "X", size?: "..." }           ← busca Widgets/X.html | X/index.html
  //   - { nombre: "X", size?: "..." }       ← igual que id
  const SIZES_VALIDOS = new Set(['1x1', '2x1', '2x2']);
  const normalizarSize = (s) =>
    (typeof s === 'string' && SIZES_VALIDOS.has(s.toLowerCase())) ? s.toLowerCase() : '1x1';

  // Índice case-insensitive del ZIP (path normalizado → path real)
  const indexarZip = (zip) => {
    const idx = new Map();
    const norm = (p) => String(p).replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();
    zip.forEach((path, entry) => {
      if (!entry.dir) idx.set(norm(path), path);
    });
    return { idx, norm };
  };

  const buscarArchivoWidget = (indexado, candidatos) => {
    for (const c of candidatos) {
      const hit = indexado.idx.get(indexado.norm(c));
      if (hit) return hit;
    }
    return null;
  };

  // Devuelve { file, size } o null si no se puede resolver
  const canonicalizarWidget = (w, zip, indexado) => {
    let file = null;
    let size = '1x1';

    if (typeof w === 'string') {
      file = w;
    } else if (w && typeof w === 'object') {
      size = normalizarSize(w.size);
      if (typeof w.file === 'string') file = w.file;
      else if (typeof w.archivo === 'string') file = w.archivo;
      else if (typeof w.id === 'string' || typeof w.nombre === 'string') {
        const id = w.id || w.nombre;
        const encontrado = buscarArchivoWidget(indexado, [
          `Widgets/${id}.html`,
          `Widgets/${id}.js`,
          `Widgets/${id}/index.html`,
          `Widgets/${id}/index.js`,
          `Widgets/${id}/manifest.json`
        ]);
        if (encontrado) file = encontrado;
      }
    }

    if (!file) return null;
    const real = buscarArchivoWidget(indexado, [file]);
    if (!real) return null;
    return { file: real, size };
  };

  const getWidgetsCrudos = (manifest) => {
    if (!manifest || !manifest.widgets) return [];
    if (Array.isArray(manifest.widgets)) return manifest.widgets;
    // Tolerancia: si es un objeto suelto, lo tratamos como array de 1
    if (typeof manifest.widgets === 'object') return [manifest.widgets];
    return [];
  };

  // Devuelve { validos: [{file,size}, ...], descartados: [string, ...] }
  const procesarWidgets = (manifest, zip) => {
    const crudos = getWidgetsCrudos(manifest);
    if (crudos.length === 0) return { validos: [], descartados: [] };
    const indexado = indexarZip(zip);
    const validos = [];
    const descartados = [];
    for (const w of crudos) {
      const canon = canonicalizarWidget(w, zip, indexado);
      if (canon) validos.push(canon);
      else descartados.push(typeof w === 'string' ? w : JSON.stringify(w));
    }
    return { validos, descartados };
  };

  const getWidgets = (manifest) => {
    if (!manifest || !manifest.widgets) return [];
    return Array.isArray(manifest.widgets) ? manifest.widgets : [];
  };

  // ================= Render de instaladas =================
  const renderInstaladas = async () => {
    const apps = await kvGet('apps_instaladas') || {};
    appsList.innerHTML = '';

    if (Object.keys(apps).length === 0) {
      appsList.innerHTML = '<p style="color: var(--muted); font-size: 13px; text-align: center;">No hay apps instaladas.</p>';
      return;
    }

    for (const data of Object.values(apps)) {
      const widgets = getWidgets(data.manifest);
      const badge = widgets.length > 0
        ? `<span class="widget-badge" title="Incluye ${widgets.length} widget(s)"><i data-lucide="layout-grid"></i>${widgets.length} widget${widgets.length > 1 ? 's' : ''}</span>`
        : '';

      const div = document.createElement('div');
      div.className = 'app-item';
      div.innerHTML = `
        <div class="app-item-icon"><i data-lucide="${data.manifest.icono || 'box'}"></i></div>
        <div class="app-item-info">
          <div class="app-item-title">${data.manifest.titulo}${badge}</div>
          <div class="app-item-id">ID: ${data.manifest.id}</div>
        </div>
      `;
      appsList.appendChild(div);
    }
    if (window.lucide) lucide.createIcons();
  };

  // ================= Procesar ZIP =================
  const procesarZIP = async (file) => {
    try {
      const zip = await JSZip.loadAsync(file);

      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) return alert('El ZIP debe contener un manifest.json');
      const manifestStr = await manifestFile.async('string');
      const manifest = JSON.parse(manifestStr);

      if (!manifest.id || !manifest.titulo) return alert('El manifest.json debe tener id y titulo.');

      // ── Canonicalizar widgets ANTES de guardar ──
      const { validos, descartados } = procesarWidgets(manifest, zip);
      if (validos.length > 0) {
        manifest.widgets = validos;              // { file, size } — listo para ExtraFunc
      } else if (descartados.length > 0 || manifest.widgets) {
        delete manifest.widgets;                 // nada válido → limpiamos el campo
      }

      // Extraer TODOS los archivos (widgets incluidos, recursivo)
      const archivos = {};
      const promises = [];
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          promises.push(zipEntry.async('blob').then(blob => {
            archivos[relativePath] = blob;
          }));
        }
      });
      await Promise.all(promises);

      // Guardar en IndexedDB
      const apps = await kvGet('apps_instaladas') || {};
      apps[manifest.id] = { manifest, archivos };
      await kvSet('apps_instaladas', apps);

      // Avisar al Lobby
      if (window.parent && window.parent.MyHub) {
        window.parent.MyHub.registrarApp({
          id: manifest.id,
          titulo: manifest.titulo,
          icono: manifest.icono || 'box',
          instalada: true,
          archivos: archivos,
          manifest: manifest
        });
        const total = getWidgets(manifest).length;
        const sufijo = total > 0 ? ` con ${total} widget(s)` : '';
        window.parent.MyHub.toast(`App "${manifest.titulo}" instalada${sufijo}`);
      }

      await renderInstaladas();

      // Reporte final
      const total = getWidgets(manifest).length;
      const partes = [];
      if (total > 0) partes.push(`Se instalaron ${total} widget(s).`);
      if (descartados.length > 0) {
        partes.push(`\n⚠ Se descartaron ${descartados.length} widget(s) inválido(s):\n• ${descartados.join('\n• ')}`);
      }
      alert(`¡Instalación exitosa!${partes.length ? '\n\n' + partes.join('\n') : ''}`);

    } catch (err) {
      console.error(err);
      alert('Error al procesar el ZIP. Asegúrate de que es válido.');
    }
  };

  dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragover'); };
  dropZone.ondragleave = () => dropZone.classList.remove('dragover');
  dropZone.ondrop = (e) => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) procesarZIP(e.dataTransfer.files[0]);
  };

  btnFile.onclick = () => fileInput.click();
  fileInput.onchange = () => {
    if (fileInput.files.length) procesarZIP(fileInput.files[0]);
  };

  renderInstaladas();
})();
