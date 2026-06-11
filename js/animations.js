// js/animations.js

const previousBalances = new Map();

function animateValue(el, newValue, isCurrency = true, prefix = '', stableKey = null) {
  if (!el) return;
  
  if (!el.dataset.animId) {
    el.dataset.animId = Math.random().toString(36).substr(2, 9);
  }
  const key = stableKey || el.id || el.dataset.animId;
  
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

function updateTabIndicator(containerId = 'monthTabs') {
  const performUpdate = () => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Ensure the container has relative position for absolute indicator placement
    if (window.getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    
    let indicator = container.querySelector('.tab-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'tab-indicator bg-accent-500';
      container.appendChild(indicator);
    }
    
    const activeTabBtn = container.querySelector('button.active');
    if (activeTabBtn) {
      indicator.style.display = 'block';
      
      // Calculate bounding rect of container and the active button
      const containerRect = container.getBoundingClientRect();
      const btnRect = activeTabBtn.getBoundingClientRect();
      
      // Left calculation offsets the button relative to container and factors horizontal scrolling
      const left = btnRect.left - containerRect.left + container.scrollLeft;
      
      indicator.style.width = `${btnRect.width}px`;
      indicator.style.left = `${left}px`;
    } else {
      indicator.style.display = 'none';
    }
  };

  performUpdate();
  if (document.fonts) {
    document.fonts.ready.then(performUpdate);
  }
  setTimeout(performUpdate, 150);
}

window.addEventListener('resize', () => {
  updateTabIndicator('monthTabs');
  updateTabIndicator('settingsTabsContainer');
});

function triggerStaggerAnimation(container) {
  if (!container) return;
  const items = container.querySelectorAll('.stagger-item');
  
  items.forEach((item) => {
    item.style.animation = 'none';
    item.style.opacity = '0';
  });
  
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      items.forEach((item, index) => {
        item.style.animation = '';
        item.style.opacity = '';
        item.style.animationDelay = `${index * 0.03}s`;
      });
    });
  });
}
