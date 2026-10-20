/**
 * math-tool.js
 * Provides mathematical evaluation logic for the built-in calculator feature.
 */
function evaluateMathExpression(inputStr) {
  let expr = inputStr.trim();
  expr = expr.replace(/,/g, '');
  if (expr.endsWith("=")) {
    expr = expr.slice(0, -1);
  }
  expr = expr.replace(/×/g, "*").replace(/÷/g, "/");

  if (!/^[\d\.\+\-\*\/\(\)\s]+$/.test(expr)) return null;

  try {
    const tokens = expr.match(/([0-9\.]+)|([\+\-\*\/\(\)])/g);
    if (!tokens) return null;
    
    let pos = 0;
    function parseExpression() {
      let value = parseTerm();
      while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
        let op = tokens[pos++];
        let nextTerm = parseTerm();
        value = op === '+' ? value + nextTerm : value - nextTerm;
      }
      return value;
    }
    function parseTerm() {
      let value = parseFactor();
      while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
        let op = tokens[pos++];
        let nextFactor = parseFactor();
        value = op === '*' ? value * nextFactor : value / nextFactor;
      }
      return value;
    }
    function parseFactor() {
      if (pos >= tokens.length) throw new Error("Unexpected end");
      let token = tokens[pos++];
      if (token === '(') {
        let value = parseExpression();
        if (pos >= tokens.length || tokens[pos++] !== ')') throw new Error("Missing )");
        return value;
      }
      if (token === '-') return -parseFactor();
      if (token === '+') return parseFactor();
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) throw new Error("Invalid number");
      return Number(token);
    }
    
    const result = parseExpression();
    if (pos === tokens.length && Number.isFinite(result) && Math.abs(result) <= Number.MAX_SAFE_INTEGER / 100) {
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
    const wasExpression = /[+*/()×÷=]|\d\s*-/.test(inputEl.value);
    inputEl.value = result;
    if (wasExpression && typeof trackEvent === "function") trackEvent("used_inline_calculator", "Feature Usage");
    return wasExpression;
  }
  return false; 
}

function parseAmountValue(value) {
  const result = evaluateMathExpression(String(value ?? ""));
  return result === null ? NaN : result;
}

// Catch invalid calculator fields before any form handler mutates financial state.
document.addEventListener("submit", (event) => {
  const fields = event.target.querySelectorAll("input.calc-amount");
  for (const input of fields) {
    if (input.disabled || !input.getClientRects().length || !input.value.trim()) continue;
    const result = parseAmountValue(input.value);
    if (!Number.isFinite(result)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showNotification("Enter a valid amount or complete calculation. Division by zero and unfinished expressions cannot be saved.", "error", 7000);
      input.focus();
      return;
    }
    input.value = result;
  }
}, true);

function positionMathToolbar(inputEl) {
  const parent = inputEl.parentElement;
  if (!parent.classList.contains("relative")) {
    parent.classList.add("relative");
  }
  if (!parent.contains(mathToolbar)) {
    parent.appendChild(mathToolbar);
  }
  mathToolbar.style.left = 'auto';
  mathToolbar.style.right = '1rem';
  mathToolbar.style.top = '100%';
  mathToolbar.style.marginTop = '4px';
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

