// ================= Descarga de Documentación para Apps =================
window.descargarDocApps = function() {
  const doc = `
==================================================
MYHUBHESTUDIO - GUÍA DEFINITIVA DE DESARROLLO
==================================================

Bienvenido al entorno de desarrollo de MyHubHestudio. 
Has creado el Web OS definitivo para la productividad y la rapidez.
Aquí aprenderás a crear aplicaciones que se integren perfectamente.

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

--- EL MANIFEST.JSON EXPLICADO ---
{
  "id": "mi-app",             // (Obligatorio) ID único, sin espacios ni mayúsculas. Ej: "calculadora".
  "titulo": "Mi App",         // (Obligatorio) El nombre que aparecerá debajo del icono.
  "icono": "layout",          // (Obligatorio) El nombre del icono de Lucide (ej: "clock", "settings").
  "main": "index.html",       // (Obligatorio) El archivo HTML principal que se cargará.
  
  // --- CAMPOS OPCIONALES (Mejoran la vista en la tienda Stor-He) ---
  "autor": "Tu Nombre",       // (Opcional) Creador de la app.
  "descripcion": "Una app que hace cosas increíbles." // (Opcional) Breve descripción.
}

--- EJEMPLO DE INDEX.HTML TODO-EN-UNO ---
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    /* Todo tu CSS va aquí adentro */
    body { margin: 0; background: var(--card); color: var(--text); font-family: sans-serif; }
  </style>
</head>
<body>
  <h1>Mi Súper App</h1>
  <script>
    /* Todo tu JS va aquí adentro */
    console.log('App cargada correctamente');
  </script>
</body>
</html>

--------------------------------------------------
3. TAMAÑO DE PANTALLA Y LAYOUT
--------------------------------------------------
MyHubHestudio utiliza un sistema de 3 ventanas fijas (Izquierda, Centro, Derecha).
Esto significa que tu app NO ocupará toda la pantalla, sino 1/3 de ella.

- Resolución aproximada: En un monitor de 1920x1080, tu app tendrá unos ~600px de ancho.
- Tu HTML y CSS DEBEN ser responsivos. Usa siempre:
  html, body { height: 100vh; width: 100%; margin: 0; overflow: hidden; }
- Si tu app tiene muchos elementos, usa contenedores con overflow-y: auto; para que el usuario pueda hacer scroll dentro de tu app.

--------------------------------------------------
4. ESTILOS, TEMAS Y COLORES (¡OPCIONAL!)
--------------------------------------------------
Los colores y modos son mecánicas opcionales. ¡Puedes usarlas a tu placer!
Si decides adaptarte al sistema, MyHub expone variables CSS globales:

- var(--accent)     -> Color principal actual (azul, rojo, morado, etc.)
- var(--text)       -> Color del texto (se adapta a claro/oscuro)
- var(--card)       -> Color de fondo principal (blanco o gris oscuro)
- var(--field)      -> Color de inputs y áreas de texto
- var(--line)       -> Color de los bordes sutiles
- var(--muted)      -> Color del texto secundario

Para que tu app detecte el modo oscuro, MyHub le inyecta el atributo 
data-modo="oscuro" a la etiqueta <html>. Úsalo así en tu CSS:

html[data-modo="oscuro"] {
  /* Tus estilos oscuros aquí */
  background: #1a1a1a;
}

--------------------------------------------------
5. COMUNICACIÓN CON EL LOBBY (PostMessage)
--------------------------------------------------
Como tu app corre dentro de un iframe, si necesitas datos del usuario o del sistema,
debes usar window.parent.postMessage.

--- Obtener el Perfil del Usuario ---
window.parent.postMessage({ type: 'myhub:perfil' }, '*');

window.addEventListener('message', (e) => {
  if (e.data?.type === 'myhub:perfil:res') {
    console.log('Datos:', e.data.data);
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
6. API GLOBAL ÚTIL
--------------------------------------------------
- window.MyHub.toast('Mensaje');  // Muestra una notificación flotante en el sistema
- window.MyHub.cerrar('mi-app');  // Cierra la ventana de tu app por su ID

==================================================
Hecho con amor para MyHubHestudio. ¡Feliz código!
`;

  const blob = new Blob([doc], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'DocApps_MyHub.txt';
  document.body.appendChild(a);
  a.click();
  
  // Limpieza
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};
