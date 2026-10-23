// ================= Utilidades =================
const $ = id => document.getElementById(id);
const desk = $('desktop');
const menu = $('menu');
const modal = $('modal');

const aHex = bytes => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function refrescarIconos() { if (window.lucide) lucide.createIcons(); }
function toast(m) {
  const t = $('toast');
  t.textContent = m;
  t.style.display = 'block';
  clearTimeout(t._h);
  t._h = setTimeout(() => t.style.display = 'none', 2600);
}
const aDataURL = blob => new Promise(r => {
  const fr = new FileReader();
  fr.onload = () => r(fr.result);
  fr.readAsDataURL(blob);
});

// FIX: Modal de confirmación reutilizable (lo usa el "Eliminar App" del context-menu)
function showConfirm(titulo, mensaje) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;';
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--card,#fff);color:var(--text,#000);border:2px solid var(--accent,#2563eb);border-radius:16px;padding:24px;max-width:340px;width:90vw;box-shadow:0 20px 40px rgba(0,0,0,0.4);';
    box.innerHTML = `
      <h3 style="margin:0 0 10px;font-size:18px;font-weight:700;">${esc(titulo)}</h3>
      <p style="margin:0 0 20px;font-size:13px;color:var(--muted,#666);line-height:1.4;">${esc(mensaje)}</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="confirm-cancel" style="padding:8px 16px;border-radius:8px;border:1px solid var(--line,#ccc);background:var(--field,#f0f0f0);color:var(--text,#000);cursor:pointer;font:inherit;font-weight:600;font-size:13px;">Cancelar</button>
        <button id="confirm-ok" style="padding:8px 16px;border-radius:8px;border:none;background:var(--danger,#ef4444);color:#fff;cursor:pointer;font:inherit;font-weight:600;font-size:13px;">Aceptar</button>
      </div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    const close = (r) => { overlay.remove(); resolve(r); };
    box.querySelector('#confirm-cancel').onclick = () => close(false);
    box.querySelector('#confirm-ok').onclick = () => close(true);
    overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    box.querySelector('#confirm-ok').focus();
  });
}

// ================= Almacenamiento: IndexedDB =================
const dbP = new Promise((resolve, reject) => {
  const req = indexedDB.open('myhub-lobby', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('kv');
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
async function kvGet(k) {
  const db = await dbP;
  return new Promise((res, rej) => {
    const r = db.transaction('kv').objectStore('kv').get(k);
    r.onsuccess = () => res(r.result ?? null);
    r.onerror = () => rej(r.error);
  });
}
async function kvSet(k, v) {
  const db = await dbP;
  return new Promise((res, rej) => {
    const t = db.transaction('kv', 'readwrite');
    t.objectStore('kv').put(v, k);
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}

// ================= Datos base =================
// FIX: rosado y cafe añadidos a COLORES (morado ya estaba). Así aparecen
// automáticamente en Configuración y aplicarAjustes() los respeta al cambiar de modo.
const COLORES = {
  azul: '#2563eb', celeste: '#0ea5e9', rojo: '#dc2626',
  verde: '#16a34a', morado: '#7c3aed', amarillo: '#ca8a04',
  rosado: '#ec4899', cafe: '#8b4513'
};
const LIMITE_FONDO = 1024 * 1024;
const AJUSTES_BASE = { color: 'azul', modo: 'claro', fondo: null };
const IDIOMAS = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français' };
const PAISES = [['CL','Chile'],['AR','Argentina'],['BO','Bolivia'],['BR','Brasil'],['CO','Colombia'],['CR','Costa Rica'],['CU','Cuba'],['EC','Ecuador'],['SV','El Salvador'],['ES','España'],['US','Estados Unidos'],['GT','Guatemala'],['HN','Honduras'],['MX','México'],['NI','Nicaragua'],['PA','Panamá'],['PY','Paraguay'],['PE','Perú'],['PR','Puerto Rico'],['DO','República Dominicana'],['UY','Uruguay'],['VE','Venezuela'],['CA','Canadá'],['FR','Francia'],['DE','Alemania'],['IT','Italia'],['PT','Portugal'],['GB','Reino Unido'],['JP','Japón'],['CN','China'],['IN','India'],['AU','Australia'],['OTRO','Otro']];
const GENEROS = { 'hombre': 'Hombre', 'mujer': 'Mujer', 'no-binario': 'No binario', 'otro': 'Otro' };

const MARGEN_ICONOS = 16;
// Cuadrícula FIJA: 16 columnas x 5 filas. No se mide el escritorio.
// Estos valores deben coincidir con las variables CSS de :root (--grid-cols, --grid-rows, --cell-w, --cell-h).
const GRID_COLS = 16;
const GRID_ROWS = 5;
const GRID_X = 82;   // ancho de celda (px)
const GRID_Y = 108;  // alto de celda (px)

// FIX: Tamaños de widgets centralizados (antes duplicados en 3 sitios)
const WIDGET_SIZES = {
  '1x1': { w: GRID_X - 2,     h: GRID_Y - 8,      cols: 1, rows: 1 },
  '2x1': { w: GRID_X * 2 - 2, h: GRID_Y - 8,      cols: 2, rows: 1 },
  '2x2': { w: GRID_X * 2 - 2, h: GRID_Y * 2 - 8,  cols: 2, rows: 2 }
};

// ================= Estado global =================
let ajustes = { ...AJUSTES_BASE };
let cuentaActual = null;
let sesionActiva = false;
let posicionesIconos = {};
let carpetas = {};
let pinnedApps = [];
let ctxMenu = null;
window.widgetsActivos = [];

async function guardarAjustes() { await kvSet('ajustes', ajustes); }
const guardarCarpetas = () => kvSet('carpetas', carpetas);
const guardarPinned = () => kvSet('pinned_apps', pinnedApps);

function aplicarAjustes() {
  const root = document.documentElement;
  const accentColor = COLORES[ajustes.color] || COLORES.azul;
  root.style.setProperty('--accent', accentColor);
  root.dataset.modo = ajustes.modo === 'oscuro' ? 'oscuro' : 'claro';

  const fondoEl = $('fondo-imagen');
  if (ajustes.fondo) {
    fondoEl.style.background = `url("${ajustes.fondo}") center/cover no-repeat`;
  } else {
    fondoEl.style.background = '';
  }
  document.body.classList.toggle('con-fondo', !!ajustes.fondo);

  // FIX: notificar a los widgets abiertos del cambio de tema
  document.querySelectorAll('.widget-container iframe').forEach(f => {
    try {
      f.contentWindow.postMessage({ type: 'myhub:tema:res', color: accentColor, modo: ajustes.modo }, '*');
    } catch (e) {}
  });
}

// ================= Cuenta =================
async function derivarHash(pass, salt) {
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, clave, 256);
  return aHex(new Uint8Array(bits));
}

async function redimensionarFoto(file) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url;
  });
  const lado = Math.min(img.width, img.height);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  c.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 256, 256);
  URL.revokeObjectURL(url);
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
}

async function crearCuenta(datos, pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  cuentaActual = { ...datos, salt, hash: await derivarHash(pass, salt), creada: new Date().toISOString() };
  sesionActiva = true;
  await kvSet('cuenta', cuentaActual);
  await kvSet('sesion', true);
}

async function iniciarSesion(pass) {
  const ok = (await derivarHash(pass, cuentaActual.salt)) === cuentaActual.hash;
  if (ok) { sesionActiva = true; await kvSet('sesion', true); }
  return ok;
}

async function cerrarSesion() {
  Object.keys(win).forEach(cerrar);
  sesionActiva = false;
  await kvSet('sesion', false);
}

async function perfil() {
  if (!cuentaActual || !sesionActiva) return null;
  const { hash, salt, foto, ...publico } = cuentaActual;
  return { ...publico, foto: foto ? await aDataURL(foto) : null };
}

function refrescarEstado() {
  const bloqueado = !sesionActiva;
  $('bloqueo').classList.toggle('hidden', !bloqueado);
  if (bloqueado) {
    const tiene = !!cuentaActual;
    $('bloqueoTitulo').textContent = tiene ? 'Sesión cerrada' : 'Bienvenido a MyHub';
    $('bloqueoTexto').textContent = tiene ? 'Inicia sesión para usar tus apps y la configuración.' : 'Crea una cuenta para empezar a usar MyHub.';
    $('bloqueoBtn').textContent = tiene ? 'Iniciar sesión' : 'Crear cuenta';
  }
  renderMenu();
}

$('bloqueoBtn').onclick = () => cuentaActual ? abrirModal('Iniciar sesión', vistaLogin) : abrirModal('Crear cuenta', vistaRegistro);

// ================= Menú de inicio =================
function crearOpMenu(icono, texto, fn, bloqueada = false) {
  const b = document.createElement('button');
  b.className = 'menu-op' + (bloqueada ? ' bloqueada' : '');
  b.innerHTML = `<i data-lucide="${icono}"></i><span>${esc(texto)}</span>` + (bloqueada ? '<i data-lucide="lock" class="candado"></i>' : '');
  b.onclick = () => { menu.classList.add('hidden'); if (bloqueada) return toast('Inicia sesión'); fn(); };
  return b;
}

function renderMenu() {
  const ops = $('menuOps'); ops.innerHTML = '';
  let cuentaOp;
  if (!cuentaActual) cuentaOp = { icono: 'user-plus', texto: 'Crear cuenta', fn: () => abrirModal('Crear cuenta', vistaRegistro) };
  else if (!sesionActiva) cuentaOp = { icono: 'log-in', texto: 'Iniciar sesión', fn: () => abrirModal('Iniciar sesión', vistaLogin) };
  else cuentaOp = { icono: 'user-round', texto: 'Mi cuenta', fn: () => abrirModal('Mi cuenta', vistaMiCuenta) };

  ops.appendChild(crearOpMenu(cuentaOp.icono, cuentaOp.texto, cuentaOp.fn));

  const docBtn = document.createElement('button'); docBtn.className = 'menu-op';
  docBtn.innerHTML = `<i data-lucide="file-text"></i><span>DocApps</span>`;
  docBtn.onclick = () => { menu.classList.add('hidden'); if (window.descargarDocApps) window.descargarDocApps(); };
  ops.appendChild(docBtn);

  const docWidgsBtn = document.createElement('button'); docWidgsBtn.className = 'menu-op';
  docWidgsBtn.innerHTML = `<i data-lucide="layout-dashboard"></i><span>DocWidgets</span>`;
  docWidgsBtn.onclick = () => { menu.classList.add('hidden'); if (window.descargarDocWidgets) window.descargarDocWidgets(); };
  ops.appendChild(docWidgsBtn);

  const creditsBtn = document.createElement('button'); creditsBtn.className = 'menu-op';
  creditsBtn.innerHTML = `<i data-lucide="info"></i><span>Créditos</span>`;
  creditsBtn.onclick = () => { menu.classList.add('hidden'); abrirModal('Créditos', vistaCreditos); };
  ops.appendChild(creditsBtn);

  ops.appendChild(crearOpMenu('settings', 'Configuración', () => abrirModal('Configuración', vistaConfig), !sesionActiva));
  refrescarIconos();
}

$('inicio').addEventListener('pointerdown', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
document.addEventListener('pointerdown', e => { if (!menu.contains(e.target)) menu.classList.add('hidden'); });

// ================= Modal =================
function abrirModal(titulo, vista) {
  $('mTitulo').textContent = titulo;
  $('mBody').replaceChildren(vista(() => abrirModal(titulo, vista)));
  modal.classList.remove('hidden');
  refrescarIconos();
}
function cerrarModal() { modal.classList.add('hidden'); }
$('mCerrar').onclick = cerrarModal;
modal.addEventListener('pointerdown', e => { if (e.target === modal) cerrarModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { cerrarModal(); menu.classList.add('hidden'); } });

function avatarEl(blob) {
  const a = document.createElement('div'); a.className = 'avatar';
  if (blob) { const img = document.createElement('img'); const url = URL.createObjectURL(blob); img.src = url; img.onload = () => URL.revokeObjectURL(url); a.appendChild(img); }
  else a.innerHTML = '<i data-lucide="user-round"></i>';
  return a;
}

function vistaCreditos() {
  const d = document.createElement('div');
  d.className = 'creditos';
  d.innerHTML = `
    <div class="credito-item">
      <h4>Creador y Desarrollo</h4>
      <p><strong>VicHeStudios</strong> (Fundador y Desarrollador Principal)</p>
    </div>
    <div class="credito-item">
      <h4>Librerías de Código Abierto</h4>
      <p><strong>Lucide</strong> (Iconografía del sistema)</p>
      <p><strong>JSZip</strong> (Manejo de archivos comprimidos en la instalación)</p>
      <p><strong>GitHub Raw</strong> (Distribución instantánea de archivos en Stor-He)</p>
      <p><strong>snd-lib</strong> (Efectos de sonido de interfaz de usuario)</p>
    </div>
    <div class="credito-item">
      <h4>Infraestructura y Despliegue</h4>
      <p><strong>GitHub Pages</strong> (Alojamiento web y despliegue)</p>
      <p><strong>GitHub</strong> (Repositorio de código fuente)</p>
    </div>
    <p class="nota" style="text-align:center; margin-top:16px;">Hecho con ❤️ para la comunidad.</p>
  `;
  return d;
}

function vistaRegistro() {
  const d = document.createElement('div');
  const hoy = new Date(); const anioActual = hoy.getFullYear();
  let optionsDias = '', optionsAnios = '';
  for (let i = 1; i <= 31; i++) optionsDias += `<option value="${String(i).padStart(2, '0')}">${i}</option>`;
  for (let i = anioActual; i >= 1920; i--) optionsAnios += `<option value="${i}">${i}</option>`;
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const optionsMeses = meses.map((m, i) => `<option value="${String(i + 1).padStart(2, '0')}">${m}</option>`).join('');

  d.innerHTML = `
    <div class="avatar-up"><div class="avatar" id="rFotoBox"><i data-lucide="camera"></i></div><div><button class="btn gray" id="rFotoBtn"><i data-lucide="image-plus"></i>Subir foto</button><input type="file" id="rFoto" accept="image/png,image/jpeg,image/webp" hidden><p class="nota">Se recorta a cuadrado. Máx. 5 MB.</p></div></div>
    <div class="grid2"><label>Nombre<input type="text" id="rNombre" maxlength="32"></label><label>Apellido<input type="text" id="rApellido" maxlength="48"></label></div>
    <div class="fila-fecha-genero"><div class="col-fecha"><label>Fecha de nacimiento</label><div class="fecha-nac"><select id="rDia">${optionsDias}</select><select id="rMes">${optionsMeses}</select><select id="rAnio">${optionsAnios}</select></div></div><div class="col-genero"><label>Género</label><select id="rGenero">${Object.entries(GENEROS).map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select></div></div>
    <div class="grid2" style="margin-top: 12px;"><label>País<select id="rPais">${PAISES.map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join('')}</select></label><label>Idioma<select id="rIdioma">${Object.entries(IDIOMAS).map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join('')}</select></label></div>
    <div class="grid2"><label>Contraseña<input type="password" id="rPass"></label><label>Repetir contraseña<input type="password" id="rPass2"></label></div>
    <p class="nota">Mínimo 6 caracteres. Todo se guarda en este navegador.</p><button class="btn btn-bloque" id="rCrear"><i data-lucide="check"></i>Crear cuenta</button>`;

  let fotoBlob = null; const foto = d.querySelector('#rFoto');
  d.querySelector('#rFotoBtn').onclick = () => foto.click();
  foto.onchange = async () => {
    const f = foto.files[0]; if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return toast('Usa una imagen PNG, JPG o WEBP');
    if (f.size > 5 * 1024 * 1024) return toast('La foto debe pesar menos de 5 MB');
    try { fotoBlob = await redimensionarFoto(f); const box = d.querySelector('#rFotoBox'); const old = box.querySelector('img'); if (old) URL.revokeObjectURL(old.src); const url = URL.createObjectURL(fotoBlob); const img = new Image(); img.onload = () => URL.revokeObjectURL(url); img.src = url; box.replaceChildren(img); } catch { toast('No se pudo leer esa imagen'); }
  };
  d.querySelector('#rCrear').onclick = async () => {
    const v = id => d.querySelector('#' + id).value;
    const nombre = v('rNombre').trim(); const pass = v('rPass');
    const dia = v('rDia'); const mes = v('rMes'); const anio = v('rAnio'); const nacimiento = `${anio}-${mes}-${dia}`;
    if (!nombre) return toast('Escribe tu nombre');
    const fechaTest = new Date(nacimiento + 'T00:00');
    if (fechaTest.getDate() !== parseInt(dia) || fechaTest.getMonth() + 1 !== parseInt(mes)) return toast('La fecha seleccionada no es válida');
    const hoyISO = new Date().toISOString().slice(0, 10);
    if (nacimiento >= hoyISO) return toast('La fecha de nacimiento debe ser anterior a hoy');
    if (pass.length < 6) return toast('La contraseña necesita al menos 6 caracteres');
    if (pass !== v('rPass2')) return toast('Las contraseñas no coinciden');
    try {
      await crearCuenta({ nombre, apellido: v('rApellido').trim(), nacimiento, genero: v('rGenero'), pais: v('rPais'), idioma: v('rIdioma'), foto: fotoBlob }, pass);
      cerrarModal(); refrescarEstado(); toast(`Bienvenido, ${nombre}`);
    } catch { toast('No se pudo crear la cuenta. Abre MyHub desde localhost o https.'); }
  };
  return d;
}

function vistaLogin() {
  const d = document.createElement('div'); d.className = 'perfil'; d.appendChild(avatarEl(cuentaActual.foto));
  d.insertAdjacentHTML('beforeend', `<h4>Hola, ${esc(cuentaActual.nombre)}</h4><p class="nota">Escribe tu contraseña para continuar.</p><label style="text-align:left">Contraseña<input type="password" id="lPass"></label><button class="btn btn-bloque" id="lEntrar"><i data-lucide="log-in"></i>Entrar</button>`);
  const entrar = async () => { const pass = d.querySelector('#lPass').value; if (!pass) return toast('Escribe tu contraseña'); if (await iniciarSesion(pass)) { cerrarModal(); refrescarEstado(); toast('Sesión iniciada'); } else toast('Contraseña incorrecta'); };
  d.querySelector('#lEntrar').onclick = entrar;
  d.querySelector('#lPass').addEventListener('keydown', e => { if (e.key === 'Enter') entrar(); });
  return d;
}

function vistaMiCuenta() {
  const c = cuentaActual; const d = document.createElement('div'); d.className = 'perfil'; d.appendChild(avatarEl(c.foto));
  const pais = (PAISES.find(p => p[0] === c.pais) || [null, '—'])[1];
  const nacimiento = new Date(c.nacimiento + 'T00:00').toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
  const generoTexto = GENEROS[c.genero] || '—';
  d.insertAdjacentHTML('beforeend', `<h4>${esc(c.nombre)} ${esc(c.apellido || '')}</h4><dl class="datos"><dt>Nacimiento</dt><dd>${esc(nacimiento)}</dd><dt>Género</dt><dd>${esc(generoTexto)}</dd><dt>País</dt><dd>${esc(pais)}</dd><dt>Idioma</dt><dd>${esc(IDIOMAS[c.idioma] || '—')}</dd><dt>Cuenta creada</dt><dd>${esc(new Date(c.creada).toLocaleDateString('es'))}</dd></dl>`);
  const salir = document.createElement('button'); salir.className = 'btn red btn-bloque'; salir.innerHTML = '<i data-lucide="log-out"></i>Cerrar sesión';
  salir.onclick = async () => { await cerrarSesion(); cerrarModal(); refrescarEstado(); toast('Sesión cerrada'); };
  d.appendChild(salir); return d;
}

function vistaConfig(recargar) {
  const d = document.createElement('div');
  d.innerHTML = `<div class="sec">Color del sistema</div><div class="swatches"></div><div class="sec">Modo</div><div class="seg ${ajustes.modo === 'oscuro' ? 'dark' : ''}"><button data-modo="claro" class="${ajustes.modo !== 'oscuro' ? 'on' : ''}"><i data-lucide="sun"></i>Claro</button><button data-modo="oscuro" class="${ajustes.modo === 'oscuro' ? 'on' : ''}"><i data-lucide="moon"></i>Oscuro</button></div><div class="sec">Fondo de pantalla</div><div class="fila-btns"><button class="btn" id="cambiarFondo"><i data-lucide="image"></i>Subir PNG</button><button class="btn gray" id="quitarFondo">Quitar</button></div><input type="file" accept="image/png" id="fondoIn" hidden><p class="nota">PNG de menos de 1 MB.</p>`;

  const sw = d.querySelector('.swatches');
  for (const [nombre, hex] of Object.entries(COLORES)) {
    const b = document.createElement('div');
    b.className = 'swatch' + (ajustes.color === nombre ? ' on' : '');
    b.style.background = hex;
    b.title = nombre;
    b.onclick = () => { ajustes.color = nombre; guardarAjustes(); aplicarAjustes(); recargar(); };
    sw.appendChild(b);
  }

  d.querySelectorAll('[data-modo]').forEach(b => b.onclick = () => {
    ajustes.modo = b.dataset.modo;
    guardarAjustes();
    aplicarAjustes();
    recargar();
  });

  const fondoIn = d.querySelector('#fondoIn');
  d.querySelector('#cambiarFondo').onclick = () => fondoIn.click();

  fondoIn.onchange = () => {
    const f = fondoIn.files[0]; if (!f) return;
    if (f.type !== 'image/png') return toast('Solo se aceptan archivos PNG');
    if (f.size >= LIMITE_FONDO) return toast('El PNG debe pesar menos de 1 MB');
    const lector = new FileReader();
    lector.onload = () => { ajustes.fondo = lector.result; guardarAjustes(); aplicarAjustes(); toast('Fondo actualizado'); };
    lector.readAsDataURL(f);
  };

  d.querySelector('#quitarFondo').onclick = () => { ajustes.fondo = null; guardarAjustes(); aplicarAjustes(); recargar(); };
  return d;
}

// ================= Registro de apps =================
const registro = new Map();
const orden = [];

function registrarApp(app) {
  if (registro.has(app.id)) return;
  registro.set(app.id, app);
  orden.push(app.id);
  renderIconos();
}

async function eliminarApp(id) {
  if (!registro.has(id)) return;

  cerrar(id);

  registro.delete(id);
  const idx = orden.indexOf(id);
  if (idx > -1) orden.splice(idx, 1);

  if (posicionesIconos[id]) {
    delete posicionesIconos[id];
    kvSet('posiciones_iconos', posicionesIconos);
  }

  const idxPinned = pinnedApps.indexOf(id);
  if (idxPinned > -1) {
    pinnedApps.splice(idxPinned, 1);
    guardarPinned();
  }

  try {
    const appsInstaladas = await kvGet('apps_instaladas') || {};
    if (appsInstaladas[id]) {
      delete appsInstaladas[id];
      await kvSet('apps_instaladas', appsInstaladas);
    }
  } catch (err) {
    console.error('[eliminarApp] Error al borrar de IndexedDB:', err);
  }

  // Eliminar widgets asociados a esta app
  if (window.widgetsActivos && window.widgetsActivos.length > 0) {
    const originalLen = window.widgetsActivos.length;
    window.widgetsActivos = window.widgetsActivos.filter(w => w.id !== id);
    if (window.widgetsActivos.length !== originalLen) {
      await kvSet('widgets_activos', window.widgetsActivos);
      if (window.renderWidgets) window.renderWidgets();
      toast('Widgets asociados eliminados');
    }
  }

  renderIconos();
  if (typeof renderQuickLaunch === 'function') renderQuickLaunch();
}

// ================= Carpetas helpers =================
function appsEnCarpetas() {
  const s = new Set();
  Object.values(carpetas).forEach(c => c.apps.forEach(id => s.add(id)));
  return s;
}
function limpiarCarpetasHuerfanas() {
  let changed = false;
  Object.values(carpetas).forEach(f => {
    const orig = f.apps.length;
    f.apps = f.apps.filter(id => registro.has(id));
    if (f.apps.length !== orig) changed = true;
  });
  if (changed) guardarCarpetas();
}

// ================= Inyección de CSS (extras) =================
function injectStyles() {
  if (document.getElementById('myhub-extras-style')) return;
  const style = document.createElement('style');
  style.id = 'myhub-extras-style';
  style.textContent = `
    #quicklaunch {
      display: flex; gap: 4px; padding: 0 6px; margin: 0 2px;
      border-right: 1px solid var(--line); align-items: center;
    }
    #quicklaunch:empty { display: none; }

    .quick-btn {
      width: 42px; height: 42px; border: none; border-radius: 10px;
      background: transparent; color: var(--muted); cursor: pointer; padding: 0;
      display: flex; align-items: center; justify-content: center;
      transition: background .15s, color .15s, transform .15s;
    }
    .quick-btn:hover { background: var(--field); color: var(--text); }
    .quick-btn:active { transform: scale(.9); }
    .quick-btn svg { width: 20px; height: 20px; }

    #tasks { overflow: visible !important; }

    .status-pill {
      display: flex; align-items: center; gap: 12px;
      background: var(--accent-soft);
      border: 1px solid var(--accent-line);
      border-radius: 12px; padding: 6px 14px;
      font-size: 13px; font-weight: 600;
      color: var(--accent);
      margin-left: auto; font-variant-numeric: tabular-nums;
    }
    .status-item { display: flex; align-items: center; gap: 6px; }
    .status-item svg { width: 16px; height: 16px; color: currentColor; }
    .status-item.low { color: #ef4444; }

    #clock {
      margin: 0 !important; padding: 0 !important;
      background: transparent !important; color: inherit !important;
      font-size: inherit !important; font-weight: inherit !important;
      border: none !important;
    }

    @media (max-width: 860px) { .status-item.date { display: none; } }
    @media (max-width: 680px) { .status-item.battery { display: none; } }

    .close.minimize:hover { background: #f59e0b; color: #fff; }

    .task.minimized {
      opacity: 0.7; padding: 0 !important;
      width: 42px !important; min-width: 42px; height: 42px;
      justify-content: center; border-radius: 10px;
      background: transparent; border: 1.5px dashed var(--muted);
      color: var(--muted);
    }
    .task.minimized:hover {
      opacity: 1; background: var(--field);
      border: 1.5px solid var(--line); color: var(--text);
    }

    .icon.folder-icon .ico { position: relative; overflow: hidden; padding: 6px; }
    .folder-previews {
      display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;
      gap: 3px; width: 100%; height: 100%;
      align-items: center; justify-content: center;
    }
    .folder-mini {
      display: flex; align-items: center; justify-content: center;
      background: var(--field); border-radius: 4px; color: var(--accent);
      border: 1px solid var(--line); overflow: hidden;
    }
    .folder-mini svg { width: 14px !important; height: 14px !important; }
    .folder-mini[data-single] { grid-column: 1 / -1; grid-row: 1 / -1; border-radius: 8px; }
    .folder-mini[data-single] svg { width: 26px !important; height: 26px !important; }

    .folder-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(82px, 1fr)); gap: 12px; padding: 8px 0; }
    .folder-item {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 10px 6px; border-radius: 10px; cursor: pointer;
      transition: background .15s; color: var(--text);
    }
    .folder-item:hover { background: var(--accent-soft); }
    .folder-item .ico {
      width: 46px; height: 46px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      background: var(--card); border: 1.5px solid var(--accent-line); color: var(--accent);
    }
    .folder-item .ico svg { width: 22px; height: 22px; }
    .folder-item span {
      font-size: 12px; font-weight: 600; text-align: center;
      max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
  `;
  document.head.appendChild(style);
}

// ================= Iconos (folder-aware) =================
// Celdas de la cuadrícula ocupadas por widgets (los iconos no deben colocarse sobre ellas)
function celdasDeWidgets() {
  const ocupadas = new Set();
  (window.widgetsActivos || []).forEach(w => {
    if (!w.pos) return;
    const ws = WIDGET_SIZES[w.size] || WIDGET_SIZES['1x1'];
    const c0 = Math.round((parseFloat(w.pos.left) - MARGEN_ICONOS) / GRID_X);
    const r0 = Math.round((parseFloat(w.pos.top) - MARGEN_ICONOS) / GRID_Y);
    for (let i = 0; i < ws.cols; i++) {
      for (let j = 0; j < ws.rows; j++) ocupadas.add(`${c0 + i}-${r0 + j}`);
    }
  });
  return ocupadas;
}

// Lleva los widgets guardados a la cuadrícula actual y evita solapamientos.
// Devuelve true si algo cambió (para guardar de nuevo).
function normalizarWidgets() {
  const ocupadas = new Set();
  let cambio = false;

  window.widgetsActivos.forEach(w => {
    const ws = WIDGET_SIZES[w.size] || WIDGET_SIZES['1x1'];
    const px = parseFloat(w.pos?.left), py = parseFloat(w.pos?.top);
    let c = isNaN(px) ? 0 : Math.round((px - MARGEN_ICONOS) / GRID_X);
    let r = isNaN(py) ? 0 : Math.round((py - MARGEN_ICONOS) / GRID_Y);
    c = Math.min(GRID_COLS - ws.cols, Math.max(0, c));
    r = Math.min(GRID_ROWS - ws.rows, Math.max(0, r));

    const celdas = (cc, rr) => { const out = []; for (let i = 0; i < ws.cols; i++) for (let j = 0; j < ws.rows; j++) out.push(`${cc + i}-${rr + j}`); return out; };

    if (celdas(c, r).some(k => ocupadas.has(k))) {
      let hueco = null;
      for (let rr = 0; rr <= GRID_ROWS - ws.rows && !hueco; rr++) {
        for (let cc = 0; cc <= GRID_COLS - ws.cols && !hueco; cc++) {
          if (!celdas(cc, rr).some(k => ocupadas.has(k))) hueco = [cc, rr];
        }
      }
      if (hueco) { [c, r] = hueco; }
    }

    celdas(c, r).forEach(k => ocupadas.add(k));
    const nuevo = { left: (MARGEN_ICONOS + c * GRID_X) + 'px', top: (MARGEN_ICONOS + r * GRID_Y) + 'px' };
    if (!w.pos || w.pos.left !== nuevo.left || w.pos.top !== nuevo.top) { w.pos = nuevo; cambio = true; }
  });
  return cambio;
}

function renderIconos() {
  const iconsEl = $('icons');
  if (!iconsEl) return;
  iconsEl.innerHTML = '';

  const MARGEN = MARGEN_ICONOS, GX = GRID_X, GY = GRID_Y;
  const maxRows = GRID_ROWS;
  const maxY = MARGEN_ICONOS + (GRID_ROWS - 1) * GRID_Y;
  const inFolder = appsEnCarpetas();

  inFolder.forEach(id => { delete posicionesIconos[id]; });

  const items = [];
  orden.forEach(id => {
    if (inFolder.has(id)) return;
    const app = registro.get(id);
    if (app) items.push({ kind: 'app', id, app });
  });
  Object.values(carpetas).forEach(f => items.push({ kind: 'folder', id: f.id, folder: f }));

  const used = new Set();
  const posUpdates = {};
  const celdasWidget = celdasDeWidgets();
  const celdaDe = (x, y) => `${Math.round((x - MARGEN) / GX)}-${Math.round((y - MARGEN) / GY)}`;

  items.forEach((item) => {
    let savedPos = item.kind === 'app' ? posicionesIconos[item.id] : item.folder.pos;
    let tx = -1, ty = -1;

    // Posición guardada -> celda más cercana de la cuadrícula actual (corrige datos de versiones anteriores)
    if (savedPos) {
      const sx = parseFloat(savedPos.left), sy = parseFloat(savedPos.top);
      if (!isNaN(sx) && !isNaN(sy)) {
        const c = Math.min(GRID_COLS - 1, Math.max(0, Math.round((sx - MARGEN) / GX)));
        const r = Math.min(GRID_ROWS - 1, Math.max(0, Math.round((sy - MARGEN) / GY)));
        const key = `${c}-${r}`;
        if (!used.has(key) && !celdasWidget.has(key)) { tx = MARGEN + c * GX; ty = MARGEN + r * GY; used.add(key); }
      }
    }
    // Sin posición válida -> primera celda libre
    if (tx === -1) {
      let col = 0, row = 0;
      while (col < GRID_COLS) {
        const key = `${col}-${row}`;
        if (!used.has(key) && !celdasWidget.has(key)) { tx = MARGEN + col * GX; ty = MARGEN + row * GY; used.add(key); break; }
        row++; if (row >= GRID_ROWS) { row = 0; col++; }
      }
    }
    if (tx === -1) return; // sin espacio en la cuadrícula

    if (item.kind === 'app') {
      posUpdates[item.id] = { left: tx + 'px', top: ty + 'px' };
    } else {
      item.folder.pos = { left: tx + 'px', top: ty + 'px' };
    }

    const el = document.createElement('div');
    el.className = 'icon';
    el.style.left = tx + 'px';
    el.style.top = ty + 'px';

    if (item.kind === 'app') {
      el.dataset.appId = item.id;
      el.innerHTML = `<div class="ico"><i data-lucide="${esc(item.app.icono || 'app-window')}"></i></div><span>${esc(item.app.titulo)}</span>`;
      el.addEventListener('contextmenu', (e) => { e.stopPropagation(); contextoApp(e, item.id); });
      hacerArrastrable(el, item.id, maxRows, maxY);
    } else {
      el.classList.add('folder-icon');
      el.dataset.folderId = item.id;
      const apps = item.folder.apps.slice(0, 4);
      let previews;
      if (apps.length === 1) {
        const a = registro.get(apps[0]);
        previews = a ? `<div class="folder-mini" data-single><i data-lucide="${esc(a.icono || 'app-window')}"></i></div>` : '';
      } else {
        previews = apps.map(aid => {
          const a = registro.get(aid);
          return a ? `<div class="folder-mini"><i data-lucide="${esc(a.icono || 'app-window')}"></i></div>` : '';
        }).join('');
      }
      el.innerHTML = `<div class="ico"><div class="folder-previews">${previews}</div></div><span>${esc(item.folder.nombre)}</span>`;
      el.addEventListener('contextmenu', (e) => { e.stopPropagation(); contextoCarpeta(e, item.id); });
      hacerArrastrableCarpeta(el, item.id, maxRows, maxY);
    }

    iconsEl.appendChild(el);
  });

  Object.assign(posicionesIconos, posUpdates);
  kvSet('posiciones_iconos', posicionesIconos);
  if (Object.keys(carpetas).length > 0) guardarCarpetas();

  refrescarIconos();
}

// ================= Arrastre apps (Con colisión nativa a widgets) =================
function hacerArrastrable(el, id, maxRows, maxYLimit) {
  const MARGEN = MARGEN_ICONOS, GX = GRID_X, GY = GRID_Y;
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    isDragging = false;
    el.setPointerCapture(e.pointerId);

    const parentRect = el.parentElement.getBoundingClientRect();
    const rect = el.getBoundingClientRect();

    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left - parentRect.left;
    startTop = rect.top - parentRect.top;

    el.classList.add('dragging');

    const mover = ev => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging = true;
      if (isDragging) {
        let newLeft = startLeft + dx;
        let newTop = startTop + dy;
        const maxLeft = MARGEN + (GRID_COLS - 1) * GX;
        newTop = Math.max(MARGEN, Math.min(newTop, maxYLimit));
        newLeft = Math.max(MARGEN, Math.min(newLeft, maxLeft));
        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
      }
    };

    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      el.classList.remove('dragging');

      if (isDragging) {
        let currentLeft = parseFloat(el.style.left) || MARGEN;
        let currentTop = parseFloat(el.style.top) || MARGEN;
        let snapX = Math.round((currentLeft - MARGEN) / GX) * GX + MARGEN;
        let snapY = Math.round((currentTop - MARGEN) / GY) * GY + MARGEN;
        const maxLeft = MARGEN + (GRID_COLS - 1) * GX;
        snapX = Math.max(MARGEN, Math.min(snapX, maxLeft));

        let invalid = false;
        if (snapY > maxYLimit) invalid = true;

        const icons = document.querySelectorAll('.icon');
        for (const iconEl of icons) {
          if (iconEl === el) continue;
          if (parseFloat(iconEl.style.left) === snapX && parseFloat(iconEl.style.top) === snapY) {
            invalid = true;
            break;
          }
        }

        // Colisión con Widgets (usa WIDGET_SIZES centralizado)
        if (!invalid && window.widgetsActivos) {
          const wW = el.offsetWidth, wH = el.offsetHeight;
          const snapRect = { left: snapX, top: snapY, right: snapX + wW, bottom: snapY + wH };

          for (const w of window.widgetsActivos) {
            if (!w.pos) continue;
            const wx = parseFloat(w.pos.left), wy = parseFloat(w.pos.top);
            const ws = WIDGET_SIZES[w.size] || WIDGET_SIZES['1x1'];
            const wRect = { left: wx, top: wy, right: wx + ws.w, bottom: wy + ws.h };
            if (!(snapRect.right <= wRect.left || snapRect.left >= wRect.right || snapRect.bottom <= wRect.top || snapRect.top >= wRect.bottom)) {
              invalid = true;
              toast('No puedes colocar iconos sobre un widget');
              break;
            }
          }
        }

        if (invalid) {
          el.style.left = startLeft + 'px';
          el.style.top = startTop + 'px';
          toast('Posición inválida u ocupada');
        } else {
          el.style.left = snapX + 'px';
          el.style.top = snapY + 'px';
          posicionesIconos[id] = { left: el.style.left, top: el.style.top };
          kvSet('posiciones_iconos', posicionesIconos);
        }
      } else {
        abrir(id);
      }
    };

    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  });
}

// ================= Arrastre carpetas =================
function hacerArrastrableCarpeta(el, folderId, maxRows, maxY) {
  const MARGEN = MARGEN_ICONOS, GX = GRID_X, GY = GRID_Y;
  let isDragging = false, startX, startY, startLeft, startTop;

  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    isDragging = false;
    el.setPointerCapture(e.pointerId);
    const parentRect = el.parentElement.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startLeft = rect.left - parentRect.left;
    startTop = rect.top - parentRect.top;
    el.classList.add('dragging');

    const mover = ev => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging = true;
      if (!isDragging) return;
      const maxLeft = MARGEN + (GRID_COLS - 1) * GX;
      let nl = Math.max(MARGEN, Math.min(startLeft + dx, maxLeft));
      let nt = Math.max(MARGEN, Math.min(startTop + dy, maxY));
      el.style.left = nl + 'px'; el.style.top = nt + 'px';
    };
    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      el.classList.remove('dragging');

      if (isDragging) {
        let cl = parseFloat(el.style.left) || MARGEN;
        let ct = parseFloat(el.style.top) || MARGEN;
        let sx = Math.round((cl - MARGEN) / GX) * GX + MARGEN;
        let sy = Math.round((ct - MARGEN) / GY) * GY + MARGEN;
        const maxLeft = MARGEN + (GRID_COLS - 1) * GX;
        sx = Math.max(MARGEN, Math.min(sx, maxLeft));

        let invalid = sy > maxY;
        document.querySelectorAll('.icon').forEach(iconEl => {
          if (iconEl === el) return;
          if (parseFloat(iconEl.style.left) === sx && parseFloat(iconEl.style.top) === sy) invalid = true;
        });

        // Colisión con Widgets
        if (!invalid && window.widgetsActivos) {
          const wW = el.offsetWidth, wH = el.offsetHeight;
          const snapRect = { left: sx, top: sy, right: sx + wW, bottom: sy + wH };

          for (const w of window.widgetsActivos) {
            if (!w.pos) continue;
            const wx = parseFloat(w.pos.left), wy = parseFloat(w.pos.top);
            const ws = WIDGET_SIZES[w.size] || WIDGET_SIZES['1x1'];
            const wRect = { left: wx, top: wy, right: wx + ws.w, bottom: wy + ws.h };
            if (!(snapRect.right <= wRect.left || snapRect.left >= wRect.right || snapRect.bottom <= wRect.top || snapRect.top >= wRect.bottom)) {
              invalid = true;
              toast('No puedes colocar carpetas sobre un widget');
              break;
            }
          }
        }

        if (invalid) {
          el.style.left = startLeft + 'px'; el.style.top = startTop + 'px';
          toast('Posición inválida u ocupada');
        } else {
          el.style.left = sx + 'px'; el.style.top = sy + 'px';
          if (carpetas[folderId]) {
            carpetas[folderId].pos = { left: sx + 'px', top: sy + 'px' };
            guardarCarpetas();
          }
        }
      } else {
        abrirCarpeta(folderId);
      }
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  });
}

// ================= Detección drag onto folder =================
function setupDragDetection() {
  const iconsEl = $('icons');
  if (!iconsEl) return;

  let dragTracking = null;

  iconsEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const icon = e.target.closest('.icon[data-app-id]');
    if (!icon) return;
    dragTracking = { appId: icon.dataset.appId, startX: e.clientX, startY: e.clientY, moved: false };
  }, true);

  window.addEventListener('pointermove', (e) => {
    if (!dragTracking) return;
    const dx = e.clientX - dragTracking.startX;
    const dy = e.clientY - dragTracking.startY;
    if (Math.hypot(dx, dy) > 5) dragTracking.moved = true;
  });

  window.addEventListener('pointerup', (e) => {
    if (!dragTracking) return;
    const { appId, moved } = dragTracking;
    dragTracking = null;
    if (!moved) return;
    const folder = getFolderAtPoint(e.clientX, e.clientY);
    if (folder) moverAppACarpeta(appId, folder.id);
  });
}

function getFolderAtPoint(x, y) {
  const folders = document.querySelectorAll('.icon.folder-icon');
  for (const el of folders) {
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      return { id: el.dataset.folderId, el };
    }
  }
  return null;
}

// ================= Carpetas: lógica =================
async function crearCarpeta(nombre, appsIniciales = []) {
  try {
    const id = 'folder_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    carpetas[id] = { id, nombre: nombre || 'Nueva carpeta', apps: appsIniciales.slice(), pos: null };
    appsIniciales.forEach(a => { delete posicionesIconos[a]; });
    await guardarCarpetas();
    await kvSet('posiciones_iconos', posicionesIconos);
    renderIconos();
    window.MyHub.toast(`Carpeta "${carpetas[id].nombre}" creada`);
  } catch (err) {
    console.error(err);
    window.MyHub.toast('Error al guardar la carpeta');
  }
}

async function eliminarCarpeta(folderId, eliminarApps = false) {
  const folder = carpetas[folderId];
  if (!folder) return;
  if (eliminarApps && window.MyHub?.eliminarApp) {
    folder.apps.forEach(id => window.MyHub.eliminarApp(id));
  }
  delete carpetas[folderId];
  await guardarCarpetas();
  renderIconos();
  window.MyHub.toast('Carpeta eliminada');
}

async function moverAppACarpeta(appId, folderId) {
  const folder = carpetas[folderId];
  if (!folder || folder.apps.includes(appId)) return;
  folder.apps.push(appId);
  delete posicionesIconos[appId];
  await guardarCarpetas();
  await kvSet('posiciones_iconos', posicionesIconos);
  renderIconos();
  window.MyHub.toast(`App movida a "${folder.nombre}"`);
}

function abrirCarpeta(folderId) {
  const folder = carpetas[folderId];
  if (!folder) return;
  abrirModal(folder.nombre, vistaCarpetaContenido(folderId));
}

function vistaCarpetaContenido(folderId) {
  return (recargar) => {
    const d = document.createElement('div');
    const folder = carpetas[folderId];
    if (!folder) return d;

    if (folder.apps.length === 0) {
      d.innerHTML = `<p style="text-align:center;color:var(--muted);padding:26px 12px;font-size:14px;line-height:1.5;">
        Esta carpeta está vacía.<br><small>Arrastra apps del escritorio sobre el icono de la carpeta.</small>
      </p>`;
      return d;
    }

    const grid = document.createElement('div');
    grid.className = 'folder-grid';

    folder.apps.forEach(appId => {
      const app = registro.get(appId);
      if (!app) return;
      const item = document.createElement('div');
      item.className = 'folder-item';
      item.innerHTML = `<div class="ico"><i data-lucide="${esc(app.icono || 'app-window')}"></i></div><span>${esc(app.titulo)}</span>`;
      item.onclick = () => { cerrarModal(); abrir(appId); };
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const esSistemaApp = ['papelera', 'forge', 'storhe', 'cmdhe'].includes(appId) || !!app.url;
        const opciones = [
          { icon: 'play', text: 'Abrir', fn: () => { cerrarModal(); abrir(appId); } },
          { separator: true },
          { icon: 'folder-minus', text: 'Sacar de la carpeta', fn: async () => {
            folder.apps = folder.apps.filter(a => a !== appId);
            await guardarCarpetas();
            renderIconos();
            window.MyHub.toast('App sacada de la carpeta');
            recargar();
          }},
          { separator: true }
        ];
        if (esSistemaApp) {
          opciones.push({ icon: 'lock', text: 'App de Sistema', locked: true,
            fn: () => toast('Las apps base no se pueden borrar desde aquí. Usa CMD-HE.') });
        } else {
          opciones.push({ icon: 'trash-2', text: 'Eliminar App', danger: true, fn: async () => {
            const ok = await showConfirm('Eliminar Aplicación', `¿Estás seguro que deseas eliminar "${app.titulo}" del sistema?`);
            if (!ok) return;
            // Usar la versión pública: así se limpia también la carpeta y sus cambios se guardan
            await window.MyHub.eliminarApp(appId);
            toast('App eliminada');
            if (carpetas[folderId]) recargar(); else cerrarModal();
          }});
        }
        mostrarContexto(e.clientX, e.clientY, opciones);
      });
      grid.appendChild(item);
    });

    d.appendChild(grid);
    return d;
  };
}

// ================= Prompt carpeta =================
function promptCarpeta(titulo, defaultValue, callback) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
  `;
  const box = document.createElement('div');
  box.style.cssText = `
    background: var(--card, #fff); color: var(--text, #000);
    padding: 24px; border-radius: 16px;
    border: 2px solid var(--accent, #2563eb);
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    width: 320px; max-width: 90vw;
    display: flex; flex-direction: column; gap: 12px;
  `;
  box.innerHTML = `
    <h3 style="margin:0;font-size:16px;font-weight:700;">${esc(titulo)}</h3>
    <input type="text" id="prompt-input" value="${esc(defaultValue)}" maxlength="24" style="
      padding: 10px; border-radius: 8px; border: 1.5px solid var(--line, #ccc);
      background: var(--field, #f0f0f0); color: var(--text, #000); font: inherit; outline: none;
    ">
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
      <button id="prompt-cancel" style="padding:8px 16px;border-radius:8px;border:1px solid var(--line, #ccc);background:transparent;color:inherit;cursor:pointer;">Cancelar</button>
      <button id="prompt-ok" style="padding:8px 16px;border-radius:8px;border:none;background:var(--accent, #2563eb);color:#fff;cursor:pointer;font-weight:600;">Aceptar</button>
    </div>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const input = box.querySelector('#prompt-input');
  input.focus(); input.select();
  const close = () => overlay.remove();

  box.querySelector('#prompt-cancel').onclick = close;
  box.querySelector('#prompt-ok').onclick = () => {
    const val = input.value.trim();
    close();
    if (val) callback(val);
  };
  input.onkeydown = (e) => {
    if (e.key === 'Enter') box.querySelector('#prompt-ok').click();
    if (e.key === 'Escape') close();
  };
}

// ================= Quick Launch =================
function renderQuickLaunch() {
  const taskbar = $('taskbar');
  const inicio = $('inicio');
  if (!taskbar || !inicio) return;

  let ql = document.getElementById('quicklaunch');
  if (!ql) {
    ql = document.createElement('div');
    ql.id = 'quicklaunch';
    inicio.parentNode.insertBefore(ql, inicio.nextSibling);
  }

  ql.innerHTML = '';
  pinnedApps.forEach(appId => {
    const app = registro.get(appId);
    if (!app) return;
    const btn = document.createElement('button');
    btn.className = 'quick-btn';
    btn.title = app.titulo;
    btn.innerHTML = `<i data-lucide="${esc(app.icono || 'app-window')}"></i>`;
    btn.onclick = () => abrir(appId);
    ql.appendChild(btn);
  });
  refrescarIconos();
}

async function togglePinned(appId) {
  const i = pinnedApps.indexOf(appId);
  if (i > -1) pinnedApps.splice(i, 1);
  else pinnedApps.push(appId);
  await guardarPinned();
  renderQuickLaunch();
  window.MyHub.toast(pinnedApps.includes(appId) ? 'Fijado a la barra' : 'Quitado de la barra');
}

// ================= Status Pill =================
function setupStatusPill() {
  const clock = $('clock');
  if (!clock || document.getElementById('status-pill')) return;

  const pill = document.createElement('div');
  pill.id = 'status-pill';
  pill.className = 'status-pill';

  clock.parentNode.insertBefore(pill, clock);
  pill.appendChild(clock);

  const batteryEl = document.createElement('div');
  batteryEl.className = 'status-item battery';
  pill.insertBefore(batteryEl, clock);

  const updateBattery = (battery) => {
    if (!battery) {
      batteryEl.innerHTML = `<i data-lucide="battery"></i>`;
      refrescarIconos(); return;
    }
    const level = Math.round(battery.level * 100);
    const charging = battery.charging;

    let icon = 'battery';
    if (charging) icon = 'battery-charging';
    else if (level >= 90) icon = 'battery-full';
    else if (level >= 60) icon = 'battery-medium';
    else if (level >= 30) icon = 'battery-low';
    else icon = 'battery-warning';

    batteryEl.innerHTML = `<i data-lucide="${icon}"></i><span>${level}%</span>`;
    refrescarIconos();

    if (level <= 20 && !charging) batteryEl.classList.add('low');
    else batteryEl.classList.remove('low');
  };

  if (navigator.getBattery) {
    navigator.getBattery().then(battery => {
      updateBattery(battery);
      battery.addEventListener('levelchange', () => updateBattery(battery));
      battery.addEventListener('chargingchange', () => updateBattery(battery));
    }).catch(() => { batteryEl.style.display = 'none'; });
  } else {
    batteryEl.style.display = 'none';
  }

  const dateEl = document.createElement('div');
  dateEl.className = 'status-item date';
  pill.insertBefore(dateEl, clock);

  const updateDate = () => {
    const now = new Date();
    const wd = now.toLocaleDateString('es', { weekday: 'short' });
    const day = now.getDate();
    const mo = now.toLocaleDateString('es', { month: 'short' });
    dateEl.innerHTML = `<i data-lucide="calendar"></i><span>${wd} ${day} ${mo}`.replace(/\./g, '') + '</span>';
    refrescarIconos();
  };
  updateDate();
  setInterval(updateDate, 60000);
}

// ================= Menús contextuales =================
// FIX: soporte para `danger` (rojo) y `locked` (deshabilitado)
function mostrarContexto(x, y, items) {
  cerrarContexto();
  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position:fixed;inset:0;z-index:499;';
  backdrop.addEventListener('pointerdown', () => cerrarContexto());

  ctxMenu = document.createElement('div');
  ctxMenu.style.cssText = `
    position: fixed;
    left: ${Math.min(x, window.innerWidth - 220)}px;
    top: ${Math.min(y, window.innerHeight - 60 - items.length * 36)}px;
    background: var(--glass, rgba(255,255,255,0.95));
    backdrop-filter: blur(20px);
    border: 1.5px solid var(--accent-line, #ccc);
    border-radius: 10px;
    padding: 6px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    z-index: 500;
    min-width: 190px;
    color: var(--text, #000);
    display: flex;
    flex-direction: column;
  `;

  items.forEach(item => {
    if (item.separator) {
      const hr = document.createElement('hr');
      hr.style.cssText = 'border:none;border-top:1px solid var(--line, #eee);margin:4px 2px;';
      ctxMenu.appendChild(hr);
      return;
    }
    const b = document.createElement('button');
    b.style.cssText = `
      display: flex; align-items: center; gap: 10px;
      width: 100%; padding: 9px 12px; border: none; border-radius: 7px;
      background: transparent; color: ${item.danger ? 'var(--danger, #ef4444)' : 'inherit'};
      font: inherit; font-size: 13px; font-weight: 500;
      cursor: ${item.locked ? 'not-allowed' : 'pointer'}; text-align: left;
      transition: background 0.15s, color 0.15s;
      ${item.locked ? 'opacity: 0.6;' : ''}
    `;
    b.onmouseover = () => {
      if (item.locked) return;
      b.style.background = item.danger ? 'var(--danger, #ef4444)' : 'var(--accent, #2563eb)';
      b.style.color = '#fff';
    };
    b.onmouseout = () => {
      b.style.background = 'transparent';
      b.style.color = item.danger ? 'var(--danger, #ef4444)' : 'inherit';
    };

    b.innerHTML = `<i data-lucide="${item.icon || 'circle'}"></i><span>${esc(item.text)}</span>`;
    b.onclick = () => { cerrarContexto(); item.fn(); };
    ctxMenu.appendChild(b);
  });

  document.body.appendChild(backdrop);
  document.body.appendChild(ctxMenu);
  ctxMenu._backdrop = backdrop;
  refrescarIconos();
}

function cerrarContexto() {
  if (ctxMenu) {
    if (ctxMenu._backdrop) ctxMenu._backdrop.remove();
    ctxMenu.remove();
    ctxMenu = null;
  }
}

// FIX: Restaurado "Eliminar App" (con modal de confirmación) + "App de Sistema" bloqueada
function contextoApp(e, appId) {
  e.preventDefault();
  const app = registro.get(appId);
  if (!app) return;
  const pinned = pinnedApps.includes(appId);
  const esSistema = ['papelera', 'forge', 'storhe', 'cmdhe'].includes(appId) || !!app.url;

  const items = [
    { icon: 'play', text: 'Abrir', fn: () => abrir(appId) },
    { separator: true },
    { icon: pinned ? 'pin-off' : 'pin', text: pinned ? 'Quitar de la barra' : 'Fijar a la barra', fn: () => togglePinned(appId) },
    { icon: 'folder-plus', text: 'Nueva carpeta con esta app', fn: () => {
      promptCarpeta('Nueva carpeta con esta app', 'Nueva carpeta', (nombre) => crearCarpeta(nombre, [appId]));
    }}
  ];

  if (Object.keys(carpetas).length > 0) {
    items.push({ separator: true });
    Object.values(carpetas).forEach(f => {
      if (f.apps.includes(appId)) return;
      items.push({ icon: 'folder', text: `Mover a: ${f.nombre}`, fn: () => moverAppACarpeta(appId, f.id) });
    });
  }

  items.push({ separator: true });
  if (esSistema) {
    items.push({
      icon: 'lock',
      text: 'App de Sistema',
      locked: true,
      fn: () => toast('Las apps base no se pueden borrar desde aquí. Usa CMD-HE.')
    });
  } else {
    items.push({
      icon: 'trash-2',
      text: 'Eliminar App',
      danger: true,
      fn: async () => {
        const ok = await showConfirm('Eliminar Aplicación', `¿Estás seguro que deseas eliminar "${app.titulo}" del sistema?`);
        if (ok) {
          await eliminarApp(appId);
          toast('App eliminada');
        }
      }
    });
  }

  mostrarContexto(e.clientX, e.clientY, items);
}

function contextoDesktop(e) {
  if (e.target.closest('.icon') || e.target.closest('.win') || e.target.closest('.menu') || e.target.closest('#taskbar') || e.target.closest('.widget-container')) return;
  e.preventDefault();
  mostrarContexto(e.clientX, e.clientY, [
    { icon: 'folder-plus', text: 'Nueva carpeta', fn: () => {
      promptCarpeta('Nueva carpeta', 'Nueva carpeta', (nombre) => crearCarpeta(nombre));
    }},
    { separator: true },
    { icon: 'layout-grid', text: 'Gestión de Widgets', fn: () => {
      if (window.abrirPanelWidgets) window.abrirPanelWidgets();
      else toast('Los widgets aún se están cargando...');
    }}
  ]);
}

function contextoCarpeta(e, folderId) {
  e.preventDefault();
  const folder = carpetas[folderId];
  if (!folder) return;
  mostrarContexto(e.clientX, e.clientY, [
    { icon: 'folder-open', text: 'Abrir', fn: () => abrirCarpeta(folderId) },
    { separator: true },
    { icon: 'pencil', text: 'Renombrar', fn: () => {
      promptCarpeta('Renombrar carpeta', folder.nombre, (nuevo) => {
        if (nuevo && nuevo.trim()) {
          folder.nombre = nuevo.trim();
          guardarCarpetas();
          renderIconos();
        }
      });
    }},
    { icon: 'folder-minus', text: 'Vaciar (sacar todas las apps)', fn: async () => {
      folder.apps.forEach(a => { delete posicionesIconos[a]; });
      folder.apps = [];
      await guardarCarpetas();
      await kvSet('posiciones_iconos', posicionesIconos);
      renderIconos();
      window.MyHub.toast('Carpeta vaciada');
    }},
    { icon: 'trash-2', text: 'Eliminar carpeta', danger: true, fn: async () => {
      const ok = await showConfirm('Eliminar carpeta', '¿Eliminar esta carpeta? Las apps volverán al escritorio.');
      if (ok) eliminarCarpeta(folderId, false);
    }}
  ]);
}

// ================= Menú: opción Nueva carpeta =================
function setupMenuOption() {
  const menuOps = $('menuOps');
  if (!menuOps) return;

  const injectButton = () => {
    if (document.getElementById('menu-nueva-carpeta')) return;
    const docBtn = Array.from(menuOps.children).find(el => el.textContent.includes('DocApps'));
    if (!docBtn) return;

    const btn = document.createElement('button');
    btn.id = 'menu-nueva-carpeta';
    btn.className = 'menu-op';
    btn.innerHTML = `<i data-lucide="folder-plus"></i><span>Nueva carpeta</span>`;
    btn.onclick = (e) => {
      e.stopPropagation();
      const menuEl = $('menu');
      if (menuEl) menuEl.classList.add('hidden');
      promptCarpeta('Nueva carpeta', 'Nueva carpeta', (nombre) => crearCarpeta(nombre));
    };
    menuOps.insertBefore(btn, docBtn.nextSibling);
    refrescarIconos();
  };

  injectButton();
  const observer = new MutationObserver(injectButton);
  observer.observe(menuOps, { childList: true });
}

// ================= Editar perfil =================
function setupEditProfile() {
  const mTitulo = $('mTitulo');
  const mBody = $('mBody');
  if (!modal || !mBody) return;

  const observer = new MutationObserver(() => {
    if (mTitulo.textContent === 'Mi cuenta' && !document.getElementById('btn-editar-perfil')) {
      const perfilDiv = mBody.querySelector('.perfil');
      if (perfilDiv) {
        const editBtn = document.createElement('button');
        editBtn.id = 'btn-editar-perfil';
        editBtn.className = 'btn btn-bloque';
        editBtn.style.marginBottom = '8px';
        editBtn.innerHTML = '<i data-lucide="pencil"></i> Editar perfil';
        editBtn.onclick = () => abrirFormularioEdicion();

        const salirBtn = perfilDiv.querySelector('.btn.red');
        if (salirBtn) perfilDiv.insertBefore(editBtn, salirBtn);
        else perfilDiv.appendChild(editBtn);

        refrescarIconos();
      }
    }
  });
  observer.observe(modal, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });

  async function abrirFormularioEdicion() {
    const cuenta = await kvGet('cuenta');
    if (!cuenta) return;

    mTitulo.textContent = 'Editar perfil';
    mBody.innerHTML = '';

    const d = document.createElement('div');

    let optionsPaises = PAISES.map(([c, n]) => `<option value="${c}" ${cuenta.pais === c ? 'selected' : ''}>${esc(n)}</option>`).join('');
    let optionsGeneros = Object.entries(GENEROS).map(([v, t]) => `<option value="${v}" ${cuenta.genero === v ? 'selected' : ''}>${esc(t)}</option>`).join('');
    let optionsIdiomas = Object.entries(IDIOMAS).map(([c, n]) => `<option value="${c}" ${cuenta.idioma === c ? 'selected' : ''}>${esc(n)}</option>`).join('');

    d.innerHTML = `
      <div class="avatar-up">
        <div class="avatar" id="editFotoBox"></div>
        <div>
          <button class="btn gray" id="editFotoBtn"><i data-lucide="image-plus"></i>Cambiar foto</button>
          <input type="file" id="editFoto" accept="image/png,image/jpeg,image/webp" hidden>
        </div>
      </div>
      <div class="grid2">
        <label>Nombre<input type="text" id="editNombre" value="${esc(cuenta.nombre)}" maxlength="32"></label>
        <label>Apellido<input type="text" id="editApellido" value="${esc(cuenta.apellido || '')}" maxlength="48"></label>
      </div>
      <div class="grid2" style="margin-top:12px;">
        <label>Nacimiento<input type="date" id="editNacimiento" value="${cuenta.nacimiento}"></label>
        <label>Género<select id="editGenero">${optionsGeneros}</select></label>
      </div>
      <div class="grid2" style="margin-top: 12px;">
        <label>País<select id="editPais">${optionsPaises}</select></label>
        <label>Idioma<select id="editIdioma">${optionsIdiomas}</select></label>
      </div>
      <button class="btn btn-bloque" id="editGuardar" style="margin-top:16px;"><i data-lucide="check"></i>Guardar cambios</button>
    `;

    const editFotoBox = d.querySelector('#editFotoBox');
    if (cuenta.foto) {
      const img = document.createElement('img');
      const url = URL.createObjectURL(cuenta.foto);
      img.src = url; img.onload = () => URL.revokeObjectURL(url);
      editFotoBox.appendChild(img);
    } else {
      editFotoBox.innerHTML = '<i data-lucide="user-round"></i>';
    }

    let nuevaFotoBlob = cuenta.foto;
    const editFotoInput = d.querySelector('#editFoto');
    d.querySelector('#editFotoBtn').onclick = () => editFotoInput.click();

    editFotoInput.onchange = async () => {
      const f = editFotoInput.files[0]; if (!f) return;
      if (f.size > 5 * 1024 * 1024) return window.MyHub.toast('La foto debe pesar menos de 5 MB');

      const url = URL.createObjectURL(f);
      const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = url; });
      const lado = Math.min(img.width, img.height);
      const c = document.createElement('canvas'); c.width = c.height = 256;
      c.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 256, 256);
      URL.revokeObjectURL(url);

      nuevaFotoBlob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));

      const newUrl = URL.createObjectURL(nuevaFotoBlob);
      const newImg = document.createElement('img'); newImg.src = newUrl; newImg.onload = () => URL.revokeObjectURL(newUrl);
      editFotoBox.replaceChildren(newImg);
    };

    d.querySelector('#editGuardar').onclick = async () => {
      const nuevaCuenta = {
        ...cuenta,
        nombre: d.querySelector('#editNombre').value.trim(),
        apellido: d.querySelector('#editApellido').value.trim(),
        nacimiento: d.querySelector('#editNacimiento').value,
        genero: d.querySelector('#editGenero').value,
        pais: d.querySelector('#editPais').value,
        idioma: d.querySelector('#editIdioma').value,
        foto: nuevaFotoBlob
      };

      if (!nuevaCuenta.nombre) return window.MyHub.toast('El nombre no puede estar vacío');

      await kvSet('cuenta', nuevaCuenta);
      window.MyHub.toast('Perfil actualizado correctamente');
      setTimeout(() => window.location.reload(), 800);
    };

    mBody.appendChild(d);
    refrescarIconos();
  }
}

// ================= Soporte papelera =================
function setupEliminarApp() {
  if (!window.MyHub) return;

  window.MyHub.eliminarCarpetaLobby = function(folderId) {
    if (carpetas[folderId]) {
      delete carpetas[folderId];
      renderIconos();
      kvSet('posiciones_iconos', posicionesIconos);
    }
  };

  const origEliminarApp = window.MyHub.eliminarApp;
  if (origEliminarApp) {
    window.MyHub.eliminarApp = function(appId) {
      origEliminarApp.call(this, appId);

      let carpetasModificadas = false;
      let carpetasParaEliminar = [];

      Object.values(carpetas).forEach(folder => {
        const index = folder.apps.indexOf(appId);
        if (index > -1) {
          folder.apps.splice(index, 1);
          carpetasModificadas = true;
          if (folder.apps.length === 0) carpetasParaEliminar.push(folder.id);
        }
      });

      if (carpetasModificadas) {
        carpetasParaEliminar.forEach(id => delete carpetas[id]);
        guardarCarpetas();
        renderIconos();
      }
    };
  }
}

// ================= Ventanas (sistema de 3 columnas) =================
// Cada ventana ocupa 1 columna (normal) o 2 columnas contiguas (agrandada).
// Ninguna ventana puede solaparse con otra. Con una ventana agrandada solo
// queda 1 columna libre, así que el límite visible baja de 3 a 2 apps.
const win = {};            // id -> { el, span: 1|2, start: 0|1|2, cols: [..] }
const minimized = new Set();
let focused = null;

const colsDe = (start, span) => Array.from({ length: span }, (_, i) => start + i);

function rectCol(start, span) {
  const G = 18, W = desk.clientWidth, H = desk.clientHeight;
  const w = (W - G * 4) / 3;
  return {
    left: G + start * (w + G),
    top: G,
    width: span === 2 ? w * 2 + G : w,
    height: H - G * 2
  };
}

// Qué ventana (visible) ocupa cada columna
function ocupacion() {
  const occ = [null, null, null];
  for (const id in win) {
    if (minimized.has(id)) continue;
    win[id].cols.forEach(c => { occ[c] = id; });
  }
  return occ;
}

// Primer inicio con 'span' columnas libres, o -1
function bloqueLibre(span, occ) {
  const inicios = span === 2 ? [0, 1] : [0, 1, 2];
  for (const s of inicios) {
    if (colsDe(s, span).every(c => !occ[c])) return s;
  }
  return -1;
}

// Libera una ventana visible (la enfocada, o la primera visible) para abrir otra
function liberarUna(excepto = null) {
  let candidato = null;
  if (focused && focused !== excepto && win[focused] && !minimized.has(focused)) candidato = focused;
  if (!candidato) candidato = Object.keys(win).find(k => k !== excepto && !minimized.has(k)) || null;
  if (candidato) minimizar(candidato);
  return !!candidato;
}

function acomodar() {
  for (const id in win) {
    const w = win[id];
    if (w.el.classList.contains('dragging') || minimized.has(id)) continue;
    const r = rectCol(w.start, w.span);
    Object.assign(w.el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  }
}

async function prepararAppInstalada(app) {
  const archivos = app.archivos;
  const dataUrls = {};

  for (const [nombre, fileBlob] of Object.entries(archivos)) {
    const blob = fileBlob instanceof Blob ? fileBlob : new Blob([fileBlob]);
    dataUrls[nombre] = await aDataURL(blob);
  }

  const mainFile = app.manifest.main || 'index.html';
  const mainBlob = archivos[mainFile];

  if (!mainBlob) {
    console.error('No se encontró el archivo principal:', mainFile);
    return null;
  }

  const blobToUse = mainBlob instanceof Blob ? mainBlob : new Blob([mainBlob]);
  let htmlText = await blobToUse.text();

  const regex = /(href|src)=["']([^"']+)["']/g;

  htmlText = htmlText.replace(regex, (match, attribute, path) => {
    const cleanPath = path.replace(/^\.\//, '').replace(/^\//, '');
    if (dataUrls[cleanPath]) {
      return `${attribute}="${dataUrls[cleanPath]}"`;
    }
    return match;
  });

  return htmlText;
}

async function abrir(id) {
  if (!sesionActiva) { toast('Inicia sesión para usar las apps'); return; }

  if (win[id]) {
    if (minimized.has(id)) restaurar(id);
    else enfocar(id);
    return;
  }

  if (Object.keys(win).length >= 6) {
    toast('Máximo 6 apps abiertas. Cierra una primero.');
    return;
  }

  const app = registro.get(id); if (!app) return;

  let start = bloqueLibre(1, ocupacion());
  if (start === -1 && liberarUna()) start = bloqueLibre(1, ocupacion());
  if (start === -1) return;

  const el = document.createElement('div'); el.className = 'win';
  el.innerHTML = `
    <div class="titlebar">
      <span></span>
      <button class="close minimize" aria-label="Minimizar" title="Minimizar"><i data-lucide="minus"></i></button>
      <button class="close" aria-label="Cerrar" title="Cerrar" style="margin-left: 0;"><i data-lucide="x"></i></button>
    </div>
    <div class="body"></div>`;

  el.querySelector('.titlebar span').textContent = app.titulo;
  desk.appendChild(el);

  win[id] = { el, span: 1, start, cols: colsDe(start, 1) };

  el.querySelector('.minimize').onclick = (e) => { e.stopPropagation(); minimizar(id); };
  el.querySelector('.close:not(.minimize)').onclick = () => cerrar(id);

  el.querySelector('.titlebar').addEventListener('pointerdown', e => {
    if (e.target.closest('.close')) return;
    arrastrar(e, id);
  });
  el.addEventListener('pointerdown', () => enfocar(id));

  acomodar(); enfocar(id); refrescarIconos();

  if (app.url) {
    el.querySelector('.body').className = 'body app';
    const iframe = document.createElement('iframe');
    iframe.className = 'appframe';
    iframe.src = app.url;
    el.querySelector('.body').replaceChildren(iframe);
    refrescarIconos();
    return;
  }

  if (app.instalada) {
    el.querySelector('.body').className = 'body app';
    const iframe = document.createElement('iframe');
    iframe.className = 'appframe';

    const htmlVirtual = await prepararAppInstalada(app);
    if (htmlVirtual) {
      iframe.srcdoc = htmlVirtual;
      el.querySelector('.body').replaceChildren(iframe);
    } else {
      el.querySelector('.body').innerHTML = '<div class="empty" style="padding:24px;text-align:center;">Error al leer los archivos de la app.</div>';
    }
    refrescarIconos();
    return;
  }

  try {
    const contenido = await app.contenido(el);
    if (win[id]) el.querySelector('.body').replaceChildren(contenido);
  } catch (err) {
    console.error('Error al abrir la app', id, err);
    if (win[id]) el.querySelector('.body').innerHTML = '<div class="empty" style="padding:24px;text-align:center;">No se pudo cargar la app.</div>';
  }
  refrescarIconos();
}

function cerrar(id) {
  const w = win[id]; if (!w) return;
  minimized.delete(id);
  w.el.remove();
  delete win[id];

  if (focused === id) {
    focused = null;
    const remaining = Object.keys(win).filter(k => !minimized.has(k));
    if (remaining.length > 0) enfocar(remaining[0]);
  }
  acomodar(); renderTareas();
}

function minimizar(id) {
  const w = win[id]; if (!w || minimized.has(id)) return;
  minimized.add(id);
  w.el.style.display = 'none';

  if (focused === id) {
    focused = null;
    const remaining = Object.keys(win).filter(k => !minimized.has(k));
    if (remaining.length > 0) enfocar(remaining[0]);
  }
  acomodar(); renderTareas();
}

function restaurar(id) {
  const w = win[id]; if (!w || !minimized.has(id)) return;

  let start = bloqueLibre(w.span, ocupacion());
  if (start === -1 && liberarUna(id)) start = bloqueLibre(w.span, ocupacion());
  if (start === -1) { toast('No hay espacio para restaurar esta app'); return; }

  minimized.delete(id);
  w.start = start;
  w.cols = colsDe(start, w.span);
  w.el.style.display = '';
  acomodar(); enfocar(id);
}

function enfocar(id) {
  if (!win[id]) return; focused = id;
  for (const x in win) {
    win[x].el.style.zIndex = x === id ? 5 : 1;
    win[x].el.classList.toggle('focused', x === id);
  }
  renderTareas();
}

// ================= Agrandar / contraer =================
// Agrandar ocupa la columna actual y una vecina libre (prefiere mantener su posición).
function alternarExpansion(id) {
  const w = win[id];
  if (!w || minimized.has(id)) return false;

  if (w.span === 2) {
    w.span = 1;
    w.cols = colsDe(w.start, 1);
    acomodar();
    return true;
  }

  const occ = ocupacion();
  const candidatos = [0, 1].filter(s => colsDe(s, 2).every(c => !occ[c] || occ[c] === id));
  if (candidatos.length === 0) { toast('No hay espacio libre al lado para agrandar'); return false; }
  candidatos.sort((a, b) => Math.abs(a - w.start) - Math.abs(b - w.start));

  w.start = candidatos[0];
  w.span = 2;
  w.cols = colsDe(w.start, 2);
  acomodar(); enfocar(id);
  return true;
}

function estaExpandida(id) {
  return !!win[id] && win[id].span === 2;
}

// ICON-ONLY TASKBAR
function renderTareas() {
  const c = $('tasks'); c.innerHTML = '';
  for (const id of Object.keys(win)) {
    const app = registro.get(id);
    const t = document.createElement('div');
    const isMin = minimized.has(id);
    t.className = 'task' + (focused === id && !isMin ? ' active' : '') + (isMin ? ' minimized' : '');
    t.title = app.titulo;
    t.innerHTML = `<i data-lucide="${app.icono || 'app-window'}"></i>`;
    t.onclick = () => {
      if (isMin) restaurar(id);
      else enfocar(id);
    };
    c.appendChild(t);
  }
  refrescarIconos();
}

// ================= Arrastre entre columnas =================
function arrastrar(e, id) {
  if (e.target.closest('.close')) return;
  const w = win[id];
  const dr = desk.getBoundingClientRect(); const wr = w.el.getBoundingClientRect();
  const ox = e.clientX - wr.left, oy = e.clientY - wr.top;

  w.el.classList.add('dragging'); enfocar(id);
  const mover = ev => {
    w.el.style.left = (ev.clientX - dr.left - ox) + 'px';
    w.el.style.top = (ev.clientY - dr.top - oy) + 'px';
  };
  const soltar = ev => {
    window.removeEventListener('pointermove', mover);
    window.removeEventListener('pointerup', soltar);
    w.el.classList.remove('dragging');
    soltarEn(id, ev.clientX - dr.left, dr.width);
  };
  window.addEventListener('pointermove', mover);
  window.addEventListener('pointerup', soltar);
}

// Columna de destino según dónde se suelta
function inicioDestino(span, relX, anchoDesk) {
  if (span === 2) return relX < anchoDesk / 2 ? 0 : 1;
  return Math.min(2, Math.max(0, Math.floor(relX / (anchoDesk / 3))));
}

// Suelta la ventana en su destino. Si el destino tiene otras ventanas, se
// reubican en el espacio que deja libre la ventana arrastrada (como un swap).
// Si no caben, se rechaza el movimiento: nunca se solapan.
function soltarEn(id, relX, anchoDesk) {
  const w = win[id]; if (!w) return;

  const destino = inicioDestino(w.span, relX, anchoDesk);
  const colsDestino = colsDe(destino, w.span);

  const otros = Object.keys(win).filter(k => k !== id && !minimized.has(k));
  const afectados = otros.filter(k => win[k].cols.some(c => colsDestino.includes(c)));
  const fijos = otros.filter(k => !afectados.includes(k));

  // Columnas que quedan disponibles para reubicar a los afectados
  let disponibles = [0, 1, 2].filter(c =>
    !colsDestino.includes(c) && !fijos.some(k => win[k].cols.includes(c)));

  const reubicar = [];
  for (const k of afectados) {
    const sp = win[k].span;
    const cand = (sp === 2 ? [0, 1] : [0, 1, 2]).find(s => colsDe(s, sp).every(c => disponibles.includes(c)));
    if (cand === undefined) {
      toast('Ese espacio está ocupado y no hay lugar para la otra app');
      acomodar();
      return;
    }
    reubicar.push([k, cand]);
    colsDe(cand, sp).forEach(c => { disponibles = disponibles.filter(x => x !== c); });
  }

  w.start = destino;
  w.cols = colsDestino;
  reubicar.forEach(([k, s]) => {
    win[k].start = s;
    win[k].cols = colsDe(s, win[k].span);
  });
  acomodar(); enfocar(id);
}

window.descargarDocApps = function() {
  const doc = `
==================================================
MYHUBHESTUDIO - GUÍA DEFINITIVA DE DESARROLLO
Versión 2.1 - Edición "ADN VicHeStudios"
==================================================

Bienvenido al entorno de desarrollo de MyHubHestudio.
Has creado el Web OS definitivo para la productividad y la rapidez.

Esta guía es diferente a las anteriores: no solo te dice QUÉ puedes
hacer, también te dice CÓMO lo hacen las apps oficiales. Ese conjunto
de patrones repetidos en TODAS las apps del sistema es lo que
llamamos el "ADN VicHeStudios". Si tu app lo cumple, se verá y
sentirá nativa. Si no, se notará "pegada con cinta adhesiva".

Léela una vez. Vuelve a la sección 4 y 9 cada vez que empieces una app.

--------------------------------------------------
1. FORMAS DE CREAR UNA APP
--------------------------------------------------
Existen 3 formas principales de integrar una app:

A) APP INSTANTÁNEA (JavaScript puro):
Ideal para apps rápidas que no necesitan un archivo HTML propio.
window.MyHub.registrarApp({
  id: 'mi-app',             // Identificador único
  titulo: 'Mi App',         // Nombre visible
  icono: 'layout',          // Icono de Lucide (https://lucide.dev/)
  contenido: (el) => {      // Función que retorna el HTML o nodo de la app
    const div = document.createElement('div');
    div.innerHTML = '<h1>Hola mundo</h1>';
    return div;
  }
});

B) APP LOCAL (Archivo HTML físico):
Ideal si tienes una carpeta con tu app. Se carga mediante un iframe.
window.MyHub.registrarApp({
  id: 'mi-app-local',
  titulo: 'Mi App Local',
  icono: 'folder',
  url: 'Apps/MiApp/index.html' // Ruta relativa desde Lobby.html
});

C) APP INSTALABLE (Archivo ZIP) - RECOMENDADO PARA DISTRIBUIR:
El usuario la instala usando "Forge" o "Stor-He".
Esta guía se enfoca en este formato porque es el único que garantiza
que tu app sobreviva a cualquier cambio del sistema.

