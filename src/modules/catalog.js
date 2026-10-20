// ==========================================================================
// MÓDULO 3 & 7: CATÁLOGO CONECTADO AL ALMACÉN CENTRAL (src/modules/catalog.js)
// --------------------------------------------------------------------------
// Ahora el catálogo no lee una lista fija, sino que consulta `store.js`:
// - Soporta fotos reales (`product.imageUrl`) subidas desde `/davedave` o el
//   gráfico SVG si no se subió foto.
// - Soporta el estado "Agotado" (`product.inStock === false`).
// - Escucha `subscribeToStore()` para actualizarse en vivo apenas edites algo
//   en `/davedave`.
// ==========================================================================

import {
  escapeHTML,
  formatGuaranies,
  sanitizeImageUrl,
} from '../data/products.js';
import {
  getCategories,
  getProducts,
  getSettings,
  subscribeToStore,
} from '../data/store.js';
import { openLightbox } from './lightbox.js';

/**
 * Genera el gráfico central del estampado en SVG según el símbolo de cada prenda.
 */
export function renderSymbolSVG(symbol) {
  switch (symbol) {
    case 'lightning':
      return `
        <circle cx="160" cy="130" r="24" stroke="#DCDDD0" stroke-width="2" />
        <path d="M164 110 L150 131 L161 131 L155 152 L171 129 L160 129 Z" fill="#DCDDD0" />
      `;
    case 'skull-star':
      return `
        <polygon points="160,106 166,123 184,123 170,134 175,151 160,140 145,151 150,134 136,123 154,123" stroke="#DCDDD0" stroke-width="2" fill="none" />
        <circle cx="160" cy="131" r="6" fill="#DCDDD0" />
      `;
    case 'dice':
      return `
        <rect x="138" y="108" width="44" height="44" rx="6" stroke="#DCDDD0" stroke-width="2" />
        <circle cx="150" cy="120" r="3.5" fill="#DCDDD0" />
        <circle cx="160" cy="130" r="3.5" fill="#DCDDD0" />
        <circle cx="170" cy="140" r="3.5" fill="#DCDDD0" />
        <circle cx="170" cy="120" r="3.5" fill="#DCDDD0" />
        <circle cx="150" cy="140" r="3.5" fill="#DCDDD0" />
      `;
    case 'pass':
      return `
        <rect x="136" y="106" width="48" height="48" rx="3" stroke="#DCDDD0" stroke-width="2" stroke-dasharray="5 3" />
        <text x="160" y="137" text-anchor="middle" fill="#DCDDD0" font-family="BadLuckCustom, Bebas Neue, sans-serif" font-size="22" letter-spacing="2">VIP</text>
      `;
    case 'vinyl':
      return `
        <circle cx="160" cy="130" r="24" stroke="#DCDDD0" stroke-width="2" />
        <circle cx="160" cy="130" r="15" stroke="#8E8E96" stroke-width="1" stroke-dasharray="3 3" />
        <circle cx="160" cy="130" r="6" fill="#DCDDD0" />
      `;
    default:
      return `
        <circle cx="160" cy="130" r="22" stroke="#DCDDD0" stroke-width="2" />
        <line x1="132" y1="130" x2="188" y2="130" stroke="#DCDDD0" stroke-width="1.5" />
        <line x1="160" y1="102" x2="160" y2="158" stroke="#DCDDD0" stroke-width="1.5" />
      `;
  }
}

/**
 * Genera el SVG completo de la prenda (Remera o Buzo/Hoodie) con su estampado.
 */
