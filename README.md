# 🚀 MyHubHestudio

> Tu Mini Web OS. Desarrolla apps en segundos o descarga utilidades pre-hechas para potenciar tu navegador.

[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen?style=for-the-badge)](https://viche-studios.github.io/MyHubHestudio/)
[![GitHub](https://img.shields.io/badge/GitHub-Repositorio-black?style=for-the-badge&logo=github)](https://github.com/VicHe-studios/MyHubHestudio)

**MyHubHestudio** es un entorno de escritorio ligero (Web OS) que corre directamente en tu navegador. No necesitas instalar nada, todo se guarda de forma local y segura en tu navegador mediante IndexedDB.

## ✨ Características

- 🖥️ **Escritorio Interactivo**: Sistema de ventanas (hasta 3 simultáneas) y organización de iconos por cuadrícula.
- 🎨 **Totalmente Personalizable**: Modos claro/oscuro, colores de acento dinámicos y fondos de pantalla personalizados.
- 🛠️ **Forge (Instalador)**: Arrastra un archivo `.zip` con tu app y se instalará en el sistema al instante.
- 🛒 **Stor-He (Tienda)**: Descarga aplicaciones directamente desde el repositorio de GitHub.
- 🗑️ **Gestión de Apps**: Papelera integrada para desinstalar apps y limpiar el sistema.
- 🔒 **Privacidad Primero**: Todo el ecosistema corre en Local-First. Tus datos, notas y ajustes nunca salen de tu navegador.

## 🚀 Cómo usarlo

Puedes usar MyHubHestudio de dos formas:

### 1. En línea (Recomendado)
Haz clic en el botón de **[Live Demo](https://viche-studios.github.io/MyHubHestudio/)** y empieza a usar el sistema sin configurar nada.

### 2. En local
Si quieres probar el código o modificarlo:
1. Clona este repositorio: `git clone https://github.com/VicHe-studios/MyHubHestudio.git`
2. Ejecuta el archivo `iniciar.bat` (Windows) o abre una terminal en la carpeta y escribe:
   `python -m http.server 8000`
3. Abre tu navegador y ve a `http://localhost:8000`

## 🧑‍💻 ¿Cómo crear una App?

Crear una app para MyHub es muy sencillo. Solo necesitas un archivo `manifest.json` y un archivo `index.html`.

**Ejemplo de `manifest.json`:**
```json
{
  "id": "mi-app",
  "titulo": "Mi App Increíble",
  "icono": "layout",
  "main": "index.html"
}