--------------------------------------------------
2. REGLA DE ORO: 1 SOLO ARCHIVO HTML + MANIFEST
--------------------------------------------------
¡ATENCIÓN! Para garantizar que tu app cargue de forma instantánea y sin
errores de rutas (Error 404) dentro del sistema, la app instalable
DEBE constar únicamente de 2 archivos:

MiApp.zip
 ┣ 📜 manifest.json  (Obligatorio)
 ┗ 📜 index.html     (Obligatorio, contiene TODO el HTML, CSS y JS)

NO uses archivos separados como style.css, app.js o carpetas de imágenes.
En su lugar, integra todo dentro del index.html usando las etiquetas
<style> para el diseño y <script> para la lógica.

--- ¿Y si necesito imágenes o assets? ---
Embébelos como Data URLs (Base64) directamente dentro del HTML:
  <img src="data:image/png;base64,..." alt="">
O mejor aún, usa SVG inline (más liviano y escalable):
  <svg viewBox="0 0 24 24" ...>...</svg>

--- ¿Y si necesito guardar archivos pesados del usuario? ---
NO uses localStorage para binarios grandes (>1MB). Usá IndexedDB
(ver sección 8: ALMACENAMIENTO).

--- EL MANIFEST.JSON EXPLICADO ---
{
  "id": "mi-app",             // (Obligatorio) ID único, sin espacios ni mayúsculas.
  "titulo": "Mi App",         // (Obligatorio) Nombre visible bajo el icono.
  "icono": "sparkles",        // (Obligatorio) Nombre del icono de Lucide.
  "main": "index.html",       // (Obligatorio) Archivo HTML principal.

  // --- CAMPOS OPCIONALES (Mejoran la vista en Stor-He) ---
  "autor": "VicHeStudios",    // (Opcional) Creador de la app.
  "descripcion": "Una app."   // (Opcional) Breve descripción, sin punto final.
}

