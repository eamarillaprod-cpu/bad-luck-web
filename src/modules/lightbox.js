// ==========================================================================
// MÓDULO LIGHTBOX: VISUALIZADOR TIPO EBAY / AMAZON (src/modules/lightbox.js)
// --------------------------------------------------------------------------
// Galería en alta resolución con:
// 1. Carrusel lateral izquierdo con miniaturas para alternar fotos (Frente, Espalda, etc.)
// 2. Visor central con zoom interactivo 100% para revisar detalles y serigrafía.
// 3. Controles de navegación anterior / siguiente y atajos de teclado (Flechas).
// 4. Cumple con Modern Web: <dialog closedby="any"> y overscroll-behavior: contain.
// ==========================================================================

import { escapeHTML, sanitizeImageUrl } from '../data/products.js';
import { renderGarmentSVG } from './catalog.js';

let dialogEl = null;
let titleEl = null;
let badgeEl = null;
let imgEl = null;
let imgContainerEl = null;
let viewerEl = null;
let thumbsContainerEl = null;
let counterEl = null;
let prevBtn = null;
let nextBtn = null;
let zoomToggleBtn = null;
let zoomTextEl = null;
let closeBtn = null;

let currentProduct = null;
let currentImages = [];
let activeIndex = 0;
let isZoomed = false;

function setZoomState(zoomed) {
  isZoomed = Boolean(zoomed);
  if (imgContainerEl) {
    imgContainerEl.classList.toggle('is-zoomed', isZoomed);
  }
  if (zoomTextEl) {
    zoomTextEl.textContent = isZoomed ? 'Ajustar' : 'Zoom 100%';
  }
  if (zoomToggleBtn) {
    zoomToggleBtn.setAttribute(
      'title',
      isZoomed ? 'Ajustar imagen a la pantalla' : 'Ver en tamaño original'
    );
  }
}

function showActiveImage() {
  if (!currentImages.length) {
    // Si no tiene fotos subidas, mostramos el vector SVG
    if (imgEl) {
      imgEl.hidden = true;
      imgEl.removeAttribute('src');
    }
    let svgFallback = imgContainerEl?.querySelector('.lightbox-svg-fallback');
    if (!svgFallback) {
      svgFallback = document.createElement('div');
      svgFallback.className = 'lightbox-svg-fallback';
      imgContainerEl?.appendChild(svgFallback);
    }
    if (currentProduct) {
      svgFallback.innerHTML = renderGarmentSVG(currentProduct);
    }
    if (counterEl) counterEl.textContent = '';
    return;
  }

  const svgFallback = imgContainerEl?.querySelector('.lightbox-svg-fallback');
  if (svgFallback) svgFallback.remove();

  if (imgEl) {
    imgEl.hidden = false;
    imgEl.src = currentImages[activeIndex];
    imgEl.alt = `${currentProduct?.name || 'Prenda'} - Foto ${activeIndex + 1}`;
  }

  // Actualizar contador
  if (counterEl) {
    counterEl.textContent = `${activeIndex + 1} / ${currentImages.length}`;
  }

  // Actualizar miniatura activa
  if (thumbsContainerEl) {
    const thumbBtns = thumbsContainerEl.querySelectorAll('.lightbox-thumb');
    thumbBtns.forEach((btn, idx) => {
      btn.classList.toggle('is-active', idx === activeIndex);
      btn.setAttribute('aria-selected', String(idx === activeIndex));
    });
  }

  // Resetear zoom y scroll
  setZoomState(false);
  if (viewerEl) {
    viewerEl.scrollTop = 0;
    viewerEl.scrollLeft = 0;
  }
}

function renderThumbnails() {
  if (!thumbsContainerEl) return;

  if (currentImages.length <= 1) {
    thumbsContainerEl.style.display = 'none';
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    if (counterEl) counterEl.style.display = 'none';
    return;
  }

  thumbsContainerEl.style.display = 'flex';
  if (prevBtn) prevBtn.style.display = 'flex';
  if (nextBtn) nextBtn.style.display = 'flex';
  if (counterEl) counterEl.style.display = 'inline-block';

  thumbsContainerEl.innerHTML = currentImages
    .map((imgUrl, idx) => {
      let roleLabel = `Foto ${idx + 1}`;
      if (idx === 0) roleLabel = 'Frente';
      else if (idx === 1) roleLabel = 'Espalda';

      return `
        <button
          type="button"
          class="lightbox-thumb ${idx === activeIndex ? 'is-active' : ''}"
          data-thumb-idx="${idx}"
          role="tab"
          aria-selected="${idx === activeIndex ? 'true' : 'false'}"
          aria-label="Ver ${roleLabel}"
        >
          <img src="${escapeHTML(imgUrl)}" alt="${roleLabel}" loading="lazy" decoding="async" fetchpriority="low" />
          <span class="lightbox-thumb__tag">${roleLabel}</span>
        </button>
      `;
    })
    .join('');
}

