// ==========================================================================
// MÓDULO 3: BASE DE DATOS LOCAL DE PRODUCTOS (src/data/products.js)
// --------------------------------------------------------------------------
// ¿Por qué separamos los datos en su propio archivo?
// Si mañana quieres cambiar un precio, agregar una nueva remera de una banda
// o modificar los talles disponibles, solo editas esta lista sin tocar ni una
// sola línea del código HTML ni la lógica de programación.
// ==========================================================================

export const CATEGORIES = [
  { id: 'todos', label: 'Todos los Drops' },
  { id: 'bandas', label: 'Bandas & Rock' },
  { id: 'conciertos', label: 'Conciertos & Eventos' },
  { id: 'streetwear', label: 'Diseños BAD LUCK' },
  { id: 'buzos', label: 'Buzos & Hoodies' },
];

export const PRODUCTS = [
  {
    id: 'bl-01',
    name: 'Remera "Lightning Tour" Edición Recital',
    category: 'conciertos',
    categoryLabel: 'Conciertos & Eventos',
    basePrice: 85000,
    oversizeExtra: 15000, // +Gs. 15.000 si elige corte Oversize
    badge: 'Más Pedido',
    description:
      'Estampado frente y espalda con fechas de gira o el line-up de tu concierto favorito. Algodón peinado 24/1.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    defaultSize: 'L',
    cuts: ['Oversize', 'Clásico'],
    defaultCut: 'Oversize',
    garmentType: 'tshirt',
    graphicTitle: 'WORLD TOUR',
    graphicSubtitle: 'ASUNCIÓN • ITAUGUÁ',
    graphicSymbol: 'lightning',
  },
  {
    id: 'bl-02',
    name: 'Remera "Trash Metal / Underground"',
    category: 'bandas',
    categoryLabel: 'Bandas & Rock',
    basePrice: 80000,
    oversizeExtra: 15000,
    badge: 'Personalizable',
    description:
      'Elegí el logo o portada de álbum de tu banda favorita. Serigrafía e impresión de alta definición resistente a lavados.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    defaultSize: 'L',
    cuts: ['Oversize', 'Clásico'],
    defaultCut: 'Oversize',
    garmentType: 'tshirt',
    graphicTitle: 'HEAVY SOUND',
    graphicSubtitle: 'CUSTOM BAND MERCH',
    graphicSymbol: 'skull-star',
  },
  {
    id: 'bl-03',
    name: 'Remera "Lucky Dice 13" — Original Drop',
    category: 'streetwear',
    categoryLabel: 'Diseños BAD LUCK',
    basePrice: 75000,
    oversizeExtra: 15000,
    badge: 'Original BAD LUCK',
    description:
      'Diseño exclusivo de la casa. Gráfico de dados cargados y tipografía brutalista en tono hueso (#DCDDD0) sobre negro carbón.',
    sizes: ['S', 'M', 'L', 'XL'],
    defaultSize: 'M',
    cuts: ['Oversize', 'Clásico'],
    defaultCut: 'Oversize',
    garmentType: 'tshirt',
    graphicTitle: 'BAD LUCK 13',
    graphicSubtitle: 'ROLL THE DICE',
    graphicSymbol: 'dice',
  },
  {
    id: 'bl-04',
    name: 'Hoodie Canguro "Backstage Pass"',
    category: 'buzos',
    categoryLabel: 'Buzos & Hoodies',
    basePrice: 165000,
    oversizeExtra: 20000,
    badge: 'Abrigo Pesado',
    description:
      'Buzo canguro con capucha forrada y bolsillo frontal. Ideal para noches de concierto o diseños personalizados de gran formato.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    defaultSize: 'L',
    cuts: ['Oversize', 'Clásico'],
    defaultCut: 'Oversize',
    garmentType: 'hoodie',
    graphicTitle: 'BACKSTAGE',
    graphicSubtitle: 'ALL ACCESS VIP',
    graphicSymbol: 'pass',
  },
  {
    id: 'bl-05',
    name: 'Remera "Alt Rock / Grunge 90s"',
    category: 'bandas',
    categoryLabel: 'Bandas & Rock',
    basePrice: 80000,
    oversizeExtra: 15000,
    badge: 'Estética Vintage',
    description:
      'Acabado estilo póster de los 90s con trama semitono. Podés pedir cualquier banda de rock, indie, nu-metal o punk.',
    sizes: ['S', 'M', 'L', 'XL'],
    defaultSize: 'M',
    cuts: ['Clásico', 'Oversize'],
    defaultCut: 'Clásico',
    garmentType: 'tshirt',
    graphicTitle: 'GRUNGE 1994',
    graphicSubtitle: 'NOISE & DISTORTION',
    graphicSymbol: 'vinyl',
  },
  {
    id: 'bl-06',
    name: 'Buzo Crewneck "No Good Luck Club"',
    category: 'buzos',
    categoryLabel: 'Buzos & Hoodies',
    basePrice: 145000,
    oversizeExtra: 20000,
    badge: 'Nuevo Drop',
    description:
      'Buzo cuello redondo sin capucha en frisa invisible premium. Puños acanalados firmes y estampado minimalista de alto contraste.',
    sizes: ['M', 'L', 'XL', 'XXL'],
    defaultSize: 'L',
    cuts: ['Oversize', 'Clásico'],
    defaultCut: 'Oversize',
    garmentType: 'hoodie',
    graphicTitle: 'NO LUCK CLUB',
    graphicSubtitle: 'EST. ITAUGUÁ PY',
    graphicSymbol: 'crosshair',
  },
];

/**
 * Formatea un número entero al formato de moneda local de Paraguay (Guaraníes).
 * Ejemplo: 85000 -> "Gs. 85.000"
 */
export function formatGuaranies(amount) {
  const numericAmount = Number(amount);
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;
  const formattedNumber = new Intl.NumberFormat('es-PY').format(safeAmount);
  return `Gs. ${formattedNumber}`;
}

/**
 * Escapa caracteres especiales HTML para prevenir inyecciones XSS al interpolar en `innerHTML`.
 */
export function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Valida que una URL de imagen use un protocolo seguro (http, https, data:image o ruta relativa).
 */
export function sanitizeImageUrl(url) {
  const trimmed = String(url ?? '').trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    /^https?:\/\//i.test(trimmed) ||
    /^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)
  ) {
    return trimmed;
  }
  return '';
}

