/** Local service catalogue. IDs are portable backup values, never remote URLs. */
const SubscriptionServices = (() => {
  const rows = [
    ["Netflix","netflix"],["Spotify","spotify","spotify premium|spotify family"],["Apple Music","applemusic"],
    ["Apple TV","appletv","apple tv+"],["Apple iCloud","icloud","icloud+"],
    ["YouTube Premium","youtube","youtube|youtube premium"],["YouTube Music","youtubemusic","yt music"],["Amazon Prime","amazonprime","prime video|amazon prime video"],
    ["Disney+","disneyplus","disney plus|disneyplus"],["HBO Max","hbo"],["Hulu","hulu"],["Paramount+","paramountplus"],
    ["Crunchyroll","crunchyroll"],["Twitch","twitch"],["Plex","plex"],["MUBI","mubi"],["Vimeo","vimeo"],
    ["Deezer","deezer"],["Tidal","tidal"],["SoundCloud","soundcloud"],["Audible","audible"],
    ["Patreon","patreon"],["Passes","passes"],["Fansly","fansly"],
    ["ChatGPT","openai","openai|chat gpt|chatgpt plus|chatgpt pro"],["Claude","claude","anthropic"],
    ["Gemini","googlegemini","google gemini|google ai"],["Google One","googleone","google storage"],
    ["Perplexity","perplexity"],["Midjourney","midjourney","mid journey"],["DeepSeek","deepseek","deep seek"],["Grok","grok","xai|x ai"],["Cursor","cursor"],["GitHub Copilot","githubcopilot"],
    ["Adobe","adobe","creative cloud|adobe cloud|photoshop|illustrator|premiere pro|acrobat|firefly"],
    ["Lightroom Mobile","lightroommobile","lightroom|adobe lightroom mobile|lightroom for mobile|lr mobile"],
    ["Envato","envato","envato elements"],["Magnific (Freepik)","magnific","freepik|magnific|magnific ai"],
    ["PickMe Pass","pickmepass","pickme|pick me|pick me pass"],["Uber One","uberone","uber|uber eats|ubereats"],
    ["Dialog","dialog","dialog viu|dialog television|dialog tv|dialog home broadband"],
    ["SLT-MOBITEL","sltmobitel","slt|mobitel|slt fibre|slt fiber|slt broadband"],["PEO TV","peotv","peo tv|peotv"],
    ["Hutch","hutch"],["Airtel","airtel"],["Dialog Viu","dialogviu","viu"],
    ["Canva","canva"],["CapCut","capcut","cap cut"],["Figma","figma"],["Picsart","picsart","pics art"],["Autodesk","autodesk","autocad|auto cad|fusion 360|autodesk maya|autodesk revit"],["Framer","framer"],["Webflow","webflow"],
    ["Shutterstock","shutterstock"],["Flaticon","flaticon"],["Icons8","icons8"],["ArtStation","artstation"],
    ["Dribbble","dribbble"],["Behance","behance"],["Loom","loom"],
    ["Microsoft 365","microsoft","office 365|microsoft office"],["Google Workspace","googleworkspace","g suite"],
    ["Notion","notion"],["Evernote","evernote"],["Todoist","todoist"],["TickTick","ticktick"],
    ["Trello","trello"],["Asana","asana"],["ClickUp","clickup"],["Monday.com","mondaydotcom"],
    ["Slack","slack"],["Zoom","zoom"],["Calendly","calendly"],["Grammarly","grammarly"],["QuillBot","quillbot","quill bot"],["Replit","replit"],["Linktree","linktree","link tree"],
    ["Dropbox","dropbox"],["OneDrive","microsoftonedrive"],["Box","box"],["MEGA","mega"],
    ["Proton","proton","proton mail|proton drive|proton vpn"],["LastPass","lastpass"],
    ["NordVPN","nordvpn"],["Surfshark","surfshark"],
    ["Malwarebytes","malwarebytes"],["ESET","eset"],["Bitdefender","bitdefender"],["Norton","norton"],
    ["GitHub","github"],["GitLab","gitlab"],["JetBrains","jetbrains"],["Docker","docker"],
    ["Cloudflare","cloudflare"],["Vercel","vercel"],["Netlify","netlify"],["Supabase","supabase"],
    ["Firebase","firebase"],["Amazon Web Services","aws","aws|amazon aws"],
    ["Namecheap","namecheap"],["GoDaddy","godaddy"],["Hostinger","hostinger"],["WordPress","wordpress"],
    ["Squarespace","squarespace"],["Wix","wix"],["Shopify","shopify"],["WooCommerce","woocommerce"],
    ["Mailchimp","mailchimp"],["Buffer","buffer"],["Hootsuite","hootsuite"],
    ["PlayStation Plus","playstation"],["Xbox Game Pass","xbox"],["Nintendo Switch Online","nintendoswitch"],
    ["EA Play","ea","ea"],["Ubisoft+","ubisoft"],["GeForce NOW","nvidia","geforce|nvidia geforce now"],["Discord Nitro","discord","discord|discord premium"],["Minecraft Realms","minecraft","minecraft|realms plus|minecraft realms plus"],["Google Play Pass","googleplaypass","play pass"],
    ["Duolingo","duolingo"],["Coursera","coursera"],["Udemy","udemy"],["Skillshare","skillshare"],
    ["Strava","strava"],["Google Health Premium (Fitbit)","fitbit","google health|google health premium|health premium|fitbit|fitbit premium"],["MyFitnessPal","myfitnesspal"],["Lyfta","lyfta","lyfta pro|lyfta premium"],
    ["Headspace","headspace"],["Calm","calm"],["Flo Premium","flo","flo|flo health"],["Medium","medium"],["Substack","substack"],
    ["Epidemic Sound","epidemicsound","epidemic"],["iflix","iflix"],
    ["Meta","meta","meta verified|meta ai|meta one"],["Facebook","facebook","facebook verified|facebook premium|facebook plus"],["Instagram","instagram","instagram verified|instagram premium|instagram plus"],["WhatsApp","whatsapp","whats app|whatsapp business|whatsapp verified|whatsapp premium|whatsapp plus"],
    ["LinkedIn Premium","linkedin","linkedin|linked in premium"],["OnlyFans","onlyfans","only fans"],["Snapchat+","snapchat","snapchat|snapchat plus"],["Telegram Premium","telegram","telegram"],["X Premium","x","x|twitter|twitter blue"],["Tinder","tinder","tinder plus|tinder gold|tinder platinum"],["Bumble","bumble","bumble boost|bumble premium"],
    ["The New York Times","newyorktimes"],["The Guardian","theguardian"],["Financial Times","financialtimes"],
    ["The Economist","theeconomist"],["The Washington Post","thewashingtonpost"],["Reuters","reuters"],
    ["QuickBooks","quickbooks"],["Xero","xero"],
    ["FreshBooks","freshbooks"],["Zoho","zoho"],["HubSpot","hubspot"],["Salesforce","salesforce"]
  ];
  const generics = { letter:["Initial","font"], gym:["Gym / Fitness","dumbbell"], internet:["Internet","wifi"],
    phone:["Phone plan","mobile-alt"], insurance:["Insurance","shield-alt"], learning:["Education","graduation-cap"],
    news:["Newspaper","newspaper"], home:["Home services","home"], cloud:["Cloud storage","cloud"],
    music:["Music","music"], video:["Video","film"], software:["Software","laptop-code"] };
  const sharedLogos={uberone:'uber',peotv:'sltmobitel'};
  const artworkVersion=document.querySelector?.('meta[name="application-version"]')?.getAttribute?.('content')||'local';
  const services = rows.map(([name,id,aliases=""]) => ({name,id,logoId:sharedLogos[id]||id,aliases:aliases.split("|").filter(Boolean)}));
  const get=id=>services.find(service=>service.id===id);
  const normalize = value => String(value||'').toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  function match(value) {
    const phrase=` ${normalize(value)} `;
    const matches=services.map(service=>({service,score:Math.max(0,...[service.name,...service.aliases].map(name=>{
      const term=normalize(name);return term && phrase.includes(` ${term} `)?term.length:0;
    }))})).filter(row=>row.score>0).sort((a,b)=>b.score-a.score);
    // Equally specific different brands need an explicit choice rather than a guess.
    return matches.length && (matches.length===1||matches[0].score>matches[1].score)?matches[0].service:null;
  }
  function search(query) {
    const q=normalize(query);
    const detected=match(query);
    // Require an intentional brand prefix before suggesting this service.
    const words=q.split(' '),fanSearch=words.some(word=>word.startsWith('fan'));
    const candidates=services.filter(service=>service.id==='onlyfans'?(fanSearch||words.some(word=>word.startsWith('only'))):service.id==='fansly'?fanSearch:true);
    if(!q)return candidates.slice(0,12);
    const scoreTerm=(term,isName)=>{
      const text=normalize(term);if(!text)return 0;
      if(text===q)return isName?1000:950;
      if(text.startsWith(q))return isName?900:800;
      if(!isName&&q.length<=2)return 0;
      if(text.split(' ').some(word=>word.startsWith(q)))return isName?700:600;
      // Short fragments inside alias words are usually noise (ea in Eats/Creative).
      if(text.includes(q) && (isName||q.length>=3))return isName?300:100;
      return 0;
    };
    return candidates.map((service,index)=>({service,index,score:Math.max(scoreTerm(service.name,true),...service.aliases.map(alias=>scoreTerm(alias,false)),service===detected?850:0)}))
      .filter(row=>row.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,12).map(row=>row.service);
  }
  function icon(subscription) {
    const service=get(subscription.serviceId) || (!subscription.serviceId && subscription.icon!=='custom' && match(subscription.name));
    const generic=generics[subscription.icon] || generics.letter;
    const initial=Array.from(subscription.name?.trim() || "S")[0].toUpperCase();
    return `<span class="subscription-icon"><span class="subscription-icon-fallback">${generic===generics.letter ? escapeHTML(initial) : `<i class="fas fa-${generic[1]}" aria-hidden="true"></i>`}</span>${service && SUBSCRIPTION_LOGOS.includes(service.logoId) ? `<img src="img/subscriptions/${SUBSCRIPTION_LOGO_FILES[service.logoId]||service.logoId+'.svg'}?v=${encodeURIComponent(artworkVersion)}" alt="" loading="lazy" decoding="async" data-subscription-logo>` : ""}</span>`;
  }
  return {services,generics,search,match,icon,get};
})();
document.addEventListener("error",event=>{
  if(event.target?.matches?.('[data-subscription-logo]')) event.target.hidden=true;
},true);
