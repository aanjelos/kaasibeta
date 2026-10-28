# App Shell Release Cache

`app-shell.json` lists the release version and SHA-256 hashes of `index.html` and its local versioned JavaScript/CSS. The service worker checks this small manifest on navigation. Unchanged releases reuse cached assets; changed releases are downloaded and verified before the navigation cache switches to their HTML. Failed verification falls back to the last working shell.

When publishing an HTML, JavaScript or CSS change:

1. Update the application version, asset query versions and service worker BUILD together.
2. Regenerate the manifest entries from the actual HTML script/link references, including `./index.html`. Hash UTF-8 text with CRLF normalized to LF, so Windows working copies and Git-hosted copies agree.
3. Run `node --test tests/service-worker.test.cjs` to check coverage, version agreement and file hashes. Commit the manifest with the release assets.

Never regenerate the manifest on the client or accept a hash mismatch: a mismatch can indicate an incomplete deployment. This cache contains application files only, not financial records. IndexedDB, authentication and device preferences are not cleared by updates. The previous build is retained for tabs open during activation; older build caches are pruned.