export function renderGarmentSVG(product) {
  const isHoodie = product.garmentType === 'hoodie';

  const silhouette = isHoodie
    ? `
      <path d="M118 28 C125 8 195 8 202 28 L232 38 L296 95 L272 288 L238 288 L232 130 L226 308 L94 308 L88 130 L82 288 L48 288 L24 95 L88 38 Z" fill="#141418" stroke="#DCDDD0" stroke-width="2.8" stroke-linejoin="round" />
      <path d="M114 235 L206 235 L216 286 L104 286 Z" fill="#101014" stroke="#26262E" stroke-width="2" />
    `
    : `
      <path d="M95 30 L125 22 C138 38 182 38 195 22 L225 30 L295 85 L262 142 L228 118 L228 308 L92 308 L92 118 L58 142 L25 85 Z" fill="#141418" stroke="#DCDDD0" stroke-width="2.8" stroke-linejoin="round" />
      <path d="M122 24 C138 44 182 44 198 24 C192 48 128 48 122 24 Z" fill="#0A0A0C" stroke="#DCDDD0" stroke-width="2" />
    `;

  return `
    <svg class="product-card__svg" viewBox="0 0 320 330" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${silhouette}
      <rect x="120" y="88" width="80" height="106" rx="2" fill="#0A0A0C" stroke="#DCDDD0" stroke-width="1.5" />
      ${renderSymbolSVG(product.graphicSymbol)}
      <text x="160" y="174" text-anchor="middle" fill="#DCDDD0" font-family="BadLuckCustom, Bebas Neue, sans-serif" font-size="14" letter-spacing="2">
        ${escapeHTML(product.graphicTitle || 'BAD LUCK')}
      </text>
      <text x="160" y="186" text-anchor="middle" fill="#8E8E96" font-family="Space Grotesk, sans-serif" font-size="6.5" letter-spacing="1.5">
        ${escapeHTML(product.graphicSubtitle || 'CUSTOM PY')}
      </text>
    </svg>
  `;
}

/**
 * Renderiza la foto real subida en `/davedave` o el SVG vectorial por defecto.
 * Soporta múltiples fotos (Frente, Espalda, Detalles).
 */
export function renderProductVisual(product, activeIndex = 0) {
  const images =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images.map(sanitizeImageUrl).filter(Boolean)
      : sanitizeImageUrl(product.imageUrl)
        ? [sanitizeImageUrl(product.imageUrl)]
        : [];

  if (images.length > 0) {
    const currentImg = images[activeIndex] || images[0];
    return `<img class="product-card__img" src="${escapeHTML(currentImg)}" alt="${escapeHTML(product.name)}" loading="lazy" decoding="async" />`;
  }
  return renderGarmentSVG(product);
}

/**
 * Calcula el precio final de una prenda según el corte elegido (Clásico vs. Oversize),
 * la calidad seleccionada (Básica vs. Premium) y el talle (XXL con costo adicional).
 */
export function calculateProductPrice(
  product,
  selectedCut,
  qualityExtra = 0,
  selectedSize = 'L'
) {
  let price = Number(product.basePrice);
  if (selectedCut === 'Oversize') {
    price += Number(product.oversizeExtra || 0);
  }
  price += Number(qualityExtra || 0);
  if (selectedSize === 'XXL') {
    const { customPrices } = getSettings();
    price += Number(customPrices?.sizeXxlExtra || 0);
  }
  return price;
}

/**
 * Crea el HTML de una tarjeta de producto individual.
 */
