/** Local service catalogue. IDs are portable backup values, never remote URLs. */
const SubscriptionServices = (() => {
  const rows = [
    ["Netflix","netflix"],["Spotify","spotify","spotify premium|spotify family"],["Apple Music","applemusic"],
    ["Apple TV","appletv","apple tv+"],["Apple iCloud","icloud","icloud+"],
    ["YouTube Premium","youtube","youtube premium|youtube music"],["Amazon Prime","amazonprime","prime video"],
    ["Disney+","disneyplus"],["HBO Max","hbo"],["Hulu","hulu"],["Paramount+","paramountplus"],
    ["Crunchyroll","crunchyroll"],["Twitch","twitch"],["Plex","plex"],["MUBI","mubi"],["Vimeo","vimeo"],
    ["Deezer","deezer"],["Tidal","tidal"],["SoundCloud","soundcloud"],["Audible","audible"],
    ["Patreon","patreon"],
    ["ChatGPT","openai","openai|chat gpt|chatgpt plus|chatgpt pro"],["Claude","claude","anthropic"],
    ["Gemini","googlegemini","google gemini|google ai"],["Google One","googleone","google storage"],
    ["Perplexity","perplexity"],["Midjourney","midjourney"],["Cursor","cursor"],["GitHub Copilot","githubcopilot"],
    ["Adobe","adobe","creative cloud|adobe cloud|photoshop|illustrator|lightroom|premiere pro|acrobat|firefly"],
    ["Lightroom Mobile","lightroommobile","adobe lightroom mobile|lightroom for mobile|lr mobile"],
    ["Envato","envato","envato elements"],["Magnific (Freepik)","magnific","freepik|magnific|magnific ai"],
    ["PickMe Pass","pickmepass","pickme|pick me|pick me pass"],["Uber One","uberone","uber|uber eats|ubereats"],
    ["Dialog","dialog","dialog viu|dialog television|dialog tv|dialog home broadband"],
    ["SLT-MOBITEL","sltmobitel","slt|mobitel|slt fibre|slt fiber|slt broadband"],["PEO TV","peotv","peo tv|peotv"],
    ["Hutch","hutch"],["Airtel","airtel"],["Dialog Viu","dialogviu","viu"],
    ["Canva","canva"],["Figma","figma"],["Framer","framer"],["Webflow","webflow"],
    ["Shutterstock","shutterstock"],["Flaticon","flaticon"],["Icons8","icons8"],["ArtStation","artstation"],
    ["Dribbble","dribbble"],["Behance","behance"],["Loom","loom"],
    ["Microsoft 365","microsoft","office 365|microsoft office"],["Google Workspace","googleworkspace","g suite"],
    ["Notion","notion"],["Evernote","evernote"],["Todoist","todoist"],["TickTick","ticktick"],
    ["Trello","trello"],["Asana","asana"],["ClickUp","clickup"],["Monday.com","mondaydotcom"],
    ["Slack","slack"],["Zoom","zoom"],["Calendly","calendly"],["Grammarly","grammarly"],
    ["Dropbox","dropbox"],["OneDrive","microsoftonedrive"],["Box","box"],["MEGA","mega"],
    ["Proton","proton","proton mail|proton drive|proton vpn"],["LastPass","lastpass"],
    ["NordVPN","nordvpn"],["Surfshark","surfshark"],
    ["Malwarebytes","malwarebytes"],["ESET","eset"],["Bitdefender","bitdefender"],["Norton","norton"],
    ["GitHub","github"],["GitLab","gitlab"],["JetBrains","jetbrains"],["Docker","docker"],
    ["Cloudflare","cloudflare"],["Vercel","vercel"],["Netlify","netlify"],["Supabase","supabase"],
    ["Firebase","firebase"],
    ["Namecheap","namecheap"],["GoDaddy","godaddy"],["Hostinger","hostinger"],["WordPress","wordpress"],
    ["Squarespace","squarespace"],["Wix","wix"],["Shopify","shopify"],["WooCommerce","woocommerce"],
    ["Mailchimp","mailchimp"],["Buffer","buffer"],["Hootsuite","hootsuite"],
    ["PlayStation Plus","playstation"],["Xbox Game Pass","xbox"],["Nintendo Switch Online","nintendoswitch"],
    ["EA Play","ea"],["Ubisoft+","ubisoft"],["GeForce NOW","nvidia"],["Discord Nitro","discord"],["Google Play Pass","googleplaypass","play pass"],
    ["Duolingo","duolingo"],["Coursera","coursera"],["Udemy","udemy"],["Skillshare","skillshare"],
    ["Strava","strava"],["Fitbit","fitbit"],["MyFitnessPal","myfitnesspal"],["Lyfta","lyfta","lyfta pro|lyfta premium"],
    ["Headspace","headspace"],["Calm","calm"],["Medium","medium"],["Substack","substack"],
    ["The New York Times","newyorktimes"],["The Guardian","theguardian"],["Financial Times","financialtimes"],
    ["The Economist","theeconomist"],["The Washington Post","thewashingtonpost"],["Reuters","reuters"],
    ["QuickBooks","quickbooks"],["Xero","xero"],
    ["FreshBooks","freshbooks"],["Zoho","zoho"],["HubSpot","hubspot"],["Salesforce","salesforce"]
  ];
  const generics = { letter:["Initial","font"], gym:["Gym / Fitness","dumbbell"], internet:["Internet","wifi"],
    phone:["Phone plan","mobile-alt"], insurance:["Insurance","shield-alt"], learning:["Education","graduation-cap"],
    news:["Newspaper","newspaper"], home:["Home services","home"], cloud:["Cloud storage","cloud"],
    music:["Music","music"], video:["Video","film"], software:["Software","laptop-code"] };
  // Legacy IDs remain readable without changing the user's saved JSON.
  const legacyIds={adobecreativecloud:'adobe',adobephotoshop:'adobe',adobeillustrator:'adobe',adobelightroom:'adobe',adobepremierepro:'adobe',adobeacrobatreader:'adobe',adobefirefly:'adobe',freepik:'magnific'};
  const sharedLogos={uberone:'uber'};
  const services = rows.map(([name,id,aliases=""]) => ({name,id,logoId:sharedLogos[id]||id,aliases:aliases.split("|").filter(Boolean)}));
  const get=id=>services.find(service=>service.id===(legacyIds[id]||id));
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
    return services.filter(service => service===detected || !q || [service.name,...service.aliases].some(name => normalize(name).includes(q)))
      .sort((a,b) => Number(normalize(b.name)===q)-Number(normalize(a.name)===q)).slice(0,12);
  }
  function icon(subscription) {
    const service=get(subscription.serviceId) || (!subscription.serviceId && subscription.icon!=='custom' && match(subscription.name));
    const generic=generics[subscription.icon] || generics.letter;
    const initial=Array.from(subscription.name?.trim() || "S")[0].toUpperCase();
    const light=service && SUBSCRIPTION_LIGHT_LOGOS.includes(service.logoId);
    return `<span class="subscription-icon${light?' subscription-icon-light':''}"><span class="subscription-icon-fallback">${generic===generics.letter ? escapeHTML(initial) : `<i class="fas fa-${generic[1]}" aria-hidden="true"></i>`}</span>${service && SUBSCRIPTION_LOGOS.includes(service.logoId) ? `<img src="img/subscriptions/${SUBSCRIPTION_LOGO_FILES[service.logoId]||service.logoId+'.svg'}" alt="" loading="lazy" data-subscription-logo>` : ""}</span>`;
  }
  return {services,generics,search,match,icon,get};
})();
document.addEventListener("error",event=>{
  if(event.target?.matches?.('[data-subscription-logo]')) event.target.hidden=true;
},true);