--------------------------------------------------
3. LAYOUT: 3 VENTANAS FIJAS
--------------------------------------------------
MyHubHestudio usa un sistema de 3 ventanas fijas (Izquierda, Centro, Derecha).
Tu app NO ocupará toda la pantalla, sino 1/3 de ella.

- Resolución aproximada: En 1920x1080, tu app tendrá ~600px de ancho.
- Máximo 6 apps abiertas simultáneamente (3 visibles + 3 minimizadas).
- Tu HTML y CSS DEBEN ser responsivos. Regla obligatoria en body:
  html, body { height: 100vh; width: 100%; margin: 0; overflow: hidden; }
- Si tu app tiene muchos elementos, usa overflow-y: auto en el contenedor
  interno (nunca en el body completo, salvo excepciones justificadas).

--------------------------------------------------
4. ⭐ ADN VICHeSTUDIOS (LO QUE HACE QUE UNA APP SEA "OFICIAL")
--------------------------------------------------
Esta sección es el corazón de la guía. Todo lo que aparece aquí se
repite en TODAS las apps oficiales del sistema. Cópialo tal cual.

4.1 VARIABLES CSS OBLIGATORIAS
Todo el color de tu app debe salir de estas variables. Nunca uses
hex codes sueltos (salvo en la paleta de colores fija de la sección 5).

