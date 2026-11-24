# Back-Safe Gym Plan

A phone web app for an 84-day back-safe gym program (25 Nov 2026 – 16 Feb 2027).

- Source: `app/app.html` (one file: styles, markup and script)
- Build: `node app/build.mjs` writes the installable site (manifest, offline service worker, icons) to `docs/`
- Hosting: GitHub Pages serves `docs/` from `main`; every push redeploys

Logged data stays in the browser on the device (localStorage). Use Guide → Settings → Copy backup to keep a copy.
