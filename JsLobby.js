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
const COLORES = {
  azul: '#2563eb', celeste: '#0ea5e9', rojo: '#dc2626',
  verde: '#16a34a', morado: '#7c3aed', amarillo: '#ca8a04'
};
const LIMITE_FONDO = 1024 * 1024;
const AJUSTES_BASE = { color: 'azul', modo: 'claro', fondo: null };
const IDIOMAS = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français' };
const PAISES = [['CL','Chile'],['AR','Argentina'],['BO','Bolivia'],['BR','Brasil'],['CO','Colombia'],['CR','Costa Rica'],['CU','Cuba'],['EC','Ecuador'],['SV','El Salvador'],['ES','España'],['US','Estados Unidos'],['GT','Guatemala'],['HN','Honduras'],['MX','México'],['NI','Nicaragua'],['PA','Panamá'],['PY','Paraguay'],['PE','Perú'],['PR','Puerto Rico'],['DO','República Dominicana'],['UY','Uruguay'],['VE','Venezuela'],['CA','Canadá'],['FR','Francia'],['DE','Alemania'],['IT','Italia'],['PT','Portugal'],['GB','Reino Unido'],['JP','Japón'],['CN','China'],['IN','India'],['AU','Australia'],['OTRO','Otro']];
const GENEROS = { 'hombre': 'Hombre', 'mujer': 'Mujer', 'no-binario': 'No binario', 'otro': 'Otro' };

const MARGEN_ICONOS = 16; 
const GRID_X = 100;       
const GRID_Y = 110;       

let ajustes = { ...AJUSTES_BASE };
let cuentaActual = null;
let sesionActiva = false;
let posicionesIconos = {}; 

async function guardarAjustes() { await kvSet('ajustes', ajustes); }

