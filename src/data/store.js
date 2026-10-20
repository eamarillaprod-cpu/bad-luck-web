// ==========================================================================
// MÓDULO 7: ALMACÉN CENTRALIZADO DE DATOS — PATRÓN STORE (src/data/store.js)
// --------------------------------------------------------------------------
// ¿Qué problema resuelve este archivo?
// Antes, la tienda leía datos fijos desde `products.js`. Ahora que tenemos el
// panel `/davedave`, necesitamos una "Única Fuente de Verdad" (Single Source of
// Truth) donde `/davedave` pueda guardar nuevas prendas, fotos, colecciones y
// precios, y la tienda pública los lea al instante.
//
// Además, usamos el evento nativo `storage` del navegador: si tienes la tienda
// abierta en una pestaña y `/davedave` en otra, cualquier cambio que guardes
// en `/davedave` actualizará la tienda en vivo sin tocar F5.
// ==========================================================================

import {
  CATEGORIES as DEFAULT_CATEGORIES,
  PRODUCTS as DEFAULT_PRODUCTS,
  sanitizeImageUrl,
} from './products.js';

const STORE_KEY = 'badluck_store_v1';

export const DEFAULT_SETTINGS = {
  whatsappNumber: '595971903651',
  adminPin: 'badluck13',
  customPrices: {
    'remera-oversize': 90000,
    'remera-clasica': 75000,
    'hoodie-canguro': 165000,
    zoneDoubleExtra: 15000,
    sizeXxlExtra: 10000,
  },
  qualities: [
    {
      id: 'basica',
      name: 'Básica',
      description: 'Algodón estándar 100% suave y fresco',
      extraPrice: 0,
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'Algodón peinado 24/1 pesado de alta densidad',
      extraPrice: 20000,
    },
  ],
};

/**
 * Construye el estado inicial combinando los valores de fábrica de `products.js`.
 */
function createInitialState() {
  return {
    categories: DEFAULT_CATEGORIES.filter((c) => c.id !== 'todos'),
    products: DEFAULT_PRODUCTS.map((p) => ({
      ...p,
      inStock: true,
      imageUrl: p.imageUrl || '',
      images: Array.isArray(p.images) && p.images.length > 0
        ? p.images.slice(0, 5)
        : p.imageUrl
          ? [p.imageUrl]
          : [],
    })),
    settings: structuredClone(DEFAULT_SETTINGS),
    updatedAt: Date.now(),
  };
}

/**
 * Lee el almacén completo desde `localStorage` o devuelve los valores de fábrica.
 */
export function getStoreState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return createInitialState();

    const parsed = JSON.parse(raw);
    const parsedQualities = Array.isArray(parsed.settings?.qualities) && parsed.settings.qualities.length > 0
      ? parsed.settings.qualities.map((q, idx) => ({
          id: q.id || `quality-${idx}`,
          name: q.name || `Calidad ${idx + 1}`,
          description: q.description || '',
          extraPrice: Number(q.extraPrice) || 0,
        }))
      : DEFAULT_SETTINGS.qualities;

    return {
      categories: Array.isArray(parsed.categories)
        ? parsed.categories
        : createInitialState().categories,
      products: Array.isArray(parsed.products)
        ? parsed.products.map((p) => {
            const safeImages =
              Array.isArray(p.images) && p.images.length > 0
                ? p.images.map(sanitizeImageUrl).filter(Boolean).slice(0, 5)
                : sanitizeImageUrl(p.imageUrl)
                  ? [sanitizeImageUrl(p.imageUrl)]
                  : [];
            return {
              ...p,
              images: safeImages,
              imageUrl: safeImages[0] || sanitizeImageUrl(p.imageUrl) || '',
            };
          })
        : createInitialState().products,
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings || {}),
        customPrices: {
          ...DEFAULT_SETTINGS.customPrices,
          ...(parsed.settings?.customPrices || {}),
        },
        qualities: parsedQualities,
      },
      updatedAt: parsed.updatedAt || Date.now(),
    };
  } catch {
    return createInitialState();
  }
}

/**
 * Guarda el estado completo en `localStorage` y notifica a toda la aplicación.
 */
function saveStoreState(nextState) {
  const payload = {
    ...nextState,
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(payload));
  } catch {
    throw new Error(
      'Límite de memoria del navegador alcanzado. Reducí la cantidad de fotos o descargá un respaldo.'
    );
  }

  // Notificar a la pestaña actual
  window.dispatchEvent(
    new CustomEvent('badluck:store-updated', { detail: payload })
  );
  return payload;
}

// ==========================================================================
// 1. LECTORES PÚBLICOS (Usados tanto por la Tienda como por /davedave)
// ==========================================================================

/**
 * Devuelve todas las categorías incluyendo la pestaña "Todos los Drops" al inicio.
 */
export function getCategories({ includeAll = true } = {}) {
  const { categories } = getStoreState();
  if (!includeAll) return categories;
  return [{ id: 'todos', label: 'Todos los Drops' }, ...categories];
}

export function getProducts() {
  return getStoreState().products;
}

export function getSettings() {
  return getStoreState().settings;
}

// ==========================================================================
// 2. ACCIONES CRUD DE PRENDAS (Crear, Editar, Stock, Eliminar)
// ==========================================================================

