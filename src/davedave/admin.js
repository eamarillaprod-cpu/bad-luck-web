// ==========================================================================
// MÓDULO 8 & 9: PANEL /DAVEDAVE + CRUD DE PRENDAS Y COMPRESOR <CANVAS>
// (src/davedave/admin.js)
// --------------------------------------------------------------------------
// Nuevos conceptos del Módulo 9:
// 1. Lectura de archivos locales (`<input type="file">`) y compresión de
//    imágenes en el navegador usando un elemento `<canvas>` oculto para
//    convertir fotos pesadas de celular (4-8 MB) en WebP ligeros (~35 KB).
// 2. Operaciones CRUD completas (Crear, Leer, Actualizar y Borrar prendas)
//    conectadas en tiempo real con `store.js`.
// ==========================================================================

import '../styles/variables.css';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import './admin.css';

import {
  escapeHTML,
  formatGuaranies,
  sanitizeImageUrl,
} from '../data/products.js';
import {
  deleteCategory,
  deleteProduct,
  exportStoreJSON,
  getCategories,
  getProducts,
  getSettings,
  importStoreJSON,
  resetStoreToDefaults,
  saveCategory,
  saveProduct,
  saveSettings,
  subscribeToStore,
  toggleProductStock,
} from '../data/store.js';
import { renderProductVisual } from '../modules/catalog.js';

const SESSION_AUTH_KEY = 'badluck_davedave_unlocked';

// Elementos principales
const authScreen = document.querySelector('#auth-screen');
const authForm = document.querySelector('#auth-form');
const pinInput = document.querySelector('#admin-pin-input');
const authError = document.querySelector('#auth-error');
const dashboard = document.querySelector('#admin-dashboard');
const logoutBtn = document.querySelector('#logout-btn');
const toastEl = document.querySelector('#admin-toast');

// KPIs
const kpiTotalProducts = document.querySelector('#kpi-total-products');
const kpiInStock = document.querySelector('#kpi-in-stock');
const kpiTotalCategories = document.querySelector('#kpi-total-categories');

// Contenedores de Prendas
const productsListEl = document.querySelector('#admin-products-list');
const searchInput = document.querySelector('#admin-search-input');
const categoryFilterSelect = document.querySelector('#admin-category-filter');
const newProductBtn = document.querySelector('#new-product-btn');

// Modal de Prenda (Módulo 9)
const productModal = document.querySelector('#product-modal');
const productForm = document.querySelector('#product-form');
const modalTitle = document.querySelector('#product-modal-title');
const closeProductModalBtn = document.querySelector('#close-product-modal-btn');
const cancelProductModalBtn = document.querySelector('#cancel-product-modal-btn');
const photoFileInput = document.querySelector('#prod-photo-file');
const photoUrlInput = document.querySelector('#prod-photo-url');
const addPhotoUrlBtn = document.querySelector('#add-photo-url-btn');
const photosGridList = document.querySelector('#photos-grid-list');
const photoCounterBadge = document.querySelector('#photo-counter-badge');
const uploadPhotoLabel = document.querySelector('#upload-photo-label');
const clearPhotoBtn = document.querySelector('#clear-photo-btn');
const prodCategorySelect = document.querySelector('#prod-category');

let currentProductImages = [];

let toastTimer = null;
export function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 2600);
}

// ==========================================================================
// 1. BLOQUEO CON CLAVE (badluck13 por defecto)
// ==========================================================================
function isAuthenticated() {
  return sessionStorage.getItem(SESSION_AUTH_KEY) === 'true';
}

function updateAuthUI() {
  const unlocked = isAuthenticated();
  if (authScreen) authScreen.hidden = unlocked;
  if (dashboard) dashboard.hidden = !unlocked;
  if (unlocked) {
    refreshDashboard();
  } else {
    pinInput?.focus();
  }
}

authForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const enteredPin = pinInput?.value.trim() || '';
  const { adminPin } = getSettings();

  if (enteredPin === adminPin) {
    sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
    if (authError) authError.hidden = true;
    if (pinInput) pinInput.value = '';
    updateAuthUI();
    showToast('⚡ Bienvenido al panel /davedave');
  } else {
    if (authError) authError.hidden = false;
    pinInput?.select();
  }
});