:root {
  --accent: #2563eb;                /* Azul identidad VicHeStudios */
  --accent-soft: rgba(37, 99, 235, 0.15);
  --text: #0b1220;
  --muted: #64748b;
  --line: rgba(15, 23, 42, 0.08);
  --card: #ffffff;
  --field: #f6f8fb;                 /* Inputs, áreas de texto, fondos secundarios */
  --danger: #ef4444;                /* Errores, borrar, cerrar */
}

4.2 MODO OSCURO
MyHub inyecta data-modo="oscuro" al <html>. Tú solo defines las
variables oscuras. NO uses preferencias del sistema (prefers-color-scheme).

html[data-modo="oscuro"] {
  --text: #f4f4f6;
  --muted: #9ea1aa;
  --line: rgba(255, 255, 255, 0.09);
  --card: #222227;
  --field: #2a2a31;
}

4.3 RESET Y TIPOGRAFÍA
* { box-sizing: border-box; }
body {
  margin: 0; height: 100vh; display: flex; flex-direction: column;
  font-family: 'Segoe UI Variable', system-ui, sans-serif;
  background: var(--card); color: var(--text);
  overflow: hidden;
}

4.4 BOTÓN PRIMARIO (regla universal)
Fondo var(--accent), texto blanco, radius 8px, font-weight 600,
hover con filter: brightness(1.1). Sin excepciones.

