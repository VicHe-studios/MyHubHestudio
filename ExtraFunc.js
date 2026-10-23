// ============================================================================
// ExtraFunc.js
// ----------------------------------------------------------------------------
// Este archivo está reservado para futuras extensiones del Lobby.
// La funcionalidad base (carpetas, quick launch, status pill, edición de
// perfil, drag-into-folder, menús contextuales, etc.) ya está fusionada
// dentro de JsLobby.js.
//
// Si necesitas añadir algo nuevo que NO deba modificar el core del Lobby,
// escríbelo aquí. Se carga DESPUÉS de JsLobby.js, así que tienes acceso a:
//
//   window.MyHub.*          (API pública)
//   window.registro         (Map de apps)
//   window.orden            (array de IDs)
//   window.posicionesIconos (objeto de posiciones)
//   window.carpetas         (objeto de carpetas)
//   window.pinnedApps       (array de pinned)
//
// Ejemplo:
//   (async () => {
//     // código de extensión
//   })();
// ============================================================================
