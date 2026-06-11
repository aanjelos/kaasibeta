// js/animations.js

const previousBalances = new Map();

function animateValue(el, newValue, isCurrency = true, prefix = '') {
  if (!el) return;
  
  if (!el.dataset.animId) {
    el.dataset.animId = Math.random().toString(36).substr(2, 9);
  }
  const key = el.dataset.animId;
  
  let startValue = previousBalances.get(key);
  if (startValue === undefined) {
    const rawText = el.textContent.replace(/[^0-9.-]/g, '');
    startValue = rawText ? parseFloat(rawText) : 0;
  }
  
  previousBalances.set(key, newValue);
  
  if (startValue === newValue) {
    el.innerHTML = isCurrency ? `${prefix}<span class="tabular-nums">${formatCurrency(newValue)}</span>` : `${prefix}${newValue}`;
    return;
  }

  const duration = 600;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // easeOutExpo
    const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    
    const currentValue = startValue + (newValue - startValue) * easeProgress;
    
    el.innerHTML = isCurrency ? `${prefix}<span class="tabular-nums">${formatCurrency(currentValue)}</span>` : `${prefix}${currentValue.toFixed(2)}`;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.innerHTML = isCurrency ? `${prefix}<span class="tabular-nums">${formatCurrency(newValue)}</span>` : `${prefix}${newValue}`;
    }
  }
  
  requestAnimationFrame(update);
}

function updateTabIndicator() {
  const container = document.getElementById('monthTabs');
  if (!container) return;
  
  let indicator = container.querySelector('.tab-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'tab-indicator';
    container.appendChild(indicator);
  }
  
  const activeTabs = container.querySelectorAll('button.active');
  if (activeTabs.length === 1) {
    const activeTabBtn = activeTabs[0];
    indicator.style.display = 'block';
    indicator.style.width = `${activeTabBtn.offsetWidth}px`;
    indicator.style.left = `${activeTabBtn.offsetLeft}px`;
  } else {
    indicator.style.display = 'none';
  }
}
