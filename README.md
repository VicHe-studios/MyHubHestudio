# 🚀 MyHubHestudio

> Tu Mini Web OS. Desarrolla apps en segundos o descarga utilidades pre-hechas para potenciar tu navegador.

[![Abrir MyHubHestudio](https://img.shields.io/badge/Abrir_MyHubHestudio-Online-brightgreen?style=for-the-badge)](https://viche-studios.github.io/MyHubHestudio/)
[![GitHub](https://img.shields.io/badge/GitHub-Repositorio-black?style=for-the-badge&logo=github)](https://github.com/VicHe-studios/MyHubHestudio)

**MyHubHestudio** es un entorno de escritorio ligero (Web OS) que corre directamente en tu navegador. No necesitas instalar nada: todo se guarda de forma local y segura en tu navegador mediante IndexedDB.

> 💡 **Versión Estable 2.1.0**: Esta es una versión totalmente funcional y lista para el uso diario. El proyecto se mantiene en constante evolución, por lo que recibirás futuras actualizaciones con nuevas herramientas y mejoras de rendimiento.

<img width="1366" height="607" alt="image" src="https://github.com/user-attachments/assets/58a162b9-42da-4e8d-9bef-581b8e069716" />


## ✨ Características

- 🖥️ **Escritorio Interactivo**: Sistema de ventanas (hasta 3 simultáneas) y organización de iconos por cuadrícula.
- 🎨 **Totalmente Personalizable**: Modos claro/oscuro, colores de acento dinámicos y fondos de pantalla personalizados.
- 🛠️ **Forge (Instalador)**: Arrastra un archivo `.zip` con tu app y se instalará en el sistema al instante.
- 🛒 **Stor-He (Tienda)**: Descarga aplicaciones directamente desde el repositorio de GitHub de forma rápida.
- 🗑️ **Papelera**: Gestión integrada para desinstalar apps y limpiar el sistema.
- 🖥️ **CMD-HE (Terminal)**: Consola de control con más de 25 comandos para gestionar el sistema, la base de datos y tu perfil.
- ⌨️ **Atajos de Teclado Configurables**: Accedé a tus apps y acciones favoritas con `Shift + tecla`.
- 🔊 **Sonidos del Sistema**: Efectos de sonido opcionales para apertura, cierre y acciones (vía `snd-lib`).
- 💾 **Backup y Restore**: Exportá e importá todas tus apps, carpetas y ajustes en un solo archivo.
- 📌 **Quick Launch**: Fijá tus apps favoritas a la barra de tareas para acceso inmediato.
- 🔒 **Privacidad Primero**: Todo el ecosistema corre en Local-First. Tus datos, notas y ajustes nunca salen de tu navegador.

<img width="1366" height="609" alt="image" src="https://github.com/user-attachments/assets/73d35012-1617-4806-a7c6-3c3d1454f261" />


## ⚠️ Modelo de confianza

**MyHubHestudio** permite instalar apps desde dos fuentes:

- **Stor-He**: repositorio curado manualmente por VicHeStudios. Cada app es probada antes y durante su publicación en la tienda oficial.
- **Forge**: archivos `.zip` locales (apps propias o de terceros).

Las apps instaladas corren con acceso completo al escritorio, al sistema de archivos virtual y a los datos de la cuenta de usuario. Esto es intencional: permite que las apps sean potentes (CMD-HE, por ejemplo, necesita acceso al kernel para funcionar).

**Recomendación**: instalá apps desde **Stor-He** o desde fuentes en las que confíes plenamente. Es la misma lógica que aplicarías al instalar cualquier software de escritorio: el origen importa.

Si desarrollás tus propias apps, podés inspeccionar su código antes de empaquetarlas con Forge.

## 🚀 Cómo usarlo

Puedes usar MyHubHestudio de dos formas:

### 1. En línea (Recomendado)

Haz clic en el botón de **[Abrir MyHubHestudio](https://viche-studios.github.io/MyHubHestudio/)** para entrar a la versión estable v2.1.0 alojada en GitHub Pages.

### 2. En local

Si quieres probar el código, modificarlo o desarrollar tus propias apps:

1. Clona este repositorio:

   ```bash
   git clone https://github.com/VicHe-studios/MyHubHestudio.git
   ```

2. Ejecuta el archivo `iniciar.bat` (Windows) o abre una terminal en la carpeta y escribe:

   ```bash
   python -m http.server 8000
   ```

3. Abre tu navegador y ve a `http://localhost:8000`

## 🧑‍💻 ¿Cómo crear una App?

Crear una app para MyHubHestudio es muy sencillo. Solo necesitas un archivo `manifest.json` y un archivo `index.html`.

### Regla de oro: 1 solo HTML + manifest

Para garantizar que tu app cargue de forma instantánea y sin errores de rutas dentro del sistema, la app instalable **debe** constar únicamente de 2 archivos:

```
MiApp.zip
 ┣ 📜 manifest.json  (Obligatorio)
 ┗ 📜 index.html     (Obligatorio, contiene TODO el HTML, CSS y JS)
```

**No uses archivos separados** como `style.css`, `app.js` o carpetas de imágenes. En su lugar, integra todo dentro del `index.html` usando las etiquetas `<style>` para el diseño y `<script>` para la lógica.

### Ejemplo de `manifest.json`

```json
{
  "id": "mi-app-he",
  "titulo": "Mi App Increíble",
  "icono": "layout",
  "main": "index.html",
  "autor": "VicHeStudios",
  "descripcion": "Una app que hace cosas increíbles"
}
```

**Campos del manifest:**

| Campo | Obligatorio | Descripción |
|---|---|---|
| `id` | ✅ | Identificador único, sin espacios ni mayúsculas. Formato: `nombre-descriptivo-he` |
| `titulo` | ✅ | Nombre visible bajo el icono. Formato: `Nombre-App` |
| `icono` | ✅ | Nombre exacto del icono en [Lucide](https://lucide.dev/) (ej. `calculator`, `cloud-sun`) |
| `main` | ✅ | Archivo HTML principal (generalmente `index.html`) |
| `autor` | ❌ | Creador de la app. Mejora la vista en Stor-He |
| `descripcion` | ❌ | Breve descripción sin punto final |

### Guía completa de desarrollo

Dentro del propio **MyHubHestudio**, abrí el menú de inicio y elegí **DocApps**. Se descargará un archivo `.txt` con la **Guía Definitiva de Desarrollo** ("ADN VicHeStudios"), que cubre:

- Las 3 formas de crear apps (instantánea, local, instalable)
- Layout de 3 ventanas fijas (~600px de ancho en 1920×1080)
- Variables CSS obligatorias y modo oscuro
- Sincronización de tema con el Lobby (`postMessage`)
- Convenciones de nomenclatura
- Comunicación con el Lobby (perfil de usuario, API global)
- Checklist antes de empaquetar
- Plantilla base completa lista para copiar y pegar

### Compatibilidad de tema

Toda app instalable **debe** escuchar el tema del sistema para verse integrada. Al inicio de tu `<script>`:

```js
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
```

## 🗂️ Estructura del proyecto

```
MyHubHestudio/
 ┣ 📜 index.html              ← Punto de entrada (Lobby)
 ┣ 📜 LobbyStyle.css          ← Estilos globales del sistema
 ┣ 📜 JsLobby.js              ← Kernel: ventanas, cuentas, ajustes, registro
 ┣ 📜 JsRutas.js              ← Rutas de apps del sistema (Papelera, Forge, Stor-He, CMD-HE)
 ┣ 📜 ExtraFunc.js            ← Extensiones: sonidos, atajos, backup, previews, context menu
 ┣ 📁 Apps/
 ┃  ┣ 📁 Papelera/
 ┃  ┣ 📁 Forge/
 ┃  ┣ 📁 StorHe/
 ┃  ┗ 📁 CMD-HE/
 ┗ 📁 vendor/
    ┣ 📜 lucide.min.js
    ┗ 📜 snd.js
```

## 🧩 Apps del sistema

| App | Descripción |
|---|---|
| 🗑️ **Papelera** | Desinstala apps y elimina carpetas del sistema |
| 🛠️ **Forge** | Instala apps desde archivos `.zip` locales |
| 🛒 **Stor-He** | Tienda oficial conectada al repositorio de GitHub |
| 🖥️ **CMD-HE** | Terminal con acceso al kernel, base de datos y perfil |

## ⌨️ Atajos de teclado

Por defecto, `Shift + tecla`:

| Atajo | Acción |
|---|---|
| `Shift + 1` | Abrir Papelera |
| `Shift + 2` | Abrir Forge |
| `Shift + 3` | Abrir Stor-He |
| `Shift + 4` | Abrir CMD-HE |
| `Shift + M` | Minimizar todas las ventanas |
| `Shift + C` | Cerrar todas las ventanas |
| `Shift + D` | Alternar tema (claro/oscuro) |
| `Shift + R` | Recargar escritorio |
| `Shift + N` | Nueva carpeta |
| `Shift + S` | Abrir configuración |
| `Shift + F` | Pantalla completa |

Todos los atajos son **configurables** desde el menú de Configuración.

## 🤝 Créditos

- **Creador y Desarrollo**: [VicHeStudios](https://github.com/VicHe-studios)
- **Iconografía**: [Lucide](https://lucide.dev/)
- **Manejo de ZIP**: [JSZip](https://stuk.github.io/jszip/)
- **Sonidos**: [snd-lib](https://github.com/nathanhoad/snd-lib)
- **Distribución de apps**: GitHub Raw + GitHub Pages

## 📄 Licencia

Proyecto personal desarrollado por VicHeStudios. Si querés contribuir o reportar bugs, abrí un issue en el repositorio.

---

Hecho con ❤️ por VicHeStudios
