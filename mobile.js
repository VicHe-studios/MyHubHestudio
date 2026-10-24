// mobile.js — Adaptaciones de MyHub para móvil (carousel horizontal)
(function () {
  'use strict';

  const MQ = () => matchMedia('(max-width: 768px)').matches;

  // Esperar a que el Lobby esté listo
  const init = () => {
    if (!window.MyHub || !document.getElementById('desktop')) {
      return setTimeout(init, 100);
    }
    if (MQ()) setup();
    // Si cambia de breakpoint, ofrecemos recargar (evita estado mixto)
    const mql = matchMedia('(max-width: 768px)');
    let wasMobile = MQ();
    mql.addEventListener('change', () => {
      if (wasMobile !== MQ()) {
        window.MyHub.toast('Recargá la página para aplicar el nuevo layout');
        wasMobile = MQ();
      }
    });
  };

  function setup() {
    const desk = document.getElementById('desktop');
    window.__mobileActive = true;
    console.log('[mobile.js] Modo carousel activo.');

    // ─────────────────────────────────────────────
    // 1) Scroll suave hacia un elemento slide
    // ─────────────────────────────────────────────
    const scrollToEl = (el) => {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    };

    // ─────────────────────────────────────────────
    // 2) Scroll automático al abrir una ventana
    // ─────────────────────────────────────────────
    const newWinObs = new MutationObserver((muts) => {
      muts.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList.contains('win')) {
            setTimeout(() => scrollToEl(node), 60);
            // Observar cambios de clase para scroll al recibir .focused
            classObs.observe(node, { attributes: true, attributeFilter: ['class'] });
          }
        });
        // Sin ventanas → volver a iconos
        if (m.removedNodes.length && desk.querySelectorAll('.win').length === 0) {
          setTimeout(() => desk.scrollTo({ left: 0, behavior: 'smooth' }), 60);
        }
      });
    });

    const classObs = new MutationObserver((muts) => {
      muts.forEach((m) => {
        if (!m.target.classList.contains('win')) return;
        if (m.target.classList.contains('focused')) {
          setTimeout(() => scrollToEl(m.target), 20);
        }
      });
    });

    // Observar ventanas existentes al iniciar
    desk.querySelectorAll('.win').forEach((w) =>
      classObs.observe(w, { attributes: true, attributeFilter: ['class'] })
    );
    newWinObs.observe(desk, { childList: true });

    // ─────────────────────────────────────────────
    // 3) Sincronizar taskbar con scroll manual
    // ─────────────────────────────────────────────
    let scrollT;
    desk.addEventListener('scroll', () => {
      clearTimeout(scrollT);
      scrollT = setTimeout(() => {
        const vw = window.innerWidth;
        const idx = Math.round(desk.scrollLeft / vw);
        const wins = [...desk.querySelectorAll('.win')];
        // Limpiar active
        document.querySelectorAll('.task').forEach((t) => t.classList.remove('active'));
        if (idx > 0 && wins[idx - 1]) {
          const winEl = wins[idx - 1];
          const title = winEl.querySelector('.titlebar span')?.textContent;
          if (title) {
            document.querySelectorAll('.task').forEach((t) => {
              if (t.getAttribute('title') === title) t.classList.add('active');
            });
          }
          // Reflejar foco visual en la ventana
          wins.forEach((w) => w.classList.toggle('focused', w === winEl));
        }
      }, 80);
    }, { passive: true });

    // ─────────────────────────────────────────────
    // 4) Scroll al toque sobre la taskbar
    //    (JsLobby llama enfocar() en click, pero si ya estaba
    //     enfocada, no cambia clases → scroll manual)
    // ─────────────────────────────────────────────
    document.addEventListener('pointerup', (e) => {
      if (!MQ()) return;
      const task = e.target.closest('.task');
      if (!task) return;
      setTimeout(() => {
        const focusedWin = desk.querySelector('.win.focused');
        if (focusedWin) scrollToEl(focusedWin);
      }, 120);
    }, true);

    // ─────────────────────────────────────────────
    // 5) Bloquear drag de titlebar → permitir swipe
    // ─────────────────────────────────────────────
    document.addEventListener('pointerdown', (e) => {
      if (!MQ()) return;
      if (e.target.closest('.titlebar') && !e.target.closest('.close')) {
        // Captura antes que JsLobby (bubble) → el swipe horizontal queda libre
        e.stopImmediatePropagation();
      }
    }, true);

    // ─────────────────────────────────────────────
    // 6) Long-press en icono → menú contextual
    //    Tap → abrir / abrir carpeta
    // ─────────────────────────────────────────────
    document.addEventListener('pointerdown', (e) => {
      if (!MQ()) return;
      const icon = e.target.closest('.icon');
      if (!icon) return;

      // Bloquear drag nativo de JsLobby
      e.stopImmediatePropagation();

      const appId = icon.dataset.appId;
      const folderId = icon.dataset.folderId;
      const startX = e.clientX, startY = e.clientY;
      let fired = false, moved = false;

      const timer = setTimeout(() => {
        fired = true;
        navigator.vibrate?.(20);
        if (appId && typeof window.contextoApp === 'function') {
          window.contextoApp(e, appId);
        } else if (folderId && typeof window.contextoCarpeta === 'function') {
          window.contextoCarpeta(e, folderId);
        }
      }, 450);

      const onMove = (mv) => {
        if (Math.hypot(mv.clientX - startX, mv.clientY - startY) > 10) {
          moved = true;
          clearTimeout(timer);
        }
      };
      const onUp = () => {
        clearTimeout(timer);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (fired || moved) return;
        // Fue un tap
        if (appId) {
          window.MyHub?.abrir?.(appId);
        } else if (folderId && typeof window.abrirCarpeta === 'function') {
          window.abrirCarpeta(folderId);
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    }, true);

    // ─────────────────────────────────────────────
    // 7) Long-press en fondo del escritorio → menú contextual
    //    (bubble para no interferir con scroll)
    // ─────────────────────────────────────────────
    document.addEventListener('pointerdown', (e) => {
      if (!MQ()) return;
      const onBg =
        e.target.id === 'desktop' ||
        e.target.id === 'icons' ||
        (e.target.closest('#desktop') &&
          !e.target.closest('.icon') &&
          !e.target.closest('.win') &&
          !e.target.closest('.widget-container'));
      if (!onBg) return;

      const startX = e.clientX, startY = e.clientY;
      let moved = false;

      const timer = setTimeout(() => {
        if (!moved && typeof window.contextoDesktop === 'function') {
          navigator.vibrate?.(20);
          window.contextoDesktop(e);
        }
      }, 500);

      const onMove = (mv) => {
        if (Math.hypot(mv.clientX - startX, mv.clientY - startY) > 10) {
          moved = true;
          clearTimeout(timer);
        }
      };
      const onUp = () => {
        clearTimeout(timer);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    }, false);

    // ─────────────────────────────────────────────
    // 8) Suprimir menú nativo del navegador
    // ─────────────────────────────────────────────
    document.addEventListener('contextmenu', (e) => {
      if (!MQ()) return;
      if (e.target.closest('#desktop')) e.preventDefault();
    });

    // ─────────────────────────────────────────────
    // 9) Botón "atrás" → cierra ventana / sale
    // ─────────────────────────────────────────────
    history.pushState({ mh: 'home' }, '');
    let exitArmed = false;

    window.addEventListener('popstate', () => {
      if (!MQ()) return;
      const vw = window.innerWidth;
      const idx = Math.round(desk.scrollLeft / vw);

      if (idx > 0) {
        // Cerrar la ventana visible (usando su botón para pasar por JsLobby)
        const winEl = desk.querySelectorAll('.win')[idx - 1];
        const closeBtn = winEl?.querySelector('.close:not(.minimize):not(.reload-btn):not(.expand-btn)');
        closeBtn?.click();
        history.pushState({ mh: 'home' }, '');
        exitArmed = false;
        return;
      }

      if (!exitArmed) {
        exitArmed = true;
        history.pushState({ mh: 'home' }, '');
        window.MyHub?.toast?.('Presioná atrás otra vez para salir');
        setTimeout(() => { exitArmed = false; }, 2000);
        return;
      }
      exitArmed = false;
      history.back();
    });

    // ─────────────────────────────────────────────
    // 10) Rotación de pantalla
    // ─────────────────────────────────────────────
    window.addEventListener('orientationchange', () => {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 250);
      // Reposicionar al slide actual
      setTimeout(() => {
        const idx = Math.round(desk.scrollLeft / window.innerWidth);
        desk.scrollTo({ left: idx * window.innerWidth, behavior: 'auto' });
      }, 350);
    });

    // ─────────────────────────────────────────────
    // 11) Evitar bounce elástico del body
    // ─────────────────────────────────────────────
    document.addEventListener('touchmove', (e) => {
      if (!MQ()) return;
      const t = e.target;
      const permitido =
        t.closest('#desktop') ||
        t.closest('.modal') ||
        t.closest('.menu') ||
        t.closest('#taskbar');
      if (!permitido && (t === document.body || t === document.documentElement)) {
        e.preventDefault();
      }
    }, { passive: false });

    // ─────────────────────────────────────────────
    // 12) Haptics sutiles en acciones clave
    // ─────────────────────────────────────────────
    document.addEventListener('pointerup', (e) => {
      if (!MQ()) return;
      if (e.target.closest('.task, .btn, .menu-op, .close')) {
        navigator.vibrate?.(8);
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();
