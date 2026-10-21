# Website (Cloudflare Pages)

The website is the same game as the extension, served as a normal web page, plus a "Download Extension" button that gives
people the extension zip directly and shows the install steps on screen. Everything is built from this repo on every push,
so the site and the downloadable zip are always the latest `main`.

## One-time setup
1. Cloudflare dashboard > Workers & Pages > Create > Pages > **Connect to Git** > pick this repo (branch `main`).
2. Build settings:
   - Framework preset: **None**
   - Build command: `node tools/build-site.js`
   - Build output directory: `dist`
   - Environment variable (optional): `NODE_VERSION` = `20`
3. Save and Deploy. Every push to `main` redeploys automatically (about a minute). Pull requests get preview URLs.
4. Accounts on the website: Supabase dashboard > Authentication > URL Configuration > add your Pages URL
   (for example `https://r6-pixel-siege.pages.dev` and any custom domain) to **Redirect URLs**. Without this, email-confirmation
   links will not bring people back to the site.

## What the build does (`tools/build-site.js`)
- Copies the game files into `dist/` (same file set as the extension; tools, tests, content packs and `site/` are left out).
- Writes `dist/R6-Pixel-Siege.zip`, the extension zip, using a built-in zip writer (no npm install needed).
- Writes `dist/index.html` = `game.html` + `window.R6_WEB=1` + `web.js` (the download button, card and install popup).
- Writes `dist/version.json` and the `_headers` file (no-cache for html/js/zip, direct-download header for the zip).

## Website vs extension
- Same code, same online rooms (public MQTT brokers + WebRTC), so a room code hosted on one joins from the other.
- The website never shows the extension's UPDATE NOW banner (it is always the latest deploy); the extension still updates itself.
- Accounts are cloud-based, so signing in on either shows the same profile. Local settings (controls, volume) are per browser.

## Test locally
`node tools/build-site.js && npx serve dist` (or `python3 -m http.server -d dist 8080`), then open http://localhost:8080

## Phones and tablets
`site/touch.js` (touch devices only) sizes the page to the real visible area, fits the game to the screen and puts a small control set in the side bars (2 sticks + 8 buttons, a MORE page for the rest). Landscape only: portrait shows a rotate prompt. On iPhone, Safari/Chrome cannot do true fullscreen: use Share > Add to Home Screen and open it from the icon for no browser bars. Force on/off with `?touch=1` / `?touch=0`.