.btn-primary {
  background: var(--accent); color: #fff; border: none;
  padding: 8px 14px; border-radius: 8px;
  font-family: inherit; font-weight: 600; font-size: 13px;
  cursor: pointer; transition: 0.2s;
}
.btn-primary:hover { filter: brightness(1.1); }

4.5 BOTÓN SECUNDARIO
Fondo var(--field), borde var(--line), texto var(--text).
Se usa para acciones no destructivas.

.btn-secondary {
  background: var(--field); color: var(--text);
  border: 1px solid var(--line); padding: 8px 14px;
  border-radius: 8px; font-family: inherit;
  font-weight: 600; font-size: 13px;
  cursor: pointer; transition: 0.2s;
}

4.6 INPUT ESTÁNDAR (radius 10px)
Todos los inputs, selects y textareas comparten estos estilos.
En focus: borde var(--accent). Sin excepciones.

.input {
  padding: 10px 12px; border-radius: 10px;
  border: 1.5px solid var(--line);
  background: var(--field); color: var(--text);
  font-family: inherit; font-size: 13px; outline: none;
  transition: border-color 0.2s;
}
.input:focus { border-color: var(--accent); }

4.7 HEADER ESTÁNDAR
Borde inferior var(--line), padding 12px 16px, flex space-between,
background var(--card). Se repite en el 100% de las apps oficiales.

.header {
  padding: 12px 16px; border-bottom: 1px solid var(--line);
  background: var(--card); flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
}

4.8 FOOTER CREDIT
Toda app oficial cierra con un crédito. Dos formatos válidos:

  A) "Hecho con ❤️ por VicHeStudios" (uso general)
  B) "Usa [Librería] por [Autor]" (cuando se apoya en una librería externa)

.app-credit {
  text-align: center; font-size: 11px; color: var(--muted);
  padding: 8px; border-top: 1px solid var(--line);
  background: var(--card); flex-shrink: 0;
}
.app-credit a { color: var(--accent); text-decoration: none; font-weight: 600; }

4.9 SCROLLBAR PERSONALIZADA (6px)
En todas las apps oficiales. En móvil se ignora, pero en desktop
es parte del "feel" del sistema.

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: var(--line); border-radius: 4px; }

