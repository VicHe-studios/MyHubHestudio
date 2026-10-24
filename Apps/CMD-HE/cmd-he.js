// cmd-he.js — CMD-HE v2.1.0 (Kernel edition)
(async function() {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

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

    // ================= UI helpers =================
    const san = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

    const print = (text, cls = '') => {
      const d = document.createElement('div');
      d.className = `line ${cls}`;
      d.innerHTML = text;
      output.appendChild(d);
      output.scrollTop = output.scrollHeight;
    };
    const printCmd = (text) => {
      const d = document.createElement('div');
      d.className = 'line cmd-echo';
      d.innerHTML = `<span style="color: var(--accent);">root@myhub:~$</span> ${san(text)}`;
      output.appendChild(d);
      output.scrollTop = output.scrollHeight;
    };
    const printLine = (cmd, desc) => print(`<div class="cmd-list-item"><strong>${san(cmd)}</strong><span>${san(desc)}</span></div>`);
    const printJSON = (obj) => {
      const s = JSON.stringify(obj, null, 2);
      s.split('\n').forEach(l => print(san(l) || ' ', 'dim'));
    };

    // ================= DB =================
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
    const kvDel = async (k) => {
      const db = await dbP;
      return new Promise((res) => {
        const t = db.transaction('kv', 'readwrite');
        t.objectStore('kv').delete(k);
        t.oncomplete = () => res();
      });
    };
    const kvKeys = async () => {
      const db = await dbP;
      return new Promise((res) => {
        const r = db.transaction('kv', 'readonly').objectStore('kv').getAllKeys();
        r.onsuccess = () => res(r.result);
      });
    };

    // Serializa Blobs/Map/Set para poder mostrarlos en consola
    const serializable = (v) => {
      if (v instanceof Blob) return `[Blob: ${v.size} bytes, ${v.type || '?'}]`;
      if (v instanceof Map) return Object.fromEntries(v);
      if (v instanceof Set) return [...v];
      if (Array.isArray(v)) return v.map(serializable);
      if (v && typeof v === 'object') {
        const out = {};
        for (const [k, val] of Object.entries(v)) out[k] = serializable(val);
        return out;
      }
      return v;
    };

    // ================= Acceso al Lobby =================
    const L = () => window.parent?.MyHub || null;
    const P = () => window.parent || null;

    const tituloAIdMap = async () => {
      const map = new Map();
      (P()?.RUTAS_APPS || []).forEach(r => map.set(r.titulo, r.id));
      const apps = (await kvGet('apps_instaladas')) || {};
      Object.values(apps).forEach(a => map.set(a.manifest.titulo, a.manifest.id));
      return map;
    };

    const ventanasAbiertas = async () => {
      const tasks = P()?.document?.querySelectorAll('.task');
      if (!tasks || tasks.length === 0) return [];
      const map = await tituloAIdMap();
      return [...tasks].map(t => map.get(t.getAttribute('title'))).filter(Boolean);
    };

    // ================= Historial persistente =================
    let historial = [];
    try { historial = JSON.parse(localStorage.getItem('cmdhe_history') || '[]'); } catch {}
    const pushHist = (cmd) => {
      if (historial[historial.length - 1] === cmd) return;
      historial.push(cmd);
      if (historial.length > 200) historial = historial.slice(-200);
      try { localStorage.setItem('cmdhe_history', JSON.stringify(historial)); } catch {}
    };
    let hIdx = -1;

    // ================= Base64 UTF-8 =================
    const b64enc = (s) => {
      const bytes = new TextEncoder().encode(s);
      let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
      return btoa(bin);
    };
    const b64dec = (s) => {
      const bin = atob(s);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    };

    // ================= Listas =================
    const chistes = [
      "¿Por qué los programadores prefieren el modo oscuro? Porque la luz atrae a los bugs.",
      "Hay 10 tipos de personas: las que saben binario y las que no.",
      "Un SQL entra a un bar, se acerca a dos mesas y dice: '¿Puedo unirme a ustedes?'",
      "Para entender la recursividad, primero debes entender la recursividad."
    ];

    // ================= Comandos =================
    const commands = {

      // ──────── AYUDA ────────
      'help': () => {
        print(`--- COMANDOS DISPONIBLES (${Object.keys(commands).length}) ---`, 'info');

        print('SISTEMA', 'dim');
        printLine('help', 'Esta lista.');
        printLine('about', 'Info de CMD-HE.');
        printLine('version', 'Versión del kernel.');
        printLine('sysinfo', 'Info del navegador.');
        printLine('stats', 'Contadores del sistema.');
        printLine('storage', 'Uso de almacenamiento.');
        printLine('settings', 'Config actual.');
        printLine('date | time', 'Fecha / fecha+hora.');
        printLine('ping', 'Latencia de IndexedDB.');
        printLine('history | clearhistory', 'Historial de comandos.');
        printLine('banner', 'ASCII art.');
        printLine('clear', 'Limpiar pantalla.');
        printLine('exit', 'Cerrar esta ventana.');

        print('APARIENCIA', 'dim');
        printLine('theme [dark|light]', 'Cambiar tema.');
        printLine('color <hex>', 'Cambiar color de acento.');
        printLine('reload', 'Recargar escritorio.');
        printLine('minimize | close', 'Minimizar / cerrar ventanas.');

        print('USUARIO', 'dim');
        printLine('whoami', 'Tu nombre.');
        printLine('profile', 'Tu perfil completo.');

        print('UTILIDADES', 'dim');
        printLine('echo <txt>', 'Repetir texto.');
        printLine('calc <n> <op> <n>', 'Calculadora.');
        printLine('random <min> <max>', 'Aleatorio.');
        printLine('flip', 'Moneda.');
        printLine('roll <caras>', 'Dado.');
        printLine('joke', 'Chiste.');
        printLine('toast <msg>', 'Notificación.');
        printLine('uuid', 'UUID v4.');
        printLine('password [len]', 'Contraseña segura.');
        printLine('base64 <enc|dec> <txt>', 'Base64 UTF-8.');

        print('APPS', 'dim');
        printLine('apps', 'Listar apps (sistema + instaladas).');
        printLine('open <id>', 'Abrir app.');
        printLine('uninstall <id>', 'Desinstalar.');
        printLine('whois <id>', 'Info detallada.');
        printLine('pin | unpin <id>', 'Fijar / quitar de la barra.');
        printLine('pinned', 'Apps fijadas.');

        print('CARPETAS', 'dim');
        printLine('folders', 'Listar carpetas.');
        printLine('folder-create <nombre>', 'Crear.');
        printLine('folder-delete <id>', 'Eliminar.');
        printLine('folder-rename <id> <nombre>', 'Renombrar (cambia el ID).');

        print('WIDGETS', 'dim');
        printLine('widgets', 'Listar widgets activos.');
        printLine('widget-remove <n>', 'Eliminar widget n-ésimo.');

        print('BASE DE DATOS', 'dim');
        printLine('dbs', 'Listar IndexedDBs.');
        printLine('dbdrop <nombre>', 'Eliminar DB entera.');
        printLine('dbkeys', 'Listar claves.');
        printLine('dbget <clave>', 'Leer una clave.');
        printLine('dbrm <clave>', 'Eliminar una clave.');
        printLine('dbdump [clave]', 'Dumpear todo o una clave.');
      },

      'about': () => {
        print('CMD-HE v2.1.0 — Kernel edition', 'info');
        print('Consola de control absoluto para MyHubHestudio.');
        print('Por VicHeStudios.');
        print('');
        print('Cambios v2.1:', 'dim');
        print('  • theme/color ahora persisten en IndexedDB', 'dim');
        print('  • minimize/close/minimize funcionan (fix de scope)', 'dim');
        print('  • apps/folders leen de IndexedDB', 'dim');
        print('  • +24 comandos nuevos', 'dim');
      },

      'version': () => {
        print('CMD-HE v2.1.0', 'info');
        printLine('Kernel', 'v2.1.0 (Kernel edition)');
        printLine('Comandos', String(Object.keys(commands).length));
        printLine('Motor DB', 'IndexedDB · myhub-lobby');
        printLine('Autor', 'VicHeStudios');
      },

      'clear': () => { output.innerHTML = ''; },

      // ──────── APARIENCIA (CORREGIDOS) ────────
      'theme': async (args) => {
        const target = args[0]?.toLowerCase();
        const ajustesDB = (await kvGet('ajustes')) || {};
        const modoActual = P()?.document?.documentElement?.dataset?.modo || ajustesDB.modo || 'claro';
        const nuevo = (target === 'dark' || target === 'oscuro') ? 'oscuro'
                    : (target === 'light' || target === 'claro') ? 'claro'
                    : (modoActual === 'oscuro' ? 'claro' : 'oscuro');

        await kvSet('ajustes', { ...ajustesDB, modo: nuevo });
        if (P()?.document) P().document.documentElement.dataset.modo = nuevo;
        document.documentElement.dataset.modo = nuevo;
        try {
          const t = JSON.parse(P().localStorage.getItem('myhub_tema') || '{}');
          t.modo = nuevo;
          P().localStorage.setItem('myhub_tema', JSON.stringify(t));
        } catch (e) {}

        print(`Tema cambiado a ${nuevo}.`, 'success');
        print('Nota: Configuración puede mostrar el modo anterior hasta recargar (limitación del Lobby).', 'dim');
      },

      'color': async (args) => {
        const hex = args[0];
        if (!hex || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
          return print('Uso: color <#hex> (ej. color #ff0000)', 'error');
        }
        const ajustesDB = (await kvGet('ajustes')) || {};
        await kvSet('ajustes', { ...ajustesDB, color: hex });
        if (P()?.document) P().document.documentElement.style.setProperty('--accent', hex);
        document.documentElement.style.setProperty('--accent', hex);
        try {
          const t = JSON.parse(P().localStorage.getItem('myhub_tema') || '{}');
          t.color = hex;
          P().localStorage.setItem('myhub_tema', JSON.stringify(t));
        } catch (e) {}

        print(`Color: ${hex}.`, 'success');
        const esPaleta = ['#2563eb','#0ea5e9','#dc2626','#16a34a','#7c3aed','#ca8a04','#ec4899','#8b4513']
          .includes(hex.toLowerCase());
        if (!esPaleta) {
          print('⚠ Color fuera de la paleta: al recargar el Lobby puede revertir a azul.', 'dim');
          print('Parche opcional en JsLobby (aplicarAjustes):', 'dim');
          print('  const accentColor = ajustes.color?.startsWith("#") ? ajustes.color : (COLORES[ajustes.color] || COLORES.azul);', 'dim');
        }
      },

      'reload': () => {
        if (P()) P().location.reload();
      },

      'minimize': async () => {
        const ids = await ventanasAbiertas();
        if (ids.length === 0) return print('No hay ventanas abiertas.', 'info');
        if (!L()?.minimizar) return print('MyHub.minimizar no disponible.', 'error');
        for (const id of ids) { try { L().minimizar(id); } catch (e) {} }
        print(`Ventanas minimizadas (${ids.length}).`, 'success');
      },

      'close': async () => {
        const ids = await ventanasAbiertas();
        if (ids.length === 0) return print('No hay ventanas abiertas.', 'info');
        if (!L()?.cerrar) return print('MyHub.cerrar no disponible.', 'error');
        for (const id of ids) { try { L().cerrar(id); } catch (e) {} }
        print(`Ventanas cerradas (${ids.length}).`, 'success');
      },

      'exit': () => {
        if (L()?.cerrar) L().cerrar('cmdhe');
        else print('No disponible.', 'error');
      },

      // ──────── INFO ────────
      'sysinfo': () => {
        print('--- SISTEMA ---', 'info');
        printLine('Plataforma', navigator.platform || '—');
        printLine('Idioma', navigator.language || '—');
        printLine('CPU cores', String(navigator.hardwareConcurrency || '—'));
        printLine('Pantalla', `${screen.width}×${screen.height}`);
        printLine('Online', navigator.onLine ? 'sí' : 'no');
        printLine('User Agent', navigator.userAgent);
      },

      'stats': async () => {
        const apps = (await kvGet('apps_instaladas')) || {};
        const carpetas = (await kvGet('carpetas')) || {};
        const widgets = (await kvGet('widgets_activos')) || [];
        const pinned = (await kvGet('pinned_apps')) || [];
        print('--- ESTADÍSTICAS ---', 'info');
        printLine('Apps sistema', String((P()?.RUTAS_APPS || []).length));
        printLine('Apps instaladas', String(Object.keys(apps).length));
        printLine('Carpetas', String(Object.keys(carpetas).length));
        printLine('Widgets activos', String(widgets.length));
        printLine('Apps fijadas', String(pinned.length));
      },

      'storage': async () => {
        if (!navigator.storage?.estimate) return print('navigator.storage no soportado.', 'error');
        const { usage, quota } = await navigator.storage.estimate();
        const fmt = (b) => b >= 1024**3 ? (b/1024**3).toFixed(2)+' GB'
                         : b >= 1024**2 ? (b/1024**2).toFixed(1)+' MB'
                         : (b/1024).toFixed(0)+' KB';
        const pct = quota > 0 ? ((usage / quota) * 100).toFixed(1) : '0';
        print(`Uso: ${fmt(usage)} / ${fmt(quota)} (${pct}%)`, 'success');
      },

      'settings': async () => {
        const a = (await kvGet('ajustes')) || {};
        print('--- CONFIGURACIÓN ---', 'info');
        printLine('Modo', a.modo || 'claro');
        printLine('Color', a.color || 'azul');
        printLine('Fondo', a.fondo ? 'personalizado' : 'por defecto');
        printLine('Sesión', L()?.sesion?.() ? 'activa' : 'cerrada');
      },

      'date': () => {
        print(new Date().toLocaleDateString('es', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        }), 'success');
      },

      'time': () => {
        const n = new Date();
        print(`${n.toLocaleDateString()} · ${n.toLocaleTimeString()}`, 'success');
      },

      'ping': async () => {
        const t0 = performance.now();
        await kvGet('ajustes');
        print(`Pong! ${(performance.now() - t0).toFixed(2)}ms`, 'success');
      },

      'history': () => {
        print(`--- HISTORIAL (${historial.length}) ---`, 'info');
        if (historial.length === 0) return print('Vacío.', 'dim');
        historial.slice(-50).forEach((c, i) => {
          const n = historial.length - Math.min(50, historial.length) + i + 1;
          print(`  ${String(n).padStart(3)}. ${san(c)}`, 'dim');
        });
      },

      'clearhistory': () => {
        historial = [];
        try { localStorage.removeItem('cmdhe_history'); } catch {}
        print('Historial borrado.', 'success');
      },

      'banner': () => {
        print('  ██████╗███╗   ███╗██████╗       ██╗  ██╗███████╗', 'info');
        print(' ██╔════╝████╗ ████║██╔══██╗      ██║  ██║██╔════╝', 'info');
        print(' ██║     ██╔████╔██║██║  ██║█████╗███████║█████╗  ', 'info');
        print(' ██║     ██║╚██╔╝██║██║  ██║╚════╝██╔══██║██╔══╝  ', 'info');
        print(' ╚██████╗██║ ╚═╝ ██║██████╔╝      ██║  ██║███████╗', 'info');
        print('  ╚═════╝╚═╝     ╚═╝╚═════╝       ╚═╝  ╚═╝╚══════╝', 'info');
        print('        Kernel Edition v2.1.0 — VicHeStudios', 'dim');
      },

      // ──────── USUARIO ────────
      'whoami': async () => {
        if (!L()?.perfil) return print('MyHub.perfil no disponible.', 'error');
        const p = await L().perfil();
        if (!p) return print('No has iniciado sesión.', 'error');
        print(`Eres: ${p.nombre} ${p.apellido || ''}`.trim(), 'success');
      },

      'profile': async () => {
        if (!L()?.perfil) return print('MyHub.perfil no disponible.', 'error');
        const p = await L().perfil();
        if (!p) return print('No has iniciado sesión.', 'error');
        print('--- PERFIL ---', 'info');
        printLine('Nombre', `${p.nombre} ${p.apellido || ''}`.trim());
        printLine('Nacimiento', p.nacimiento || '—');
        printLine('Género', p.genero || '—');
        printLine('País', p.pais || '—');
        printLine('Idioma', p.idioma || '—');
      },

      // ──────── UTILIDADES ────────
      'echo': (args) => print(san(args.join(' '))),

      'calc': (args) => {
        if (args.length < 3) return print('Uso: calc <n> <op> <n>', 'error');
        const [a, op, b] = [parseFloat(args[0]), args[1], parseFloat(args[2])];
        if (isNaN(a) || isNaN(b)) return print('Números inválidos.', 'error');
        const r = { '+': a+b, '-': a-b, '*': a*b, '/': b !== 0 ? a/b : NaN }[op];
        if (r === undefined) return print('Operador inválido (+, -, *, /).', 'error');
        if (isNaN(r)) return print('Error: división por 0.', 'error');
        print(`${a} ${op} ${b} = ${r}`, 'success');
      },

      'random': (args) => {
        const min = parseInt(args[0]) || 1;
        const max = parseInt(args[1]) || 100;
        if (max <= min) return print('El máximo debe ser mayor que el mínimo.', 'error');
        print(`Aleatorio [${min}, ${max}]: ${Math.floor(Math.random() * (max - min + 1)) + min}`, 'success');
      },

      'flip': () => print(`🪙 ${Math.random() < 0.5 ? 'Cara' : 'Cruz'}`, 'success'),

      'roll': (args) => {
        const caras = Math.max(2, parseInt(args[0]) || 6);
        print(`🎲 ${Math.floor(Math.random() * caras) + 1} (de ${caras})`, 'success');
      },

      'joke': () => print(`😂 ${chistes[Math.floor(Math.random() * chistes.length)]}`, 'info'),

      'toast': (args) => {
        const msg = args.join(' ');
        if (!msg) return print('Uso: toast <mensaje>', 'error');
        if (L()?.toast) { L().toast(msg); print('Enviado.', 'success'); }
        else print('toast no disponible.', 'error');
      },

      'uuid': () => {
        const u = crypto.randomUUID ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
              const r = (Math.random() * 16) | 0;
              return (c === 'x' ? r : ((r & 0x3) | 0x8)).toString(16);
            });
        print(u, 'success');
      },

      'password': (args) => {
        const len = Math.max(8, parseInt(args[0]) || 16);
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}';
        const arr = new Uint8Array(len);
        crypto.getRandomValues(arr);
        const pwd = Array.from(arr, b => chars[b % chars.length]).join('');
        print(`${len} chars:`, 'info');
        print(pwd, 'success');
      },

      'base64': (args) => {
        const modo = args[0]?.toLowerCase();
        const txt = args.slice(1).join(' ');
        if (!modo || !txt) return print('Uso: base64 <enc|dec> <texto>', 'error');
        try {
          if (modo === 'enc' || modo === 'encode') print(b64enc(txt), 'success');
          else if (modo === 'dec' || modo === 'decode') print(b64dec(txt), 'success');
          else print('Modo inválido: usa enc o dec.', 'error');
        } catch (e) { print(`Error: ${e.message}`, 'error'); }
      },

      // ──────── APPS (CORREGIDOS) ────────
      'apps': async () => {
        const rutas = P()?.RUTAS_APPS || [];
        const apps = (await kvGet('apps_instaladas')) || {};

        if (rutas.length > 0) {
          print('--- APPS DEL SISTEMA ---', 'info');
          rutas.forEach(r => printLine(r.id, r.titulo));
        }
        const inst = Object.values(apps);
        if (inst.length > 0) {
          print('--- APPS INSTALADAS ---', 'info');
          inst.forEach(a => printLine(a.manifest.id, a.manifest.titulo));
        }
        if (rutas.length === 0 && inst.length === 0) print('No hay apps.', 'dim');
      },

      'open': async (args) => {
        const id = args[0];
        if (!id) return print('Uso: open <id>', 'error');
        if (L()?.abrir) { await L().abrir(id); print(`Abriendo "${id}"...`, 'success'); }
        else print('abrir no disponible.', 'error');
      },

      'uninstall': async (args) => {
        const id = args[0];
        if (!id) return print('Uso: uninstall <id>', 'error');
        const apps = (await kvGet('apps_instaladas')) || {};
        if (!apps[id]) return print('Esa app no está instalada.', 'error');
        if (L()?.eliminarApp) { await L().eliminarApp(id); print(`"${id}" eliminada.`, 'success'); }
        else print('eliminarApp no disponible.', 'error');
      },

      'whois': async (args) => {
        const id = args[0];
        if (!id) return print('Uso: whois <id>', 'error');
        const rutas = P()?.RUTAS_APPS || [];
        const sistema = rutas.find(r => r.id === id);
        const apps = (await kvGet('apps_instaladas')) || {};
        const inst = apps[id];

        if (sistema) {
          print(`--- ${sistema.titulo} (sistema) ---`, 'info');
          printLine('ID', sistema.id);
          printLine('Icono', sistema.icono);
          printLine('URL', sistema.url);
          return;
        }
        if (inst) {
          const m = inst.manifest;
          print(`--- ${m.titulo} (instalada) ---`, 'info');
          printLine('ID', m.id);
          printLine('Icono', m.icono || '—');
          printLine('Main', m.main || 'index.html');
          printLine('Autor', m.autor || '—');
          printLine('Widgets', String((m.widgets || []).length));
          printLine('Archivos', String(Object.keys(inst.archivos || {}).length));
          return;
        }
        print(`No existe "${id}".`, 'error');
      },

      'pin': async (args) => {
        const id = args[0];
        if (!id) return print('Uso: pin <id>', 'error');
        const apps = (await kvGet('apps_instaladas')) || {};
        const rutas = P()?.RUTAS_APPS || [];
        if (!apps[id] && !rutas.find(r => r.id === id)) return print('No existe esa app.', 'error');
        const pinned = (await kvGet('pinned_apps')) || [];
        if (pinned.includes(id)) return print('Ya está fijada.', 'info');
        if (!L()?.toast) return print('togglePinned no disponible.', 'error');
        if (typeof P().togglePinned === 'function') {
          await P().togglePinned(id);
          print(`"${id}" fijada.`, 'success');
        } else print('togglePinned no disponible.', 'error');
      },

      'unpin': async (args) => {
        const id = args[0];
        if (!id) return print('Uso: unpin <id>', 'error');
        const pinned = (await kvGet('pinned_apps')) || [];
        if (!pinned.includes(id)) return print('No está fijada.', 'info');
        if (typeof P().togglePinned === 'function') {
          await P().togglePinned(id);
          print(`"${id}" quitada de la barra.`, 'success');
        } else print('togglePinned no disponible.', 'error');
      },

      'pinned': async () => {
        const pinned = (await kvGet('pinned_apps')) || [];
        if (pinned.length === 0) return print('No hay apps fijadas.', 'dim');
        print(`--- FIJADAS (${pinned.length}) ---`, 'info');
        pinned.forEach((id, i) => printLine(`${i + 1}. ${id}`, ''));
      },

      // ──────── CARPETAS (CORREGIDOS) ────────
      'folders': async () => {
        const carpetas = (await kvGet('carpetas')) || {};
        const ids = Object.keys(carpetas);
        if (ids.length === 0) return print('No hay carpetas.', 'dim');
        print(`--- CARPETAS (${ids.length}) ---`, 'info');
        ids.forEach(id => {
          const f = carpetas[id];
          printLine(f.nombre, `${id} · ${f.apps.length} apps`);
        });
      },

      'folder-create': async (args) => {
        const nombre = args.join(' ').trim();
        if (!nombre) return print('Uso: folder-create <nombre>', 'error');
        if (typeof P().crearCarpeta !== 'function') return print('crearCarpeta no disponible.', 'error');
        await P().crearCarpeta(nombre);
        print(`Carpeta "${nombre}" creada.`, 'success');
      },

      'folder-delete': async (args) => {
        const id = args[0];
        if (!id) return print('Uso: folder-delete <id>', 'error');
        const carpetas = (await kvGet('carpetas')) || {};
        if (!carpetas[id]) return print('No existe esa carpeta.', 'error');
        if (typeof P().eliminarCarpeta !== 'function') return print('eliminarCarpeta no disponible.', 'error');
        await P().eliminarCarpeta(id, false);
        print(`Carpeta "${id}" eliminada (las apps volvieron al escritorio).`, 'success');
      },

      'folder-rename': async (args) => {
        const [id, ...rest] = args;
        const nuevo = rest.join(' ').trim();
        if (!id || !nuevo) return print('Uso: folder-rename <id> <nuevo nombre>', 'error');
        const carpetas = (await kvGet('carpetas')) || {};
        const folder = carpetas[id];
        if (!folder) return print('No existe esa carpeta.', 'error');
        if (typeof P().eliminarCarpeta !== 'function' || typeof P().crearCarpeta !== 'function') {
          return print('Funciones de carpeta no disponibles.', 'error');
        }
        const apps = [...folder.apps];
        await P().eliminarCarpeta(id, false);
        await P().crearCarpeta(nuevo, apps);
        print(`Carpeta renombrada a "${nuevo}".`, 'success');
        print('⚠ El ID interno cambió (delete + create). Si tenías algo apuntando al id viejo, se rompió.', 'dim');
      },

      // ──────── WIDGETS ────────
      'widgets': async () => {
        const widgets = (await kvGet('widgets_activos')) || [];
        if (widgets.length === 0) return print('No hay widgets activos.', 'dim');
        print(`--- WIDGETS (${widgets.length}) ---`, 'info');
        widgets.forEach((w, i) => {
          printLine(`${i + 1}. ${w.id}`, `${w.file || '—'} [${w.size || '1x1'}]`);
        });
      },

      'widget-remove': async (args) => {
        const n = parseInt(args[0]);
        const widgets = (await kvGet('widgets_activos')) || [];
        if (!n || n < 1 || n > widgets.length) {
          return print(`Uso: widget-remove <1..${widgets.length}>`, 'error');
        }
        const [removed] = widgets.splice(n - 1, 1);
        await kvSet('widgets_activos', widgets);
        if (P() && typeof P().renderWidgets === 'function') P().renderWidgets();
        print(`Widget "${removed.id}" eliminado.`, 'success');
      },

      // ──────── BASE DE DATOS ────────
      'dbs': async () => {
        if (!indexedDB.databases) return print('Tu navegador no soporta indexedDB.databases.', 'error');
        const dbs = await indexedDB.databases();
        print('--- BASES DE DATOS ---', 'info');
        dbs.forEach(db => printLine(db.name, `v${db.version}`));
      },

      'dbdrop': (args) => {
        const dbName = args[0];
        if (!dbName) return print('Uso: dbdrop <nombre>', 'error');
        if (dbName === 'myhub-lobby') return print('No se puede eliminar la DB del sistema.', 'error');
        print(`Eliminando "${dbName}"...`, 'info');
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => print(`DB "${dbName}" eliminada.`, 'success');
        req.onerror = () => print(`Error al eliminar "${dbName}".`, 'error');
        req.onblocked = () => print(`Bloqueado: cerrá apps usando "${dbName}".`, 'error');
      },

      'dbkeys': async () => {
        const keys = await kvKeys();
        print(`--- CLAVES (${keys.length}) ---`, 'info');
        keys.forEach(k => print(`- ${san(k)}`, 'dim'));
      },

      'dbget': async (args) => {
        const key = args[0];
        if (!key) return print('Uso: dbget <clave>', 'error');
        const val = await kvGet(key);
        if (val === null) return print(`"${key}" no existe.`, 'error');
        print(`--- ${key} ---`, 'info');
        printJSON(serializable(val));
      },

      'dbrm': async (args) => {
        const key = args[0];
        if (!key) return print('Uso: dbrm <clave>', 'error');
        await kvDel(key);
        print(`"${key}" eliminada.`, 'success');
        if (['apps_instaladas', 'carpetas', 'cuenta'].includes(key)) {
          print('⚠ Clave crítica borrada. Recargá el escritorio.', 'error');
        }
      },

      'dbdump': async (args) => {
        const key = args[0];
        if (key) {
          const val = await kvGet(key);
          if (val === null) return print(`"${key}" no existe.`, 'error');
          print(`--- ${key} ---`, 'info');
          printJSON(serializable(val));
        } else {
          const keys = await kvKeys();
          print(`--- DB myhub-lobby (${keys.length} claves) ---`, 'info');
          for (const k of keys) {
            const v = await kvGet(k);
            let preview;
            if (v instanceof Blob) preview = `[Blob: ${v.size}b]`;
            else if (Array.isArray(v)) preview = `Array(${v.length})`;
            else if (v && typeof v === 'object') preview = `${Object.keys(v).length} campos`;
            else preview = String(v).slice(0, 40);
            printLine(k, preview);
          }
        }
      }
    };

    // ================= Input: historial con flechas =================
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historial.length === 0) return;
        hIdx = hIdx === -1 ? historial.length - 1 : Math.max(0, hIdx - 1);
        input.value = historial[hIdx];
        input.setSelectionRange(input.value.length, input.value.length);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (hIdx === -1) return;
        hIdx = Math.min(historial.length, hIdx + 1);
        input.value = hIdx >= historial.length ? '' : historial[hIdx];
        return;
      }
      if (e.key !== 'Enter') return;

      const raw = input.value.trim();
      if (!raw) return;
      printCmd(raw);
      input.value = '';
      hIdx = -1;

      // `!!` repite el comando anterior
      let comando = raw;
      if (raw === '!!') {
        if (historial.length === 0) return print('No hay comando previo.', 'error');
        comando = historial[historial.length - 1];
        print(`↻ ${san(comando)}`, 'dim');
      }
      pushHist(comando);

      const parts = comando.split(/\s+/);
      const cmdKey = parts[0].toLowerCase();
      const args = parts.slice(1);
      const fn = commands[cmdKey];

      if (fn) {
        try { await fn(args); }
        catch (err) { print(`Error interno: ${err.message}`, 'error'); }
      } else {
        // Atajo: si escribe un ID existente, abre la app
        const apps = await kvGet('apps_instaladas') || {};
        const rutas = P()?.RUTAS_APPS || [];
        if (apps[parts[0]] || rutas.find(r => r.id === parts[0])) {
          if (L()?.abrir) { await L().abrir(parts[0]); print(`Abriendo "${parts[0]}"...`, 'success'); }
        } else {
          print(`Comando no reconocido: "${san(comando)}". Probá "help".`, 'error');
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.btn') && window.getSelection().toString() === '') input.focus();
    });

    btnClear.onclick = () => commands['clear']();
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => input.focus(), 100);
  }
})();