logoutBtn?.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_AUTH_KEY);
  updateAuthUI();
});

// ==========================================================================
// 2. NAVEGACIÓN ENTRE PESTAÑAS (Prendas / Colecciones / Precios)
// ==========================================================================
const tabButtons = document.querySelectorAll('.admin-tab[data-tab]');
const tabPanels = {
  products: document.querySelector('#panel-products'),
  categories: document.querySelector('#panel-categories'),
  settings: document.querySelector('#panel-settings'),
};

function activateTab(btn) {
  const targetTab = btn.dataset.tab;
  tabButtons.forEach((b) => {
    const isSelected = b === btn;
    b.setAttribute('aria-selected', String(isSelected));
    b.tabIndex = isSelected ? 0 : -1;
  });
  Object.entries(tabPanels).forEach(([key, panel]) => {
    if (panel) panel.hidden = key !== targetTab;
  });
}

tabButtons.forEach((btn, idx) => {
  btn.tabIndex = btn.getAttribute('aria-selected') === 'true' ? 0 : -1;
  btn.addEventListener('click', () => activateTab(btn));
  btn.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const dir = event.key === 'ArrowRight' ? 1 : -1;
    const nextIdx = (idx + dir + tabButtons.length) % tabButtons.length;
    const nextBtn = tabButtons[nextIdx];
    nextBtn.focus();
    activateTab(nextBtn);
  });
});

// ==========================================================================
// 3. RESUMEN DE MÉTRICAS (KPIs) Y VISTA DE PRENDAS
// ==========================================================================
function renderKPIs() {
  const products = getProducts();
  const categories = getCategories({ includeAll: false });
  const inStockCount = products.filter((p) => p.inStock !== false).length;

  if (kpiTotalProducts) kpiTotalProducts.textContent = String(products.length);
  if (kpiInStock) kpiInStock.textContent = String(inStockCount);
  if (kpiTotalCategories)
    kpiTotalCategories.textContent = String(categories.length);
}

function renderCategoryFilterSelect() {
  const categoriesWithAll = getCategories({ includeAll: true });
  const categoriesOnly = getCategories({ includeAll: false });

  if (categoryFilterSelect) {
    const currentVal = categoryFilterSelect.value || 'todos';
    categoryFilterSelect.innerHTML = categoriesWithAll
      .map(
        (c) =>
          `<option value="${escapeHTML(c.id)}">${escapeHTML(c.label)}</option>`
      )
      .join('');
    if (categoriesWithAll.some((c) => c.id === currentVal)) {
      categoryFilterSelect.value = currentVal;
    }
  }

  if (prodCategorySelect) {
    prodCategorySelect.innerHTML = categoriesOnly
      .map(
        (c) =>
          `<option value="${escapeHTML(c.id)}">${escapeHTML(c.label)}</option>`
      )
      .join('');
  }
}