function createProductCardHTML(product, index = 0) {
  const isAvailable = product.inStock !== false;
  const { qualities = [], customPrices } = getSettings();
  const defaultQuality =
    qualities[0] || { id: 'basica', name: 'Básica', extraPrice: 0 };
  const initialPrice = calculateProductPrice(
    product,
    product.defaultCut,
    defaultQuality.extraPrice,
    product.defaultSize
  );

  const safeProductId = escapeHTML(product.id);
  const cutsHTML = (product.cuts || ['Oversize', 'Clásico'])
    .map(
      (cut) => `
      <label class="option-pill">
        <input
          type="radio"
          name="cut-${safeProductId}"
          value="${escapeHTML(cut)}"
          data-role="cut-selector"
          ${cut === product.defaultCut ? 'checked' : ''}
        />
        <span>${escapeHTML(cut)}</span>
      </label>
    `
    )
    .join('');

  const qualitiesHTML = qualities
    .map(
      (q, qIdx) => `
      <label class="option-pill" title="${escapeHTML(q.description || '')}">
        <input
          type="radio"
          name="quality-${safeProductId}"
          value="${escapeHTML(q.id)}"
          data-role="quality-selector"
          data-extra="${Number(q.extraPrice) || 0}"
          ${qIdx === 0 ? 'checked' : ''}
        />
        <span>${escapeHTML(q.name)}</span>${
          Number(q.extraPrice) > 0
            ? `<span class="option-pill__extra">(+${formatGuaranies(q.extraPrice)})</span>`
            : ''
        }
      </label>
    `
    )
    .join('');

  const xxlExtra = Number(customPrices?.sizeXxlExtra) || 0;
  const sizesHTML = (product.sizes || ['S', 'M', 'L', 'XL'])
    .map(
      (size) => `
      <label class="option-pill">
        <input
          type="radio"
          name="size-${safeProductId}"
          value="${escapeHTML(size)}"
          data-role="size-selector"
          ${size === product.defaultSize ? 'checked' : ''}
        />
        <span>${escapeHTML(size)}</span>${
          size === 'XXL' && xxlExtra > 0
            ? `<span class="option-pill__extra">(+${formatGuaranies(xxlExtra)})</span>`
            : ''
        }
      </label>
    `
    )
    .join('');

  const productImages =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images.map(sanitizeImageUrl).filter(Boolean)
      : sanitizeImageUrl(product.imageUrl)
        ? [sanitizeImageUrl(product.imageUrl)]
        : [];
  const hasMultipleImages = productImages.length > 1;

  return `
    <article
      class="product-card ${isAvailable ? '' : 'is-out-of-stock'}"
      data-product-id="${safeProductId}"
      style="--card-idx: ${index};"
    >
      <div
        class="product-card__media ${hasMultipleImages ? 'has-multiple-images' : ''}"
        data-action="open-lightbox"
        data-current-img-idx="0"
        tabindex="0"
        role="button"
        aria-label="Ver foto de ${escapeHTML(product.name)} en alta resolución"
        title="Clic para ver foto en alta resolución"
      >
        <span class="product-card__badge">
          ${isAvailable ? escapeHTML(product.badge) : 'Agotado'}
        </span>
        <span class="product-card__category">${escapeHTML(product.categoryLabel || '')}</span>
        ${renderProductVisual(product, 0)}

        ${
          hasMultipleImages
            ? `
          <button
            type="button"
            class="product-card__nav-btn product-card__nav-btn--prev"
            data-action="prev-card-image"
            aria-label="Foto anterior"
            title="Foto anterior"
          >
            ‹
          </button>

          <button
            type="button"
            class="product-card__nav-btn product-card__nav-btn--next"
            data-action="next-card-image"
            aria-label="Siguiente foto"
            title="Siguiente foto"
          >
            ›
          </button>

          <div class="product-card__dots" aria-label="Fotos disponibles">
            ${productImages
              .map(
                (_, dIdx) => `
              <button
                type="button"
                class="product-card__dot ${dIdx === 0 ? 'is-active' : ''}"
                data-action="goto-card-image"
                data-img-index="${dIdx}"
                aria-label="Ir a foto ${dIdx + 1}"
              ></button>
            `
              )
              .join('')}
          </div>
        `
            : ''
        }

        <div class="product-card__zoom-hint" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          <span>Ver detalle</span>
        </div>
      </div>

      <div class="product-card__body">
        <div>
          <h3 class="product-card__title">${escapeHTML(product.name)}</h3>
          <p class="product-card__desc">${escapeHTML(product.description)}</p>
        </div>

        <div class="product-options">
          <div class="option-row">
            <span class="option-label">Corte:</span>
            <div class="option-pills" role="radiogroup" aria-label="Seleccionar corte">
              ${cutsHTML}
            </div>
          </div>

          ${
            qualities.length > 0
              ? `
          <div class="option-row">
            <span class="option-label">Calidad:</span>
            <div class="option-pills" role="radiogroup" aria-label="Seleccionar calidad de tela">
              ${qualitiesHTML}
            </div>
          </div>
          `
              : ''
          }

          <div class="option-row">
            <span class="option-label">Talle:</span>
            <div class="option-pills" role="radiogroup" aria-label="Seleccionar talle">
              ${sizesHTML}
            </div>
          </div>
        </div>

        <div class="product-card__footer">
          <div class="product-price">
            <span class="product-price__label">Precio final</span>
            <strong class="product-price__value" data-price-display>
              ${formatGuaranies(initialPrice)}
            </strong>
          </div>

          <button
            type="button"
            class="btn btn-primary add-to-cart-btn"
            data-action="add-to-cart"
            ${isAvailable ? '' : 'disabled'}
          >
            ${isAvailable ? '+ Sumar al Carrito' : 'Sin Stock'}
          </button>
        </div>
      </div>
    </article>
  `;
}

