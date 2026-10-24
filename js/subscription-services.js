/** Local service catalogue. IDs are portable backup values, never remote URLs. */
const SubscriptionServices = (() => {
  const rows = [
    ["Netflix","netflix"],["Spotify","spotify","spotify premium|spotify family"],["Apple Music","applemusic"],
    ["Apple TV","appletv","apple tv+"],["Apple iCloud","icloud","icloud+"],["Apple Arcade","applearcade"],
    ["YouTube Premium","youtube","youtube premium|youtube music"],["Amazon Prime","amazonprime","prime video"],
    ["Disney+","disneyplus"],["HBO Max","hbo"],["Hulu","hulu"],["Paramount+","paramountplus"],
    ["Crunchyroll","crunchyroll"],["Twitch","twitch"],["Plex","plex"],["MUBI","mubi"],["Vimeo","vimeo"],
    ["Deezer","deezer"],["Tidal","tidal"],["SoundCloud","soundcloud"],["Audible","audible"],
    ["Pocket Casts","pocketcasts"],["Patreon","patreon"],["Nebula","nebula"],["Curiosity Stream","curiositystream"],
    ["ChatGPT","openai","openai|chat gpt|chatgpt plus|chatgpt pro"],["Claude","claude","anthropic"],
    ["Gemini","googlegemini","google gemini|google ai"],["Google One","googleone","google storage"],
    ["Perplexity","perplexity"],["Midjourney","midjourney"],["Cursor","cursor"],["GitHub Copilot","githubcopilot"],
    ["Adobe Creative Cloud","adobecreativecloud","adobe|creative cloud|adobe cloud"],["Adobe Photoshop","adobephotoshop","photoshop"],
    ["Adobe Illustrator","adobeillustrator","illustrator"],["Adobe Lightroom","adobelightroom","lightroom"],["Adobe Premiere Pro","adobepremierepro","premiere pro"],
    ["Adobe Acrobat","adobeacrobatreader","acrobat"],["Adobe Firefly","adobefirefly","firefly"],["Envato","envato","envato elements"],["Freepik","freepik"],
    ["PickMe Pass","pickmepass","pickme|pick me|pick me pass"],["Uber One","uberone","uber|uber eats|ubereats"],
    ["Dialog","dialog","dialog viu|dialog television|dialog tv|dialog home broadband"],
    ["SLT-MOBITEL","sltmobitel","slt|mobitel|slt fibre|slt fiber|slt broadband"],["PEO TV","peotv","peo tv|peotv"],
    ["Hutch","hutch"],["Airtel","airtel"],["Dialog Viu","dialogviu","viu"],
    ["Canva","canva"],["Figma","figma"],["Sketch","sketch"],["Framer","framer"],["Webflow","webflow"],
    ["Shutterstock","shutterstock"],["Flaticon","flaticon"],["Icons8","icons8"],["ArtStation","artstation"],
    ["Dribbble","dribbble"],["Behance","behance"],["Spline","spline"],["Loom","loom"],
    ["Microsoft 365","microsoft","office 365|microsoft office"],["Google Workspace","googleworkspace","g suite"],
    ["Notion","notion"],["Evernote","evernote"],["Todoist","todoist"],["TickTick","ticktick"],
    ["Trello","trello"],["Asana","asana"],["ClickUp","clickup"],["Monday.com","mondaydotcom"],
    ["Linear","linear"],["Slack","slack"],["Zoom","zoom"],["Calendly","calendly"],["Grammarly","grammarly"],
    ["Dropbox","dropbox"],["OneDrive","microsoftonedrive"],["Box","box"],["MEGA","mega"],
    ["pCloud","pcloud"],["Proton","proton","proton mail|proton drive|proton vpn"],["Sync.com","sync"],
    ["1Password","1password"],["Bitwarden","bitwarden"],["Dashlane","dashlane"],["LastPass","lastpass"],
    ["NordVPN","nordvpn"],["ExpressVPN","expressvpn"],["Surfshark","surfshark"],["Mullvad","mullvad"],
    ["Malwarebytes","malwarebytes"],["ESET","eset"],["Bitdefender","bitdefender"],["Norton","norton"],
    ["GitHub","github"],["GitLab","gitlab"],["JetBrains","jetbrains"],["Docker","docker"],
    ["DigitalOcean","digitalocean"],["Linode","linode"],["Vultr","vultr"],["Hetzner","hetzner"],
    ["Cloudflare","cloudflare"],["Vercel","vercel"],["Netlify","netlify"],["Supabase","supabase"],
    ["Firebase","firebase"],["Heroku","heroku"],["Render","render"],["Railway","railway"],
    ["Postman","postman"],["Sentry","sentry"],["Datadog","datadog"],["New Relic","newrelic"],
    ["Namecheap","namecheap"],["GoDaddy","godaddy"],["Hostinger","hostinger"],["WordPress","wordpress"],
    ["Squarespace","squarespace"],["Wix","wix"],["Shopify","shopify"],["WooCommerce","woocommerce"],
    ["Mailchimp","mailchimp"],["Brevo","brevo"],["ConvertKit","kit"],["Buffer","buffer"],["Hootsuite","hootsuite"],
    ["PlayStation Plus","playstation"],["Xbox Game Pass","xbox"],["Nintendo Switch Online","nintendoswitch"],
    ["EA Play","ea"],["Ubisoft+","ubisoft"],["GeForce NOW","nvidia"],["Discord Nitro","discord"],
    ["Duolingo","duolingo"],["Coursera","coursera"],["Udemy","udemy"],["Skillshare","skillshare"],
    ["Brilliant","brilliant"],["DataCamp","datacamp"],["Codecademy","codecademy"],["Frontend Masters","frontendmasters"],
    ["Strava","strava"],["Fitbit","fitbit"],["Peloton","peloton"],["MyFitnessPal","myfitnesspal"],
    ["Headspace","headspace"],["Calm","calm"],["Medium","medium"],["Substack","substack"],
    ["The New York Times","newyorktimes"],["The Guardian","theguardian"],["Financial Times","financialtimes"],
    ["The Economist","theeconomist"],["The Washington Post","thewashingtonpost"],["Reuters","reuters"],
    ["TradingView","tradingview"],["YNAB","ynab"],["QuickBooks","quickbooks"],["Xero","xero"],
    ["FreshBooks","freshbooks"],["Zoho","zoho"],["HubSpot","hubspot"],["Salesforce","salesforce"]
  ];
  const generics = { letter:["Initial","font"], gym:["Gym / Fitness","dumbbell"], internet:["Internet","wifi"],
    phone:["Phone plan","mobile-alt"], insurance:["Insurance","shield-alt"], learning:["Education","graduation-cap"],
    news:["Newspaper","newspaper"], home:["Home services","home"], cloud:["Cloud storage","cloud"],
    music:["Music","music"], video:["Video","film"], software:["Software","laptop-code"] };
  // Product identities remain separate in backups; artwork can be shared locally.
  const sharedLogos={adobecreativecloud:'adobe',adobephotoshop:'adobe',adobeillustrator:'adobe',adobelightroom:'adobe',adobepremierepro:'adobe',adobeacrobatreader:'adobe',adobefirefly:'adobe',uberone:'uber'};
  const services = rows.map(([name,id,aliases=""]) => ({name,id,logoId:sharedLogos[id]||id,aliases:aliases.split("|").filter(Boolean)}));
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
    const service=services.find(row=>row.id===subscription.serviceId) || (!subscription.serviceId && subscription.icon!=='custom' && match(subscription.name));
    const generic=generics[subscription.icon] || generics.letter;
    const initial=Array.from(subscription.name?.trim() || "S")[0].toUpperCase();
    const light=service && SUBSCRIPTION_LIGHT_LOGOS.includes(service.logoId);
    return `<span class="subscription-icon${light?' subscription-icon-light':''}"><span class="subscription-icon-fallback">${generic===generics.letter ? escapeHTML(initial) : `<i class="fas fa-${generic[1]}" aria-hidden="true"></i>`}</span>${service && SUBSCRIPTION_LOGOS.includes(service.logoId) ? `<img src="img/subscriptions/${service.logoId}.svg" alt="" loading="lazy" data-subscription-logo>` : ""}</span>`;
  }
  return {services,generics,search,match,icon};
})();
document.addEventListener("error",event=>{
  if(event.target?.matches?.('[data-subscription-logo]')) event.target.hidden=true;
},true);