function renderAdminProducts() {
  if (!productsListEl) return;

  const query = (searchInput?.value || '').trim().toLowerCase();
  const selectedCat = categoryFilterSelect?.value || 'todos';

  const filtered = getProducts().filter((product) => {
    const matchesCat =
      selectedCat === 'todos' || product.category === selectedCat;
    const matchesQuery =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query);
    return matchesCat && matchesQuery;
  });

  if (filtered.length === 0) {
    productsListEl.innerHTML = `
      <div class="admin-card" style="grid-column: 1 / -1; text-align: center;">
        <p style="margin-inline: auto;">No se encontraron prendas con ese filtro.</p>
      </div>
    `;
    return;
  }

  productsListEl.innerHTML = filtered
    .map((product) => {
      const available = product.inStock !== false;
      const safeName = escapeHTML(product.name);
      return `
        <article class="admin-product-card" data-id="${escapeHTML(product.id)}">
          <div class="admin-product-card__media">
            <span class="stock-badge ${available ? 'in-stock' : 'out-stock'}">
              ${available ? 'En Stock' : 'Agotado'}
            </span>
            ${renderProductVisual(product)}
          </div>
          <div class="admin-product-card__body">
            <div>
              <span style="font-size: 0.7rem; color: var(--color-text-muted); text-transform: uppercase;">
                ${escapeHTML(product.categoryLabel || product.category)} • ${escapeHTML(product.badge)}
              </span>
              <h3 class="admin-product-card__title">${safeName}</h3>
            </div>

            <div class="quick-price-row">
              <span style="font-size: var(--text-xs); color: var(--color-text-muted);">
                Base: <strong>${formatGuaranies(product.basePrice)}</strong>
              </span>
              <span style="font-size: 0.72rem; color: var(--color-text-muted);">
                Talles: ${escapeHTML((product.sizes || []).join(', '))}
              </span>
            </div>

            <div class="admin-product-card__actions">
              <button type="button" class="admin-action-btn" data-admin-action="edit" aria-label="Editar ${safeName}">
                ✎ Editar
              </button>
              <button type="button" class="admin-action-btn" data-admin-action="toggle-stock" aria-label="${available ? 'Marcar agotado' : 'Activar stock de'} ${safeName}">
                ${available ? 'Marcar Agotado' : 'Activar Stock'}
              </button>
              <button type="button" class="admin-action-btn danger" data-admin-action="delete" aria-label="Eliminar ${safeName}">
                ✕
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

// ==========================================================================
// 4. MÓDULO 9: COMPRESOR DE FOTOS CON <CANVAS> Y MODAL CRUD DE PRENDAS
// ==========================================================================

/**
 * Recibe un archivo de imagen (`File`) desde la PC o celular, lo redimensiona
 * a un máximo de 1400px manteniendo su proporción, y lo comprime a formato WebP
 * usando un elemento `<canvas>` en memoria para conservar la máxima nitidez.
 */
function compressImageToWebP(file, maxDimension = 1400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen inválido.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Exportar como WebP ligero en Base64 (DataURL)
        const compressedDataUrl = canvas.toDataURL('image/webp', quality);
        resolve(compressedDataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotosGrid() {
  if (!photosGridList) return;

  const count = currentProductImages.length;
  if (photoCounterBadge) {
    photoCounterBadge.textContent = `${count} / 5 fotos`;
  }

  if (uploadPhotoLabel) {
    uploadPhotoLabel.style.display = count >= 5 ? 'none' : 'inline-flex';
  }

  if (count === 0) {
    photosGridList.innerHTML = `
      <div class="photos-grid-empty">
        <span>Sin fotos cargadas todavía.<br />(La prenda usará el gráfico vectorial SVG en el catálogo)</span>
      </div>
    `;
    return;
  }

  photosGridList.innerHTML = currentProductImages
    .map((imgUrl, idx) => {
      let roleLabel = `Foto #${idx + 1}`;
      if (idx === 0) roleLabel = '★ Frente';
      else if (idx === 1) roleLabel = 'Espalda';

      return `
        <div class="photo-slot" data-photo-idx="${idx}">
          <img src="${escapeHTML(imgUrl)}" alt="Foto ${idx + 1}" />
          <span class="photo-slot__badge">${roleLabel}</span>
          <button type="button" class="photo-slot__remove" data-remove-photo="${idx}" aria-label="Eliminar foto ${idx + 1}" title="Eliminar foto">✕</button>
        </div>
      `;
    })
    .join('');
}

// Clic en botón eliminar foto individual
photosGridList?.addEventListener('click', (event) => {
  const removeBtn = event.target.closest('[data-remove-photo]');
  if (!removeBtn) return;
  const idx = Number(removeBtn.dataset.removePhoto);
  if (Number.isFinite(idx) && idx >= 0 && idx < currentProductImages.length) {
    currentProductImages.splice(idx, 1);
    renderPhotosGrid();
    showToast('Foto eliminada');
  }
});

photoFileInput?.addEventListener('change', async (event) => {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  const availableSlots = 5 - currentProductImages.length;
  if (availableSlots <= 0) {
    showToast('Ya alcanzaste el máximo de 5 fotos.');
    photoFileInput.value = '';
    return;
  }

  const filesToProcess = files.slice(0, availableSlots);
  if (files.length > availableSlots) {
    showToast(`Se cargaron las primeras ${availableSlots} fotos (máximo 5).`);
  }

  for (const file of filesToProcess) {
    try {
      const webpDataUrl = await compressImageToWebP(file, 1400, 0.85);
      currentProductImages.push(webpDataUrl);
    } catch (err) {
      showToast(err.message || 'Error al procesar una imagen');
    }
  }

  photoFileInput.value = '';
  renderPhotosGrid();
  showToast(`📷 ${currentProductImages.length} foto(s) listas`);
});

