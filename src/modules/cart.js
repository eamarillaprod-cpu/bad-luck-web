// ==========================================================================
// MÓDULO 5: CARRITO PERSISTENTE + CHECKOUT A WHATSAPP (src/modules/cart.js)
// --------------------------------------------------------------------------
// Qué vas a aprender en este archivo:
// 1. Gestión de Estado y Persistencia con `localStorage` (JSON.stringify / parse).
// 2. Uso de `.reduce()` para sumar cantidades y calcular el total en Guaraníes.
// 3. Control del elemento nativo `<dialog>` (`showModal()`, light-dismiss y
//    animación de salida suave).
// 4. Armado del mensaje automático hacia WhatsApp (`wa.me/595971903651`) con
//    `encodeURIComponent()`.
// ==========================================================================

import {
  escapeHTML,
  formatGuaranies,
  sanitizeImageUrl,
} from '../data/products.js';
import { getSettings, subscribeToStore } from '../data/store.js';

const STORAGE_KEY = 'badluck_cart_v1';

/**
 * Lee el carrito guardado en el navegador para que no se pierda al recargar.
 */
function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Guarda el estado actual del carrito en `localStorage`.
 */
function saveCartToStorage(cartItems) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
  } catch (err) {
    console.warn('No se pudo guardar en localStorage:', err);
  }
}

/**
 * Cierra el `<dialog>` esperando a que termine su animación de salida si es necesario.
 */
async function closeDialogSmoothly(dialog) {
  dialog.setAttribute('data-closing', '');
  const animations = dialog.getAnimations({ subtree: true });
  if (animations.length > 0) {
    await Promise.race([
      Promise.allSettled(animations.map((a) => a.finished)),
      new Promise((resolve) => setTimeout(resolve, 350)),
    ]);
  }
  dialog.removeAttribute('data-closing');
  dialog.close();
}

