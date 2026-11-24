const KaasiStats = (() => {
  const formats = new Intl.NumberFormat('en-LK');
  const dateFormat = new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const monthFormat = new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'});
  const monthName = new Intl.DateTimeFormat('en-GB',{month:'long'});
  const displayDate = date => dateFormat.format(new Date(date+'T12:00:00'));
  let grain, logo, assets, revision = 0, file;
  function summarize(data, period, today) {
    const counts = [0,0,0], totals = [0,0], largest = [null,null];
    const days = new Set(), months = new Set(), years = new Set();
    const byDay = new Map(), byMonth = new Map();
    let first, last;
    function collect(row, kind) {
      const date = row?.date, amount = Number(row?.amount);
      if (kind < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today || !Number.isFinite(amount) || amount <= 0) return;
      const year = date.slice(0,4), month = date.slice(0,7);
      years.add(year);
      if (period !== 'all' && period !== year) return;
      counts[kind]++;
      days.add(date);
      months.add(month);
      if (!first || date < first) first = date;
      if (!last || date > last) last = date;
      if (kind === 2) return;
      const cents = Math.round(amount * 100);
      totals[kind] += cents;
      if (!largest[kind] || amount > Number(largest[kind].amount)) largest[kind] = row;
      if (kind === 0) {
        byDay.set(date,(byDay.get(date)||0)+cents);
        byMonth.set(month,(byMonth.get(month)||0)+cents);
      }
    }
    for (const row of data.transactions || []) collect(row,['expense','income'].indexOf(row?.type));
    for (const row of data.creditCard?.transactions || []) collect(row,2);
    function peak(map) {
      let best;
      for (const item of map) if (!best || item[1]>best[1] || (item[1]===best[1] && item[0]<best[0])) best=item;
      return best;
    }
    return {counts,totals,largest,first,last,years,days:days.size,months:months.size,day:peak(byDay),month:peak(byMonth)};
  }
  function createGrain() {
    const grain = document.createElement('canvas');
    grain.width = grain.height = 180;
    const grainContext = grain.getContext('2d');
    const pixels = grainContext.createImageData(grain.width, grain.height);
    let seed = 731;
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const shade = 32 + (seed >>> 24) * 0.75;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = shade;
      pixels.data[i + 3] = 255;
    }
    grainContext.putImageData(pixels, 0, 0);
    return grain;
  }
  function group(title, rows, note) {
    const section = document.createElement('section');
    const heading = document.createElement('h3');
    heading.textContent = title;
    const list = document.createElement('dl');
    for (const [label, value, detail] of rows) {
      const row = document.createElement('div');
      const name = document.createElement('dt');
      const stat = document.createElement('dd');
      name.textContent = label;
      stat.textContent = value;
      if (detail) {
        const description = document.createElement('div');
        description.className = 'stats-detail';
        description.textContent = detail;
        name.append(description);
      }
      row.append(name, stat);
      list.append(row);
    }
    section.append(heading,list);
    if (note) {
      const footnote = document.createElement('p');
      footnote.textContent = note;
      section.append(footnote);
    }
    return section;
  }
  function poster(data, total) {
    const canvas = document.getElementById('statsPoster');
    const c = canvas.getContext('2d');
    const charcoal = '#121212';
    const orange = '#e67e26';
    c.fillStyle = charcoal;
    c.fillRect(0,0,1080,1920);
    for (const [x,y,r,color] of [[1000,360,540,'rgba(59,130,246,.12)'],[260,1450,760,'rgba(230,126,38,.29)']]) {
      const glow=c.createRadialGradient(x,y,0,x,y,r);
      glow.addColorStop(0,color); glow.addColorStop(1,'transparent');
      c.fillStyle=glow; c.fillRect(0,0,1080,1920);
    }
    c.save();
    c.globalAlpha = 38 / 255;
    c.globalCompositeOperation = 'soft-light';
    c.imageSmoothingEnabled = false;
    c.scale(2.6,2.6);
    c.fillStyle = c.createPattern(grain, 'repeat');
    c.fillRect(0,0,1080/2.6,1920/2.6);
    c.restore();
    const text = (value,y,font,color='#fff',x=540,maxWidth=900) => {
      c.fillStyle=color;
      c.font=font;
      c.textAlign='center';
      c.fillText(value,x,y,maxWidth);
    };
    const headingFont = '132px "Instrument Serif", Georgia, serif';
    const headingBaseline = 375;
    const wordmarkHeight = 94;
    const wordmarkWidth = wordmarkHeight * 2164.01 / 700;
    const gap = 24;
    c.font = headingFont;
    const prefixWidth = c.measureText('My').width;
    const suffixWidth = c.measureText(data.titleSuffix).width;
    const titleLeft = (1080 - prefixWidth - suffixWidth - wordmarkWidth - gap * 2) / 2;
    const logoLeft = titleLeft + prefixWidth + gap;
    text('My',headingBaseline,headingFont,'#fff',titleLeft + prefixWidth / 2);
    c.drawImage(logo,logoLeft,headingBaseline - wordmarkHeight,wordmarkWidth,wordmarkHeight);
    text(data.titleSuffix,headingBaseline,headingFont,'#fff',logoLeft + wordmarkWidth + gap + suffixWidth / 2);
    text(data.dates,465,'500 34px Satoshi, system-ui, sans-serif','#a1a1aa');
    let size=400;
    const numeralFont = () => size+'px "Instrument Serif", Georgia, serif';
    c.font=numeralFont();
    const width=c.measureText(total).width;
    if (width>900) size=Math.floor(size*900/width);
    text(total,1136,numeralFont(),orange);
    text('transactions logged',1230,'500 58px Satoshi, system-ui, sans-serif');
    c.strokeStyle='rgba(255,255,255,.18)'; c.lineWidth=2;
    c.beginPath(); c.moveTo(92,1405); c.lineTo(988,1405); c.stroke();
    const supporting = [[data.days,'days tracked'],[data.counts[2],'credit card purchases'],[data.months,'active months']];
    supporting.forEach(([value,label],index) => {
      const x=[240,540,840][index];
      text(formats.format(value),1570,'85px "Instrument Serif", Georgia, serif','#fff',x,255);
      text(label,1637,'500 33px Satoshi, system-ui, sans-serif','#a1a1aa',x,255);
    });
    canvas.setAttribute('aria-label',data.title + ', ' + data.dates + ': ' + total + ' transactions logged, ' + data.days + ' days tracked, ' + data.counts[2] + ' credit card purchases and ' + data.months + ' active months.');
  }

  function loadAssets() {
    if (!assets) {
      logo = new Image();
      logo.src = 'img/KaasiWordmark.svg';
      grain = createGrain();
      assets = Promise.all([logo.decode(),document.fonts.load('132px "Instrument Serif"'),document.fonts.load('500 58px Satoshi')]);
    }
    return assets;
  }
  async function open() {
    const token = ++revision, today = getCurrentDateString(), year = today.slice(0,4);
    const picker = document.getElementById('statsPeriod'), list = document.getElementById('statsList');
    const save = document.getElementById('statsExport'), share = document.getElementById('statsShare');
    const period = picker.value || year;
    const data = summarize(state,period,today);
    data.years.add(year);
    picker.replaceChildren(...[...data.years].sort().reverse().map(y=>new Option(y,y)),new Option('All time','all'));
    picker.value = period;
    if (!picker.value) { picker.value=year; return open(); }
    picker.onchange = open;
    const total = formats.format(data.counts.reduce((a,b)=>a+b,0));
    const amountRow = (label,row) => row ? [label,formatCurrency(Number(row.amount)),[row.description,displayDate(row.date)].filter(Boolean).join(' · ')] : [label,'—'];
    const peakRow = (label,peak,monthly) => peak ? [label,formatCurrency(peak[1]/100),monthly ? monthFormat.format(new Date(peak[0]+'-01T12:00:00')) : displayDate(peak[0])] : [label,'—'];
    const note = data.first ? '' : 'No transactions recorded for this period.';
    list.replaceChildren(group('Transactions', [
      ['Total transactions',total],
      ...['Expense entries','Income entries','Credit card purchases'].map((label,i)=>[label,formats.format(data.counts[i])]),
      ['Recorded income',formatCurrency(data.totals[1]/100)],
      ['Recorded expenses',formatCurrency(data.totals[0]/100)]
    ],note),
      group('Highlights',[amountRow('Biggest expense',data.largest[0]),amountRow('Biggest income',data.largest[1]),peakRow('Highest-spend month',data.month,true),peakRow('Highest-spend day',data.day,false)]),
      group('Activity',[['First transaction',data.first ? displayDate(data.first) : '—'],['Latest transaction',data.last ? displayDate(data.last) : '—'],['Days tracked',formats.format(data.days)],['Active months',formats.format(data.months)]]));
    const canvas = document.getElementById('statsPoster');
    canvas.parentElement.hidden = !data.first;
    save.disabled = true;
    share.hidden = true;
    file = null;
    if (!data.first) return;
    data.titleSuffix = period === 'all' ? 'stats' : 'year';
    data.title = 'My Kaasi ' + data.titleSuffix;
    const month = today.slice(5,7);
    data.dates = period;
    if (period === 'all') {
      data.dates = 'Since ' + monthFormat.format(new Date(data.first+'T12:00:00'));
    } else if (period === year && month !== '12') {
      data.dates = month === '01' ? 'January ' + year :
        'January to ' + monthName.format(new Date(today+'T12:00:00')) + ' ' + year;
    }
    try {
      await loadAssets();
      if (token !== revision) return;
      poster(data,total);
      const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
      if (token !== revision) return;
      if (!blob) throw new Error('Image unavailable');
      file = new File([blob],'my-kaasi-'+period+'.png',{type:'image/png'});
      save.disabled = false;
      share.hidden = !navigator.canShare?.({files:[file]});
    } catch {
      if (token === revision) { assets = null; showNotification('Could not prepare the share image. Reopen Stats to retry.','error'); }
    }
    save.onclick = () => {
      if (!file) return;
      const url=URL.createObjectURL(file), link=document.createElement('a');
      link.href=url; link.download=file.name; link.click();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    };
    share.onclick = async () => {
      try { await navigator.share({files:[file]}); }
      catch (error) { if (error.name!=='AbortError') showNotification('Sharing is unavailable. Use Save image.','warning'); }
    };
  }
  return {open,summarize};
})();