export function saveProduct(productData) {
  const state = getStoreState();
  const categories = state.categories;
  const matchedCat = categories.find((c) => c.id === productData.category);

  const rawImages = Array.isArray(productData.images)
    ? productData.images.map(sanitizeImageUrl).filter(Boolean)
    : sanitizeImageUrl(productData.imageUrl)
      ? [sanitizeImageUrl(productData.imageUrl)]
      : [];
  const images = rawImages.slice(0, 5);
  const imageUrl = images[0] || sanitizeImageUrl(productData.imageUrl) || '';

  const normalizedProduct = {
    id: productData.id || `bl-${Date.now().toString(36)}`,
    name: productData.name.trim(),
    category: productData.category,
    categoryLabel: matchedCat ? matchedCat.label : productData.category,
    basePrice: Number(productData.basePrice) || 75000,
    oversizeExtra: Number(productData.oversizeExtra) || 15000,
    badge: (productData.badge || 'Drop').trim(),
    description: (productData.description || '').trim(),
    sizes:
      Array.isArray(productData.sizes) && productData.sizes.length > 0
        ? productData.sizes
        : ['S', 'M', 'L', 'XL'],
    defaultSize: productData.defaultSize || 'L',
    cuts:
      Array.isArray(productData.cuts) && productData.cuts.length > 0
        ? productData.cuts
        : ['Oversize', 'Clásico'],
    defaultCut: productData.defaultCut || 'Oversize',
    garmentType: productData.garmentType || 'tshirt',
    graphicTitle: (productData.graphicTitle || 'BAD LUCK').trim().toUpperCase(),
    graphicSubtitle: (productData.graphicSubtitle || 'CUSTOM WEAR PY')
      .trim()
      .toUpperCase(),
    graphicSymbol: productData.graphicSymbol || 'lightning',
    imageUrl,
    images,
    inStock: productData.inStock !== false,
  };

  const existingIndex = state.products.findIndex(
    (p) => p.id === normalizedProduct.id
  );

  if (existingIndex >= 0) {
    state.products[existingIndex] = normalizedProduct;
  } else {
    // Las prendas nuevas se agregan al principio del catálogo
    state.products.unshift(normalizedProduct);
  }

  saveStoreState(state);
  return normalizedProduct;
}

export function toggleProductStock(productId) {
  const state = getStoreState();
  const product = state.products.find((p) => p.id === productId);
  if (!product) return null;

  product.inStock = product.inStock === false ? true : false;
  saveStoreState(state);
  return product;
}

export function deleteProduct(productId) {
  const state = getStoreState();
  state.products = state.products.filter((p) => p.id !== productId);
  saveStoreState(state);
}

// ==========================================================================
// 3. ACCIONES CRUD DE COLECCIONES / CATEGORÍAS
// ==========================================================================

export function saveCategory({ id, label }) {
  const state = getStoreState();
  const cleanLabel = label.trim();
  if (!cleanLabel) return null;

  // Generar un slug limpio si es una categoría nueva (ej: "Metal Nacional" -> "metal-nacional")
  const slug =
    id ||
    cleanLabel
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const existing = state.categories.find((c) => c.id === slug);
  if (existing) {
    existing.label = cleanLabel;
    // Actualizar también la etiqueta visible en las prendas de esa colección
    state.products.forEach((p) => {
      if (p.category === slug) p.categoryLabel = cleanLabel;
    });
  } else {
    state.categories.push({ id: slug, label: cleanLabel });
  }

  saveStoreState(state);
  return { id: slug, label: cleanLabel };
}

export function deleteCategory(categoryId) {
  const state = getStoreState();
  if (state.categories.length <= 1) {
    throw new Error('Debe existir al menos una colección activa.');
  }

  state.categories = state.categories.filter((c) => c.id !== categoryId);
  const fallbackCat = state.categories[0];

  // Reasignar prendas huérfanas a la primera colección disponible
  state.products.forEach((p) => {
    if (p.category === categoryId) {
      p.category = fallbackCat.id;
      p.categoryLabel = fallbackCat.label;
    }
  });

  saveStoreState(state);
}

// ==========================================================================
// 4. CONFIGURACIÓN GLOBAL Y RESPALDO (Exportar / Importar / Reset)
// ==========================================================================

export function saveSettings(partialSettings) {
  const state = getStoreState();
  state.settings = {
    ...state.settings,
    ...partialSettings,
    customPrices: {
      ...state.settings.customPrices,
      ...(partialSettings.customPrices || {}),
    },
    qualities: Array.isArray(partialSettings.qualities)
      ? partialSettings.qualities
      : (state.settings.qualities || DEFAULT_SETTINGS.qualities),
  };
  saveStoreState(state);
  return state.settings;
}

export function resetStoreToDefaults() {
  const initial = createInitialState();
  saveStoreState(initial);
  return initial;
}

export function exportStoreJSON() {
  const state = getStoreState();
  return JSON.stringify(state, null, 2);
}

export function importStoreJSON(jsonString) {
  const parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed.products) || !Array.isArray(parsed.categories)) {
    throw new Error('El archivo JSON no tiene un formato de catálogo válido.');
  }
  return saveStoreState(parsed);
}

/**
 * Suscribe una función para ejecutarse cada vez que cambie el almacén
 * (ya sea desde la misma pestaña o desde otra pestaña abierta en `/davedave`).
 */
export function subscribeToStore(callback) {
  window.addEventListener('badluck:store-updated', () => {
    callback(getStoreState());
  });

  window.addEventListener('storage', (event) => {
    if (event.key === STORE_KEY) {
      callback(getStoreState());
    }
  });
}
