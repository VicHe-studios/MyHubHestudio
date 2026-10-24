// forge.js — Instalador (mismo formato de almacenamiento que Stor-He)
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

  // ================= Widgets: solo diagnóstico =================
  // Formato OFICIAL (único que ExtraFunc renderiza): { file: "...", size: "1x1"|"2x1"|"2x2" }
  // NO modificamos el manifest. Stor-He lo guarda tal cual, Forge hace lo mismo.
  // Solo inspeccionamos para avisar al usuario qué no va a funcionar.

  const getWidgets = (manifest) => {
    if (!manifest || !manifest.widgets) return [];
    return Array.isArray(manifest.widgets) ? manifest.widgets : [];
  };

  const diagnosticarWidgets = (manifest, zip) => {
    const widgets = getWidgets(manifest);
    if (widgets.length === 0) return { total: 0, problemas: [] };

    const norm = (p) => String(p).replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();
    const index = new Set();
    zip.forEach((path, entry) => { if (!entry.dir) index.add(norm(path)); });

    const problemas = [];
    widgets.forEach((w, i) => {
      const n = `widget #${i + 1}`;
      if (typeof w === 'string') {
        problemas.push(`${n}: formato string (el runtime lee w.file → undefined). Debería ser { "file": "...", "size": "..." }`);
        return;
      }
      if (!w || typeof w !== 'object') {
        problemas.push(`${n}: entrada inválida (${JSON.stringify(w)})`);
        return;
      }
      if (typeof w.file !== 'string') {
        problemas.push(`${n}: falta "file" (ExtraFunc solo lee file + size)`);
        return;
      }
      if (!index.has(norm(w.file))) {
        problemas.push(`${n}: el archivo "${w.file}" no existe en el ZIP`);
      }
      if (w.size && !['1x1','2x1','2x2'].includes(w.size)) {
        problemas.push(`${n}: tamaño inválido "${w.size}" (válidos: 1x1, 2x1, 2x2)`);
      }
    });
    return { total: widgets.length, problemas };
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

  // ================= Procesar ZIP (mismo formato que Stor-He) =================
  const procesarZIP = async (file) => {
    try {
      const zip = await JSZip.loadAsync(file);

      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) return alert('El ZIP debe contener un manifest.json');
      const manifestStr = await manifestFile.async('string');
      const manifest = JSON.parse(manifestStr);

      if (!manifest.id || !manifest.titulo) return alert('El manifest.json debe tener id y titulo.');

      // Diagnóstico (NO modifica nada)
      const { total, problemas } = diagnosticarWidgets(manifest, zip);

      // Extraer todos los archivos (widgets incluidos, recursivo)
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

      // ⚠ MISMO FORMATO QUE STOR-HE: manifest tal cual + archivos relativos
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
        const sufijo = total > 0 ? ` con ${total} widget(s)` : '';
        window.parent.MyHub.toast(`App "${manifest.titulo}" instalada${sufijo}`);
      }

      await renderInstaladas();

      // Reporte al usuario
      if (problemas.length > 0) {
        alert(
          `¡Instalación exitosa!\n\n` +
          `La app quedó guardada igual que con Stor-He, pero se detectaron problemas en los widgets que impedirán que se rendericen:\n\n` +
          `• ${problemas.join('\n• ')}\n\n` +
          `El autor de la app debe corregir el manifest.json para que funcionen.`
        );
      } else if (total > 0) {
        alert(`¡Instalación exitosa!\nSe instalaron ${total} widget(s) correctamente.`);
      } else {
        alert('¡Instalación exitosa!');
      }

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
