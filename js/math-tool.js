/**
 * math-tool.js
 * Provides mathematical evaluation logic for the built-in calculator feature.
 */
function evaluateMathExpression(inputStr) {
  let expr = inputStr.trim();
  if (expr.endsWith("=")) {
    expr = expr.slice(0, -1);
  }
  expr = expr.replace(/×/g, "*").replace(/÷/g, "/");

  if (!/^[\d\.\+\-\*\/\(\)\s]+$/.test(expr)) return null;
  if (!/[\+\-\*\/]/.test(expr)) return null;

  try {
    const result = Function('"use strict";return (' + expr + ')')();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return parseFloat(result.toFixed(2));
    }
  } catch (e) {
    return null;
  }
  return null;
}

function processCalculation(inputEl) {
  const result = evaluateMathExpression(inputEl.value);
  if (result !== null) {
    inputEl.value = result;
    if (typeof trackEvent === "function") trackEvent("used_inline_calculator", "Feature Usage");
    return true; 
  }
  return false; 
}

function positionMathToolbar(inputEl) {
  const rect = inputEl.getBoundingClientRect();
  const tbWidth = mathToolbar.offsetWidth || 226; // Approx width if layout isn't painted yet
  mathToolbar.style.left = `${rect.right + window.scrollX - tbWidth}px`;
  mathToolbar.style.top = `${rect.bottom + window.scrollY + 6}px`; 
}

function showMathToolbar(inputEl) {
  if (state.settings && state.settings.showMathToolbar === false) return;
  activeCalcInput = inputEl;
  positionMathToolbar(inputEl);
  mathToolbar.classList.add("visible");
  if (toolbarHideTimeout) clearTimeout(toolbarHideTimeout);
}

function hideMathToolbar() {
  toolbarHideTimeout = setTimeout(() => {
    mathToolbar.classList.remove("visible");
    activeCalcInput = null;
  }, 150);
}