4.10 MODALES (opcional pero recomendado)
Si tu app usa modales, este es el patrón oficial:
Overlay rgba(0,0,0,0.5) + backdrop-filter: blur(4px),
caja con background var(--card), radius 16px, borde var(--line).

4.11 ICONOS
Usa Lucide. Dos formas válidas:
  A) <script src="../../vendor/lucide.min.js"></script> + <i data-lucide="nombre">
  B) SVG inline con stroke="currentColor" stroke-width="2"

--------------------------------------------------
5. PALETA DE COLORES OFICIAL
--------------------------------------------------
El sistema permite personalizar el color de acento. Estos son los
colores disponibles en el modal de Configuración:

  Azul       #2563eb  (por defecto)
  Celeste    #0ea5e9
  Rojo       #dc2626
  Verde      #16a34a
  Morado     #7c3aed
  Amarillo   #ca8a04
  Rosado     #ec4899
  Café       #8b4513

Tu app NO necesita hardcodear ninguno de estos colores: usa siempre
var(--accent) y se actualizará automáticamente cuando el usuario
cambie el color del sistema.

Si tu app ofrece al usuario ELEGIR un color (como Pint-He), entonces
sí podés incluir la paleta completa como opciones fijas. Pero para
la UI de tu app (botones, headers, etc.), usá siempre var(--accent).

--------------------------------------------------
6. SINCRONIZACIÓN DE TEMA CON EL LOBBY (OBLIGATORIO)
--------------------------------------------------
Toda app instalable DEBE escuchar el tema del sistema. Sin esto,
tu app se queda con los colores por defecto y rompe la armonía
visual del escritorio.

Pega esto al inicio de tu <script>, sin excepciones:

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'myhub:get-tema' }, '*');
  }
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'myhub:tema:res') {
      document.documentElement.dataset.modo = e.data.modo;
      document.documentElement.style.setProperty('--accent', e.data.color);
      document.documentElement.style.setProperty('--accent-soft', e.data.color + '26');
    }
  });

Nota: '26' es la opacidad en hex (~15%). Es el estándar oficial para
--accent-soft. Si tu app no usa --accent-soft, puedes omitir esa línea.

El mensaje "myhub:tema:res" devuelve:
  { type: 'myhub:tema:res', color: '#2563eb', modo: 'claro' | 'oscuro' }

--------------------------------------------------
7. CONVENCIONES DE NOMENCLATURA
--------------------------------------------------
El sufijo/prefijo "He" es una RECOMENDACIÓN, no una obligación.
Las apps oficiales lo siguen, las apps externas son libres de
nombrarse como quieran.

--- ID en manifest.json ---
Formato recomendado: [nombre]-he (sufijo) o he-[nombre] (prefijo)
  ✅ calcul-he, clim-he, qr-he
  ✅ he-nteligens, he-ptune, he-vento
  ✅ ocplaylist, mi-app, cualquier-cosa   (apps externas)
  ❌ MiApp, CALC, con espacios            (nunca, sin importar autor)

--- Título visible ---
Formato recomendado: Capitalizado, con guion si aplica
  ✅ Calcul-He, Clim-He, He-nteligens, OcPlaylist
  ❌ calculadora, MiApp

--- Icono Lucide ---
Nombre exacto de la librería (sin "icon-", sin guiones bajos)
  ✅ calculator, cloud-sun, key-round, qr-code
  ❌ Calculator, cloud_sun

--- Autor (opcional) ---
  ✅ VicHeStudios (el nombre oficial del estudio)
  ✅ Tu nombre de usuario si contribuyes desde fuera

Si sos contribuidor externo, sos libre de nombrar tu app como quieras.
Solo te pedimos que el ID sea único, sin espacios y en minúsculas.

--------------------------------------------------
8. ALMACENAMIENTO: localStorage vs IndexedDB
--------------------------------------------------
Elegir bien dónde guardar los datos es CRÍTICO. Un error común es
usar localStorage para todo, lo cual rompe apps después de cierto
volumen de datos.

--- localStorage (límite ~5MB por dominio) ---
Usalo SOLO para:
  ✅ Configuraciones pequeñas (preferencias, tema, tokens de API)
  ✅ Listas simples de IDs o strings cortos
  ✅ Estados de UI (chat activo, pestaña seleccionada)

NO lo uses para:
  ❌ Imágenes (Base64 ocupa 33% más que el binario original)
  ❌ Audio o video
  ❌ Archivos grandes del usuario

--- IndexedDB (límite cientos de MB, asíncrono) ---
Usalo para:
  ✅ Imágenes, audio, video (Blobs nativos, sin Base64)
  ✅ Archivos que sube el usuario
  ✅ Bases de datos estructuradas con muchos registros
  ✅ Cualquier cosa que pueda crecer con el uso

--- Ejemplo mínimo de IndexedDB ---
const dbP = new Promise((resolve) => {
  const req = indexedDB.open('mi-app-db', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('kv');
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

Referencia: Spoti-vic y Galería-He usan IndexedDB para archivos
binarios. HE-nteligens usa localStorage solo para configuración
(token, modelo, nombre). Usá esas apps como ejemplo según tu caso.

--------------------------------------------------
9. COMUNICACIÓN CON EL LOBBY (postMessage)
--------------------------------------------------
Tu app corre dentro de un iframe. Si necesitas datos del sistema,
usa window.parent.postMessage. Nunca uses window.top ni localStorage
del padre.

--- Obtener el Perfil del Usuario ---
window.parent.postMessage({ type: 'myhub:perfil' }, '*');
window.addEventListener('message', (e) => {
  if (e.data?.type === 'myhub:perfil:res') {
    console.log('Datos:', e.data.data);
    // { nombre, apellido, nacimiento, genero, pais, idioma, foto (Base64) }
  }
});

--- API Global Útil (window.MyHub.*) ---
window.MyHub.toast('Mensaje');          // Notificación flotante
window.MyHub.cerrar('mi-app');          // Cierra la ventana
window.MyHub.minimizar('mi-app');       // Minimiza la ventana
window.MyHub.restaurar('mi-app');       // Restaura la ventana
window.MyHub.isMinimized('mi-app');     // true/false
window.MyHub.abrir('otra-app');         // Abre otra app
window.MyHub.tema();                    // { color: '#2563eb', modo: 'claro' }
window.MyHub.sesion();                  // true/false (si hay sesión activa)

--- Identidad del usuario en apps sociales ---
Si tu app necesita identificar al usuario de forma persistente
(como HE-ptune o un chat), el lobby NO expone un ID único. Cada
app debe generar su propio device_id en localStorage:

  let deviceId = localStorage.getItem('mi-app_device_id');
  if (!deviceId) {
    deviceId = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    localStorage.setItem('mi-app_device_id', deviceId);
  }

Esto es válido para apps locales. Para apps con backend (como
HE-ptune con Supabase), combiná device_id + username + password
para que el usuario pueda recuperar su cuenta en otro dispositivo.

--------------------------------------------------
10. APPS DEL SISTEMA (referencia)
--------------------------------------------------
MyHubHestudio incluye estas apps oficiales que sirven como ejemplo
de implementación correcta del ADN:

  🗑️ Papelera     - CRUD de apps instaladas
  🛠️ Forge        - Instalación de ZIPs locales
  🛒 Stor-He      - Tienda conectada a GitHub
  🖥️ CMD-HE       - Terminal con acceso al kernel

Mirar el código fuente de estas apps (están en Apps/) es la mejor
forma de aprender los patrones oficiales. Cada una resuelve un caso
de uso diferente y todas siguen el mismo ADN.

--------------------------------------------------
11. APPS DEL CATÁLOGO OFICIAL (referencia por categoría)
--------------------------------------------------
Para ver patrones según el tipo de app, revisá:

  UTILIDADES:      Calcul-He, HE-loj, QR-He, Trans-He
  PRODUCTIVIDAD:   Not-He, He-To-Do, He-vento, Cod-He
  MULTIMEDIA:      Galeria-He, Spoti-vic, Pint-He, PDF-He
  INFORMACIÓN:     Clim-He, Map-He
  IA / REDES:      He-nteligens, HE-ptune
  JUEGOS:          Ajedr-He
  SEGURIDAD:       Pass-He

Cada una demuestra un patrón distinto: manejo de audio, canvas,
IndexedDB, APIs externas, etc.

--------------------------------------------------
12. CHECKLIST ANTES DE EMPAQUETAR
--------------------------------------------------
Marca todas antes de generar el ZIP:

[ ] index.html contiene TODO el CSS y JS inline (nada externo)
[ ] manifest.json con id, titulo, icono, main (los 4 obligatorios)
[ ] Las variables :root y html[data-modo="oscuro"] están definidas
[ ] El bloque de postMessage myhub:get-tema está presente
[ ] body { height: 100vh; overflow: hidden; }
[ ] Header con border-bottom y padding estándar
[ ] Botones con radius 8px y font-weight 600
[ ] Inputs con radius 10px y focus var(--accent)
[ ] Footer .app-credit con "Hecho con ❤️ por VicHeStudios" (o tu autoría)
[ ] Scrollbar 6px estilizada (desktop)
[ ] Iconos Lucide o SVG inline (no emojis en el header)
[ ] Archivos pesados (>1MB) van en IndexedDB, no localStorage
[ ] Probado en modo claro Y oscuro
[ ] Probado en ventana estrecha (~600px de ancho)

--------------------------------------------------
13. PLANTILLA BASE COMPLETA (copiar y pegar)
--------------------------------------------------
Este es el esqueleto mínimo de una app oficial. Cópialo y empieza
a construir encima. Todo lo que está aquí es obligatorio.

--- index.html ---
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root {
    --accent: #2563eb;
    --accent-soft: rgba(37, 99, 235, 0.15);
    --text: #0b1220;
    --muted: #64748b;
    --line: rgba(15, 23, 42, 0.08);
    --card: #ffffff;
    --field: #f6f8fb;
    --danger: #ef4444;
  }
  html[data-modo="oscuro"] {
    --text: #f4f4f6;
    --muted: #9ea1aa;
    --line: rgba(255, 255, 255, 0.09);
    --card: #222227;
    --field: #2a2a31;
  }
  * { box-sizing: border-box; }
  html, body {
    height: 100vh; width: 100%; margin: 0; overflow: hidden;
  }
  body {
    display: flex; flex-direction: column;
    font-family: 'Segoe UI Variable', system-ui, sans-serif;
    background: var(--card); color: var(--text);
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-thumb { background: var(--line); border-radius: 4px; }

  .header {
    padding: 12px 16px; border-bottom: 1px solid var(--line);
    background: var(--card); flex-shrink: 0;
    display: flex; align-items: center; justify-content: space-between;
  }
  .header h1 { margin: 0; font-size: 16px; font-weight: 700; }

  .content {
    flex: 1; overflow-y: auto; padding: 16px;
    display: flex; flex-direction: column; gap: 12px;
  }

  .btn-primary {
    background: var(--accent); color: #fff; border: none;
    padding: 8px 14px; border-radius: 8px;
    font-family: inherit; font-weight: 600; font-size: 13px;
    cursor: pointer; transition: 0.2s;
  }
  .btn-primary:hover { filter: brightness(1.1); }

  .input {
    padding: 10px 12px; border-radius: 10px;
    border: 1.5px solid var(--line);
    background: var(--field); color: var(--text);
    font-family: inherit; font-size: 13px; outline: none;
    transition: border-color 0.2s;
  }
  .input:focus { border-color: var(--accent); }

  .app-credit {
    text-align: center; font-size: 11px; color: var(--muted);
    padding: 8px; border-top: 1px solid var(--line);
    background: var(--card); flex-shrink: 0;
  }
  .app-credit a { color: var(--accent); text-decoration: none; font-weight: 600; }
</style>
</head>
<body>

  <div class="header">
    <h1>Mi App</h1>
    <button class="btn-primary" id="btn-accion">Acción</button>
  </div>

  <div class="content">
    <input class="input" type="text" placeholder="Escribe algo...">
    <p>Contenido de la app aquí.</p>
  </div>

  <div class="app-credit">
    Hecho con ❤️ por VicHeStudios
  </div>

<script>
  // 1. Sincronización de tema (OBLIGATORIO)
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'myhub:get-tema' }, '*');
  }
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'myhub:tema:res') {
      document.documentElement.dataset.modo = e.data.modo;
      document.documentElement.style.setProperty('--accent', e.data.color);
      document.documentElement.style.setProperty('--accent-soft', e.data.color + '26');
    }
  });

  // 2. Lógica de la app
  document.getElementById('btn-accion').onclick = () => {
    if (window.MyHub) window.MyHub.toast('¡Funciona!');
    else alert('¡Funciona!');
  };
</script>
</body>
</html>

--- manifest.json ---
{
  "id": "mi-app",
  "titulo": "Mi App",
  "icono": "sparkles",
  "main": "index.html",
  "autor": "VicHeStudios",
  "descripcion": "Una app que hace cosas increíbles"
}

--------------------------------------------------
14. FILOSOFÍA
--------------------------------------------------
El objetivo no es que cada app se vea igual, sino que todas se
sientan parte del mismo sistema. Un usuario no debería notar dónde
termina el escritorio y dónde empieza tu app.

Cuando dudes entre dos opciones de diseño, pregúntate:
"¿Esto ya existe en alguna otra app del sistema?"
Si la respuesta es sí, úsalo igual. Si es no, pregúntate por qué.

Y si sos contribuidor externo: no te sientas obligado a seguir el
sufijo "He" ni a imitar cada detalle. Lo importante es que tu app
funcione bien, respete el tema del sistema y no rompa la experiencia.
El resto es estilo, y el estilo es tuyo.

==================================================
Hecho con amor para MyHubHestudio. ¡Feliz código!
==================================================
`;

  const blob = new Blob([doc], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'DocApps_MyHub.txt';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
};

window.descargarDocWidgets = function() {
  const doc = `
==================================================
MYHUBHESTUDIO - GUÍA DE WIDGETS
==================================================

Los widgets son pequeñas piezas de información que viven en el escritorio.
A diferencia de las apps, no se abren en ventanas, sino que se quedan fijas.

1. ¿CÓMO CREAR UN WIDGET?
Debes añadir una carpeta "Widgets" dentro de tu app (junto al index.html).
Dentro de esa carpeta, coloca un archivo .html o .js.

2. EL MANIFEST.JSON
Añade el array "widgets" a tu manifest para declararlos:
{
  "id": "clim-he",
  "titulo": "Clim-He",
  "icono": "cloud-sun",
  "main": "index.html",
  "widgets": [
    { "file": "Widgets/Clim-He.html", "size": "2x2" }
  ]
}
Tamaños permitidos: "1x1", "2x1", "2x2".

3. CREANDO EL WIDGET (HTML)
Puedes usar HTML, CSS y JS. El sistema inyectará automáticamente las variables
CSS (--accent, --text, etc.), el modo oscuro y la librería Lucide.

Ejemplo de Widget/Clim-He.html:
<div style="padding:20px; text-align:center;">
  <i data-lucide="cloud-sun" style="width:32px; height:32px;"></i>
  <h2 id="temp">--°C</h2>
  <p id="desc">Cargando clima...</p>
</div>
<script>
  // Tu lógica aquí
</script>

4. CREANDO EL WIDGET (JS)
Si usas un archivo .js, el sistema lo envolverá en un HTML básico.
Asegúrate de que tu JS inyecte elementos en el DOM (body).

5. CONSEJOS DE DISEÑO
- Usa colores transparentes o hereda las variables CSS.
- No pongas fondos sólidos (el sistema ya añade el efecto cristal).
- Sé conciso. Un widget no es una app completa.

