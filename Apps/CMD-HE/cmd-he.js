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
    div.innerHTML = `<span>root@myhub:~$</span> ${text}`;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
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
      print('<strong>HubInfo</strong> - Muestra esta lista.');
      print('<strong>clear</strong> - Limpia la pantalla.');
      print('<strong>sys toast <mensaje></strong> - Muestra una notificación flotante.');
      print('<strong>sys open <id_app></strong> - Abre una aplicación.');
      print('<strong>sys theme <dark|light></strong> - Cambia el modo del sistema.');
      print('<strong>db list</strong> - Lista todas las bases de datos IndexedDB.');
      print('<strong>db drop <nombre></strong> - Elimina una base de datos (¡Cuidado!).');
      print('<strong>db keys</strong> - Muestra las claves guardadas en el sistema principal.');
      print('<strong>db get <clave></strong> - Lee el contenido de una clave del sistema.');
      print('<strong>db rm <clave></strong> - Elimina una clave del sistema (ej. apps_instaladas).');
      print('<strong>app list</strong> - Lista las apps instaladas.');
      print('<strong>app delete <id_app></strong> - Desinstala una app.');
    },

    'clear': () => {
      output.innerHTML = '';
    },

    'sys toast': (args) => {
      const msg = args.join(' ');
      if (!msg) return print('Uso: sys toast <mensaje>', 'error');
      if (window.parent && window.parent.MyHub) {
        window.parent.MyHub.toast(msg);
        print(`Notificación enviada: "${msg}"`, 'success');
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
      
      // Enviamos el comando al lobby para que actualice el almacenamiento
      if (window.parent && window.parent.document) {
        // Hack rápido para cambiar el tema visualmente desde el iframe
        const root = window.parent.document.documentElement;
        root.dataset.modo = mode === 'dark' ? 'oscuro' : 'claro';
        print(`Tema cambiado a ${mode}`, 'success');
        
        // Intentar guardar el ajuste en el sistema
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
      
      print('--- BASES DE DATOS ENCONTRADAS ---', 'info');
      dbs.forEach(db => print(`- ${db}`));
    },

    'db drop': (args) => {
      const dbName = args[0];
      if (!dbName) return print('Uso: db drop <nombre_de_db>', 'error');
      if (dbName === 'myhub-lobby') {
        return print('Error Crítico: No se puede eliminar la base de datos principal del sistema (myhub-lobby).', 'error');
      }

      print(`Advertencia: Vas a eliminar la base de datos "${dbName}".`, 'info');
      
      try {
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => print(`Base de datos "${dbName}" eliminada con éxito.`, 'success');
        req.onerror = () => print(`Error al eliminar la base de datos "${dbName}".`, 'error');
        req.onblocked = () => print(`Bloqueado: Cierra otras pestañas o apps que estén usando "${dbName}".`, 'error');
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

        print('--- CLAVES EN EL SISTEMA PRINCIPAL ---', 'info');
        keys.forEach(k => print(`- ${k}`));
      } catch (e) {
        print('Error al leer las claves de myhub-lobby.', 'error');
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
        print(JSON.stringify(val, null, 2));
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
          print(`Clave "${key}" eliminada del sistema.`, 'success');
          // Si se elimina una clave crítica, avisamos que debe recargar
          if (['apps_instaladas', 'carpetas', 'cuenta'].includes(key)) {
            print('¡Aviso! Has borrado una clave crítica. Recarga el escritorio (Shift + R) para ver los cambios.', 'error');
          }
        };
      } catch (e) {
        print('Error al intentar borrar la clave.', 'error');
      }
    },

    'app list': () => {
      if (!window.parent || !window.parent.registro) return print('Error: No se puede acceder al registro de apps.', 'error');
      
      print('--- APLICACIONES INSTALADAS ---', 'info');
      window.parent.registro.forEach((app, id) => {
        print(`- <strong>${app.titulo}</strong> (ID: ${id})`);
      });
    },

    'app delete': (args) => {
      const id = args[0];
      if (!id) return print('Uso: app delete <id_app>', 'error');
      
      if (window.parent && window.parent.MyHub) {
        window.parent.MyHub.eliminarApp(id);
        print(`App "${id}" eliminada (o se envió la orden).`, 'success');
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

      // Parsear comando
      const parts = raw.split(' ');
      let cmdKey = parts[0].toLowerCase();
      let args = parts.slice(1);

      // Comandos compuestos (ej. "sys toast", "db list")
      if (['sys', 'db', 'app'].includes(cmdKey) && args.length > 0) {
        cmdKey = `${cmdKey} ${args[0].toLowerCase()}`;
        args = args.slice(1);
      }

      // Buscar coincidencia exacta o parcial en las claves (case-insensitive)
      const commandFn = Object.keys(commands).find(
        k => k.toLowerCase() === cmdKey
      );

      if (commandFn) {
        try {
          await commands[commandFn](args);
        } catch (err) {
          print(`Error interno: ${err.message}`, 'error');
        }
      } else {
        // Si no es un comando, intentar abrir la app directamente (acceso rápido)
        if (window.parent && window.parent.registro && window.parent.registro.has(parts[0])) {
          window.parent.MyHub.abrir(parts[0]);
          print(`Abriendo aplicación "${parts[0]}"...`, 'success');
        } else {
          print(`Comando no reconocido: "${raw}". Escribe HubInfo para ver la lista.`, 'error');
        }
      }
    }
  });

  // Mantener el foco en el input
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.btn') && window.getSelection().toString() === '') {
      input.focus();
    }
  });

  btnClear.onclick = () => commands['clear']();
  
  // Autofocus al iniciar
  setTimeout(() => input.focus(), 100);

})();
