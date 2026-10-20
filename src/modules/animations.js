// ==========================================================================
// MÓDULO 6: OBSERVADORES DE SCROLL — REVEAL & SCROLLSPY
// (src/modules/animations.js)
// --------------------------------------------------------------------------
// Qué vas a aprender en este archivo:
// Cómo funciona `IntersectionObserver`: la herramienta moderna del navegador
// para saber cuándo un elemento entra o sale de la pantalla del usuario sin
// sobrecargar el procesador escuchando el evento `scroll` en cada píxel.
// ==========================================================================

export function initAnimations() {
  // 1. ANIMACIÓN DE APARICIÓN AL HACER SCROLL (.reveal-on-scroll)
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) {
    revealElements.forEach((el) => el.classList.add('is-visible'));
  } else if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            // Dejamos de observar una vez que ya apareció
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15, // Se activa cuando el 15% del elemento ya es visible
        rootMargin: '0px 0px -40px 0px',
      }
    );

    revealElements.forEach((el) => revealObserver.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add('is-visible'));
  }

  // 2. SCROLLSPY: Iluminar en el menú superior la sección actual
  // (Fallback para navegadores que aún no soportan `scroll-target-group: auto` en CSS)
  const supportsScrollTargetGroup =
    window.CSS?.supports?.('scroll-target-group: auto') ?? false;

  if (!supportsScrollTargetGroup && 'IntersectionObserver' in window) {
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    const sections = document.querySelectorAll('main section[id]');

    const spyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            navLinks.forEach((link) => {
              const isActive = link.getAttribute('href') === `#${id}`;
              link.classList.toggle(':target-current', isActive);
              if (isActive) {
                link.setAttribute('aria-current', 'true');
              } else {
                link.removeAttribute('aria-current');
              }
            });
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );

    sections.forEach((section) => spyObserver.observe(section));
  }
}