export function initCart() {
  const dialog = document.querySelector('#cart-dialog');
  const openBtn = document.querySelector('#open-cart-btn');
  const closeBtn = document.querySelector('#close-cart-btn');
  const countBadge = document.querySelector('#cart-count');
  const itemsContainer = document.querySelector('#cart-items-list');
  const totalAmountEl = document.querySelector('#cart-total-amount');
  const checkoutBtn = document.querySelector('#whatsapp-checkout-btn');
  const customerNameInput = document.querySelector('#cart-customer-name');
  const deliverySelect = document.querySelector('#cart-delivery-method');

  if (!dialog || !itemsContainer) return;

  // Estado principal del carrito (Array de objetos)
  let cart = loadCartFromStorage();

  // 1. Función que dibuja el contenido del carrito y actualiza los totales
  function renderCart() {
    // Calculamos el total de prendas y el total en Gs. usando .reduce()
    const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);
    const totalGuaranies = cart.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    if (countBadge) {
      countBadge.textContent = String(totalQuantity);
    }
    if (totalAmountEl) {
      totalAmountEl.textContent = formatGuaranies(totalGuaranies);
    }

    if (cart.length === 0) {
      itemsContainer.innerHTML = `
        <div class="cart-empty">
          <strong style="font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: 1.6rem; letter-spacing: 0.04em; color: var(--color-text-bright);">
            Tu carrito está vacío
          </strong>
          <p style="font-size: var(--text-xs); margin-inline: auto;">
            Explorá el catálogo de drops o armá tu propia prenda personalizada en "Tu Idea en Tela".
          </p>
        </div>
      `;
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    if (checkoutBtn) checkoutBtn.disabled = false;

    itemsContainer.innerHTML = cart
      .map((item) => {
        const primaryThumb = sanitizeImageUrl(
          item.frontMockupUrl || item.previewThumb
        );
        const secondaryThumb = sanitizeImageUrl(item.backMockupUrl);
        const isBackOnly = item.cut === 'Solo Espalda';
        const primaryLabel = isBackOnly ? 'Espalda' : 'Frente';

        return `
        <div class="cart-item" data-cart-id="${escapeHTML(item.id)}">
          <div class="cart-item__top">
            <div>
              <h3 class="cart-item__title">${escapeHTML(item.name)}</h3>
              <span class="cart-item__meta">
                ${item.isCustom ? 'Estampado:' : 'Corte:'} ${escapeHTML(item.cut)}${item.quality ? ` • Calidad: ${escapeHTML(item.quality)}` : ''} • Talle ${escapeHTML(item.size)}
              </span>
            </div>
            <button
              type="button"
              class="remove-item-btn"
              data-cart-action="remove"
              aria-label="Eliminar ${escapeHTML(item.name)} del carrito"
            >
              Quitar
            </button>
          </div>

          ${
            item.isCustom && (item.customIdea || primaryThumb || secondaryThumb)
              ? `<div class="cart-item__custom-note" style="display: flex; align-items: center; gap: 0.65rem;">
                   <div style="display: flex; gap: 0.35rem; flex-shrink: 0;">
                     ${
                       primaryThumb
                         ? `<img src="${escapeHTML(primaryThumb)}" alt="Vista previa ${primaryLabel.toLowerCase()}" title="${primaryLabel}" style="width: 44px; height: 55px; object-fit: cover; border-radius: 4px;" />`
                         : ''
                     }
                     ${
                       secondaryThumb
                         ? `<img src="${escapeHTML(secondaryThumb)}" alt="Vista previa espalda" title="Espalda" style="width: 44px; height: 55px; object-fit: cover; border-radius: 4px;" />`
                         : ''
                     }
                   </div>
                   <div>
                     ${
                       item.cut === 'Frente + Espalda' && (item.frontDesignName || item.backDesignName)
                         ? `<strong>Frente:</strong> ${escapeHTML(item.frontDesignName || 'Sin archivo')}<br/><strong>Espalda:</strong> ${escapeHTML(item.backDesignName || 'Sin archivo')}`
                         : `<strong>Diseño (${primaryLabel}):</strong> ${escapeHTML(item.customIdea || 'Personalizado')}`
                     }
                     ${item.customNotes ? `<br/><em>Nota: ${escapeHTML(item.customNotes)}</em>` : ''}
                   </div>
                 </div>`
              : ''
          }

          <div class="cart-item__bottom">
            <div class="qty-controls">
              <button
                type="button"
                class="qty-btn"
                data-cart-action="decrease"
                aria-label="Restar una unidad"
              >
                -
              </button>
              <span style="min-width: 1.4rem; text-align: center; font-size: var(--text-xs); font-weight: 700;">
                ${Number(item.quantity) || 1}
              </span>
              <button
                type="button"
                class="qty-btn"
                data-cart-action="increase"
                aria-label="Sumar una unidad"
              >
                +
              </button>
            </div>

            <strong style="font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: 1.4rem; color: var(--color-accent); letter-spacing: 0.04em;">
              ${formatGuaranies(item.price * item.quantity)}
            </strong>
          </div>
        </div>
      `;
      })
      .join('');
  }

  // 2. Escuchar cuando el Catálogo o el Configurador emiten `badluck:add-to-cart`
  window.addEventListener('badluck:add-to-cart', (event) => {
    const newItem = event.detail;
    if (!newItem) return;

    const existing = cart.find((item) => item.id === newItem.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...newItem, quantity: 1 });
    }

    saveCartToStorage(cart);
    renderCart();
  });

  // 3. Delegación de eventos dentro del carrito (+, -, Quitar)
  itemsContainer.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('[data-cart-action]');
    if (!actionBtn) return;

    const itemRow = actionBtn.closest('[data-cart-id]');
    const cartId = itemRow?.dataset.cartId;
    const action = actionBtn.dataset.cartAction;

    const itemIndex = cart.findIndex((i) => i.id === cartId);
    if (itemIndex === -1) return;

    if (action === 'increase') {
      cart[itemIndex].quantity += 1;
    } else if (action === 'decrease') {
      if (cart[itemIndex].quantity > 1) {
        cart[itemIndex].quantity -= 1;
      } else {
        cart.splice(itemIndex, 1);
      }
    } else if (action === 'remove') {
      cart.splice(itemIndex, 1);
    }

    saveCartToStorage(cart);
    renderCart();
  });

  // 4. Abrir y cerrar el cajón <dialog>
  openBtn?.addEventListener('click', () => {
    dialog.showModal();
  });

  closeBtn?.addEventListener('click', () => {
    closeDialogSmoothly(dialog);
  });

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDialogSmoothly(dialog);
  });

  // Fallback de light-dismiss (clic fuera del cajón) para navegadores sin soporte nativo de `closedby="any"`
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const clickedInside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (!clickedInside) {
        closeDialogSmoothly(dialog);
      }
    });
  }

  /**
   * Genera una lámina PNG unificada (Frente y/o Espalda) para copiar al portapapeles
   * o descargar automáticamente al enviar el pedido a WhatsApp.
   */
  async function prepareCustomImagesForWhatsApp(customItems) {
    const itemsWithImages = customItems.filter(
      (i) => i.frontMockupUrl || i.backMockupUrl || i.previewThumb
    );
    if (!itemsWithImages.length) return false;

    const loadImg = (url) =>
      new Promise((resolve) => {
        if (!url) {
          resolve(null);
          return;
        }
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });

    const loadedRows = [];
    for (const item of itemsWithImages) {
      const frontImg = await loadImg(item.frontMockupUrl || item.previewThumb);
      const backImg = await loadImg(item.backMockupUrl);
      if (frontImg || backImg) {
        loadedRows.push({ item, frontImg, backImg });
      }
    }

    if (!loadedRows.length) return false;

    const hasAnyDouble = loadedRows.some((r) => r.frontImg && r.backImg);
    const rowHeight = 560;
    const sheet = document.createElement('canvas');
    sheet.width = hasAnyDouble ? 760 : 400;
    sheet.height = rowHeight * loadedRows.length;
    const sCtx = sheet.getContext('2d');

    sCtx.fillStyle = '#0A0A0C';
    sCtx.fillRect(0, 0, sheet.width, sheet.height);

    loadedRows.forEach(({ item, frontImg, backImg }, idx) => {
      const yBase = idx * rowHeight;
      const isBackOnly = item.cut === 'Solo Espalda';
      const primarySideLabel = isBackOnly ? 'ESPALDA' : 'FRENTE';

      if (idx > 0) {
        sCtx.strokeStyle = '#26262E';
        sCtx.lineWidth = 1;
        sCtx.beginPath();
        sCtx.moveTo(20, yBase);
        sCtx.lineTo(sheet.width - 20, yBase);
        sCtx.stroke();
      }

      sCtx.fillStyle = '#DCDDD0';
      sCtx.font = '700 18px "Space Grotesk", sans-serif';
      sCtx.fillText(`BAD LUCK • ${item.name} (Talle ${item.size})`, 24, yBase + 34);

      if (frontImg) {
        sCtx.drawImage(frontImg, 20, yBase + 52, 340, 453);
        sCtx.fillStyle = '#DCDDD0';
        sCtx.font = '600 14px "Space Grotesk", sans-serif';
        sCtx.fillText(
          `${primarySideLabel}: ${item.frontDesignName || 'Diseño'}`,
          24,
          yBase + 530
        );
      }

      if (backImg) {
        const xOffset = frontImg ? 400 : 20;
        sCtx.drawImage(backImg, xOffset, yBase + 52, 340, 453);
        sCtx.fillStyle = '#DCDDD0';
        sCtx.font = '600 14px "Space Grotesk", sans-serif';
        sCtx.fillText(
          `ESPALDA: ${item.backDesignName || 'Diseño'}`,
          xOffset + 4,
          yBase + 530
        );
      }
    });

    // 1. Intentar copiar la lámina PNG al portapapeles (para hacer Ctrl+V directo en WhatsApp)
    try {
      const blob = await new Promise((res) => sheet.toBlob(res, 'image/png'));
      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new window.ClipboardItem({ 'image/png': blob }),
        ]);
      }
    } catch {
      // Si el navegador bloquea el portapapeles, igual descargamos el archivo abajo
    }

    // 2. Descargar automáticamente la ficha lista para adjuntar en WhatsApp
    try {
      const link = document.createElement('a');
      link.href = sheet.toDataURL('image/png');
      link.download = `badluck-diseno-${Date.now()}.png`;
      link.click();
    } catch {
      // Ignorar si falla la descarga automática
    }

    return true;
  }

  // 5. Generar el resumen y abrir WhatsApp (+595971903651)
  checkoutBtn?.addEventListener('click', async () => {
    if (cart.length === 0) return;

    const customerName = customerNameInput?.value.trim() || 'Cliente Web';
    const deliveryMethod =
      deliverySelect?.value || 'Retiro en Itauguá (a coordinar)';
    const totalGuaranies = cart.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    const EMOJI_WAVE = String.fromCodePoint(0x1f44b); // 👋
    const EMOJI_COOL = String.fromCodePoint(0x1f60e); // 😎
    const EMOJI_PIN = String.fromCodePoint(0x1f4cd); // 📍
    const EMOJI_SCOOTER = String.fromCodePoint(0x1f6f5); // 🛵
    const EMOJI_TRUCK = String.fromCodePoint(0x1f69b); // 🚛
    const EMOJI_MONEY = String.fromCodePoint(0x1f4b0); // 💰
    const EMOJI_CLIP = String.fromCodePoint(0x1f4ce); // 📎

    const deliveryLower = deliveryMethod.toLowerCase();
    let deliveryEmoji = EMOJI_PIN;
    if (deliveryLower.includes('encomienda')) {
      deliveryEmoji = EMOJI_TRUCK;
    } else if (deliveryLower.includes('delivery')) {
      deliveryEmoji = EMOJI_SCOOTER;
    }

    const lines = [
      `${EMOJI_WAVE} *HOLA BAD LUCK! Quiero hacer este pedido desde la web:*`,
      '',
      `${EMOJI_COOL} *Cliente:* ${customerName}`,
      `${deliveryEmoji} *Entrega:* ${deliveryMethod}`,
      '--------------------------------',
    ];

    let hasUploadedDesigns = false;

    cart.forEach((item, index) => {
      const subtotal = formatGuaranies(item.price * item.quantity);
      lines.push(
        `*${index + 1}. ${item.quantity}x ${item.name}*`,
        `   • ${item.isCustom ? 'Zona' : 'Corte'}: ${item.cut}${item.quality ? ` | Calidad: ${item.quality}` : ''} | Talle: ${item.size}`,
        `   • Subtotal: ${subtotal}`
      );
      if (item.isCustom) {
        if (item.cut === 'Frente + Espalda' && (item.frontDesignName || item.backDesignName)) {
          if (item.frontDesignName) {
            lines.push(`   • Diseño Frente: "${item.frontDesignName}"`);
          }
          if (item.backDesignName) {
            lines.push(`   • Diseño Espalda: "${item.backDesignName}"`);
          }
          hasUploadedDesigns = true;
        } else if (item.customIdea) {
          lines.push(`   • Idea/Banda: "${item.customIdea}"`);
          if (item.frontDesignName) hasUploadedDesigns = true;
        }
        if (item.customNotes) {
          lines.push(`   • Detalles: ${item.customNotes}`);
        }
      }
      lines.push('');
    });

    lines.push(
      '--------------------------------',
      `${EMOJI_MONEY} *TOTAL ESTIMADO: ${formatGuaranies(totalGuaranies)}*`
    );

    if (hasUploadedDesigns) {
      lines.push(
        `${EMOJI_CLIP} *Te envío acá abajo las imágenes del diseño (Frente / Espalda).*`
      );
    }

    lines.push('', '¿Me confirman disponibilidad para coordinar? ¡Gracias!');

    const customItems = cart.filter((i) => i.isCustom);
    if (customItems.length > 0) {
      await prepareCustomImagesForWhatsApp(customItems);
    }

    const messageText = lines.join('\n');
    const phone = (getSettings().whatsappNumber || '595971903651').replace(/\D/g, '');
    // Usamos api.whatsapp.com/send en lugar de wa.me porque el redireccionador de wa.me
    // corrompe los emojis UTF-8 de 4 bytes convirtiéndolos en caracteres de reemplazo ().
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(
      messageText
    )}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  });

  // Sincronizar los enlaces directos a WhatsApp del pie de página y botón flotante
  function syncDirectWhatsAppLinks() {
    const phone = (getSettings().whatsappNumber || '595971903651').replace(/\D/g, '');
    if (!phone) return;
    document.querySelectorAll('a[href*="wa.me/"]').forEach((link) => {
      link.href = link.href.replace(/wa\.me\/\d+/, `wa.me/${phone}`);
    });
  }

  syncDirectWhatsAppLinks();
  subscribeToStore(() => {
    syncDirectWhatsAppLinks();
  });

  // Render inicial al cargar la página
  renderCart();
}
