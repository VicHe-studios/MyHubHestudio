(async function() {
  const output = document.getElementById('output');
  const input = document.getElementById('cmd-input');
  const btnClear = document.getElementById('btn-clear');

  // ================= Tema =================
  if (window.parent !== window) window.parent.postMessage({ type: 'myhub:get-tema' }, '*');
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'myhub:tema:res') {
      document.documentElement.dataset.modo = e.data.modo;
      document.documentElement.style.setProperty('--accent', e.data.color);
    }
  });

  // ================= Utilidades UI =================
  const print = (text, className = '') => {
    const div = document.createElement('div');
    div.className = `line ${className}`;
    div.innerHTML = text;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  };

  const printCmd = (text) => {
    const div = document.createElement('div');
    div.className = 'line cmd-echo';
    div.innerHTML = `<span style="color: var(--accent);">root@myhub:~$</span> ${text}`;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  };

  // Formateador para las listas de comandos
  const printCmdLine = (cmd, desc) => {
    print(`<div class="cmd-list-item"><strong>${cmd}</strong><span>${desc}</span></div>`);
  };

  // ================= Base de Datos (IndexedDB) =================
  const getDBs = async () => {
    if (!indexedDB.databases) return ['Error: Tu navegador no soporta la lectura de IndexedDB.'];
    const dbs = await indexedDB.databases();
    return dbs.map(db => `${db.name} (versión ${db.version})`);
  };

  // ================= Comandos =================
  const commands = {
    'HubInfo': () => {
      print('--- COMANDOS DISPONIBLES ---', 'info');
      
      print('SISTEMA Y NAVEGACIÓN', 'dim');
      printCmdLine('clear', 'Limpia la pantalla de la consola.');
      printCmdLine('HubInfo', 'Muestra esta lista de ayuda.');
      
      print('CONTROL DEL SISTEMA (sys)', 'dim');
      printCmdLine('sys toast <msg>', 'Envía una notificación al escritorio.');
      printCmdLine('sys open <id>', 'Abre una aplicación por su ID.');
      printCmdLine('sys theme <dark|light>', 'Cambia el modo visual.');
      
      print('BASE DE DATOS (db)', 'dim');
      printCmdLine('db list', 'Lista todas las bases de datos.');
      printCmdLine('db drop <nombre>', 'Elimina una base de datos entera.');
      printCmdLine('db keys', 'Muestra las claves del sistema.');
      printCmdLine('db get <clave>', 'Lee el contenido de una clave.');
      printCmdLine('db rm <clave>', 'Elimina una clave específica.');
      
      print('APLICACIONES (app)', 'dim');
      printCmdLine('app list', 'Lista las apps instaladas.');
      printCmdLine('app delete <id>', 'Desinstala una aplicación.');
    },

    'clear': () => {
      output.innerHTML = '';
    },

    'sys toast': (args) => {
      const msg = args.join(' ');
      if (!msg) return print('Uso: sys toast <mensaje>', 'error');
      if (window.parent && window.parent.MyHub) {
        window.parent.MyHub.toast(msg);
        print(`Notificación enviada.`, 'success');
      }
    },

    'sys open': (args) => {
      const id = args[0];
      if (!id) return print('Uso: sys open <id_app>', 'error');
      if (window.parent && window.parent.MyHub) {
        window.parent.MyHub.abrir(id);
        print(`Abriendo app: ${id}`, 'success');
      }
    },

    'sys theme': (args) => {
      const mode = args[0];
      if (mode !== 'dark' && mode !== 'light') return print('Uso: sys theme <dark|light>', 'error');
      
      if (window.parent && window.parent.document) {
        const root = window.parent.document.documentElement;
        root.dataset.modo = mode === 'dark' ? 'oscuro' : 'claro';
        print(`Tema cambiado a ${mode}`, 'success');
        
        if (window.parent.ajustes && window.parent.guardarAjustes) {
          window.parent.ajustes.modo = mode === 'dark' ? 'oscuro' : 'claro';
          window.parent.guardarAjustes();
        }
      }
    },

    'db list': async () => {
      print('Consultando bases de datos...', 'dim');
      const dbs = await getDBs();
      if (typeof dbs === 'string') return print(dbs, 'error');
      if (dbs.length === 0) return print('No hay bases de datos.', 'dim');
      
      print('--- BASES DE DATOS ---', 'info');
      dbs.forEach(db => print(`- ${db}`));
    },

    'db drop': (args) => {
      const dbName = args[0];
      if (!dbName) return print('Uso: db drop <nombre_de_db>', 'error');
      if (dbName === 'myhub-lobby') {
        return print('Error: No se puede eliminar la base de datos del sistema (myhub-lobby).', 'error');
      }

      print(`Advertencia: Eliminando "${dbName}"...`, 'info');
      
      try {
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => print(`Base de datos "${dbName}" eliminada.`, 'success');
        req.onerror = () => print(`Error al eliminar "${dbName}".`, 'error');
        req.onblocked = () => print(`Bloqueado: Cierra otras apps usando "${dbName}".`, 'error');
      } catch (e) {
        print(`Error: ${e.message}`, 'error');
      }
    },

    'db keys': async () => {
      try {
        const db = await new Promise((res, rej) => {
          const r = indexedDB.open('myhub-lobby', 1);
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
        
        const tx = db.transaction('kv', 'readonly');
        const store = tx.objectStore('kv');
        const keys = await new Promise((res) => {
          const req = store.getAllKeys();
          req.onsuccess = () => res(req.result);
        });

        print('--- CLAVES DEL SISTEMA ---', 'info');
        keys.forEach(k => print(`- ${k}`));
      } catch (e) {
        print('Error al leer las claves.', 'error');
      }
    },

    'db get': async (args) => {
      const key = args[0];
      if (!key) return print('Uso: db get <clave>', 'error');
      
      try {
        const db = await new Promise((res, rej) => {
          const r = indexedDB.open('myhub-lobby', 1);
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
        
        const tx = db.transaction('kv', 'readonly');
        const store = tx.objectStore('kv');
        const val = await new Promise((res) => {
          const req = store.get(key);
          req.onsuccess = () => res(req.result);
        });

        if (val === undefined) return print(`La clave "${key}" no existe.`, 'error');
        
        print(`Contenido de "${key}":`, 'info');
        const str = JSON.stringify(val, null, 2);
        // Dividimos el JSON en líneas para que no sea un bloque gigante
        str.split('\n').forEach(line => print(line, 'dim'));
      } catch (e) {
        print('Error al leer la clave.', 'error');
      }
    },

    'db rm': async (args) => {
      const key = args[0];
      if (!key) return print('Uso: db rm <clave>', 'error');
      
      try {
        const db = await new Promise((res, rej) => {
          const r = indexedDB.open('myhub-lobby', 1);
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
        
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').delete(key);
        
        tx.oncomplete = () => {
          print(`Clave "${key}" eliminada.`, 'success');
          if (['apps_instaladas', 'carpetas', 'cuenta'].includes(key)) {
            print('¡Aviso! Has borrado una clave crítica. Recarga el escritorio (Shift + R).', 'error');
          }
        };
      } catch (e) {
        print('Error al borrar la clave.', 'error');
      }
    },

    'app list': () => {
      if (!window.parent || !window.parent.registro) return print('Error: No se puede acceder al registro.', 'error');
      
      print('--- APLICACIONES INSTALADAS ---', 'info');
      window.parent.registro.forEach((app, id) => {
        printCmdLine(id, app.titulo);
      });
    },

    'app delete': (args) => {
      const id = args[0];
      if (!id) return print('Uso: app delete <id_app>', 'error');
      
      if (window.parent && window.parent.MyHub) {
        window.parent.MyHub.eliminarApp(id);
        print(`App "${id}" eliminada.`, 'success');
      }
    }
  };

  // ================= Lógica del Input =================
  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const raw = input.value.trim();
      if (!raw) return;

      printCmd(raw);
      input.value = '';

      const parts = raw.split(' ');
      let cmdKey = parts[0].toLowerCase();
      let args = parts.slice(1);

      if (['sys', 'db', 'app'].includes(cmdKey) && args.length > 0) {
        cmdKey = `${cmdKey} ${args[0].toLowerCase()}`;
        args = args.slice(1);
      }

      const commandFn = Object.keys(commands).find(k => k.toLowerCase() === cmdKey);

      if (commandFn) {
        try {
          await commands[commandFn](args);
        } catch (err) {
          print(`Error interno: ${err.message}`, 'error');
        }
      } else {
        if (window.parent && window.parent.registro && window.parent.registro.has(parts[0])) {
          window.parent.MyHub.abrir(parts[0]);
          print(`Abriendo aplicación "${parts[0]}"...`, 'success');
        } else {
          print(`Comando no reconocido: "${raw}". Escribe HubInfo.`, 'error');
        }
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.btn') && window.getSelection().toString() === '') {
      input.focus();
    }
  });

  btnClear.onclick = () => commands['clear']();
  
  setTimeout(() => input.focus(), 100);

})();