addPhotoUrlBtn?.addEventListener('click', () => {
  const rawUrl = photoUrlInput?.value.trim();
  if (!rawUrl) return;
  const safeUrl = sanitizeImageUrl(rawUrl);
  if (!safeUrl) {
    showToast('⚠ Ingresá una URL válida (https://... o /images/...)');
    return;
  }
  if (currentProductImages.length >= 5) {
    showToast('Máximo 5 fotos por prenda.');
    return;
  }
  currentProductImages.push(safeUrl);
  if (photoUrlInput) photoUrlInput.value = '';
  renderPhotosGrid();
  showToast('✓ URL agregada');
});

clearPhotoBtn?.addEventListener('click', () => {
  currentProductImages = [];
  if (photoFileInput) photoFileInput.value = '';
  if (photoUrlInput) photoUrlInput.value = '';
  renderPhotosGrid();
  showToast('Todas las fotos han sido quitadas');
});

function openProductModal(productToEdit = null) {
  if (!productModal || !productForm) return;
  renderCategoryFilterSelect();
  productForm.reset();

  if (productToEdit) {
    if (modalTitle) modalTitle.textContent = `Editar: ${productToEdit.name}`;
    productForm.elements.id.value = productToEdit.id;
    productForm.elements.name.value = productToEdit.name;
    productForm.elements.category.value = productToEdit.category;
    productForm.elements.basePrice.value = productToEdit.basePrice;
    productForm.elements.oversizeExtra.value = productToEdit.oversizeExtra ?? 15000;
    productForm.elements.badge.value = productToEdit.badge || 'Drop';
    productForm.elements.garmentType.value = productToEdit.garmentType || 'tshirt';
    productForm.elements.description.value = productToEdit.description || '';
    productForm.elements.inStock.value = String(productToEdit.inStock !== false);

    // Marcar talles activos
    const sizeCheckboxes = productForm.querySelectorAll('input[name="sizes"]');
    sizeCheckboxes.forEach((cb) => {
      cb.checked = (productToEdit.sizes || []).includes(cb.value);
    });

    const rawImages =
      Array.isArray(productToEdit.images) && productToEdit.images.length > 0
        ? productToEdit.images
        : productToEdit.imageUrl
          ? [productToEdit.imageUrl]
          : [];
    currentProductImages = [...rawImages].slice(0, 5);
    renderPhotosGrid();
  } else {
    if (modalTitle) modalTitle.textContent = 'Subir Nueva Prenda';
    productForm.elements.id.value = '';
    currentProductImages = [];
    renderPhotosGrid();
  }

  productModal.showModal();
}

newProductBtn?.addEventListener('click', () => openProductModal(null));
closeProductModalBtn?.addEventListener('click', () => productModal?.close());
cancelProductModalBtn?.addEventListener('click', () => productModal?.close());

// Fallback de light-dismiss para navegadores sin soporte nativo de <dialog closedby="any">
if (productModal && !('closedBy' in HTMLDialogElement.prototype)) {
  productModal.addEventListener('click', (event) => {
    if (event.target !== productModal) return;
    const rect = productModal.getBoundingClientRect();
    const isInside =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;
    if (!isInside) {
      productModal.close();
    }
  });
}

productForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(productForm);
  const selectedSizes = formData.getAll('sizes');

  const existingId = String(formData.get('id') || '').trim();
  const existingProduct = existingId
    ? getProducts().find((p) => p.id === existingId)
    : null;

  try {
    const saved = saveProduct({
      ...(existingProduct || {}),
      id: existingId || undefined,
      name: String(formData.get('name') || ''),
      category: String(formData.get('category') || 'streetwear'),
      basePrice: Number(formData.get('basePrice')) || 80000,
      oversizeExtra: Number(formData.get('oversizeExtra')) || 0,
      badge: String(formData.get('badge') || 'Nuevo Drop'),
      garmentType: String(formData.get('garmentType') || 'tshirt'),
      description: String(formData.get('description') || ''),
      sizes: selectedSizes.length > 0 ? selectedSizes : ['M', 'L', 'XL'],
      inStock: formData.get('inStock') === 'true',
      images: currentProductImages,
      imageUrl: currentProductImages[0] || '',
      graphicTitle: String(formData.get('name') || 'BAD LUCK').slice(0, 14),
    });

    productModal?.close();
    showToast(`✓ Prenda "${saved.name}" guardada en la tienda`);
  } catch (err) {
    showToast(err.message || 'No se pudo guardar la prenda');
  }
});