function aplicarAjustes() {
  const root = document.documentElement;
  root.style.setProperty('--accent', COLORES[ajustes.color] || COLORES.azul);
  root.dataset.modo = ajustes.modo === 'oscuro' ? 'oscuro' : 'claro';
  
  const fondoEl = $('fondo-imagen');
  if (ajustes.fondo) {
    fondoEl.style.background = `url("${ajustes.fondo}") center/cover no-repeat`;
  } else {
    fondoEl.style.background = '';
  }
  document.body.classList.toggle('con-fondo', !!ajustes.fondo);
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

// ----- Vistas (Registro, Login, Mi Cuenta, Configuración, Créditos) -----
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
      <p><strong>jsDelivr</strong> (Distribución de archivos y descargas en Stor-He)</p>
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

function eliminarApp(id) {
  if (!registro.has(id)) return;
  cerrar(id);
  registro.delete(id);
  const idx = orden.indexOf(id);
  if (idx > -1) orden.splice(idx, 1);
  renderIconos();
}

function renderIconos() {
  const c = $('icons'); c.innerHTML = '';
  
  // LÓGICA DE COLUMNAS INTELIGENTES
  const deskHeight = desk.clientHeight || window.innerHeight - 90;
  const maxRows = Math.max(1, Math.floor((deskHeight - MARGEN_ICONOS) / GRID_Y));
  const maxYLimit = MARGEN_ICONOS + (maxRows - 1) * GRID_Y;

  const usedCells = new Set();

  orden.forEach((id, i) => {
    const app = registro.get(id);
    const d = document.createElement('div'); d.className = 'icon';
    d.style.setProperty('--i', i);
    d.innerHTML = `<div class="ico"><i data-lucide="${esc(app.icono || 'app-window')}"></i></div><span>${esc(app.titulo)}</span>`;
    
    let targetX = -1, targetY = -1;

    // 1. Intentar usar la posición guardada (si es válida)
    if (posicionesIconos[id]) {
      const savedX = parseFloat(posicionesIconos[id].left);
      const savedY = parseFloat(posicionesIconos[id].top);
      const cellKey = `${savedX}-${savedY}`;

      if (!usedCells.has(cellKey) && savedY <= maxYLimit) {
        targetX = savedX;
        targetY = savedY;
        usedCells.add(cellKey);
      }
    }

    // 2. Si no hay posición guardada o era inválida, calcular una nueva
    if (targetX === -1) {
      let col = 0;
      let row = 0;
      let found = false;

      while (!found) {
        const x = MARGEN_ICONOS + col * GRID_X;
        const y = MARGEN_ICONOS + row * GRID_Y;
        const cellKey = `${x}-${y}`;

        if (!usedCells.has(cellKey)) {
          targetX = x;
          targetY = y;
          usedCells.add(cellKey);
          found = true;
          posicionesIconos[id] = { left: x + 'px', top: y + 'px' };
        } else {
          row++;
          if (row >= maxRows) {
            row = 0;
            col++;
          }
        }
      }
    }

    d.style.left = targetX + 'px';
    d.style.top = targetY + 'px';

    hacerArrastrable(d, id, maxRows, maxYLimit);
    c.appendChild(d);
  });
  
  kvSet('posiciones_iconos', posicionesIconos);
  refrescarIconos();
}

function hacerArrastrable(el, id, maxRows, maxYLimit) {
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
        
        const maxLeft = el.parentElement.clientWidth - el.clientWidth - MARGEN_ICONOS;
        newTop = Math.max(MARGEN_ICONOS, Math.min(newTop, maxYLimit));
        newLeft = Math.max(MARGEN_ICONOS, Math.min(newLeft, maxLeft));
        
        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
      }
    };

    const soltar = ev => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      el.classList.remove('dragging');
      
      if (isDragging) {
        let currentLeft = parseFloat(el.style.left) || MARGEN_ICONOS;
        let currentTop = parseFloat(el.style.top) || MARGEN_ICONOS;
        
        let snapX = Math.round((currentLeft - MARGEN_ICONOS) / GRID_X) * GRID_X + MARGEN_ICONOS;
        let snapY = Math.round((currentTop - MARGEN_ICONOS) / GRID_Y) * GRID_Y + MARGEN_ICONOS;
        
        const maxLeft = el.parentElement.clientWidth - el.clientWidth - MARGEN_ICONOS;
        snapX = Math.max(MARGEN_ICONOS, Math.min(snapX, maxLeft));

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

// ================= Ventanas =================
const win = {};
const slots = { left: null, center: null, right: null };
let focused = null;

function rectSlot(s) {
  const G = 18, W = desk.clientWidth, H = desk.clientHeight;
  const w = (W - G * 4) / 3;
  return {
    left: s === 'left' ? G : s === 'center' ? G * 2 + w : W - G - w,
    top: G,
    width: w,
    height: H - G * 2
  };
}

function acomodar() {
  for (const id in win) {
    const w = win[id]; if (w.el.classList.contains('dragging')) continue;
    const r = rectSlot(w.slot);
    Object.assign(w.el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  }
}

// NUEVO MÉTODO ROBUSTO DE PREPARACIÓN DE APP
async function prepararAppInstalada(app) {
  const archivos = app.archivos;
  const dataUrls = {};
  
  // 1. Convertir todos los archivos a Data URLs
  for (const [nombre, fileBlob] of Object.entries(archivos)) {
    const blob = fileBlob instanceof Blob ? fileBlob : new Blob([fileBlob]);
    dataUrls[nombre] = await aDataURL(blob);
  }

  const mainFile = app.manifest.main || 'index.html';
  const mainBlob = archivos[mainFile];
  
  if (!mainBlob) {
    console.error("No se encontró el archivo principal:", mainFile);
    return null;
  }

  const blobToUse = mainBlob instanceof Blob ? mainBlob : new Blob([mainBlob]);
  let htmlText = await blobToUse.text();

  // 2. Usar DOMParser para manipular el HTML de forma segura
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');

  // Función auxiliar para buscar coincidencias
  const getDataUrl = (path) => {
    const cleanPath = path.replace(/^\.\//, '').replace(/^\//, '');
    return dataUrls[cleanPath] || null;
  };

  // 3. Reemplazar CSS
  doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    const href = link.getAttribute('href');
    if (href) {
      const dataUrl = getDataUrl(href);
      if (dataUrl) link.setAttribute('href', dataUrl);
    }
  });

  // 4. Reemplazar JS
  doc.querySelectorAll('script[src]').forEach(script => {
    const src = script.getAttribute('src');
    if (src) {
      const dataUrl = getDataUrl(src);
      if (dataUrl) script.setAttribute('src', dataUrl);
    }
  });

  // 5. Reemplazar Imágenes
  doc.querySelectorAll('img[src]').forEach(img => {
    const src = img.getAttribute('src');
    if (src) {
      const dataUrl = getDataUrl(src);
      if (dataUrl) img.setAttribute('src', dataUrl);
    }
  });

  return doc.documentElement.outerHTML;
}

async function abrir(id) {
  if (!sesionActiva) { toast('Inicia sesión para usar las apps'); return; }
  if (win[id]) return enfocar(id);
  const app = registro.get(id); if (!app) return;
  
  const libre = !slots.left ? 'left' : !slots.center ? 'center' : !slots.right ? 'right' : null;
  if (!libre) { toast('Solo caben 3 ventanas. Cierra una primero.'); return; }

  const el = document.createElement('div'); el.className = 'win';
  el.innerHTML = `<div class="titlebar"><span></span><button class="close" aria-label="Cerrar"><i data-lucide="x"></i></button></div><div class="body"></div>`;
  el.querySelector('.titlebar span').textContent = app.titulo;
  desk.appendChild(el);

  win[id] = { el, slot: libre }; slots[libre] = id;

  el.querySelector('.close').onclick = () => cerrar(id);
  el.querySelector('.titlebar').addEventListener('pointerdown', e => arrastrar(e, id));
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
  slots[w.slot] = null; w.el.remove(); delete win[id];
  if (focused === id) focused = null;
  acomodar(); renderTareas();
}

function enfocar(id) {
  if (!win[id]) return; focused = id;
  for (const x in win) {
    win[x].el.style.zIndex = x === id ? 5 : 1;
    win[x].el.classList.toggle('focused', x === id);
  }
  renderTareas();
}

function renderTareas() {
  const c = $('tasks'); c.innerHTML = '';
  for (const id of Object.keys(win)) {
    const app = registro.get(id);
    const t = document.createElement('div');
    t.className = 'task' + (focused === id ? ' active' : '');
    t.innerHTML = `<i data-lucide="${app.icono || 'app-window'}"></i><span>${esc(app.titulo)}</span>`;
    t.onclick = () => enfocar(id);
    c.appendChild(t);
  }
  refrescarIconos();
}

function arrastrar(e, id) {
  if (e.target.closest('.close')) return;
  const w = win[id];
  const dr = desk.getBoundingClientRect(); const wr = w.el.getBoundingClientRect();
  const ox = e.clientX - wr.left, oy = e.clientY - wr.top;
  
  const ladoDe = ev => {
    const relX = ev.clientX - dr.left;
    if (relX < dr.width / 3) return 'left';
    if (relX < (dr.width / 3) * 2) return 'center';
    return 'right';
  };

  w.el.classList.add('dragging'); enfocar(id);
  const mover = ev => {
    w.el.style.left = (ev.clientX - dr.left - ox) + 'px'; w.el.style.top = (ev.clientY - dr.top - oy) + 'px';
  };
  const soltar = ev => { 
    window.removeEventListener('pointermove', mover); 
    window.removeEventListener('pointerup', soltar); 
    w.el.classList.remove('dragging'); 
    soltarEn(id, ladoDe(ev)); 
  };
  window.addEventListener('pointermove', mover); 
  window.addEventListener('pointerup', soltar);
}

function soltarEn(id, lado) {
  const w = win[id]; if (!w) return;
  if (w.slot !== lado) {
    const otro = slots[lado];
    if (otro) { slots[w.slot] = otro; win[otro].slot = w.slot; }
    else slots[w.slot] = null;
    slots[lado] = id; w.slot = lado;
  }
  acomodar();
}

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
  registrarApp, eliminarApp, abrir, cerrar, toast, perfil, sesion: () => sesionActiva,
  tema: () => ({ color: COLORES[ajustes.color] || COLORES.azul, modo: ajustes.modo })
};

// ================= Arranque =================
window.addEventListener('resize', acomodar);
function reloj() { $('clock').textContent = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); }
reloj(); setInterval(reloj, 15000);

(async () => {
  const [a, c, s, pos, appsInst] = await Promise.all([
    kvGet('ajustes'), 
    kvGet('cuenta'), 
    kvGet('sesion'),
    kvGet('posiciones_iconos'),
    kvGet('apps_instaladas')
  ]);
  
  ajustes = { ...AJUSTES_BASE, ...(a || {}) };
  cuentaActual = c; sesionActiva = !!c && s === true;
  if (pos) posicionesIconos = pos;
  
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
})();
