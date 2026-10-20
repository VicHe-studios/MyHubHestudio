// ================= Descarga de Documentación para Apps =================
window.descargarDocApps = function() {
  const doc = `
==================================================
MYHUB - GUÍA DEFINITIVA DE DESARROLLO DE APLICACIONES
==================================================

Bienvenido al entorno de desarrollo de MyHub. Aquí puedes crear aplicaciones
que se integrarán perfectamente en el escritorio del sistema.

--------------------------------------------------
1. FORMAS DE CREAR UNA APP
--------------------------------------------------
Tienes 3 formas principales de integrar una app:

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

C) APP INSTALABLE (Archivo ZIP):
Ideal para distribuir tu app. El usuario la instala usando la app "Forge".
El ZIP debe contener un archivo manifest.json y un index.html.

Ejemplo de manifest.json:
{
  "id": "mi-app-zip",
  "titulo": "Mi App desde ZIP",
  "icono": "box",
  "main": "index.html"
}

--------------------------------------------------
2. COMUNICACIÓN CON EL LOBBY (PostMessage)
--------------------------------------------------
Si tu app se carga mediante URL o ZIP (dentro de un iframe), necesitas usar
window.parent.postMessage para comunicarte con MyHub.

--- Obtener el Perfil del Usuario ---
window.parent.postMessage({ type: 'myhub:perfil' }, '*');

window.addEventListener('message', (e) => {
  if (e.data?.type === 'myhub:perfil:res') {
    console.log('Datos del usuario:', e.data.data);
    // Retorna: { nombre, apellido, nacimiento, genero, pais, idioma, foto (Base64) }
  }
});

--- Obtener el Tema Actual ---
window.parent.postMessage({ type: 'myhub:get-tema' }, '*');

window.addEventListener('message', (e) => {
  if (e.data?.type === 'myhub:tema:res') {
    console.log('Color:', e.data.color); // Ej: '#2563eb'
    console.log('Modo:', e.data.modo);   // 'claro' u 'oscuro'
  }
});

--------------------------------------------------
3. ESTILOS, TEMAS Y COLORES (¡MECÁNICAS OPCIONALES!)
--------------------------------------------------
AVISO IMPORTANTE: 
Los colores y los modos (claro/oscuro) son mecánicas opcionales. 
¡Puedes usarlas a tu placer! Si prefieres que tu app tenga colores fijos
o no adaptarse al modo oscuro, simplemente no las implementes.

Si decides usarlas, MyHub te ofrece variables CSS globales que cambian
automáticamente si el usuario cambia el tema en el Lobby:

- var(--accent)     -> Color principal actual (ej: azul, rojo, etc.)
- var(--text)       -> Color del texto principal (se adapta a claro/oscuro)
- var(--card)       -> Color de fondo de las tarjetas (blanco en claro, gris en oscuro)
- var(--field)      -> Color de los inputs y áreas de texto
- var(--line)       -> Color de los bordes sutiles
- var(--muted)      -> Color del texto secundario (grisáceo)

Para que el modo oscuro funcione, el Lobby le inyecta el atributo 
data-modo="oscuro" a la etiqueta <html> de tu app. Puedes usarlo en tu CSS:

html[data-modo="oscuro"] {
  /* Tus estilos oscuros aquí */
  background: #1a1a1a;
}

--------------------------------------------------
4. API GLOBAL ÚTIL
--------------------------------------------------
- window.MyHub.toast('Mensaje');  // Muestra una notificación flotante
- window.MyHub.cerrar('mi-app');  // Cierra la ventana de tu app por su ID

==================================================
Hecho con amor para MyHub. ¡Feliz código!
`;

  const blob = new Blob([doc], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'DocApps.txt';
  document.body.appendChild(a);
  a.click();
  
  // Limpieza
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};