// Delegación de eventos en las tarjetas de prendas (Editar / Stock / Eliminar)
productsListEl?.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-admin-action]');
  if (!btn) return;

  const card = btn.closest('[data-id]');
  const productId = card?.dataset.id;
  if (!productId) return;

  const action = btn.dataset.adminAction;
  const product = getProducts().find((p) => p.id === productId);
  if (!product) return;

  if (action === 'edit') {
    openProductModal(product);
  } else if (action === 'toggle-stock') {
    const updated = toggleProductStock(productId);
    showToast(
      updated?.inStock
        ? `✓ "${product.name}" marcada EN STOCK`
        : `⚠ "${product.name}" marcada AGOTADA`
    );
  } else if (action === 'delete') {
    const confirmed = window.confirm(
      `¿Seguro que querés eliminar "${product.name}" del catálogo?`
    );
    if (confirmed) {
      deleteProduct(productId);
      showToast(`🗑 Prenda eliminada del catálogo`);
    }
  }
});

function refreshDashboard() {
  renderKPIs();
  renderCategoryFilterSelect();
  renderAdminProducts();
}

searchInput?.addEventListener('input', renderAdminProducts);
categoryFilterSelect?.addEventListener('change', renderAdminProducts);

subscribeToStore(() => {
  if (isAuthenticated()) refreshDashboard();
});

// Inicializar vista según estado de sesión
updateAuthUI();

// ==========================================================================
// 5. MÓDULO 10: GESTIÓN DE COLECCIONES, PRECIOS GLOBALES Y RESPALDO JSON
// ==========================================================================

const categoryForm = document.querySelector('#category-form');
const categoryIdInput = document.querySelector('#category-id-input');
const categoryLabelInput = document.querySelector('#category-label-input');
const categorySubmitBtn = document.querySelector('#category-submit-btn');
const categoryCancelBtn = document.querySelector('#category-cancel-btn');
const categoriesListEl = document.querySelector('#admin-categories-list');

const settingsForm = document.querySelector('#settings-form');
const exportJsonBtn = document.querySelector('#export-json-btn');
const importJsonInput = document.querySelector('#import-json-input');
const resetDefaultsBtn = document.querySelector('#reset-defaults-btn');

