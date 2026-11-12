/* Local history suggestions use the current dataset; nothing is persisted here. */
function findHistorySuggestions(records, query, field, type, limit = 2) {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length < (field === 'who' ? 1 : 2)) return [];
  const seen = new Set();
  return records.filter(row => !type || row.type === type)
    .filter(row => typeof row[field] === 'string' && row[field].trim().toLocaleLowerCase().includes(needle))
    .sort((a,b) => Number(b.timestamp || 0) - Number(a.timestamp || 0) || String(b.date || '').localeCompare(String(a.date || '')))
    .filter(row => { const key = row[field].trim().toLocaleLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; })
    .sort((a,b) => Number(b[field].trim().toLocaleLowerCase().startsWith(needle)) - Number(a[field].trim().toLocaleLowerCase().startsWith(needle)))
    .slice(0,limit);
}

(() => {
  const selector = '#description, #ccDescription, #modalDescription, #modalCcDescription, input[name="debtWho"], input[name="recWho"]';
  let input = null, list = null, rows = [], selected = -1, config = null;
  let searchTimer = null;
  function close() {
    clearTimeout(searchTimer); searchTimer = null;
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
    const existing = input === el ? list : null;
    if (!existing) close();
    if (!el.matches(selector) || sourceFloatingLayer(el) === null) return;
    config = configuration(el);
    if (el.value.trim().length < (config.field === 'who' ? 1 : 2)) return;
    rows = findHistorySuggestions(config.records,el.value,config.field,config.type,10);
    if (!rows.length) { close(); return; }
    selected = -1; el.removeAttribute('aria-activedescendant');
    input = el; list = existing || document.createElement('div'); list.id = 'historySuggestions';
    list.inert = false; list.removeAttribute('aria-busy'); list.replaceChildren(); list.scrollTop = 0;
    list.className = 'subscription-service-results history-suggestions'; list.setAttribute('role','listbox'); list.setAttribute('aria-label','From your history');
    function appendOptions(start) {
    rows.slice(start).forEach((row,offset) => {
      const index = start + offset;
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
    }
    appendOptions(0);
    let exhausted = rows.length < 10;
    function loadMore() {
      if (exhausted) return;
      const count = rows.length;
      rows = findHistorySuggestions(config.records,el.value,config.field,config.type,count+10);
      exhausted = rows.length < count+10;
      appendOptions(count);
    }
    list.onscroll=()=>{
      if (list && list.scrollTop + list.clientHeight >= list.scrollHeight - 32) loadMore();
    };
    list.loadMoreHistory = loadMore;
    if (!existing) document.body.appendChild(list);
    const popup = list, started = performance.now();
    function position() {
      if (list !== popup) return;
      const layer = sourceFloatingLayer(el);
      if (layer === null) { close(); return; }
      const rect = el.getBoundingClientRect(), viewport = window.visualViewport;
      const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0;
      const width = viewport?.width || window.innerWidth, height = viewport?.height || window.innerHeight;
      const below = Math.max(0,top+height-rect.bottom-12), above = Math.max(0,rect.top-top-12);
      // Reserve the full two-result footprint even when filtering leaves one result.
      const placeBelow = below >= 130 || below >= above;
      popup.style.maxHeight = Math.min(130,placeBelow ? below : above) + 'px';
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
    [['description','category'],['ccDescription','ccPurchaseCategory'],
      ['modalDescription','modalCategory'],['modalCcDescription','modalCcPurchaseCategory'],
      ['tourDescription','tourCategory']].forEach(([descriptionId,categoryId])=>{
      const description = document.getElementById(descriptionId), category = document.getElementById(categoryId);
      if (!description || !category) return;
      const descriptionBlock = description.closest('label.onboard-field') || description.parentElement;
      const categoryBlock = category.closest('label.onboard-field') || category.parentElement;
      const parent = categoryBlock.parentElement;
      if (parent === descriptionBlock.parentElement && [...parent.children].indexOf(descriptionBlock) > [...parent.children].indexOf(categoryBlock)) {
        parent.insertBefore(descriptionBlock,categoryBlock);
      }
    });
    document.querySelectorAll(selector).forEach(el=>{
      el.autocomplete='off'; el.setAttribute('role','combobox'); el.setAttribute('aria-autocomplete','list');
      if (!el.hasAttribute('aria-expanded')) el.setAttribute('aria-expanded','false');
    });
    if (input && sourceFloatingLayer(input) === null) close();
  }
  prepare();
  new MutationObserver(records=>{
    if (records.some(record => record.type === 'childList' && [...record.addedNodes].some(node =>
        node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector))))) prepare();
    else if (input && sourceFloatingLayer(input) === null) close();
  }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','hidden']});
  document.addEventListener('input',event=>{
    const target = event.target;
    if (!target.matches(selector)) return;
    clearTimeout(searchTimer); searchTimer = null;
    if (event.isComposing || target.value.trim().length < (configuration(target).field === 'who' ? 1 : 2)) { close(); return; }
    if (input && input !== target) close();
    if (list) { list.inert = true; list.setAttribute('aria-busy','true'); selected = -1; target.removeAttribute('aria-activedescendant'); }
    searchTimer = setTimeout(()=>{
      searchTimer = null;
      if (document.activeElement === target && target.isConnected) show(target);
    },180);
  });
  document.addEventListener('focusin',close);
  document.addEventListener('focusout',event=>{if(event.target===input)close();});
  document.addEventListener('pointerdown',event=>{if((input || searchTimer) && event.target!==input && !list?.contains(event.target))close();});
  document.addEventListener('change',event=>{if(input && event.target!==input)close();});
  window.addEventListener('resize',close);
  window.visualViewport?.addEventListener('resize',close);
  window.visualViewport?.addEventListener('scroll',close);
  document.addEventListener('scroll',event=>{if(!list?.contains(event.target))close();},true);
  document.addEventListener('keydown',event=>{
    if (searchTimer && ['Escape','Tab','Enter'].includes(event.key)) close();
    if (!input || event.target!==input || event.isComposing) return;
    if (searchTimer && ['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); return; }
    if (event.key==='Escape') {event.preventDefault();event.stopImmediatePropagation();close();return;}
    if (['ArrowDown','ArrowUp'].includes(event.key)) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.key==='ArrowDown' && selected===rows.length-1) list.loadMoreHistory();
      selected = selected < 0 ? (event.key==='ArrowDown' ? 0 : rows.length-1) : (selected + (event.key==='ArrowDown'?1:-1) + rows.length) % rows.length;
      [...list.children].forEach((option,index)=>option.setAttribute('aria-selected',String(index===selected)));
      input.setAttribute('aria-activedescendant',list.children[selected].id);
      const option = list.children[selected];
      if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
      else if (option.offsetTop+option.offsetHeight > list.scrollTop+list.clientHeight) list.scrollTop = option.offsetTop+option.offsetHeight-list.clientHeight;
    } else if (event.key==='Enter' && selected>=0) {
      event.preventDefault();event.stopImmediatePropagation();pick(selected);
    } else if (event.key==='Tab' || event.key==='Enter') close();
  },true);
})();