export function initCatalog() {
  const filterContainer = document.querySelector('#catalog-filters');
  const gridContainer = document.querySelector('#catalog-grid');
  const paginationContainer = document.querySelector('#catalog-pagination');

  if (!filterContainer || !gridContainer) return;

  const ITEMS_PER_PAGE = 6;
  let activeCategory = 'todos';
  let currentPage = 1;
  let transitionTimer = null;

  function renderFilters() {
    const categories = getCategories({ includeAll: true });
    // Si la categoría activa fue eliminada desde /davedave, volvemos a "todos"
    if (!categories.some((c) => c.id === activeCategory)) {
      activeCategory = 'todos';
      currentPage = 1;
    }

    filterContainer.innerHTML = categories
      .map(
        (cat) => `
      <button
        type="button"
        class="filter-btn"
        data-category="${escapeHTML(cat.id)}"
        aria-pressed="${cat.id === activeCategory}"
      >
        ${escapeHTML(cat.label)}
      </button>
    `
      )
      .join('');
  }

  function renderPagination(totalItems, totalPages) {
    if (!paginationContainer) return;

    if (totalItems === 0) {
      paginationContainer.innerHTML = '';
      paginationContainer.hidden = true;
      return;
    }

    paginationContainer.hidden = false;

    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    const pageButtonsHTML = Array.from({ length: totalPages }, (_, idx) => {
      const pageNum = idx + 1;
      const isCurrent = pageNum === currentPage;
      return `
        <button
          type="button"
          class="pagination-page-btn"
          data-page="${pageNum}"
          aria-current="${isCurrent ? 'page' : 'false'}"
          aria-label="Ir a la página ${pageNum}"
        >
          ${pageNum}
        </button>
      `;
    }).join('');

    paginationContainer.innerHTML = `
      <span class="pagination-info">
        Mostrando <strong>${startItem}–${endItem}</strong> de <strong>${totalItems}</strong> prendas
      </span>
      <div class="pagination-controls">
        <button
          type="button"
          class="pagination-nav-btn"
          data-page="${currentPage - 1}"
          ${currentPage <= 1 ? 'disabled' : ''}
          aria-label="Página anterior"
        >
          ← Anterior
        </button>
        <div class="pagination-pages">
          ${pageButtonsHTML}
        </div>
        <button
          type="button"
          class="pagination-nav-btn"
          data-page="${currentPage + 1}"
          ${currentPage >= totalPages ? 'disabled' : ''}
          aria-label="Página siguiente"
        >
          Siguiente →
        </button>
      </div>
    `;
  }

  function renderProducts(category) {
    const allProducts = getProducts();
    const filtered =
      category === 'todos'
        ? allProducts
        : allProducts.filter((item) => item.category === category);

    if (filtered.length === 0) {
      gridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; padding: var(--space-2xl); text-align: center; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
          <p style="margin-inline: auto;">No hay prendas cargadas en esta colección todavía.</p>
        </div>
      `;
      renderPagination(0, 0);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    if (currentPage < 1) {
      currentPage = 1;
    }

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    gridContainer.innerHTML = paginatedItems
      .map((item, idx) => createProductCardHTML(item, idx))
      .join('');
    renderPagination(filtered.length, totalPages);
  }

  /**
   * Opción 2: Carrusel horizontal por bloques (Slide de grilla completa).
   * - Si avanza ('next'): el bloque completo sale hacia la izquierda y el nuevo entra desde la derecha.
   * - Si retrocede ('prev'): el bloque completo sale hacia la derecha y el nuevo entra desde la izquierda.
   */
  function transitionCatalogView(direction = 'next', shouldScrollIfNeeded = false) {
    clearTimeout(transitionTimer);

    const previousHeight = gridContainer.offsetHeight;
    if (previousHeight > 0) {
      gridContainer.style.minHeight = `${previousHeight}px`;
    }

    gridContainer.classList.remove('is-entering-next', 'is-entering-prev');
    gridContainer.classList.add(
      direction === 'prev' ? 'is-exiting-prev' : 'is-exiting-next'
    );

    if (shouldScrollIfNeeded) {
      const filterTop = filterContainer.getBoundingClientRect().top;
      if (filterTop < 70) {
        const targetY = window.scrollY + filterTop - 95;
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
      }
    }

    transitionTimer = setTimeout(() => {
      renderProducts(activeCategory);
      gridContainer.classList.remove('is-exiting-next', 'is-exiting-prev');
      // Forzar reflow para disparar la animación de entrada en bloque desde el lado opuesto
      void gridContainer.offsetWidth;
      gridContainer.classList.add(
        direction === 'prev' ? 'is-entering-prev' : 'is-entering-next'
      );

      requestAnimationFrame(() => {
        gridContainer.style.minHeight = '';
      });
    }, 170);
  }

  renderFilters();
  renderProducts(activeCategory);

  // Sincronización en tiempo real cuando se edita en /davedave
  subscribeToStore(() => {
    renderFilters();
    renderProducts(activeCategory);
  });

  // Evento de filtrado por categoría
  filterContainer.addEventListener('click', (event) => {
    const btn = event.target.closest('.filter-btn');
    if (!btn) return;

    const selectedCategory = btn.dataset.category;
    if (selectedCategory === activeCategory) return;

    activeCategory = selectedCategory;
    currentPage = 1;
    renderFilters();
    transitionCatalogView('next', false);
  });

  // Evento de cambio de página
  paginationContainer?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-page]');
    if (!btn || btn.disabled) return;

    const targetPage = Number(btn.dataset.page);
    if (!Number.isFinite(targetPage) || targetPage === currentPage) return;

    const direction = targetPage > currentPage ? 'next' : 'prev';
    currentPage = targetPage;
    transitionCatalogView(direction, true);
  });

  // Delegación de Eventos: Actualizar precio cuando cambia el Corte, la Calidad o el Talle
  gridContainer.addEventListener('change', (event) => {
    const input = event.target;
    if (
      input.dataset.role !== 'cut-selector' &&
      input.dataset.role !== 'quality-selector' &&
      input.dataset.role !== 'size-selector'
    ) {
      return;
    }

    const card = input.closest('.product-card');
    const productId = card?.dataset.productId;
    const product = getProducts().find((p) => p.id === productId);
    if (!card || !product) return;

    const selectedCut =
      card.querySelector('input[data-role="cut-selector"]:checked')?.value ||
      product.defaultCut;
    const selectedQualityInput = card.querySelector(
      'input[data-role="quality-selector"]:checked'
    );
    const qualityExtra = Number(selectedQualityInput?.dataset.extra) || 0;
    const selectedSize =
      card.querySelector('input[data-role="size-selector"]:checked')?.value ||
      product.defaultSize;

    const newPrice = calculateProductPrice(
      product,
      selectedCut,
      qualityExtra,
      selectedSize
    );
    const priceDisplay = card.querySelector('[data-price-display]');
    if (priceDisplay) {
      priceDisplay.textContent = formatGuaranies(newPrice);
    }
  });

  // Delegación de Eventos: Clics en la cuadrícula (Carrusel de fotos, Lightbox o Carrito)
  gridContainer.addEventListener('click', (event) => {
    // 1. Carrusel de fotos en la tarjeta de la página principal
    const prevCardBtn = event.target.closest('[data-action="prev-card-image"]');
    const nextCardBtn = event.target.closest('[data-action="next-card-image"]');
    const dotBtn = event.target.closest('[data-action="goto-card-image"]');

    if (prevCardBtn || nextCardBtn || dotBtn) {
      event.preventDefault();
      event.stopPropagation();

      const card = (prevCardBtn || nextCardBtn || dotBtn).closest('.product-card');
      const productId = card?.dataset.productId;
      const product = getProducts().find((p) => p.id === productId);
      if (!card || !product) return;

      const images =
        Array.isArray(product.images) && product.images.length > 0
          ? product.images.filter(Boolean)
          : product.imageUrl
            ? [product.imageUrl]
            : [];
      if (images.length <= 1) return;

      const mediaEl = card.querySelector('.product-card__media');
      let currentIdx = Number(mediaEl?.dataset.currentImgIdx) || 0;

      if (prevCardBtn) {
        currentIdx = (currentIdx - 1 + images.length) % images.length;
      } else if (nextCardBtn) {
        currentIdx = (currentIdx + 1) % images.length;
      } else if (dotBtn) {
        currentIdx = Number(dotBtn.dataset.imgIndex) || 0;
      }

      if (mediaEl) {
        mediaEl.dataset.currentImgIdx = String(currentIdx);
      }

      const imgEl = card.querySelector('.product-card__img');
      if (imgEl) {
        imgEl.src = images[currentIdx];
      }

      const dots = card.querySelectorAll('.product-card__dot');
      dots.forEach((dot, dIdx) => {
        dot.classList.toggle('is-active', dIdx === currentIdx);
      });
      return;
    }

    // 2. Abrir imagen en alta resolución (Lightbox)
    const mediaTrigger = event.target.closest('[data-action="open-lightbox"]');
    if (mediaTrigger) {
      if (
        event.target.closest('.product-card__badge') ||
        event.target.closest('.product-card__category') ||
        event.target.closest('.product-card__nav-btn') ||
        event.target.closest('.product-card__dot')
      ) {
        return;
      }
      const card = mediaTrigger.closest('.product-card');
      const productId = card?.dataset.productId;
      const product = getProducts().find((p) => p.id === productId);
      if (product) {
        const currentIdx = Number(mediaTrigger.dataset.currentImgIdx) || 0;
        openLightbox(product, currentIdx);
        return;
      }
    }

    // 3. Clic en "+ Sumar al Carrito"
    const addBtn = event.target.closest('[data-action="add-to-cart"]');
    if (!addBtn || addBtn.disabled) return;

    const card = addBtn.closest('.product-card');
    const productId = card?.dataset.productId;
    const product = getProducts().find((p) => p.id === productId);
    if (!card || !product || product.inStock === false) return;

    const selectedCut =
      card.querySelector('input[data-role="cut-selector"]:checked')?.value ||
      product.defaultCut;
    const selectedSize =
      card.querySelector('input[data-role="size-selector"]:checked')?.value ||
      product.defaultSize;

    const { qualities = [] } = getSettings();
    const selectedQualityInput = card.querySelector(
      'input[data-role="quality-selector"]:checked'
    );
    const qualityId = selectedQualityInput?.value || qualities[0]?.id || 'basica';
    const selectedQualityObj =
      qualities.find((q) => q.id === qualityId) || qualities[0];
    const qualityExtra = Number(selectedQualityObj?.extraPrice) || 0;
    const qualityName = selectedQualityObj?.name || 'Básica';

    const unitPrice = calculateProductPrice(
      product,
      selectedCut,
      qualityExtra,
      selectedSize
    );

    const cartItem = {
      id: `${product.id}-${selectedCut}-${selectedQualityObj?.id || 'basica'}-${selectedSize}`,
      productId: product.id,
      name: product.name,
      cut: selectedCut,
      quality: qualityName,
      qualityId: selectedQualityObj?.id || 'basica',
      size: selectedSize,
      price: unitPrice,
      isCustom: false,
    };

    window.dispatchEvent(
      new CustomEvent('badluck:add-to-cart', { detail: cartItem })
    );

    const originalText = addBtn.textContent;
    addBtn.textContent = '¡Sumado! ✓';
    addBtn.classList.add('is-added');
    setTimeout(() => {
      addBtn.textContent = originalText;
      addBtn.classList.remove('is-added');
    }, 1100);
  });

  // Accesibilidad por teclado: Enter (keydown) o Espacio (keyup) en la foto abre el Lightbox
  const openLightboxFromMediaEl = (mediaTrigger) => {
    const card = mediaTrigger.closest('.product-card');
    const productId = card?.dataset.productId;
    const product = getProducts().find((p) => p.id === productId);
    if (product) {
      const currentIdx = Number(mediaTrigger.dataset.currentImgIdx) || 0;
      openLightbox(product, currentIdx);
    }
  };

  gridContainer.addEventListener('keydown', (event) => {
    const mediaTrigger = event.target.closest('[data-action="open-lightbox"]');
    if (!mediaTrigger || event.target !== mediaTrigger) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      openLightboxFromMediaEl(mediaTrigger);
    } else if (event.key === ' ') {
      event.preventDefault();
    }
  });

  gridContainer.addEventListener('keyup', (event) => {
    if (event.key !== ' ') return;
    const mediaTrigger = event.target.closest('[data-action="open-lightbox"]');
    if (!mediaTrigger || event.target !== mediaTrigger) return;

    openLightboxFromMediaEl(mediaTrigger);
  });
}