// 5.1 Renderizar lista de Colecciones con conteo de prendas
function renderAdminCategories() {
  if (!categoriesListEl) return;
  const categories = getCategories({ includeAll: false });
  const products = getProducts();

  categoriesListEl.innerHTML = categories
    .map((cat) => {
      const count = products.filter((p) => p.category === cat.id).length;
      const safeId = escapeHTML(cat.id);
      const safeLabel = escapeHTML(cat.label);
      return `
        <div class="category-item" data-cat-id="${safeId}" data-cat-label="${safeLabel}">
          <div>
            <strong style="color: var(--color-text-bright); font-size: var(--text-sm);">
              ${safeLabel}
            </strong>
            <span style="display: block; font-size: 0.72rem; color: var(--color-text-muted);">
              ID: <code>${safeId}</code> • ${count} ${count === 1 ? 'prenda' : 'prendas'}
            </span>
          </div>
          <div style="display: flex; gap: 0.4rem;">
            <button type="button" class="admin-action-btn" data-cat-action="edit" aria-label="Renombrar colección ${safeLabel}">
              ✎ Renombrar
            </button>
            <button type="button" class="admin-action-btn danger" data-cat-action="delete" aria-label="Eliminar colección ${safeLabel}">
              ✕
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

function resetCategoryForm() {
  if (!categoryForm) return;
  categoryForm.reset();
  if (categoryIdInput) categoryIdInput.value = '';
  if (categorySubmitBtn) categorySubmitBtn.textContent = '+ Guardar Colección';
  if (categoryCancelBtn) categoryCancelBtn.hidden = true;
}

categoryForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const id = categoryIdInput?.value.trim() || '';
  const label = categoryLabelInput?.value.trim() || '';
  if (!label) return;

  try {
    const saved = saveCategory({ id: id || undefined, label });
    resetCategoryForm();
    renderAdminCategories();
    showToast(`✓ Colección "${saved?.label}" guardada`);
  } catch (err) {
    showToast(err.message || 'No se pudo guardar la colección');
  }
});

categoryCancelBtn?.addEventListener('click', resetCategoryForm);

categoriesListEl?.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-cat-action]');
  if (!btn) return;

  const row = btn.closest('[data-cat-id]');
  const catId = row?.dataset.catId;
  const catLabel = row?.dataset.catLabel || '';
  if (!catId) return;

  if (btn.dataset.catAction === 'edit') {
    if (categoryIdInput) categoryIdInput.value = catId;
    if (categoryLabelInput) {
      categoryLabelInput.value = catLabel;
      categoryLabelInput.focus();
    }
    if (categorySubmitBtn) categorySubmitBtn.textContent = 'Actualizar Nombre';
    if (categoryCancelBtn) categoryCancelBtn.hidden = false;
  } else if (btn.dataset.catAction === 'delete') {
    const confirmed = window.confirm(
      `¿Eliminar la colección "${catLabel}"? Las prendas de esta colección pasarán automáticamente a la primera colección activa.`
    );
    if (!confirmed) return;

    try {
      deleteCategory(catId);
      renderAdminCategories();
      showToast(`🗑 Colección "${catLabel}" eliminada`);
    } catch (err) {
      showToast(err.message || 'No se pudo eliminar la colección');
    }
  }
});

const qualitiesSettingsList = document.querySelector('#qualities-settings-list');
const addQualityBtn = document.querySelector('#add-quality-btn');

function readQualitiesFromDOM() {
  if (!qualitiesSettingsList) return [];
  const rows = qualitiesSettingsList.querySelectorAll('.quality-config-row');
  return Array.from(rows).map((row, idx) => {
    const id = row.dataset.qualityId || `quality-${idx}`;
    const name =
      row.querySelector('[data-field="name"]')?.value.trim() ||
      `Calidad ${idx + 1}`;
    const extraPrice =
      Number(row.querySelector('[data-field="extra"]')?.value) || 0;
    const description =
      row.querySelector('[data-field="desc"]')?.value.trim() || '';
    return { id, name, extraPrice, description };
  });
}

function renderQualitiesSettings(qualities) {
  if (!qualitiesSettingsList) return;
  const list = Array.isArray(qualities) && qualities.length > 0 ? qualities : [];

  qualitiesSettingsList.innerHTML = list
    .map(
      (q, idx) => `
      <div class="quality-config-row" data-quality-id="${escapeHTML(q.id)}" style="background: rgba(0, 0, 0, 0.24); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: var(--radius-md); padding: var(--space-md); display: grid; gap: var(--space-xs);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="font-size: 0.8rem; color: var(--color-accent); letter-spacing: 0.05em;">
            CALIDAD #${idx + 1}
          </strong>
          ${
            list.length > 1
              ? `<button type="button" class="admin-action-btn danger remove-quality-btn" data-quality-idx="${idx}" title="Eliminar calidad" style="padding: 0.2rem 0.55rem; font-size: 0.72rem;">✕ Quitar</button>`
              : ''
          }
        </div>
        <div class="form-row-2">
          <div class="field-group">
            <label class="field-label" style="font-size: 0.74rem;">Nombre visible *</label>
            <input type="text" class="text-input" data-field="name" value="${escapeHTML(q.name || '')}" placeholder="Ej: Básica / Algodón Premium" required />
          </div>
          <div class="field-group">
            <label class="field-label" style="font-size: 0.74rem;">Precio Agregado (+Gs.) *</label>
            <input type="number" class="text-input" data-field="extra" value="${Number(q.extraPrice) || 0}" step="1000" min="0" placeholder="0" required />
          </div>
        </div>
        <div class="field-group">
          <label class="field-label" style="font-size: 0.74rem;">Descripción o especificación corta</label>
          <input type="text" class="text-input" data-field="desc" value="${escapeHTML(q.description || '')}" placeholder="Ej: 100% algodón peinado 24/1 pesado" />
        </div>
      </div>
    `
    )
    .join('');
}

addQualityBtn?.addEventListener('click', () => {
  const current = readQualitiesFromDOM();
  current.push({
    id: `quality-${Date.now().toString(36)}`,
    name: 'Nueva Calidad',
    description: '',
    extraPrice: 0,
  });
  renderQualitiesSettings(current);
});

qualitiesSettingsList?.addEventListener('click', (event) => {
  const removeBtn = event.target.closest('.remove-quality-btn');
  if (!removeBtn) return;
  const idxToRemove = Number(removeBtn.dataset.qualityIdx);
  const current = readQualitiesFromDOM();
  if (current.length <= 1) {
    showToast('Debe existir al menos una calidad.');
    return;
  }
  current.splice(idxToRemove, 1);
  renderQualitiesSettings(current);
});

// 5.2 Cargar y guardar Precios Globales + WhatsApp + Clave + Calidades
function populateSettingsForm() {
  if (!settingsForm) return;
  const settings = getSettings();
  const { customPrices, qualities } = settings;

  settingsForm.elements['remera-oversize'].value =
    customPrices['remera-oversize'] ?? 90000;
  settingsForm.elements['remera-clasica'].value =
    customPrices['remera-clasica'] ?? 75000;
  settingsForm.elements['hoodie-canguro'].value =
    customPrices['hoodie-canguro'] ?? 165000;
  settingsForm.elements.zoneDoubleExtra.value =
    customPrices.zoneDoubleExtra ?? 15000;
  settingsForm.elements.sizeXxlExtra.value =
    customPrices.sizeXxlExtra ?? 10000;
  settingsForm.elements.whatsappNumber.value =
    settings.whatsappNumber || '595971903651';
  settingsForm.elements.adminPin.value = settings.adminPin || 'badluck13';

  renderQualitiesSettings(qualities || []);
}

settingsForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(settingsForm);
  const currentQualities = readQualitiesFromDOM();

  try {
    saveSettings({
      whatsappNumber: String(formData.get('whatsappNumber') || '595971903651').trim(),
      adminPin: String(formData.get('adminPin') || 'badluck13').trim(),
      customPrices: {
        'remera-oversize': Number(formData.get('remera-oversize')) || 90000,
        'remera-clasica': Number(formData.get('remera-clasica')) || 75000,
        'hoodie-canguro': Number(formData.get('hoodie-canguro')) || 165000,
        zoneDoubleExtra: Number(formData.get('zoneDoubleExtra')) || 0,
        sizeXxlExtra: Number(formData.get('sizeXxlExtra')) || 0,
      },
      qualities: currentQualities.length > 0 ? currentQualities : undefined,
    });

    showToast('✓ Precios globales y ajustes actualizados en la tienda');
  } catch (err) {
    showToast(err.message || 'No se pudieron guardar los ajustes');
  }
});

// 5.3 Exportar, Importar (.json) y Restaurar Catálogo de Fábrica
exportJsonBtn?.addEventListener('click', () => {
  const jsonContent = exportStoreJSON();
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `badluck-catalogo-${dateStr}.json`;
  link.click();

  URL.revokeObjectURL(url);
  showToast('⬇ Respaldo .json descargado');
});

importJsonInput?.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    importStoreJSON(text);
    renderAdminCategories();
    populateSettingsForm();
    refreshDashboard();
    showToast('⬆ Catálogo restaurado desde el archivo .json');
  } catch (err) {
    showToast(err.message || 'Archivo JSON inválido');
  } finally {
    importJsonInput.value = '';
  }
});

resetDefaultsBtn?.addEventListener('click', () => {
  const confirmed = window.confirm(
    '¿Seguro que querés restaurar el catálogo original de fábrica? Se borrarán las prendas nuevas o cambios que no hayas exportado.'
  );
  if (!confirmed) return;

  resetStoreToDefaults();
  renderAdminCategories();
  populateSettingsForm();
  refreshDashboard();
  showToast('↺ Catálogo restaurado a los valores de fábrica');
});

// Inicializar también las pestañas de Colecciones y Ajustes al cargar/actualizar
renderAdminCategories();
populateSettingsForm();
subscribeToStore(() => {
  if (isAuthenticated()) {
    renderAdminCategories();
    populateSettingsForm();
  }
});
