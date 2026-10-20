// ==========================================================================
// MÓDULO 4 & 7: CONFIGURADOR INTERACTIVO "TU IDEA EN TELA" (Mockup IA en Vivo)
// (src/modules/customizer.js)
// --------------------------------------------------------------------------
// Qué hace este módulo:
// 1. Utiliza las 6 imágenes de estudio dedicadas (Remera Oversize y Remera
//    Clásica en cada uno de los 3 colores establecidos: Negro Carbón,
//    Blanco Hueso y Gris Vintage).
// 2. Permite al cliente subir cualquier imagen o diseño (PNG, JPG, WebP),
//    quitarle el fondo automáticamente con IA en el navegador (detectando el
//    color de borde con flood-fill y suavizado) y acomodarlo sobre la remera
//    arrastrándolo con el mouse/dedo o cambiando su tamaño.
// 3. Integra sutilmente la textura y los pliegues de la tela sobre el diseño
//    para que el resultado se vea como un estampado real.
// ==========================================================================

import { escapeHTML, formatGuaranies } from '../data/products.js';
import { getSettings, subscribeToStore } from '../data/store.js';

const CANVAS_W = 768;
const CANVAS_H = 1024;

/**
 * Mapa de las 12 imágenes de remeras generadas (2 cortes × 3 colores × Frente/Espalda).
 */
const GARMENT_META = {
  'remera-oversize': {
    label: 'Remera Oversize',
    printCenter: { x: 384, y: 465 },
    backPrintCenter: { x: 384, y: 440 },
    printBaseWidth: 225,
    colors: {
      'Negro Carbón': {
        src: '/images/oversize-negro.jpg',
        backSrc: '/images/oversize-negro-espalda.jpg',
        isDark: true,
        refLum: 42,
      },
      'Blanco Hueso': {
        src: '/images/oversize-blanco.jpg',
        backSrc: '/images/oversize-blanco-espalda.jpg',
        isDark: false,
        refLum: 205,
      },
      'Gris Vintage': {
        src: '/images/oversize-gris.jpg',
        backSrc: '/images/oversize-gris-espalda.jpg',
        isDark: true,
        refLum: 105,
      },
    },
  },
  'remera-clasica': {
    label: 'Remera Clásica',
    printCenter: { x: 384, y: 455 },
    backPrintCenter: { x: 384, y: 430 },
    printBaseWidth: 205,
    colors: {
      'Negro Carbón': {
        src: '/images/clasica-negro.jpg',
        backSrc: '/images/clasica-negro-espalda.jpg',
        isDark: true,
        refLum: 42,
      },
      'Blanco Hueso': {
        src: '/images/clasica-blanco.jpg',
        backSrc: '/images/clasica-blanco-espalda.jpg',
        isDark: false,
        refLum: 205,
      },
      'Gris Vintage': {
        src: '/images/clasica-gris.jpg',
        backSrc: '/images/clasica-gris-espalda.jpg',
        isDark: true,
        refLum: 105,
      },
    },
  },
};

/**
 * Recorta automáticamente el fondo del diseño subido por el usuario:
 * Detecta el color predominante en el perímetro de la imagen y ejecuta un
 * flood-fill (BFS) desde los bordes + rampa suave de transparencia.
 */
