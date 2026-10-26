# Subscription artwork maintenance

- Use a compact standalone brand symbol where available, rather than a long wordmark that becomes unreadable at 24–40px.
- All subscription frames use `#323232`, including in the light app theme. Choose official colour or white variants that remain visible on that background. Do not reintroduce per-service light frames.
- Explicitly resolve SVG `currentColor`: external SVG images do not inherit the frame's foreground colour. Adobe uses its red mark.
- If no suitable dark-compatible symbol is available, flag the service for review rather than substituting an unrelated favicon or silently using an initial.
- Existing artwork may include an intrinsic background as part of the published logo. This is separate from the app's frame; review it visually before replacing it.
- PEO TV deliberately shares SLT-MOBITEL artwork rather than keeping a separate wordmark file. Some official app symbols (for example Epidemic Sound, Dialog Viu and Monday.com) include their own published background.
- Prefer original coloured marks where available. TIDAL and Vercel intentionally use their recognised monochrome symbols; do not invent colour schemes for those brands. LinkedIn uses blue, Microsoft uses its four colours, and Salesforce uses blue.
- Keep compact SVGs or optimize raster artwork to 96px WebP. Bundle files locally, record provenance in `sources.json` / `official-sources.json`, and update `js/subscription-assets.js` whenever filenames change. Remove obsolete files after references are updated.
- Logo images are loaded on demand and cached after display, not precached on install. Preserve versioned image URLs and cache-first reuse. Unseen artwork cannot be guaranteed during a first offline visit.
- `tests/subscription-artwork.cjs` removes reviewed edge-connected solid backgrounds from Hulu/Magnific (black) and Dialog Viu/Monday.com/Epidemic Sound (white); Epidemic Sound's monochrome mark is rendered white for contrast. Keep this processing in the maintenance pipeline, never in the app.
- Google Health uses the original multicolour heart isolated from Google's supplied wordmark, retaining the existing `fitbit` service ID. Disney's official SVG symbol is rendered monochrome white for the dark frame. These adaptations must remain documented when refreshing assets.
- Use `tests/render-subscription-catalogue.cjs` for a dark-background contact sheet and `tests/subscriptions.test.cjs` to check bundled-file, provenance, catalogue and service-worker consistency.

Logos identify third-party services and do not imply endorsement. Preserve bundled library licence notices and source-specific information.
