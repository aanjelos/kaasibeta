/**
 * animations.js
 * Handles UI animations and visual transitions within the application.
 */
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
      
      // Use offsetLeft which directly provides the position relative to the relative offsetParent (the container itself).
      // This completely avoids issues with padding, borders, and scroll calculations.
      const left = activeTabBtn.offsetLeft;
      const width = activeTabBtn.offsetWidth;
      
      indicator.style.width = `${width}px`;
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
  updateTabIndicator('ccMonthTabs');
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

function animateListReorder(container, updateFn) {
  if (!container) return;

  // 1. FIRST: Get initial bounding rects for all children
  const firstRects = new Map();
  Array.from(container.children).forEach(child => {
    // Only track elements with a budget ID or dataset ID
    const id = child.id || child.dataset.budgetId || child.dataset.id;
    if (id) {
      firstRects.set(id, child.getBoundingClientRect());
    }
  });

  // 2. RUN UPDATE: Call the function that actually updates the DOM
  updateFn();

  // 3. LAST & INVERT: Measure new positions and invert
  Array.from(container.children).forEach(child => {
    const id = child.id || child.dataset.budgetId || child.dataset.id;
    if (id && firstRects.has(id)) {
      const firstRect = firstRects.get(id);
      const lastRect = child.getBoundingClientRect();

      const deltaX = firstRect.left - lastRect.left;
      const deltaY = firstRect.top - lastRect.top;

      if (deltaX !== 0 || deltaY !== 0) {
        // Invert: Apply transform to move it back to the first position
        child.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        child.style.transition = "none";
        
        // Ensure z-index is higher while animating so it doesn't clip underneath
        child.style.zIndex = "10";

        // 4. PLAY: Wait for next frame, then remove transform to animate
        requestAnimationFrame(() => {
          child.style.transform = "";
          child.style.transition = "transform 400ms cubic-bezier(0.4, 0, 0.2, 1)";
          
          // Cleanup transition after animation ends
          setTimeout(() => {
            child.style.transition = "";
            child.style.zIndex = "";
          }, 400);
        });
      }
    }
  });
}
