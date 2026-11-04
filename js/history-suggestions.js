/* Local history suggestions use the current dataset; nothing is persisted here. */
function findHistorySuggestions(records, query, field, type) {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length < 2) return [];
  const seen = new Set();
  return records.filter(row => !type || row.type === type)
    .filter(row => typeof row[field] === 'string' && row[field].trim().toLocaleLowerCase().includes(needle))
    .sort((a,b) => Number(b.timestamp || 0) - Number(a.timestamp || 0) || String(b.date || '').localeCompare(String(a.date || '')))
    .filter(row => { const key = row[field].trim().toLocaleLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; })
    .sort((a,b) => Number(b[field].trim().toLocaleLowerCase().startsWith(needle)) - Number(a[field].trim().toLocaleLowerCase().startsWith(needle)))
    .slice(0,2);
}

(() => {
  const selector = '#description, #ccDescription, #modalDescription, #modalCcDescription, input[name="debtWho"], input[name="recWho"]';
  let input = null, list = null, rows = [], selected = -1, config = null;
  function close() {
    if (input) { input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant'); input.removeAttribute('aria-controls'); }
    list?.remove(); list = null; input = null; rows = []; selected = -1;
  }
  function configuration(el) {
    if (el.name === 'debtWho') return {records:state.debts || [], field:'who'};
    if (el.name === 'recWho') return {records:state.receivables || [], field:'who'};
    if (['ccDescription','modalCcDescription'].includes(el.id)) return {
      records:state.creditCard?.transactions || [], field:'description',
      category:document.getElementById(el.id === 'ccDescription' ? 'ccPurchaseCategory' : 'modalCcPurchaseCategory')
    };
    return {records:state.transactions || [], field:'description',
      type:document.getElementById(el.id === 'description' ? 'transactionType' : 'modalTransactionType')?.value,
      category:document.getElementById(el.id === 'description' ? 'category' : 'modalCategory')};
  }
  function pick(index) {
    const row = rows[index], target = input, settings = config;
    if (!row || !target || sourceFloatingLayer(target) === null) { close(); return; }
    target.value = row[settings.field].trim();
    const category = settings.category;
    if (category && !category.value && row.category && [...category.options].some(option => option.value === row.category)) {
      category.value = row.category;
      category.dispatchEvent(new Event('change',{bubbles:true}));
    }
    close();
    target.dispatchEvent(new Event('input',{bubbles:true}));
    close();
  }
  function show(el) {
    close();
    if (!el.matches(selector) || sourceFloatingLayer(el) === null || el.value.trim().length < 2) return;
    config = configuration(el);
    rows = findHistorySuggestions(config.records,el.value,config.field,config.type);
    if (!rows.length) return;
    input = el; list = document.createElement('div'); list.id = 'historySuggestions';
    list.className = 'subscription-service-results history-suggestions'; list.setAttribute('role','listbox'); list.setAttribute('aria-label','From your history');
    rows.forEach((row,index) => {
      const option = document.createElement('button'); option.type = 'button'; option.tabIndex = -1;
      option.className = 'subscription-service-option';
      option.id = 'historySuggestion' + index; option.setAttribute('role','option'); option.setAttribute('aria-selected','false');
      const title = document.createElement('strong'); title.textContent = row[config.field].trim(); option.appendChild(title);
      if (config.category && row.category && [...config.category.options].some(o=>o.value===row.category)) {
        const detail = document.createElement('small'); detail.textContent = row.category; option.appendChild(detail);
      }
      option.addEventListener('pointerdown',event=>event.preventDefault());
      option.addEventListener('click',()=>pick(index)); list.appendChild(option);
    });
    document.body.appendChild(list);
    const popup = list, started = performance.now();
    function position() {
      if (list !== popup) return;
      const layer = sourceFloatingLayer(el);
      if (layer === null) { close(); return; }
      const rect = el.getBoundingClientRect(), viewport = window.visualViewport;
      const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0;
      const width = viewport?.width || window.innerWidth, height = viewport?.height || window.innerHeight;
      const below = Math.max(0,top+height-rect.bottom-12), above = Math.max(0,rect.top-top-12);
      const placeBelow = below >= Math.min(popup.scrollHeight,180) || below >= above;
      popup.style.maxHeight = Math.min(180,placeBelow ? below : above) + 'px';
      popup.style.width = Math.max(0,Math.min(rect.width,width-24)) + 'px';
      popup.style.left = Math.max(left+12,Math.min(rect.left,left+width-popup.offsetWidth-12)) + 'px';
      popup.style.top = (placeBelow ? rect.bottom+8 : rect.top-popup.offsetHeight-8) + 'px';
      popup.style.zIndex = layer;
      // Follow the field while its dialog entrance animation settles.
      if (performance.now()-started < 500) requestAnimationFrame(position);
    }
    position();
    el.setAttribute('aria-expanded','true'); el.setAttribute('aria-controls',list.id);
  }
  function prepare() {
    document.querySelectorAll(selector).forEach(el=>{
      el.autocomplete='off'; el.setAttribute('role','combobox'); el.setAttribute('aria-autocomplete','list');
      if (!el.hasAttribute('aria-expanded')) el.setAttribute('aria-expanded','false');
    });
    if (input && sourceFloatingLayer(input) === null) close();
  }
  prepare();
  new MutationObserver(prepare).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','hidden']});
  document.addEventListener('input',event=>{if(event.target.matches(selector) && !event.isComposing)show(event.target);});
  document.addEventListener('focusout',event=>{if(event.target===input)close();});
  document.addEventListener('pointerdown',event=>{if(input && event.target!==input && !list?.contains(event.target))close();});
  document.addEventListener('change',event=>{if(input && event.target!==input)close();});
  window.addEventListener('resize',close);
  window.visualViewport?.addEventListener('resize',close);
  window.visualViewport?.addEventListener('scroll',close);
  document.addEventListener('scroll',event=>{if(!list?.contains(event.target))close();},true);
  document.addEventListener('keydown',event=>{
    if (!input || event.target!==input || event.isComposing) return;
    if (event.key==='Escape') {event.preventDefault();event.stopImmediatePropagation();close();return;}
    if (['ArrowDown','ArrowUp'].includes(event.key)) {
      event.preventDefault(); event.stopImmediatePropagation();
      selected = selected < 0 ? (event.key==='ArrowDown' ? 0 : rows.length-1) : (selected + (event.key==='ArrowDown'?1:-1) + rows.length) % rows.length;
      [...list.children].forEach((option,index)=>option.setAttribute('aria-selected',String(index===selected)));
      input.setAttribute('aria-activedescendant',list.children[selected].id);
    } else if (event.key==='Enter' && selected>=0) {
      event.preventDefault();event.stopImmediatePropagation();pick(selected);
    } else if (event.key==='Tab' || event.key==='Enter') close();
  },true);
})();
