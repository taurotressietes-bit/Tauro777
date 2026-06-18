/**
 * ============================================================
 * TAURO TV — PRICING JS
 * ============================================================
 * Sistema de toggle entre Costa Rica (CRC) y LATAM (USD).
 * El usuario puede elegir su región y los precios se actualizan.
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', function () {

  // ── Constantes ──────────────────────────────────────────
  var PLANS = ['basic', 'standard', 'family'];
  var USD   = CONFIG.pricing.usd;   // { basic: 6.67, standard: 10.00, family: 13.33 }
  var CRC   = CONFIG.pricing.crc;   // { basic: 3000, standard: 4500, family: 6000 }

  // ── Estado ──────────────────────────────────────────────
  var currentMode   = 'monthly';   // 'monthly' | 'semiannual' | 'annual'
  var currentRegion = 'cr';        // 'cr' | 'latam'

  // ── Formato de números ──────────────────────────────────
  function formatThousands(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function fmt(amount, isCRC) {
    if (isCRC) {
      return '₡' + formatThousands(amount);
    }
    return '$' + amount.toFixed(2);
  }

  // ── Cálculo de precios por modo ─────────────────────────
  function getPriceData(plan, mode, isCRC) {
    var base = isCRC ? CRC[plan] : USD[plan];

    if (mode === 'monthly') {
      return {
        display: fmt(base, isCRC),
        period:  '/mes',
        altHTML: '',
      };
    }

    if (mode === 'semiannual') {
      // Pague 5 meses, lleve 6
      var total6    = base * 5;
      var perMonth6 = total6 / 6;
      return {
        display: fmt(perMonth6, isCRC),
        period:  '/mes',
        altHTML: '<span class="price-total">Total: ' + fmt(total6, isCRC) + '</span>'
               + ' &nbsp;·&nbsp; <span class="alt-saving">Paga 5 meses y recibe 6</span>',
      };
    }

    if (mode === 'annual') {
      // Pague 10 meses, lleve 12
      var total12    = base * 10;
      var perMonth12 = total12 / 12;
      return {
        display: fmt(perMonth12, isCRC),
        period:  '/mes',
        altHTML: '<span class="price-total">Total: ' + fmt(total12, isCRC) + '</span>'
               + ' &nbsp;·&nbsp; <span class="alt-saving">Paga 10 meses y recibe 12</span>',
      };
    }

    return { display: fmt(base, isCRC), period: '/mes', altHTML: '' };
  }

  // ── Render de precios en el DOM ─────────────────────────
  function renderPrices() {
    var isCRC = currentRegion === 'cr';
    
    PLANS.forEach(function (plan) {
      var data     = getPriceData(plan, currentMode, isCRC);
      var priceEl  = document.getElementById('price-' + plan);
      var periodEl = document.getElementById('period-' + plan);
      var altEl    = document.getElementById('alt-' + plan);

      if (priceEl)  priceEl.textContent  = data.display;
      if (periodEl) periodEl.textContent = data.period;
      if (altEl) {
        altEl.innerHTML     = data.altHTML;
        altEl.style.display = data.altHTML ? '' : 'none';
      }
    });
  }

  // ── Toggle de región ────────────────────────────────────
  function setRegion(region) {
    currentRegion = region;

    document.querySelectorAll('.region-toggle').forEach(function (btn) {
      var active = btn.dataset.region === region;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    renderPrices();
  }

  document.querySelectorAll('.region-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () { 
      setRegion(btn.dataset.region); 
    });
  });

  // ── Tabs de facturación ─────────────────────────────────
  function setMode(mode) {
    currentMode = mode;

    document.querySelectorAll('.billing-tab').forEach(function (tab) {
      var active = tab.dataset.mode === mode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('tabindex', active ? '0' : '-1');
    });

    renderPrices();
  }

  document.querySelectorAll('.billing-tab').forEach(function (tab) {
    tab.addEventListener('click', function () { setMode(tab.dataset.mode); });
    tab.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setMode(tab.dataset.mode);
      }
    });
  });

  // ── Botones de planes → guarda región y plan ────────────
  document.querySelectorAll('.plan-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      
      var planName = btn.dataset.plan; // 'basic', 'standard', 'family'
      var isCRC = currentRegion === 'cr';
      var currency = isCRC ? 'CRC' : 'USD';
      var priceData = getPriceData(planName, currentMode, isCRC);
      
      // Guardar en sessionStorage para usar en el formulario CTA
      sessionStorage.setItem('selected_plan', planName);
      sessionStorage.setItem('selected_region', currentRegion);
      sessionStorage.setItem('selected_currency', currency);
      sessionStorage.setItem('selected_price', priceData.display);
      sessionStorage.setItem('selected_mode', currentMode);
      
      // Scroll al CTA
      var ctaSection = document.getElementById('contacto');
      if (ctaSection) {
        ctaSection.scrollIntoView({ behavior: 'smooth' });
        
        // Mostrar el plan seleccionado en el CTA
        var planSelectedEl = document.getElementById('cta-plan-selected');
        if (planSelectedEl) {
          var planLabel = planName.charAt(0).toUpperCase() + planName.slice(1);
          var modeLabel = currentMode === 'monthly' ? 'Mensual' : 
                         currentMode === 'semiannual' ? 'Semestral' : 'Anual';
          
          planSelectedEl.textContent = 'Plan seleccionado: ' + planLabel + ' (' + modeLabel + ') — ' + priceData.display;
          planSelectedEl.style.display = 'block';
        }
      }
    });
  });

  // ── Inicialización ──────────────────────────────────────
  setRegion('cr');   // Por defecto Costa Rica
  setMode('monthly');

  // Exponer estado global para que main.js lo lea
  window.TAURO_STATE = window.TAURO_STATE || {};
  window.TAURO_STATE.getMode = function () { return currentMode; };
  window.TAURO_STATE.isCRC   = function () { return currentRegion === 'cr'; };
  window.TAURO_STATE.getRegion = function () { return currentRegion; };
  window.TAURO_STATE.getCurrency = function () { return currentRegion === 'cr' ? 'CRC' : 'USD'; };
});