/**
 * Abre el lightbox estilo eBay/Amazon con galería a la izquierda y visor grande.
 */
export function openLightbox(product, initialIndex = 0) {
  if (!dialogEl) {
    initLightbox();
  }
  if (!dialogEl || !product) return;

  currentProduct = product;
  currentImages =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images.map(sanitizeImageUrl).filter(Boolean)
      : sanitizeImageUrl(product.imageUrl)
        ? [sanitizeImageUrl(product.imageUrl)]
        : [];

  activeIndex = Math.max(0, Math.min(initialIndex, Math.max(0, currentImages.length - 1)));

  if (titleEl) {
    titleEl.textContent = product.name;
  }
  if (badgeEl) {
    const categoryText = product.categoryLabel || '';
    const badgeText = product.badge || 'Drop';
    badgeEl.textContent = categoryText ? `${categoryText} • ${badgeText}` : badgeText;
  }

  renderThumbnails();
  showActiveImage();

  dialogEl.showModal();
}

/**
 * Inicializa los eventos y controles del diálogo lightbox.
 */
export function initLightbox() {
  dialogEl = document.querySelector('#image-lightbox-dialog');
  if (!dialogEl) return;

  titleEl = dialogEl.querySelector('#lightbox-product-title');
  badgeEl = dialogEl.querySelector('#lightbox-product-badge');
  imgEl = dialogEl.querySelector('#lightbox-img');
  imgContainerEl = dialogEl.querySelector('#lightbox-img-container');
  viewerEl = dialogEl.querySelector('#lightbox-viewer');
  thumbsContainerEl = dialogEl.querySelector('#lightbox-thumbs');
  counterEl = dialogEl.querySelector('#lightbox-counter');
  prevBtn = dialogEl.querySelector('#lightbox-prev-btn');
  nextBtn = dialogEl.querySelector('#lightbox-next-btn');
  zoomToggleBtn = dialogEl.querySelector('#lightbox-zoom-toggle');
  zoomTextEl = dialogEl.querySelector('#lightbox-zoom-text');
  closeBtn = dialogEl.querySelector('#lightbox-close-btn');

  // Cerrar con botón X
  closeBtn?.addEventListener('click', () => {
    dialogEl.close();
  });

  // Alternar zoom haciendo clic en la imagen
  imgContainerEl?.addEventListener('click', () => {
    setZoomState(!isZoomed);
  });

  // Alternar zoom con el botón de la barra de controles
  zoomToggleBtn?.addEventListener('click', () => {
    setZoomState(!isZoomed);
  });

  // Selección de foto desde la barra de miniaturas izquierda
  thumbsContainerEl?.addEventListener('click', (event) => {
    const thumbBtn = event.target.closest('[data-thumb-idx]');
    if (!thumbBtn) return;
    const targetIdx = Number(thumbBtn.dataset.thumbIdx);
    if (Number.isFinite(targetIdx) && targetIdx >= 0 && targetIdx < currentImages.length) {
      activeIndex = targetIdx;
      showActiveImage();
    }
  });

  // Navegación con flechas anterior / siguiente
  prevBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (currentImages.length > 1) {
      activeIndex = (activeIndex - 1 + currentImages.length) % currentImages.length;
      showActiveImage();
    }
  });

  nextBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (currentImages.length > 1) {
      activeIndex = (activeIndex + 1) % currentImages.length;
      showActiveImage();
    }
  });

  // Atajos de teclado mientras el diálogo está abierto
  dialogEl.addEventListener('keydown', (event) => {
    if (!dialogEl.open || currentImages.length <= 1) return;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = (activeIndex - 1 + currentImages.length) % currentImages.length;
      showActiveImage();
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % currentImages.length;
      showActiveImage();
    }
  });

  // Resetear estado al cerrar el modal
  dialogEl.addEventListener('close', () => {
    setZoomState(false);
    currentProduct = null;
    currentImages = [];
    activeIndex = 0;
    if (imgEl) imgEl.removeAttribute('src');
  });

  // Fallback para navegadores sin soporte nativo de <dialog closedby="any">
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialogEl.addEventListener('click', (event) => {
      if (event.target !== dialogEl) return;
      const rect = dialogEl.getBoundingClientRect();
      const isInside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isInside) {
        dialogEl.close();
      }
    });
  }
}