==================================================
¡Feliz creación!
==================================================
`;
  const blob = new Blob([doc], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'DocWidgets.txt';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
};

// ================= Puente de comunicación =================
window.addEventListener('message', async e => {
  const m = e.data;
  if (!m || !e.source) return;
  const desdeApp = [...document.querySelectorAll('iframe')].some(f => f.contentWindow === e.source);
  if (!desdeApp) return;

  if (m.type === 'myhub:perfil') {
    const data = await perfil();
    e.source.postMessage({ type: 'myhub:perfil:res', id: m.id, data }, '*');
  }
  if (m.type === 'myhub:get-tema') {
    e.source.postMessage({
      type: 'myhub:tema:res',
      color: COLORES[ajustes.color] || COLORES.azul,
      modo: ajustes.modo
    }, '*');
  }
});

window.MyHub = {
  registrarApp, eliminarApp, abrir, cerrar, minimizar, restaurar, isMinimized: (id) => minimized.has(id),
  alternarExpansion, estaExpandida,
  toast, perfil, sesion: () => sesionActiva,
  tema: () => ({ color: COLORES[ajustes.color] || COLORES.azul, modo: ajustes.modo })
};

// ================= Arranque =================
window.addEventListener('resize', acomodar);
function reloj() { $('clock').textContent = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); }
reloj(); setInterval(reloj, 15000);

(async () => {
  const [a, c, s, pos, appsInst, carpetasData, pinnedData] = await Promise.all([
    kvGet('ajustes'), kvGet('cuenta'), kvGet('sesion'),
    kvGet('posiciones_iconos'), kvGet('apps_instaladas'),
    kvGet('carpetas'), kvGet('pinned_apps')
  ]);

  ajustes = { ...AJUSTES_BASE, ...(a || {}) };
  cuentaActual = c; sesionActiva = !!c && s === true;
  posicionesIconos = pos || {}; carpetas = carpetasData || {}; pinnedApps = pinnedData || [];

  window.widgetsActivos = (await kvGet('widgets_activos')) || [];
  if (normalizarWidgets()) await kvSet('widgets_activos', window.widgetsActivos);

  injectStyles();
  aplicarAjustes(); refrescarEstado(); refrescarIconos();

  if (window.RUTAS_APPS) {
    window.RUTAS_APPS.forEach(app => { registrarApp({ id: app.id, titulo: app.titulo, icono: app.icono, url: app.url }); });
  }

  if (appsInst) {
    for (const [id, appData] of Object.entries(appsInst)) {
      registrarApp({
        id: appData.manifest.id,
        titulo: appData.manifest.titulo,
        icono: appData.manifest.icono || 'box',
        instalada: true,
        archivos: appData.archivos,
        manifest: appData.manifest
      });
    }
  }

  limpiarCarpetasHuerfanas();
  renderIconos();
  setupEditProfile();
  setupEliminarApp();
  setupStatusPill();
  renderQuickLaunch();
  setupDragDetection();
  setupMenuOption();

  const desktopEl = $('desktop');
  if (desktopEl) {
    desktopEl.addEventListener('contextmenu', contextoDesktop);
  }
})();

// ============================================================================
// ExtraFunc.js - Extensiones y Widgets integrados - (23-10-2026) - A4
// Fixes sobre v4:
//   - Hotkeys no se disparan dentro de inputs
//   - Widgets-layer prepend (no z-index) -> widgets siempre detrás de ventanas
//   - Widget theme dinámico (postMessage myhub:tema:res)
//   - findClosestFreeSpot excluye el widget que se está arrastrando
//   - Transición de widget se resetea tras el drag
//   - Backup incluye pinned_apps
//   - Sin eval() para colores (COLORES ya está arriba)
// ============================================================================

(function() {
  'use strict';

  const escLocal = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const refrescarIconos = () => { if (window.lucide) window.lucide.createIcons(); };

  let sonidosActivos = localStorage.getItem('myhub_sounds') !== 'false';
  let hotkeys = JSON.parse(localStorage.getItem('myhub_hotkeys') || '{}');
  const defaultHotkeys = {
    'Digit1': 'papelera', 'Digit2': 'forge', 'Digit3': 'storhe', 'Digit4': 'cmdhe',
    'KeyM': 'minimize', 'KeyC': 'close', 'KeyD': 'theme', 'KeyR': 'reload',
    'KeyN': 'newfolder', 'KeyS': 'settings', 'KeyF': 'fullscreen'
  };

  let sndInstance = null;
  let sndReady = false;

  // ================= RESPALDO DE AUDIO (Web Audio, sin dependencias) =================
  // Se usa si snd-lib no está cargada o no pudo iniciarse.
  let audioCtx = null;
  const getAudioCtx = () => {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    return audioCtx;
  };
  // Los navegadores bloquean el audio hasta la primera interacción del usuario
  const desbloquearAudio = () => {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  };
  ['pointerdown', 'keydown', 'touchend'].forEach(ev =>
    document.addEventListener(ev, desbloquearAudio, { capture: true, passive: true }));

  // Cada tono: [frecuencia Hz, retardo s, duración s]
  const TONOS = {
    open:     [[660, 0, 0.07], [990, 0.06, 0.09]],
    close:    [[520, 0, 0.08], [330, 0.06, 0.10]],
    minimize: [[440, 0, 0.06]],
    start:    [[523, 0, 0.09], [659, 0.09, 0.09], [784, 0.18, 0.14]],
    move:     [[900, 0, 0.03]],
    click:    [[1200, 0, 0.025]]
  };
  const tocarTono = (type) => {
    const ctx = getAudioCtx();
    if (!ctx || ctx.state === 'closed') return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const t0 = ctx.currentTime;
    (TONOS[type] || TONOS.click).forEach(([freq, delay, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + delay);
      gain.gain.exponentialRampToValueAtTime(0.15, t0 + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0 + delay);
      osc.stop(t0 + delay + dur + 0.02);
    });
  };

  // ================= SISTEMA DE SONIDO (snd-lib si existe) =================
  if (typeof Snd !== 'undefined') {
    sndInstance = new Snd();
    sndInstance.load(Snd.KITS.SND01).then(() => {
      sndReady = true;
      console.log('[ExtraFunc] Kit de sonidos snd-lib cargado. Sonidos disponibles:', Object.keys(Snd.SOUNDS || {}));
    }).catch(e => console.error('[ExtraFunc] Error cargando snd-lib, usando respaldo:', e));
  } else {
    console.warn('[ExtraFunc] snd-lib no está cargada: usando sonidos de respaldo (Web Audio).');
  }

  const playSound = (type) => {
    if (!sonidosActivos) return;
    try {
      if (sndInstance && sndReady) {
        // Solo se usan nombres que realmente existen en el kit; si no, respaldo Web Audio
        const nombres = {
          open: ['SWITCH'], close: ['SWOOSH'], minimize: ['HOVER'],
          start: ['SUCCESS'], move: ['CLICK'], click: ['TAP', 'CLICK']
        };
        const candidatos = nombres[type] || nombres.click;
        const clave = candidatos.find(n => Snd.SOUNDS && Snd.SOUNDS[n] !== undefined);
        if (clave) {
          sndInstance.play(Snd.SOUNDS[clave]);
        } else {
          tocarTono(type);
        }
      } else {
        tocarTono(type);
      }
    } catch (e) {
      console.error('[ExtraFunc] Error al reproducir sonido:', e);
    }
  };

  // ================= INYECCIÓN DE ESTILOS =================
  const inyectarEstilos = () => {
    if (document.getElementById('extrafunc-style')) return;
    const style = document.createElement('style');
    style.id = 'extrafunc-style';
    style.textContent = `
      /* Miniaturas Taskbar */
      #task-preview { position: fixed; z-index: 1000; width: 200px; background: var(--glass, #fff); border: 1.5px solid var(--accent-line); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); padding: 12px; display: none; flex-direction: column; gap: 10px; color: var(--text); opacity: 0; transform: translateY(10px); transition: opacity 0.15s, transform 0.15s; pointer-events: auto; backdrop-filter: blur(20px); }
      #task-preview.active { display: flex; opacity: 1; transform: translateY(0); }
      .preview-header { display: flex; align-items: center; gap: 10px; }
      .preview-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; }
      .preview-icon svg { width: 16px; height: 16px; }
      .preview-title { flex: 1; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .preview-close { background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s; }
      .preview-close:hover { background: #ef4444; color: #fff; }
      .preview-close svg { width: 14px; height: 14px; }
      .preview-hint { font-size: 11px; color: var(--muted); text-align: center; }

      /* Config */
      .cfg-toggle { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--line); }
      .cfg-toggle span { font-size: 13px; font-weight: 500; }
      .cfg-toggle input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--accent); cursor: pointer; }
      .hotkey-list { max-height: 180px; overflow-y: auto; padding-right: 8px; margin-top: 8px; }
      .hotkey-row { display: grid; grid-template-columns: 1fr 110px; gap: 12px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); }
      .hotkey-row:last-child { border-bottom: none; }
      .hotkey-label { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
      .hotkey-key { width: 100%; text-align: center; background: var(--field); border: 1px solid var(--line); padding: 6px; border-radius: 6px; font-family: monospace; font-size: 12px; cursor: pointer; transition: 0.2s; outline: none; color: var(--text); }
      .hotkey-key:focus { border-color: var(--accent); background: var(--card); box-shadow: 0 0 0 3px var(--accent-soft); }

      /* Widgets */
      @keyframes dropInFixed { 0% { opacity: 0; transform: translate(-50%, -10px); } 100% { opacity: 1; transform: translate(-50%, 0); } }
      .toast { animation: dropInFixed .3s var(--ease-out) !important; }
      .widget-container { user-select: none; -webkit-user-select: none; }
      .extrafunc-modal-overlay { position: fixed; inset: 0; z-index: 99999; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.2s; }
      .extrafunc-modal-overlay.active { opacity: 1; pointer-events: auto; }
      .extrafunc-modal { background: var(--glass, #fff); border: 2px solid var(--accent, #2563eb); border-radius: 16px; padding: 24px; width: 340px; max-width: 90vw; box-shadow: 0 20px 40px rgba(0,0,0,0.3); transform: scale(0.95); transition: transform 0.2s; color: var(--text, #000); }
      .extrafunc-modal-overlay.active .extrafunc-modal { transform: scale(1); }
      .extrafunc-modal h3 { margin: 0 0 10px; font-size: 18px; font-weight: 700; color: var(--text, #000); letter-spacing: -0.02em; }
      .extrafunc-modal p { margin: 0 0 20px; font-size: 13px; color: var(--muted, #666); line-height: 1.4; }
      .extrafunc-modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
      .extrafunc-modal-btn { padding: 8px 16px; border-radius: 8px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: transform 0.15s, filter 0.15s; }
      .extrafunc-modal-btn:active { transform: scale(0.95); }
      .extrafunc-modal-btn.cancel { background: var(--field, #f0f0f0); color: var(--text, #000); border: 1px solid var(--line, #ccc); }
      .extrafunc-modal-btn.cancel:hover { background: var(--card, #fff); }
      .widget-list-item { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 16px; border: 1px solid var(--line); border-radius: 10px; background: var(--field); color: var(--text); font: inherit; cursor: pointer; transition: all 0.15s; text-align: left; box-sizing: border-box; }
      .widget-list-item:hover { background: var(--accent-soft); border-color: var(--accent-line); transform: translateY(-1px); }
      .widget-list-item i { width: 20px; height: 20px; color: var(--accent); flex-shrink: 0; }
      .widget-list-info { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-width: 0; }
      .widget-list-title { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
      .widget-list-size { font-size: 11px; color: var(--muted); text-transform: uppercase; }
    `;
    document.head.appendChild(style);
  };

  // ================= ATAJOS DE TECLADO =================
  const setupAtajosTeclado = () => {
    document.addEventListener('keydown', (e) => {
      // FIX: no disparar hotkeys si el usuario está escribiendo en un input
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const code = e.code;
        const winObj = window.win;
        const action = hotkeys[code] || defaultHotkeys[code];
        if (!action) return;

        switch (action) {
          case 'papelera': e.preventDefault(); window.MyHub.abrir('papelera'); break;
          case 'forge': e.preventDefault(); window.MyHub.abrir('forge'); break;
          case 'storhe': e.preventDefault(); window.MyHub.abrir('storhe'); break;
          case 'cmdhe': e.preventDefault(); window.MyHub.abrir('cmdhe'); break;
          case 'minimize': e.preventDefault(); if (winObj) Object.keys(winObj).forEach(id => window.MyHub.minimizar(id)); break;
          case 'close': e.preventDefault(); if (winObj) Object.keys(winObj).forEach(id => window.MyHub.cerrar(id)); break;
          case 'theme':
            e.preventDefault();
            if (typeof ajustes !== 'undefined' && typeof guardarAjustes !== 'undefined' && typeof aplicarAjustes !== 'undefined') {
              ajustes.modo = ajustes.modo === 'oscuro' ? 'claro' : 'oscuro';
              guardarAjustes(); aplicarAjustes();
              window.MyHub.toast(`Modo ${ajustes.modo} activado`);
            }
            break;
          case 'reload': e.preventDefault(); location.reload(); break;
          case 'newfolder': e.preventDefault(); if(document.getElementById('menu-nueva-carpeta')) document.getElementById('menu-nueva-carpeta').click(); break;
          case 'settings':
            e.preventDefault();
            document.getElementById('inicio').click();
            setTimeout(() => {
              const ops = document.getElementById('menuOps').children;
              for (let op of ops) { if (op.textContent.includes('Configuración')) op.click(); }
            }, 50);
            break;
          case 'fullscreen':
            e.preventDefault();
            if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
            else document.exitFullscreen();
            break;
        }
      }
    }, true);
  };

  // ================= MINIATURAS TASKBAR =================
  const setupMiniaturas = () => {
    if (document.getElementById('task-preview')) return;
    const preview = document.createElement('div');
    preview.id = 'task-preview';
    preview.innerHTML = `<div class="preview-header"><div class="preview-icon" id="preview-icon"></div><div class="preview-title" id="preview-title"></div><button class="preview-close" id="preview-close"><i data-lucide="x"></i></button></div><div class="preview-hint">Clic para enfocar</div>`;
    document.body.appendChild(preview);

    let currentTaskId = null, hideTimeout;

    document.addEventListener('mouseover', (e) => {
      const taskEl = e.target.closest('.task');
      if (taskEl) {
        clearTimeout(hideTimeout);
        const title = taskEl.getAttribute('title');
        let realId = null;
        if (registro) registro.forEach((app, id) => { if (app.titulo === title) realId = id; });

        if (realId) {
          currentTaskId = realId;
          const app = registro.get(realId);
          document.getElementById('preview-title').textContent = app.titulo;
          document.getElementById('preview-icon').innerHTML = `<i data-lucide="${app.icono || 'app-window'}"></i>`;

          const rect = taskEl.getBoundingClientRect();
          preview.style.left = `${Math.max(10, rect.left + (rect.width / 2) - 100)}px`;
          preview.style.top = `${rect.top - 90}px`;

          preview.classList.add('active');
          refrescarIconos();
        }
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('.task')) hideTimeout = setTimeout(() => preview.classList.remove('active'), 200);
    });
    preview.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    preview.addEventListener('mouseleave', () => hideTimeout = setTimeout(() => preview.classList.remove('active'), 200));

    document.getElementById('preview-close').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentTaskId) {
        window.MyHub.cerrar(currentTaskId);
        preview.classList.remove('active');
      }
    });
  };

  // ================= CONFIG INJECTION =================
  const setupConfigInjection = () => {
    const modalEl = document.getElementById('modal');
    const mTitulo = document.getElementById('mTitulo');
    const mBody = document.getElementById('mBody');
    if (!modalEl || !mBody) return;

    const observer = new MutationObserver(() => {
      if (mTitulo.textContent === 'Configuración' && !document.getElementById('extrafunc-config-injected')) {
        const container = document.createElement('div');
        container.id = 'extrafunc-config-injected';
        container.style.marginTop = '20px';

        const labels = {
          'papelera': 'Abrir Papelera', 'forge': 'Abrir Forge', 'storhe': 'Abrir Stor-He', 'cmdhe': 'Abrir CMD-HE',
          'minimize': 'Minimizar Ventanas', 'close': 'Cerrar Ventanas', 'theme': 'Alternar Tema',
          'reload': 'Recargar Escritorio', 'newfolder': 'Nueva Carpeta', 'settings': 'Configuración', 'fullscreen': 'Pantalla Completa'
        };

        const hotkeysHTML = Object.entries(defaultHotkeys).map(([code, action]) => {
          const currentCode = Object.keys(hotkeys).find(k => hotkeys[k] === action) || code;
          const displayKey = currentCode.replace('Digit', '').replace('Key', '');
          return `
            <div class="hotkey-row">
              <span class="hotkey-label">${labels[action] || action}</span>
              <input type="text" class="hotkey-key" data-action="${action}" value="Shift + ${displayKey}" readonly>
            </div>
          `;
        }).join('');

        container.innerHTML = `
          <div class="sec" style="margin-top: 20px;">Efectos de Sonido</div>
          <div class="cfg-toggle">
            <span>Sonidos del sistema</span>
            <input type="checkbox" id="cfg-toggle-sound" ${sonidosActivos ? 'checked' : ''}>
          </div>
          <div class="sec" style="margin-top: 20px;">Copia de Seguridad</div>
          <div class="fila-btns">
            <button class="btn" id="cfg-btn-export"><i data-lucide="download"></i>Exportar Datos</button>
            <button class="btn gray" id="cfg-btn-import"><i data-lucide="upload"></i>Importar Datos</button>
            <input type="file" id="cfg-input-import" accept=".json" hidden>
          </div>
          <p class="nota">Descarga un archivo con todas tus apps, carpetas, ajustes, widgets y favoritos.</p>
          <div class="sec" style="margin-top: 20px;">Atajos de Teclado</div>
          <p class="nota" style="margin-bottom: 10px;">Haz clic en un atajo y presiona la nueva combinación (Shift + Tecla).</p>
          <div class="hotkey-list">${hotkeysHTML}</div>
        `;

        mBody.appendChild(container);

        const soundToggle = document.getElementById('cfg-toggle-sound');
        soundToggle.onchange = (e) => {
          sonidosActivos = e.target.checked;
          localStorage.setItem('myhub_sounds', sonidosActivos);
          if (sonidosActivos) playSound('click');
        };

        // FIX: backup incluye pinned_apps y widgets_activos
        document.getElementById('cfg-btn-export').onclick = async () => {
          const data = {
            apps_instaladas: await window.kvGet('apps_instaladas') || {},
            carpetas: await window.kvGet('carpetas') || {},
            ajustes: await window.kvGet('ajustes') || {},
            cuenta: await window.kvGet('cuenta') || null,
            posiciones_iconos: await window.kvGet('posiciones_iconos') || {},
            widgets_activos: window.widgetsActivos || [],
            pinned_apps: await window.kvGet('pinned_apps') || []
          };
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `MyHub_Backup_${new Date().toISOString().slice(0,10)}.json`;
          a.click(); URL.revokeObjectURL(url);
          window.MyHub.toast('Copia de seguridad descargada');
        };

        const fileInput = document.getElementById('cfg-input-import');
        document.getElementById('cfg-btn-import').onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const data = JSON.parse(ev.target.result);
              if (data.apps_instaladas) await window.kvSet('apps_instaladas', data.apps_instaladas);
              if (data.carpetas) await window.kvSet('carpetas', data.carpetas);
              if (data.ajustes) await window.kvSet('ajustes', data.ajustes);
              if (data.cuenta) await window.kvSet('cuenta', data.cuenta);
              if (data.posiciones_iconos) await window.kvSet('posiciones_iconos', data.posiciones_iconos);
              if (data.widgets_activos) await window.kvSet('widgets_activos', data.widgets_activos);
              if (data.pinned_apps) await window.kvSet('pinned_apps', data.pinned_apps);
              window.MyHub.toast('Datos importados. Recargando...');
              setTimeout(() => location.reload(), 1500);
            } catch (err) { window.MyHub.toast('Error al importar: Archivo inválido'); }
          };
          reader.readAsText(file);
        };

        document.querySelectorAll('.hotkey-key').forEach(input => {
          input.addEventListener('keydown', (e) => {
            e.preventDefault();
            if (e.key === 'Escape') { input.blur(); return; }

            if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && e.code !== 'ShiftLeft' && e.code !== 'ShiftRight') {
              const newCode = e.code;
              const action = input.dataset.action;

              for (let k in hotkeys) { if (hotkeys[k] === action) delete hotkeys[k]; }
              hotkeys[newCode] = action;
              localStorage.setItem('myhub_hotkeys', JSON.stringify(hotkeys));

              const displayKey = newCode.replace('Digit', '').replace('Key', '');
              input.value = `Shift + ${displayKey}`;
              input.blur();
              window.MyHub.toast('Atajo actualizado');
              playSound('click');
            } else {
              window.MyHub.toast('Debes usar Shift + una tecla');
            }
          });
        });
        refrescarIconos();
      }
    });
    observer.observe(modalEl, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  };

  // ================= MOTOR DE WIDGETS =================
  const MARGEN = MARGEN_ICONOS, GX = GRID_X, GY = GRID_Y;

  const guardarWidgets = async () => {
    await kvSet('widgets_activos', window.widgetsActivos);
  };

  const findClosestFreeSpot = (size, targetLeft, targetTop, excludeWidget) => {
    const ws = WIDGET_SIZES[size] || WIDGET_SIZES['1x1'];
    const maxRows = GRID_ROWS, maxCols = GRID_COLS;

    const ocupadas = new Set();
    if (typeof posicionesIconos !== 'undefined') {
      Object.values(posicionesIconos).forEach(pos => {
        const c = Math.round((parseFloat(pos.left) - MARGEN) / GX);
        const r = Math.round((parseFloat(pos.top) - MARGEN) / GY);
        ocupadas.add(`${c}-${r}`);
      });
    }

    window.widgetsActivos.forEach(w => {
      if (w === excludeWidget) return; // FIX: excluir el que se está reubicando
      if (!w.pos) return;
      const wc = Math.round((parseFloat(w.pos.left) - MARGEN) / GX);
      const wr = Math.round((parseFloat(w.pos.top) - MARGEN) / GY);
      const wsize = WIDGET_SIZES[w.size] || WIDGET_SIZES['1x1'];
      for (let i = 0; i < wsize.cols; i++) {
        for (let j = 0; j < wsize.rows; j++) {
          ocupadas.add(`${wc + i}-${wr + j}`);
        }
      }
    });

    const targetCol = Math.round((targetLeft - MARGEN) / GX);
    const targetRow = Math.round((targetTop - MARGEN) / GY);

    let bestSpot = null;
    let minDist = Infinity;

    for (let r = 0; r + ws.rows <= maxRows; r++) {
      for (let c = 0; c + ws.cols <= maxCols; c++) {
        let libre = true;
        for (let i = 0; i < ws.cols; i++) {
          for (let j = 0; j < ws.rows; j++) {
            if (ocupadas.has(`${c + i}-${r + j}`)) { libre = false; break; }
          }
          if (!libre) break;
        }
        if (libre) {
          const dist = Math.abs(c - targetCol) + Math.abs(r - targetRow);
          if (dist < minDist) {
            minDist = dist;
            bestSpot = { left: `${c * GX + MARGEN}px`, top: `${r * GY + MARGEN}px` };
          }
        }
      }
    }
    return bestSpot || { left: `${MARGEN}px`, top: `${MARGEN}px` };
  };

  const checkCollision = (rect1, rect2) => {
    return !(rect1.right <= rect2.left || rect1.left >= rect2.right || rect1.bottom <= rect2.top || rect1.top >= rect2.bottom);
  };

  // Un archivo de widget puede llegar como Blob, ArrayBuffer o texto; si se perdió (p. ej. backup en JSON), devuelve null
  const toBlobSeguro = (v) => {
    if (v instanceof Blob) return v;
    if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) return new Blob([v], { type: 'text/html' });
    if (typeof v === 'string') return new Blob([v], { type: 'text/html' });
    return null;
  };

  window.renderWidgets = () => {
    let layer = document.getElementById('widgets-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'widgets-layer';
      // FIX: prepend + sin z-index → los widgets se pintan por debajo de iconos y ventanas.
      //       Durante el drag, el widget sube a z-index:999 directamente contra el root.
      layer.style.cssText = 'position:absolute; inset:0; pointer-events:none;';
      document.getElementById('desktop').prepend(layer);
    }
    layer.innerHTML = '';

    window.widgetsActivos.forEach(w => {
     try {
      const el = document.createElement('div');
      el.className = 'widget-container';

      const ws = WIDGET_SIZES[w.size] || WIDGET_SIZES['1x1'];

      const topeW = MARGEN_ICONOS + (GRID_ROWS - ws.rows) * GRID_Y;
      const topRaw = parseFloat(w.pos?.top);
      const topFinal = Math.max(MARGEN_ICONOS, Math.min(isNaN(topRaw) ? 16 : topRaw, topeW));
      el.style.cssText = `
        position: absolute; left: ${w.pos?.left || '116px'}; top: ${topFinal}px;
        width: ${ws.w}px; height: ${ws.h}px; pointer-events: auto;
        border-radius: 16px; background: var(--glass); backdrop-filter: blur(20px);
        border: 1.5px solid var(--accent-line); box-shadow: var(--shadow-md);
        overflow: hidden; transition: transform .2s, box-shadow .2s;
        cursor: grab; user-select: none; -webkit-user-select: none;
      `;

      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof mostrarContexto === 'function') {
          mostrarContexto(e.clientX, e.clientY, [
            { icon: 'trash-2', text: 'Eliminar Widget', danger: true, fn: () => {
              window.widgetsActivos = window.widgetsActivos.filter(item => item !== w);
              guardarWidgets();
              window.renderWidgets();
              window.MyHub.toast('Widget eliminado');
            }}
          ]);
        }
      });

      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:100%; height:100%; border:none; background:transparent; pointer-events: none; user-select: none; -webkit-user-drag: none;';

      const app = registro.get(w.id);
      const blobWidget = app && app.archivos ? toBlobSeguro(app.archivos[w.file]) : null;
      if (blobWidget) {
        const blob = blobWidget;
        const reader = new FileReader();
        reader.onload = (e) => {
          let html = e.target.result;

          // FIX: theme injection ahora tiene listener para actualizaciones dinámicas
          const themeInjection = `
            <script src="https://unpkg.com/lucide@latest"><\/script>
            <script>
              (function() {
                function applyTheme(color, modo) {
                  document.documentElement.dataset.modo = modo || 'claro';
                  document.documentElement.style.setProperty('--accent', color || '#2563eb');
                  const hex = (color || '#2563eb').replace('#', '');
                  if (hex.length === 6) {
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    document.documentElement.style.setProperty('--accent-soft', 'rgba(' + r + ', ' + g + ', ' + b + ', 0.15)');
                  }
                }
                applyTheme(
                  '${(typeof COLORES !== 'undefined' && COLORES[ajustes.color]) || '#2563eb'}',
                  '${ajustes.modo || 'claro'}'
                );
                window.addEventListener('message', function(ev) {
                  if (ev.data && ev.data.type === 'myhub:tema:res') {
                    applyTheme(ev.data.color, ev.data.modo);
                  }
                });
              })();
            <\/script>
          `;

          if (w.file.endsWith('.js')) {
            html = `<html><head><style>body{margin:0;color:var(--text);font-family:sans-serif;}</style>${themeInjection}</head><body><script>${html}<\/script></body></html>`;
          } else {
            html = html.replace('</head>', `${themeInjection}</head>`);
          }
          iframe.srcdoc = html;
        };
        reader.readAsText(blob);
      } else {
        iframe.srcdoc = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#ef4444; font-size:12px; text-align:center; padding:10px; box-sizing:border-box;"><b>Error: Widget no encontrado</b><br><small style="opacity:0.7">${w.file}</small></div>`;
      }

      // Enviar tema inicial al iframe en cuanto cargue
      iframe.addEventListener('load', () => {
        try {
          iframe.contentWindow.postMessage({
            type: 'myhub:tema:res',
            color: (typeof COLORES !== 'undefined' && COLORES[ajustes.color]) || '#2563eb',
            modo: ajustes.modo || 'claro'
          }, '*');
        } catch(e) {}
      });

      el.appendChild(iframe);
      hacerArrastrableWidget(el, w);
      layer.appendChild(el);
     } catch (err) {
      console.error('[Widget] no se pudo dibujar', w.id, w.file, err);
     }
    });
  };

  const hacerArrastrableWidget = (el, widgetData) => {
    let isDragging = false, startX, startY, startLeft, startTop;

    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();

      isDragging = false;
      el.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY;
      startLeft = parseFloat(el.style.left); startTop = parseFloat(el.style.top);

      el.style.transition = 'none';
      el.style.zIndex = '999';
      el.style.transform = 'scale(1.02)';
      el.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';

      const mover = (ev) => {
        if (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3) isDragging = true;
        if (!isDragging) return;
        el.style.left = (startLeft + ev.clientX - startX) + 'px';
        el.style.top = (startTop + ev.clientY - startY) + 'px';
      };

      const soltar = () => {
        window.removeEventListener('pointermove', mover);
        window.removeEventListener('pointerup', soltar);

        if (isDragging) {
          let snapX = Math.round((parseFloat(el.style.left) - MARGEN) / GX) * GX + MARGEN;
          let snapY = Math.round((parseFloat(el.style.top) - MARGEN) / GY) * GY + MARGEN;

          const deskEl = document.getElementById('desktop');
          const deskW = deskEl.clientWidth;
          const deskH = deskEl.clientHeight;
          const wW = el.offsetWidth;
          const wH = el.offsetHeight;

          snapX = Math.max(MARGEN, Math.min(snapX, MARGEN + (GRID_COLS - (WIDGET_SIZES[widgetData.size] || WIDGET_SIZES['1x1']).cols) * GX));
          const wsDrop = WIDGET_SIZES[widgetData.size] || WIDGET_SIZES['1x1'];
          const topeFila = MARGEN + (GRID_ROWS - wsDrop.rows) * GY;
          snapY = Math.max(MARGEN, Math.min(snapY, topeFila));

          // Posición tentativa (instantánea) para medir colisión
          el.style.left = snapX + 'px';
          el.style.top = snapY + 'px';

          const snapRect = el.getBoundingClientRect();
          let colision = false;

          document.querySelectorAll('.icon').forEach(icon => {
            if (checkCollision(snapRect, icon.getBoundingClientRect())) colision = true;
          });

          if (!colision) {
            document.querySelectorAll('.widget-container').forEach(other => {
              if (other === el) return;
              if (checkCollision(snapRect, other.getBoundingClientRect())) colision = true;
            });
          }

          if (colision) {
            const safeSpot = findClosestFreeSpot(widgetData.size, snapX, snapY, widgetData);
            // Transición spring solo para el snap de reubicación
            el.style.transition = 'left .3s var(--ease-spring), top .3s var(--ease-spring), transform .2s, box-shadow .2s';
            el.style.left = safeSpot.left;
            el.style.top = safeSpot.top;
            widgetData.pos = safeSpot;
            guardarWidgets();
            window.MyHub.toast('Espacio ocupado. Reubicando...');
          } else {
            widgetData.pos = { left: el.style.left, top: el.style.top };
            guardarWidgets();
          }
        }

        // Restaurar visuals
        el.style.zIndex = '';
        el.style.transform = '';
        el.style.boxShadow = '';

        // FIX: resetear transition tras la animación de asentamiento (antes quedaba sticky)
        setTimeout(() => {
          if (el.isConnected) el.style.transition = '';
        }, 350);
      };

      window.addEventListener('pointermove', mover);
      window.addEventListener('pointerup', soltar);
    });
  };

  window.abrirPanelWidgets = () => {
    const appsConWidgets = [];
    registro.forEach((app, id) => {
      if (app.manifest && app.manifest.widgets) {
        app.manifest.widgets.forEach(w => {
          appsConWidgets.push({ appId: id, titulo: app.titulo, file: w.file, size: w.size || '1x1' });
        });
      }
    });

    if (appsConWidgets.length === 0) {
      window.MyHub.toast('No hay widgets instalados. ¡Descarga apps de Stor-He!');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'extrafunc-modal-overlay';
    const m = document.createElement('div');
    m.className = 'extrafunc-modal';
    m.style.width = '400px';

    m.innerHTML = `
      <h3>Añadir Widget</h3>
      <p>Elige un widget para colocarlo en tu escritorio.</p>
      <div style="display:flex; flex-direction:column; gap:10px; max-height:240px; overflow-y:auto; padding: 8px; margin: -8px; box-sizing: border-box;">
        ${appsConWidgets.map((w, i) => `
          <button class="widget-list-item" data-index="${i}">
            <i data-lucide="layout-grid"></i>
            <div class="widget-list-info">
                <span class="widget-list-title">${escLocal(w.titulo)}</span>
                <span class="widget-list-size">Tamaño: ${w.size}</span>
            </div>
          </button>
        `).join('')}
      </div>
      <div class="extrafunc-modal-actions">
        <button class="extrafunc-modal-btn cancel">Cerrar</button>
      </div>
    `;

    overlay.appendChild(m);
    document.body.appendChild(overlay);
    void overlay.offsetWidth;
    overlay.classList.add('active');
    refrescarIconos();

    const cerrarPanel = () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
    };

    m.querySelector('.cancel').onclick = cerrarPanel;

    m.querySelectorAll('.widget-list-item').forEach(btn => {
      btn.onclick = () => {
        const w = appsConWidgets[btn.dataset.index];
        const pos = findClosestFreeSpot(w.size, 116, 16, null);
        window.widgetsActivos.push({ id: w.appId, file: w.file, size: w.size, pos });
        guardarWidgets();
        window.renderWidgets();
        cerrarPanel();
        window.MyHub.toast('Widget añadido al escritorio');
      };
    });
  };

  // ================= INICIALIZACIÓN EXTRAS =================
  const init = () => {
    if (!window.MyHub || typeof registro === 'undefined') {
      setTimeout(init, 100);
      return;
    }

    inyectarEstilos();
    setupAtajosTeclado();
    setupMiniaturas();
    setupConfigInjection();

    // Cargar widgets activos desde IndexedDB
    kvGet('widgets_activos').then(data => {
      window.widgetsActivos = data || [];
      window.renderWidgets();
      renderIconos(); // Reubicar iconos que quedaron sobre widgets
    });

    const deskEl = document.getElementById('desktop');
    if (deskEl) {
      const observerDesk = new MutationObserver((mutations) => {
        mutations.forEach(m => {
          if (m.addedNodes.length) {
            m.addedNodes.forEach(node => {
              if (node.classList && node.classList.contains('win')) playSound('open');
            });
          }
        });
      });
      observerDesk.observe(deskEl, { childList: true });
    }

    document.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.close.minimize')) playSound('minimize');
      else if (e.target.closest('.close:not(.minimize)')) playSound('close');
      else if (e.target.closest('#inicio')) playSound('start');
      else if (e.target.closest('.titlebar') && !e.target.closest('.close')) playSound('move');
    }, true);

    // Cierre del context menu con botón derecho
    document.addEventListener('pointerdown', (e) => {
      if (e.button === 2 && typeof cerrarContexto === 'function') {
        cerrarContexto();
      }
    }, true);

    console.log('%c[ExtraFunc] Extensiones y Widgets cargados correctamente', 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px; border-radius: 4px;');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }

})();