function processDesignCanvas(sourceImg, removeBg, tolerancePct) {
  const maxDim = 600;
  let w = sourceImg.naturalWidth || sourceImg.width;
  let h = sourceImg.naturalHeight || sourceImg.height;
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(sourceImg, 0, 0, w, h);

  if (!removeBg) return c;

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // 1. Muestrear los píxeles del borde para detectar el color del fondo
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  const samplePixel = (px, py) => {
    const p = (py * w + px) * 4;
    if (d[p + 3] > 128) {
      sumR += d[p];
      sumG += d[p + 1];
      sumB += d[p + 2];
      count++;
    }
  };

  for (let x = 0; x < w; x += 2) {
    samplePixel(x, 0);
    samplePixel(x, h - 1);
  }
  for (let y = 0; y < h; y += 2) {
    samplePixel(0, y);
    samplePixel(w - 1, y);
  }

  if (count === 0) return c;

  const bgR = sumR / count;
  const bgG = sumG / count;
  const bgB = sumB / count;

  const maxDist = (tolerancePct / 100) * 260;
  const softRamp = Math.max(12, maxDist * 0.35);

  const colorDist = (idx) => {
    const p = idx * 4;
    const dr = d[p] - bgR;
    const dg = d[p + 1] - bgG;
    const db = d[p + 2] - bgB;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  // 2. Flood-fill (BFS) desde los bordes para recortar el fondo exterior conectado
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const tryEnqueue = (idx) => {
    if (visited[idx]) return;
    if (d[idx * 4 + 3] < 20 || colorDist(idx) <= maxDist) {
      visited[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < w; x++) {
    tryEnqueue(x);
    tryEnqueue((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    tryEnqueue(y * w);
    tryEnqueue(y * w + (w - 1));
  }

  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % w;
    const cy = (curr - cx) / w;

    if (cx > 0) tryEnqueue(curr - 1);
    if (cx < w - 1) tryEnqueue(curr + 1);
    if (cy > 0) tryEnqueue(curr - w);
    if (cy < h - 1) tryEnqueue(curr + w);
  }

  // 3. Aplicar transparencia al fondo detectado con transición suave en bordes
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    if (visited[i]) {
      d[p + 3] = 0;
    } else {
      const dist = colorDist(i);
      if (dist < maxDist + softRamp) {
        const factor = Math.max(0, Math.min(1, (dist - maxDist) / softRamp));
        d[p + 3] = Math.round(d[p + 3] * factor);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return c;
}

function createSideState() {
  return {
    sourceImage: null,
    processedCanvas: null,
    rawDataUrl: '',
    name: '',
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    removeBg: false,
    tolerance: 28,
  };
}

export function initCustomizer() {
  const form = document.querySelector('#customizer-form');
  const canvas = document.querySelector('#custom-mockup-canvas');
  const zoneBadge = document.querySelector('#custom-preview-zone');
  const summaryGarment = document.querySelector('#summary-garment');
  const summarySpecs = document.querySelector('#summary-specs');
  const summaryIdea = document.querySelector('#summary-idea');
  const totalDisplay = document.querySelector('#custom-total-price');
  const qualityContainer = document.querySelector('#custom-quality-options');

  // Controles de subida e IA del diseño (Frente y Espalda)
  const primaryUploadTitle = document.querySelector('#primary-upload-title');
  const fileInput = document.querySelector('#custom-design-input');
  const dropzone = document.querySelector('#design-dropzone');
  const fileLabel = document.querySelector('#design-file-label');
  const clearDesignBtn = document.querySelector('#clear-design-btn');

  const backUploadBlock = document.querySelector('#back-design-upload-block');
  const backFileInput = document.querySelector('#custom-design-back-input');
  const backDropzone = document.querySelector('#design-back-dropzone');
  const backFileLabel = document.querySelector('#design-back-file-label');
  const clearBackDesignBtn = document.querySelector('#clear-back-design-btn');

  const previewSideSwitcher = document.querySelector('#preview-side-switcher');
  const sideSwitchBtns = document.querySelectorAll('[data-preview-side]');

  const aiToolsPanel = document.querySelector('#design-ai-tools');
  const removeBgCheckbox = document.querySelector('#ai-remove-bg');
  const removeBgLabel = document.querySelector('#ai-remove-bg-label');
  const toleranceRow = document.querySelector('#ai-tolerance-row');
  const toleranceSlider = document.querySelector('#ai-bg-tolerance');
  const toleranceValue = document.querySelector('#ai-tolerance-value');
  const scaleSlider = document.querySelector('#design-scale-slider');
  const scaleValue = document.querySelector('#design-scale-value');
  const resetPosBtn = document.querySelector('#reset-design-pos-btn');
  const presetBtns = document.querySelectorAll('[data-preset]');

  if (!form || !canvas) return;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // Caché de las 6 imágenes de remeras por URL
  const shirtImageCache = new Map();

  // Estado separado para Frente ('front') y Espalda ('back')
  const sides = {
    front: createSideState(),
    back: createSideState(),
  };

  let activeSide = 'front';
  const dragInfo = {
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
  };

  function getActiveDesign() {
    return sides[activeSide];
  }

  /**
   * Carga y guarda en caché cada una de las 6 imágenes de remeras.
   */
  function ensureShirtImageLoaded(srcUrl, onReady) {
    if (shirtImageCache.has(srcUrl)) {
      onReady?.(shirtImageCache.get(srcUrl));
      return Promise.resolve(shirtImageCache.get(srcUrl));
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => {
        shirtImageCache.set(srcUrl, img);
        onReady?.(img);
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = srcUrl;
    });
  }

  /**
   * Sincroniza los precios mostrados en las tarjetas del formulario desde `store.js`.
   */
  function syncFormPriceLabels() {
    const { customPrices } = getSettings();
    for (const key of ['remera-oversize', 'remera-clasica']) {
      const input = form.querySelector(`input[name="garment"][value="${key}"]`);
      const priceSpan = input
        ?.closest('.choice-card')
        ?.querySelector('.choice-card__price');
      if (priceSpan && customPrices[key]) {
        priceSpan.textContent = formatGuaranies(customPrices[key]);
      }
    }

    const doubleZoneInput = form.querySelector(
      'input[name="zone"][value="Frente + Espalda"]'
    );
    const doubleZoneSpan = doubleZoneInput
      ?.closest('.choice-card')
      ?.querySelector('.choice-card__price');
    if (doubleZoneSpan) {
      doubleZoneSpan.textContent = `+ ${formatGuaranies(
        customPrices.zoneDoubleExtra || 15000
      )}`;
    }

    const xxlBadge = form.querySelector('#custom-xxl-price-badge');
    if (xxlBadge) {
      const xxlExtra = Number(customPrices.sizeXxlExtra) || 0;
      xxlBadge.textContent = xxlExtra > 0 ? ` (+${formatGuaranies(xxlExtra)})` : '';
    }
  }

  /**
   * Genera dinámicamente las opciones de calidad (Básica / Premium / Custom)
   * según las configuradas en store.js / davedave.
   */
  function renderQualityChoices() {
    if (!qualityContainer) return;
    const { qualities = [] } = getSettings();
    const currentSelected =
      form.querySelector('input[name="quality"]:checked')?.value ||
      qualities[0]?.id ||
      'basica';

    qualityContainer.innerHTML = qualities
      .map((q, idx) => {
        const isChecked =
          q.id === currentSelected ||
          (idx === 0 && !qualities.some((item) => item.id === currentSelected));
        const priceText =
          Number(q.extraPrice) > 0
            ? `+ ${formatGuaranies(q.extraPrice)}`
            : 'Incluido';
        return `
          <label class="choice-card">
            <input type="radio" name="quality" value="${escapeHTML(q.id)}" ${
          isChecked ? 'checked' : ''
        } />
            <span class="choice-card__title">${escapeHTML(q.name)}</span>
            <span class="choice-card__price">${priceText}</span>
            ${
              q.description
                ? `<small style="display: block; font-size: 0.72rem; color: var(--color-text-muted); margin-top: 0.2rem; line-height: 1.25;">${escapeHTML(q.description)}</small>`
                : ''
            }
          </label>
        `;
      })
      .join('');
  }

  function rebuildProcessedDesign(sideKey = activeSide) {
    const sideObj = sides[sideKey];
    if (!sideObj.sourceImage) {
      sideObj.processedCanvas = null;
      return;
    }
    sideObj.processedCanvas = processDesignCanvas(
      sideObj.sourceImage,
      sideObj.removeBg,
      sideObj.tolerance
    );
  }

  function syncAiToolsWithActiveSide() {
    const current = getActiveDesign();
    const hasActiveDesign = Boolean(current.sourceImage);

    if (aiToolsPanel) {
      aiToolsPanel.hidden = !hasActiveDesign;
    }
    if (!hasActiveDesign) return;

    const sideTitle = activeSide === 'back' ? 'Espalda' : 'Frente';
    if (removeBgLabel) {
      removeBgLabel.textContent = `Quitar fondo automáticamente (${sideTitle})`;
    }
    if (removeBgCheckbox) removeBgCheckbox.checked = current.removeBg;
    if (toleranceRow) toleranceRow.hidden = !current.removeBg;
    if (toleranceSlider) toleranceSlider.value = String(current.tolerance);
    if (toleranceValue) toleranceValue.textContent = `${current.tolerance}%`;

    const pct = Math.round(current.scale * 100);
    if (scaleSlider) scaleSlider.value = String(pct);
    if (scaleValue) scaleValue.textContent = `${pct}%`;
  }

  function setActivePreviewSide(sideKey) {
    activeSide = sideKey === 'back' ? 'back' : 'front';
    sideSwitchBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.previewSide === activeSide);
    });
    syncAiToolsWithActiveSide();
    updateLivePreview();
  }

  /**
   * Dibuja en un `<canvas>` de destino la remera con el diseño del lado indicado ('front' o 'back').
   */
  function drawMockupOntoCanvas(
    targetCtx,
    garmentKey,
    colorName,
    sideKey,
    zoneLabel,
    forceBackShirt = false
  ) {
    const meta = GARMENT_META[garmentKey] || GARMENT_META['remera-oversize'];
    const colorCfg = meta.colors[colorName] || meta.colors['Negro Carbón'];
    const sideObj = sides[sideKey] || sides.front;
    const isBackShirt = sideKey === 'back' || forceBackShirt;
    const shirtSrc = isBackShirt ? colorCfg.backSrc || colorCfg.src : colorCfg.src;
    const baseCenter =
      isBackShirt && meta.backPrintCenter ? meta.backPrintCenter : meta.printCenter;

    ensureShirtImageLoaded(shirtSrc, (shirtImg) => {
      targetCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      targetCtx.drawImage(shirtImg, 0, 0, CANVAS_W, CANVAS_H);

      const hasGraphic = Boolean(sideObj.processedCanvas);
      const cx = baseCenter.x + sideObj.offsetX;
      const cy = baseCenter.y + sideObj.offsetY;

      if (hasGraphic) {
        const dCanvas = sideObj.processedCanvas;
        const aspect = dCanvas.height / dCanvas.width;
        const drawW = meta.printBaseWidth * sideObj.scale;
        const drawH = drawW * aspect;

        const rx = Math.max(0, Math.round(cx - drawW / 2));
        const ry = Math.max(0, Math.round(cy - drawH / 2));
        const rw = Math.min(CANVAS_W - rx, Math.round(drawW));
        const rh = Math.min(CANVAS_H - ry, Math.round(drawH));

        if (rw > 4 && rh > 4) {
          const shirtRegion = targetCtx.getImageData(rx, ry, rw, rh);
          const sData = shirtRegion.data;

          const printLayer = document.createElement('canvas');
          printLayer.width = rw;
          printLayer.height = rh;
          const pCtx = printLayer.getContext('2d');
          pCtx.drawImage(dCanvas, 0, 0, rw, rh);

          const pData = pCtx.getImageData(0, 0, rw, rh).data;

          for (let i = 0; i < rw * rh; i++) {
            const p = i * 4;
            const alpha = (pData[p + 3] / 255) * 0.95;
            if (alpha <= 0.005) continue;

            const lum =
              0.299 * sData[p] + 0.587 * sData[p + 1] + 0.114 * sData[p + 2];
            const relLum = lum / colorCfg.refLum;
            const foldShade = Math.max(0.75, Math.min(1.06, 0.85 + 0.15 * relLum));

            const pr = Math.min(255, pData[p] * foldShade);
            const pg = Math.min(255, pData[p + 1] * foldShade);
            const pb = Math.min(255, pData[p + 2] * foldShade);

            sData[p] = Math.round(sData[p] * (1 - alpha) + pr * alpha);
            sData[p + 1] = Math.round(sData[p + 1] * (1 - alpha) + pg * alpha);
            sData[p + 2] = Math.round(sData[p + 2] * (1 - alpha) + pb * alpha);
          }

          targetCtx.putImageData(shirtRegion, rx, ry);
        }
      } else {
        const boxW = meta.printBaseWidth;
        const boxH = meta.printBaseWidth * 1.1;

        targetCtx.save();
        targetCtx.strokeStyle = colorCfg.isDark
          ? 'rgba(220, 221, 208, 0.34)'
          : 'rgba(20, 20, 24, 0.3)';
        targetCtx.lineWidth = 2;
        targetCtx.setLineDash([8, 6]);
        targetCtx.strokeRect(
          baseCenter.x - boxW / 2,
          baseCenter.y - boxH / 2,
          boxW,
          boxH
        );

        targetCtx.fillStyle = colorCfg.isDark
          ? 'rgba(220, 221, 208, 0.7)'
          : 'rgba(20, 20, 24, 0.65)';
        targetCtx.font = '600 18px "Space Grotesk", sans-serif';
        targetCtx.textAlign = 'center';
        targetCtx.fillText(
          isBackShirt ? 'DISEÑO DE ESPALDA' : 'TU DISEÑO ACÁ',
          baseCenter.x,
          baseCenter.y - 6
        );
        targetCtx.font = '400 13px "Space Grotesk", sans-serif';
        targetCtx.fillText(
          zoneLabel.toUpperCase(),
          baseCenter.x,
          baseCenter.y + 18
        );
        targetCtx.restore();
      }
    });
  }

  function updateZoneUI(zone) {
    const isDouble = zone === 'Frente + Espalda';
    const isBackOnly = zone === 'Solo Espalda';

    if (backUploadBlock) {
      backUploadBlock.hidden = !isDouble;
    }
    if (previewSideSwitcher) {
      previewSideSwitcher.hidden = !isDouble;
    }

    if (primaryUploadTitle) {
      if (isDouble) {
        primaryUploadTitle.textContent = '5A. Subí tu diseño de frente (Pecho)';
      } else if (isBackOnly) {
        primaryUploadTitle.textContent = '5. Subí tu diseño (Espalda)';
      } else {
        primaryUploadTitle.textContent = '5. Subí tu diseño (Frente)';
      }
    }

    if (fileLabel) {
      if (sides.front.name) {
        fileLabel.textContent = isBackOnly
          ? `Espalda cargada: ${sides.front.name}`
          : `Frente cargado: ${sides.front.name}`;
      } else {
        fileLabel.textContent = isBackOnly
          ? 'Hacé clic o arrastrá el diseño de espalda acá'
          : 'Hacé clic o arrastrá el diseño de frente acá';
      }
    }

    if (!isDouble && activeSide === 'back') {
      activeSide = 'front';
      sideSwitchBtns.forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.previewSide === 'front');
      });
      syncAiToolsWithActiveSide();
    }
  }

  function updateLivePreview() {
    const { customPrices, qualities = [] } = getSettings();
    const formData = new FormData(form);
    const garmentKey = formData.get('garment') || 'remera-oversize';
    const colorName = formData.get('color') || 'Negro Carbón';
    const size = formData.get('size') || 'L';
    const zone = formData.get('zone') || 'Solo Frente';
    const qualityId = formData.get('quality') || qualities[0]?.id || 'basica';
    const selectedQuality =
      qualities.find((q) => q.id === qualityId) || qualities[0];
    const qualityExtra = Number(selectedQuality?.extraPrice) || 0;
    const qualityName = selectedQuality?.name || 'Básica';
    const xxlExtra = size === 'XXL' ? Number(customPrices.sizeXxlExtra) || 0 : 0;

    updateZoneUI(zone);

    const garment = GARMENT_META[garmentKey] || GARMENT_META['remera-oversize'];
    const basePrice = Number(customPrices[garmentKey]) || 90000;
    const extraPrice =
      zone === 'Frente + Espalda' ? Number(customPrices.zoneDoubleExtra) || 0 : 0;
    const finalPrice = basePrice + extraPrice + qualityExtra + xxlExtra;

    const isDouble = zone === 'Frente + Espalda';
    const isBackOnly = zone === 'Solo Espalda';
    const badgeText = isDouble
      ? `${zone} • Viendo: ${activeSide === 'back' ? 'Espalda' : 'Frente'}`
      : zone;

    drawMockupOntoCanvas(ctx, garmentKey, colorName, activeSide, badgeText, isBackOnly);

    if (zoneBadge) zoneBadge.textContent = badgeText;
    if (summaryGarment) summaryGarment.textContent = garment.label;
    if (summarySpecs) {
      const xxlTag = xxlExtra > 0 ? ` (+${formatGuaranies(xxlExtra)})` : '';
      summarySpecs.textContent = `${colorName} • Talle ${size}${xxlTag} • Calidad: ${qualityName}`;
    }

    let ideaSummary = 'Sin diseño subido aún';
    if (isDouble) {
      const fName = sides.front.name || 'Sin frente';
      const bName = sides.back.name || 'Sin espalda';
      if (sides.front.name || sides.back.name) {
        ideaSummary = `Frente: ${fName} | Espalda: ${bName}`;
      }
    } else if (sides.front.name) {
      ideaSummary = sides.front.name;
    }

    if (summaryIdea) {
      summaryIdea.textContent = ideaSummary;
    }
    if (totalDisplay) {
      totalDisplay.textContent = formatGuaranies(finalPrice);
    }

    return {
      garmentKey,
      garmentLabel: garment.label,
      colorName,
      size,
      sizeXxlExtra: xxlExtra,
      zone,
      qualityId: selectedQuality?.id || 'basica',
      qualityName,
      qualityExtra,
      headline: ideaSummary,
      frontDesignName: sides.front.name,
      backDesignName: isDouble ? sides.back.name : '',
      notes: (formData.get('notes') || '').trim(),
      price: finalPrice,
    };
  }

  function loadDesignImage(srcUrl, displayName, sideKey = 'front', autoDetectOpaqueBg = true) {
    const targetSide = sideKey === 'back' ? 'back' : 'front';
    const sideObj = sides[targetSide];

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      sideObj.sourceImage = img;
      sideObj.rawDataUrl = srcUrl;
      sideObj.name = displayName;
      sideObj.offsetX = 0;
      sideObj.offsetY = 0;

      if (autoDetectOpaqueBg) {
        const probe = document.createElement('canvas');
        probe.width = 8;
        probe.height = 8;
        const pCtx = probe.getContext('2d');
        pCtx.drawImage(img, 0, 0, 8, 8);
        const corners = pCtx.getImageData(0, 0, 8, 8).data;
        const topLeftAlpha = corners[3];
        const botRightAlpha = corners[63 * 4 + 3];
        sideObj.removeBg = topLeftAlpha > 240 && botRightAlpha > 240;
      } else {
        sideObj.removeBg = false;
      }

      if (targetSide === 'front') {
        const currentZone = new FormData(form).get('zone') || 'Solo Frente';
        if (fileLabel) {
          fileLabel.textContent =
            currentZone === 'Solo Espalda'
              ? `Espalda cargada: ${displayName}`
              : `Frente cargado: ${displayName}`;
        }
        if (clearDesignBtn) clearDesignBtn.hidden = false;
      } else {
        if (backFileLabel) backFileLabel.textContent = `Espalda cargada: ${displayName}`;
        if (clearBackDesignBtn) clearBackDesignBtn.hidden = false;
      }

      rebuildProcessedDesign(targetSide);
      setActivePreviewSide(targetSide);
    };
    img.src = srcUrl;
  }

  function handleFileSelected(file, sideKey = 'front') {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      loadDesignImage(String(reader.result), file.name, sideKey, true);
    };
    reader.readAsDataURL(file);
  }

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file, 'front');
  });

  backFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file, 'back');
  });

  function bindDropzoneEvents(dzElement, sideKey) {
    if (!dzElement) return;
    dzElement.addEventListener('click', () => {
      if (activeSide !== sideKey && (sideKey === 'front' || !backUploadBlock?.hidden)) {
        setActivePreviewSide(sideKey);
      }
    });
    dzElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      dzElement.classList.add('is-dragover');
    });
    dzElement.addEventListener('dragleave', () => {
      dzElement.classList.remove('is-dragover');
    });
    dzElement.addEventListener('drop', (e) => {
      e.preventDefault();
      dzElement.classList.remove('is-dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFileSelected(file, sideKey);
    });
  }

  bindDropzoneEvents(dropzone, 'front');
  bindDropzoneEvents(backDropzone, 'back');

  sideSwitchBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      setActivePreviewSide(btn.dataset.previewSide);
    });
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetUrl = btn.dataset.preset;
      const presetName = btn.dataset.presetName || 'Diseño Bad Luck';
      const presetSide = btn.dataset.presetSide || 'front';
      if (presetUrl) {
        loadDesignImage(presetUrl, presetName, presetSide, false);
      }
    });
  });

  clearDesignBtn?.addEventListener('click', () => {
    Object.assign(sides.front, createSideState());
    if (fileInput) fileInput.value = '';
    if (fileLabel) fileLabel.textContent = 'Hacé clic o arrastrá el diseño de frente acá';
    clearDesignBtn.hidden = true;
    syncAiToolsWithActiveSide();
    updateLivePreview();
  });

  clearBackDesignBtn?.addEventListener('click', () => {
    Object.assign(sides.back, createSideState());
    if (backFileInput) backFileInput.value = '';
    if (backFileLabel) backFileLabel.textContent = 'Hacé clic o arrastrá el diseño de espalda acá';
    clearBackDesignBtn.hidden = true;
    syncAiToolsWithActiveSide();
    updateLivePreview();
  });

  removeBgCheckbox?.addEventListener('change', () => {
    const current = getActiveDesign();
    current.removeBg = removeBgCheckbox.checked;
    if (toleranceRow) toleranceRow.hidden = !current.removeBg;
    rebuildProcessedDesign(activeSide);
    updateLivePreview();
  });

  toleranceSlider?.addEventListener('input', () => {
    const current = getActiveDesign();
    current.tolerance = Number(toleranceSlider.value);
    if (toleranceValue) toleranceValue.textContent = `${current.tolerance}%`;
    rebuildProcessedDesign(activeSide);
    updateLivePreview();
  });

  scaleSlider?.addEventListener('input', () => {
    const current = getActiveDesign();
    const pct = Number(scaleSlider.value);
    current.scale = pct / 100;
    if (scaleValue) scaleValue.textContent = `${pct}%`;
    updateLivePreview();
  });

  resetPosBtn?.addEventListener('click', () => {
    const current = getActiveDesign();
    current.offsetX = 0;
    current.offsetY = 0;
    current.scale = 1;
    if (scaleSlider) scaleSlider.value = '100';
    if (scaleValue) scaleValue.textContent = '100%';
    updateLivePreview();
  });

  // Arrastrar el diseño activo sobre la remera con Mouse o Touch
  canvas.addEventListener('pointerdown', (e) => {
    const current = getActiveDesign();
    if (!current.processedCanvas) return;
    dragInfo.isDragging = true;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    dragInfo.dragStartX = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    dragInfo.dragStartY = (e.clientY - rect.top) * (CANVAS_H / rect.height);
    dragInfo.initialOffsetX = current.offsetX;
    dragInfo.initialOffsetY = current.offsetY;
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!dragInfo.isDragging) return;
    const current = getActiveDesign();
    const rect = canvas.getBoundingClientRect();
    const currX = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const currY = (e.clientY - rect.top) * (CANVAS_H / rect.height);

    const dx = currX - dragInfo.dragStartX;
    const dy = currY - dragInfo.dragStartY;

    current.offsetX = Math.max(-130, Math.min(130, dragInfo.initialOffsetX + dx));
    current.offsetY = Math.max(-180, Math.min(220, dragInfo.initialOffsetY + dy));
    updateLivePreview();
  });

  const stopDragging = () => {
    dragInfo.isDragging = false;
  };
  canvas.addEventListener('pointerup', stopDragging);
  canvas.addEventListener('pointercancel', stopDragging);

  form.addEventListener('input', (e) => {
    if (
      e.target === removeBgCheckbox ||
      e.target === toleranceSlider ||
      e.target === scaleSlider ||
      e.target === fileInput ||
      e.target === backFileInput
    ) {
      return;
    }
    updateLivePreview();
  });

  form.addEventListener('change', (e) => {
    if (
      e.target === removeBgCheckbox ||
      e.target === toleranceSlider ||
      e.target === scaleSlider ||
      e.target === fileInput ||
      e.target === backFileInput
    ) {
      return;
    }
    updateLivePreview();
  });

  // Precargar las 12 imágenes de remeras (6 frente + 6 espalda) en segundo plano
  // para no competir con el LCP inicial de la portada
  const preloadRemainingShirts = () => {
    Object.values(GARMENT_META).forEach((garment) => {
      Object.values(garment.colors).forEach((colorObj) => {
        ensureShirtImageLoaded(colorObj.src);
        if (colorObj.backSrc) {
          ensureShirtImageLoaded(colorObj.backSrc);
        }
      });
    });
  };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(preloadRemainingShirts, { timeout: 2500 });
  } else {
    setTimeout(preloadRemainingShirts, 1200);
  }

  syncFormPriceLabels();
  renderQualityChoices();
  updateLivePreview();

  subscribeToStore(() => {
    syncFormPriceLabels();
    renderQualityChoices();
    updateLivePreview();
  });

  /**
   * Genera una miniatura o imagen exportable del lado indicado ('front' o 'back').
   */
  async function captureSideMockupDataUrl(
    garmentKey,
    colorName,
    sideKey,
    width = 360,
    height = 480,
    forceBackShirt = false
  ) {
    try {
      const meta = GARMENT_META[garmentKey] || GARMENT_META['remera-oversize'];
      const colorCfg = meta.colors[colorName] || meta.colors['Negro Carbón'];
      const isBackShirt = sideKey === 'back' || forceBackShirt;
      const shirtSrc = isBackShirt ? colorCfg.backSrc || colorCfg.src : colorCfg.src;
      await ensureShirtImageLoaded(shirtSrc);

      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = CANVAS_W;
      fullCanvas.height = CANVAS_H;
      const fullCtx = fullCanvas.getContext('2d');
      drawMockupOntoCanvas(
        fullCtx,
        garmentKey,
        colorName,
        sideKey,
        isBackShirt ? 'Espalda' : 'Frente',
        forceBackShirt
      );

      const outCanvas = document.createElement('canvas');
      outCanvas.width = width;
      outCanvas.height = height;
      const outCtx = outCanvas.getContext('2d');
      outCtx.drawImage(fullCanvas, 0, 0, width, height);
      return outCanvas.toDataURL('image/webp', 0.84);
    } catch {
      return '';
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const state = updateLivePreview();
    const isDouble = state.zone === 'Frente + Espalda';
    const isBackOnly = state.zone === 'Solo Espalda';

    const frontMockupUrl = await captureSideMockupDataUrl(
      state.garmentKey,
      state.colorName,
      'front',
      360,
      480,
      isBackOnly
    );
    const backMockupUrl = isDouble
      ? await captureSideMockupDataUrl(
          state.garmentKey,
          state.colorName,
          'back',
          360,
          480,
          true
        )
      : '';

    const customCartItem = {
      id: `custom-${Date.now()}`,
      productId: state.garmentKey,
      name: `Custom: ${state.garmentLabel} (${state.colorName})`,
      cut: state.zone,
      quality: state.qualityName,
      qualityId: state.qualityId,
      size: state.size,
      price: state.price,
      isCustom: true,
      customIdea: state.headline,
      frontDesignName: state.frontDesignName,
      backDesignName: state.backDesignName,
      frontMockupUrl,
      backMockupUrl,
      customNotes: state.notes,
    };

    window.dispatchEvent(
      new CustomEvent('badluck:add-to-cart', { detail: customCartItem })
    );

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) {
      const originalText = submitBtn.textContent;
      submitBtn.textContent = '¡Prenda personalizada sumada al Carrito! ✓';
      submitBtn.classList.add('is-added');
      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.classList.remove('is-added');
      }, 1600);
    }
  });
}
