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
  if (!/[\+\-\*\/]/.test(expr)) return null;

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
      return parseFloat(token);
    }
    
    const result = parseExpression();
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

