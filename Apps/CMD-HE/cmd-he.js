(async function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

  function iniciar() {
    const output = document.getElementById('output');
    const input = document.getElementById('cmd-input');
    const btnClear = document.getElementById('btn-clear');

    if (!output || !input) return;

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

    const printCmdLine = (cmd, desc) => {
      print(`<div class="cmd-list-item"><strong>${cmd}</strong><span>${desc}</span></div>`);
    };

    // ================= Diccionarios y Listas =================
    const chistes = [
      "¿Por qué los programadores prefieren el modo oscuro? Porque la luz atrae a los bugs.",
      "Hay 10 tipos de personas: las que saben binario y las que no.",
      "Un SQL entra a un bar, se acerca a dos mesas y dice: '¿Puedo unirme a ustedes?'",
      "Para entender la recursividad, primero debes entender la recursividad."
    ];

    // ================= Comandos =================
    const commands = {
      // --- AYUDA Y SISTEMA ---
      'help': () => {
        print('--- COMANDOS DISPONIBLES (27) ---', 'info');
        
        print('SISTEMA Y APARIENCIA', 'dim');
        printCmdLine('help', 'Muestra esta lista de ayuda.');
        printCmdLine('about', 'Información sobre CMD-HE.');
        printCmdLine('clear', 'Limpia la pantalla.');
        printCmdLine('theme [dark|light]', 'Cambia el modo (sin argumento alterna).');
        printCmdLine('color <hex>', 'Cambia el color de acento (ej. #ff0000).');
        printCmdLine('reload', 'Recarga el escritorio de MyHub.');
        printCmdLine('minimize', 'Minimiza todas las ventanas abiertas.');
        printCmdLine('close', 'Cierra todas las ventanas abiertas.');
        
        print('USUARIO', 'dim');
        printCmdLine('whoami', 'Muestra tu nombre de usuario.');
        printCmdLine('profile', 'Muestra tu información de perfil.');
        
        print('UTILIDADES', 'dim');
        printCmdLine('time', 'Muestra la fecha y hora actual.');
        printCmdLine('echo <texto>', 'Repite el texto que escribas.');
        printCmdLine('calc <n> <op> <n>', 'Calculadora (ej. calc 5 * 5).');
        printCmdLine('random <min> <max>', 'Genera un número aleatorio.');
        printCmdLine('flip', 'Lanza una moneda (Cara o Cruz).');
        printCmdLine('roll <caras>', 'Lanza un dado (ej. roll 20).');
        printCmdLine('joke', 'Cuenta un chiste de programación.');
        printCmdLine('toast <msg>', 'Muestra una notificación en el escritorio.');
        
        print('GESTIÓN DE APPS', 'dim');
        printCmdLine('apps', 'Lista las apps instaladas.');
        printCmdLine('open <id>', 'Abre una app por su ID.');
        printCmdLine('uninstall <id>', 'Desinstala una app.');
        printCmdLine('folders', 'Lista tus carpetas del escritorio.');
        
        print('BASE DE DATOS (PELIGRO)', 'dim');
        printCmdLine('dbs', 'Lista todas las bases de datos.');
        printCmdLine('dbdrop <nombre>', 'Elimina una base de datos entera.');
        printCmdLine('dbkeys', 'Muestra las claves del sistema.');
        printCmdLine('dbget <clave>', 'Lee el contenido de una clave.');
        printCmdLine('dbrm <clave>', 'Elimina una clave del sistema.');
      },

      'about': () => {
        print('CMD-HE v2.0.0', 'info');
        print('Consola de control absoluto para MyHubHestudio.');
        print('Creado por VicHeStudios.');
      },

      'clear': () => {
        output.innerHTML = '';
      },

      'theme': (args) => {
        let targetMode = args[0] ? args[0].toLowerCase() : null;
        const currentIsDark = document.documentElement.dataset.modo === 'oscuro';
        
        if (targetMode !== 'dark' && targetMode !== 'light') {
          targetMode = currentIsDark ? 'light' : 'dark';
        }
        
        if (window.parent && window.parent.document) {
          window.parent.document.documentElement.dataset.modo = targetMode === 'dark' ? 'oscuro' : 'claro';
          document.documentElement.dataset.modo = targetMode === 'dark' ? 'oscuro' : 'claro';
          print(`Tema cambiado a ${targetMode}.`, 'success');
          
          if (window.parent.ajustes && window.parent.guardarAjustes) {
            window.parent.ajustes.modo = targetMode === 'dark' ? 'oscuro' : 'claro';
            window.parent.guardarAjustes();
          }
        }
      },

      'color': (args) => {
        const hex = args[0];
        if (!hex || !hex.startsWith('#') || (hex.length !== 4 && hex.length !== 7)) {
          return print('Uso: color <#hex> (ej. color #ff0000)', 'error');
        }
        if (window.parent && window.parent.document) {
          window.parent.document.documentElement.style.setProperty('--accent', hex);
          document.documentElement.style.setProperty('--accent', hex);
          print(`Color de acento cambiado a ${hex}`, 'success');
          // Nota: para guardarlo permanentemente en la DB requeriría más código en el padre.
        }
      },

      'reload': () => {
        if (window.parent) window.parent.location.reload();
      },

      'minimize': () => {
        if (window.parent && window.parent.win) {
          Object.keys(window.parent.win).forEach(id => window.parent.MyHub.minimizar(id));
          print('Ventanas minimizadas.', 'success');
        }
      },

      'close': () => {
        if (window.parent && window.parent.win) {
          Object.keys(window.parent.win).forEach(id => window.parent.MyHub.cerrar(id));
          print('Ventanas cerradas.', 'success');
        }
      },

      // --- USUARIO ---
      'whoami': async () => {
        if (window.parent && window.parent.MyHub && window.parent.MyHub.perfil) {
          const p = await window.parent.MyHub.perfil();
          if (p) print(`Eres: ${p.nombre} ${p.apellido || ''}`, 'success');
          else print('No has iniciado sesión.', 'error');
        }
      },

      'profile': async () => {
        if (window.parent && window.parent.MyHub && window.parent.MyHub.perfil) {
          const p = await window.parent.MyHub.perfil();
          if (p) {
            print('--- PERFIL DE USUARIO ---', 'info');
            print(`Nombre: ${p.nombre} ${p.apellido || ''}`);
            print(`Nacimiento: ${p.nacimiento}`);
            print(`Género: ${p.genero}`);
            print(`País: ${p.pais}`);
            print(`Idioma: ${p.idioma}`);
          } else {
            print('No has iniciado sesión.', 'error');
          }
        }
      },

      // --- UTILIDADES ---
      'time': () => {
        const now = new Date();
        print(`Fecha: ${now.toLocaleDateString()} | Hora: ${now.toLocaleTimeString()}`, 'success');
      },

      'echo': (args) => {
        print(args.join(' '));
      },

      'calc': (args) => {
        if (args.length < 3) return print('Uso: calc <num1> <op> <num2> (ej. calc 5 * 5)', 'error');
        const n1 = parseFloat(args[0]);
        const op = args[1];
        const n2 = parseFloat(args[2]);
        if (isNaN(n1) || isNaN(n2)) return print('Error: Introduce números válidos.', 'error');
        
        let res;
        switch(op) {
          case '+': res = n1 + n2; break;
          case '-': res = n1 - n2; break;
          case '*': res = n1 * n2; break;
          case '/': res = n2 !== 0 ? n1 / n2 : 'Error (div por 0)'; break;
          default: return print('Operador no válido. Usa +, -, * o /.', 'error');
        }
        print(`${n1} ${op} ${n2} = ${res}`, 'success');
      },

      'random': (args) => {
        const min = parseInt(args[0]) || 1;
        const max = parseInt(args[1]) || 100;
        const res = Math.floor(Math.random() * (max - min + 1)) + min;
        print(`Número aleatorio entre ${min} y ${max}: ${res}`, 'success');
      },

      'flip': () => {
        const res = Math.random() < 0.5 ? 'Cara' : 'Cruz';
        print(`🪙 ${res}`, 'success');
      },

      'roll': (args) => {
        const caras = parseInt(args[0]) || 6;
        const res = Math.floor(Math.random() * caras) + 1;
        print(`🎲 Has sacado un ${res} (de ${caras} caras)`, 'success');
      },

      'joke': () => {
        const chiste = chistes[Math.floor(Math.random() * chistes.length)];
        print(`😂 ${chiste}`, 'info');
      },

      'toast': (args) => {
        const msg = args.join(' ');
        if (!msg) return print('Uso: toast <mensaje>', 'error');
        if (window.parent && window.parent.MyHub) {
          window.parent.MyHub.toast(msg);
          print(`Notificación enviada.`, 'success');
        }
      },

      // --- GESTIÓN DE APPS ---
      'apps': () => {
        if (!window.parent || !window.parent.registro) return print('Error: No se puede acceder al registro.', 'error');
        print('--- APLICACIONES INSTALADAS ---', 'info');
        window.parent.registro.forEach((app, id) => printCmdLine(id, app.titulo));
      },

      'open': (args) => {
        const id = args[0];
        if (!id) return print('Uso: open <id_app>', 'error');
        if (window.parent && window.parent.MyHub) {
          window.parent.MyHub.abrir(id);
          print(`Abriendo app: ${id}`, 'success');
        }
      },

      'uninstall': (args) => {
        const id = args[0];
        if (!id) return print('Uso: uninstall <id_app>', 'error');
        if (window.parent && window.parent.MyHub) {
          window.parent.MyHub.eliminarApp(id);
          print(`App "${id}" eliminada.`, 'success');
        }
      },

      'folders': () => {
        if (!window.parent || !window.parent.carpetas) return print('Error: No se puede acceder a las carpetas.', 'error');
        print('--- CARPETAS DEL ESCRITORIO ---', 'info');
        const folders = Object.values(window.parent.carpetas);
        if (folders.length === 0) return print('No hay carpetas creadas.', 'dim');
        folders.forEach(f => printCmdLine(f.id, `${f.nombre} (${f.apps.length} apps)`));
      },

      // --- BASE DE DATOS ---
      'dbs': async () => {
        if (!indexedDB.databases) return print('Tu navegador no soporta lectura de DBs.', 'error');
        print('Consultando bases de datos...', 'dim');
        const dbs = await indexedDB.databases();
        print('--- BASES DE DATOS ---', 'info');
        dbs.forEach(db => print(`- ${db.name} (v${db.version})`));
      },

      'dbdrop': (args) => {
        const dbName = args[0];
        if (!dbName) return print('Uso: dbdrop <nombre>', 'error');
        if (dbName === 'myhub-lobby') return print('Error: No se puede eliminar la DB del sistema.', 'error');

        print(`Eliminando "${dbName}"...`, 'info');
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => print(`DB "${dbName}" eliminada.`, 'success');
        req.onerror = () => print(`Error al eliminar "${dbName}".`, 'error');
        req.onblocked = () => print(`Bloqueado: Cierra otras apps usando "${dbName}".`, 'error');
      },

      'dbkeys': async () => {
        try {
          const db = await new Promise((res, rej) => {
            const r = indexedDB.open('myhub-lobby', 1);
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
          });
          const keys = await new Promise((res) => {
            const req = db.transaction('kv', 'readonly').objectStore('kv').getAllKeys();
            req.onsuccess = () => res(req.result);
          });
          print('--- CLAVES DEL SISTEMA ---', 'info');
          keys.forEach(k => print(`- ${k}`));
        } catch (e) { print('Error al leer las claves.', 'error'); }
      },

      'dbget': async (args) => {
        const key = args[0];
        if (!key) return print('Uso: dbget <clave>', 'error');
        try {
          const db = await new Promise((res, rej) => {
            const r = indexedDB.open('myhub-lobby', 1);
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
          });
          const val = await new Promise((res) => {
            const req = db.transaction('kv', 'readonly').objectStore('kv').get(key);
            req.onsuccess = () => res(req.result);
          });
          if (val === undefined) return print(`La clave "${key}" no existe.`, 'error');
          print(`Contenido de "${key}":`, 'info');
          JSON.stringify(val, null, 2).split('\n').forEach(line => print(line, 'dim'));
        } catch (e) { print('Error al leer la clave.', 'error'); }
      },

      'dbrm': async (args) => {
        const key = args[0];
        if (!key) return print('Uso: dbrm <clave>', 'error');
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
              print('¡Aviso! Has borrado una clave crítica. Recarga el escritorio.', 'error');
            }
          };
        } catch (e) { print('Error al borrar la clave.', 'error'); }
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
        const cmdKey = parts[0].toLowerCase();
        const args = parts.slice(1);

        const commandFn = commands[cmdKey];

        if (commandFn) {
          try { await commandFn(args); } 
          catch (err) { print(`Error interno: ${err.message}`, 'error'); }
        } else {
          // Atajo rápido: si escribe el ID de una app, se abre
          if (window.parent && window.parent.registro && window.parent.registro.has(parts[0])) {
            window.parent.MyHub.abrir(parts[0]);
            print(`Abriendo aplicación "${parts[0]}"...`, 'success');
          } else {
            print(`Comando no reconocido: "${raw}". Escribe "help".`, 'error');
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
    
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => input.focus(), 100);
  }
})();
