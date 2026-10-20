// ==========================================================================
// MÓDULO 6: PUNTO DE ENTRADA COMPLETO (main.js)
// --------------------------------------------------------------------------
// Este archivo orquesta todos los módulos de BAD LUCK (@badluckpy):
// 1. `initCatalog`: Catálogo dinámico y filtros con View Transitions.
// 2. `initCustomizer`: Configurador "Tu Idea en Tela" con vista previa SVG.
// 3. `initCart`: Carrito en <dialog> con localStorage y envío a WhatsApp.
// 4. `initAnimations`: Revelado al hacer scroll y Scrollspy con IntersectionObserver.
// ==========================================================================

import './styles/variables.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/animations.css';

import { initCatalog } from './modules/catalog.js';
import { initCustomizer } from './modules/customizer.js';
import { initCart } from './modules/cart.js';
import { initAnimations } from './modules/animations.js';
import { initLightbox } from './modules/lightbox.js';

initCatalog();
initCustomizer();
initCart();
initAnimations();
initLightbox();
