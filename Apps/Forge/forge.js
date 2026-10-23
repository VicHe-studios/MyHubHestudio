(async function() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const btnFile = document.getElementById('btn-file');
  const appsList = document.getElementById('apps-list');

  // Tema
  if (window.parent !== window) window.parent.postMessage({ type: 'myhub:get-tema' }, '*');
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'myhub:tema:res') {
      document.documentElement.dataset.modo = e.data.modo;
      document.documentElement.style.setProperty('--accent', e.data.color);
    }
  });

  // IndexedDB
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

  // ---------- Helpers de widgets ----------
  // Mismo criterio que la tienda: solo consideramos array válido.
  const getWidgets = (manifest) => {
    if (!manifest || !manifest.widgets) return [];
    return Array.isArray(manifest.widgets) ? manifest.widgets : [];
  };

  // Valida que los widgets declarados existan físicamente en el ZIP.
  // Soporta los tres formatos: string (id), { file, size } (oficial del Lobby), { id, archivo }.
  const validarWidgets = (manifest, zip) => {
    const issues = [];
    const widgets = getWidgets(manifest);
    if (widgets.length === 0) return issues;

    // Acepta "widgets/" y "Widgets/" (case-insensitive)
    let tieneCarpeta = false;
    zip.forEach((path, entry) => {
      if (!entry.dir && /^widgets\//i.test(path)) tieneCarpeta = true;
    });
    if (!tieneCarpeta) {
      issues.push('El manifest declara "widgets" pero el ZIP no contiene la carpeta "widgets/".');
      return issues;
    }

    for (const w of widgets) {
      let label = '';
      let encontrado = false;

      if (typeof w === 'string') {
        label = w;
        encontrado = !!(
          zip.file(`widgets/${w}/index.html`) ||
          zip.file(`widgets/${w}.html`) ||
          zip.file(`widgets/${w}/manifest.json`)
        );
      } else if (w && typeof w === 'object') {
        // Formato oficial del Lobby: { file, size }
        if (w.file) {
          label = w.file;
          encontrado = !!zip.file(w.file);
        } else if (w.archivo) {
          label = w.archivo;
          encontrado = !!(zip.file(w.archivo) || zip.file(`widgets/${w.archivo}`));
        } else if (w.id || w.nombre) {
          const id = w.id || w.nombre;
          label = id;
          encontrado = !!(
            zip.file(`widgets/${id}/index.html`) ||
            zip.file(`widgets/${id}.html`) ||
            zip.file(`widgets/${id}/manifest.json`)
          );
        }
      }

      if (!label) {
        issues.push(`Widget inválido en el manifest: ${JSON.stringify(w)}`);
        continue;
      }
      if (!encontrado) {
        issues.push(`Widget "${label}" declarado pero no se encontró su archivo en el ZIP.`);
      }
    }
    return issues;
  };

  // ---------- Render de instaladas ----------
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

  // ---------- Procesar ZIP ----------
  const procesarZIP = async (file) => {
    try {
      const zip = await JSZip.loadAsync(file);

      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) return alert('El ZIP debe contener un manifest.json');
      const manifestStr = await manifestFile.async('string');
      const manifest = JSON.parse(manifestStr);

      if (!manifest.id || !manifest.titulo) return alert('El manifest.json debe tener id y titulo.');

      const tieneWidgets = getWidgets(manifest).length > 0;
      const widgetIssues = tieneWidgets ? validarWidgets(manifest, zip) : [];

      // Extraer TODOS los archivos (incluye la carpeta widgets/ recursivamente)
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

      // Avisar al Lobby (mismo contrato que la tienda)
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

      // Mensajes de resultado
      const total = getWidgets(manifest).length;
      if (widgetIssues.length > 0) {
        alert(`¡Instalación exitosa!\n\nAdvertencias sobre widgets:\n• ${widgetIssues.join('\n• ')}`);
      } else if (total > 0) {
        alert(`¡Instalación exitosa!\nSe instalaron ${total} widget(s).`);
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
