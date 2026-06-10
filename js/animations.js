/* ============================================================
 * animations.js — Kaasi UI Animation Layer
 * Handles: staggered list entrance, balance countup,
 *          sliding tab indicator.
 * All functions are global; called from features.js / globals.js
 * ============================================================ */

/* ----------------------------------------------------------
 * 1. BALANCE COUNTUP ANIMATION
 * ---------------------------------------------------------- */

/** Snapshot of last-displayed numeric values, keyed by element ID */
const _prevBalances = {};

/**
 * Read the numeric value currently displayed in a currency element
 * and cache it so we can animate FROM this value on the next render.
 */
function snapshotBalance(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return 0;
  const raw = el.textContent.replace(/[^0-9.]/g, '');
  const val = parseFloat(raw) || 0;
  _prevBalances[elementId] = val;
  return val;
}

/**
 * Animate a DOM element's text from `from` → `to` (numeric currency values).
 * Uses an ease-out cubic curve over ~350ms.
 * Cancels any in-flight animation on the same element.
 */
function animateValue(element, from, to, duration = 350) {
  if (!element) return;
  // Skip animation if the change is trivially small (avoids flicker on load)
  if (Math.abs(to - from) < 0.005) {
    element.innerHTML = `<span class="tabular-nums">${formatCurrency(to)}</span>`;
    return;
  }
  if (element._animFrame) cancelAnimationFrame(element._animFrame);
  const start = performance.now();
  const diff = to - from;
  const step = (now) => {
    const elapsed = Math.min(now - start, duration);
    const t = elapsed / duration;
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    element.innerHTML = `<span class="tabular-nums">${formatCurrency(from + diff * eased)}</span>`;
    if (elapsed < duration) {
      element._animFrame = requestAnimationFrame(step);
    } else {
      element.innerHTML = `<span class="tabular-nums">${formatCurrency(to)}</span>`;
      element._animFrame = null;
    }
  };
  element._animFrame = requestAnimationFrame(step);
}

/**
 * Call this BEFORE renderDashboard re-renders the DOM.
 * Returns a snapshot object with all the previous balance values.
 */
function snapshotDashboardBalances() {
  const snap = {
    totalBalance: snapshotBalance('totalBalance'),
    totalPotentialBalance: snapshotBalance('totalPotentialBalance'),
  };
  if (typeof state !== 'undefined' && Array.isArray(state.accounts)) {
    state.accounts.forEach(acc => {
      snap[`accountBalance-${acc.id}`] = snapshotBalance(`accountBalance-${acc.id}`);
    });
  }
  return snap;
}

/**
 * Call this AFTER renderDashboard has written new values to the DOM.
 * For each element in `snap`, reads the newly written value and
 * animates from the old value to the new one.
 */
function animateDashboardBalances(snap) {
  Object.keys(snap).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const raw = el.textContent.replace(/[^0-9.]/g, '');
    const newVal = parseFloat(raw) || 0;
    const oldVal = snap[id] || 0;
    animateValue(el, oldVal, newVal);
  });
}

/* ----------------------------------------------------------
 * 2. STAGGERED LIST ENTRANCE
 * ---------------------------------------------------------- */

/**
 * Apply stagger-in animation to each direct child of `containerEl`.
 * Each child gets the CSS class `stagger-item` and an incremented
 * animationDelay. Safe to call multiple times (clears old delays).
 */
function applyStagger(containerEl, delayPerItem = 45) {
  if (!containerEl) return;
  const items = containerEl.querySelectorAll(':scope > *');
  items.forEach((item, idx) => {
    item.classList.add('stagger-item');
    item.style.animationDelay = `${idx * delayPerItem}ms`;
  });
}

/* ----------------------------------------------------------
 * 3. SLIDING TAB INDICATOR
 * ---------------------------------------------------------- */

/**
 * Positions the indicator element under `tab` within `container`.
 * Accounts for horizontal scroll offset of the container.
 */
function positionIndicatorOnTab(container, indicator, tab) {
  const containerRect = container.getBoundingClientRect();
  const tabRect = tab.getBoundingClientRect();
  indicator.style.left = (tabRect.left - containerRect.left + container.scrollLeft) + 'px';
  indicator.style.width = tabRect.width + 'px';
}

/**
 * Smoothly moves the tab indicator to sit under `activeTab`.
 * Only follows the primary .active tab — logically-active
 * multi-select tabs are unaffected.
 */
function moveTabIndicator(container, activeTab) {
  const indicator = container.querySelector('.tab-indicator');
  if (!indicator || !activeTab) return;
  positionIndicatorOnTab(container, indicator, activeTab);
}

/**
 * Injects a .tab-indicator element into `container` (if not already present)
 * and snaps it to the currently active tab without a transition.
 * Call this once after tabs are rendered.
 */
function initTabIndicator(container) {
  if (!container) return;
  let indicator = container.querySelector('.tab-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'tab-indicator';
    container.appendChild(indicator);
  }
  container.style.position = 'relative';

  const active = container.querySelector('.tab-button.active');
  if (active) {
    // Snap without transition on first paint
    indicator.style.transition = 'none';
    positionIndicatorOnTab(container, indicator, active);
    requestAnimationFrame(() => {
      indicator.style.transition = '';
    });
  }
}
