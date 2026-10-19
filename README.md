# R6 Pixel Siege

2D pixel-art tactical breach-and-clear shooter, built as a Chrome extension (Manifest V3).
Repo: https://github.com/coooooooooooops/R6-Pixel-Seige-Game

## Install (players)
1. Download the latest `R6-Pixel-Siege-vX.Y.Z.zip` from **Releases** and unzip it.
2. Chrome -> `chrome://extensions` -> turn on **Developer mode** -> **Load unpacked** -> pick the unzipped folder.

After that, **new seasons, cosmetics, drone skins and pass rewards arrive on their own** (see below). You only reinstall when a release says the *game code* changed.

## Seasons (hardwired calendar)
Every calendar month is a season, in **Australia/Sydney time**: it starts at **12:00:00 am on the 1st** and ends at **11:59:59 pm on the last day**, then the next month's season begins. This is built into `seasons.js`, so the calendar rotates forever with **no GitHub push needed**.

| Month | Season | Month | Season |
|---|---|---|---|
| Jan | Neon New Year | Jul | Ocean Depths |
| Feb | Crimson Hearts | Aug | Desert Storm |
| Mar | Green Rush | Sep | Harvest Moon |
| Apr | Sakura Storm | **Oct** | **Halloween** (24 items) |
| May | Jungle Run | Nov | Autumn Ember |
| Jun | Solar Flare | Dec | Winter Warfare |

Each season has a 30-tier pass (1000 XP per tier). XP = credits earned x 1.5 + 200 per finished match. Tiers unlock the moment they are reached, so nothing is lost when the month rolls. Rewards: operator skins, headgear, weapon skins, **drone skins**, tracers, kill effects, nameplates, rings, crosshairs, muzzle flashes, credits and packs; tier 30 is a season-exclusive mythic skin. Season items are **only** earnable from that season's pass (never in the daily shop or mystery packs). Anything a player unlocked is theirs forever.

## How GitHub updates reach players
The game downloads `content/content.json` from the `main` branch when it opens and every 20 minutes, validates it, applies it live and caches it (so it also works offline afterwards).

| You change | How it ships | Player does |
|---|---|---|
| `content/content.json` (new cosmetics, extra season rewards, renamed/themed seasons, announcements) | Push to `main`. Live within about 5 minutes (GitHub's raw cache) | Nothing |
| Anything else (new operators with new art, new gadget mechanics, maps, UI) | Bump `version` in `manifest.json`, push to `main`. The Action builds the zip and publishes a Release. Players see an **UPDATE AVAILABLE** banner with a download link | Download, unzip over the old folder, click reload on `chrome://extensions` |

Why two paths: Chrome Manifest V3 forbids extensions from downloading and running code, and an unpacked extension cannot self-update. Data can be fetched; code cannot. (A Chrome Web Store listing would make *code* updates silent too; that is the only way to get that.)

## Adding content (the everyday job)
1. Edit `content/content.json` (copy ideas from `content/examples/`).
2. Bump `"rev"` (any new string; the game shows a toast once per new rev) and optionally set `"announce"`.
3. Check it: `node tools/validate-content.js` (prints the affected season tracks and any problems).
4. Commit and push to `main`. The Action re-validates it.

### Item format
```json
{ "n": "Candy Corn Camo", "t": "wp", "r": "e", "s": "camo", "p": ["#ffb62e", "#ffffff", "#ff7a1a"], "se": "m10", "tier": 4 }
```
| Field | Meaning |
|---|---|
| `n` | Name, 2-28 chars: letters, digits, space and `' & . ! -` only |
| `t` | `sk` operator skin, `hd` headgear, `wp` weapon skin, `dr` drone skin, `tr` tracer, `kf` kill effect, `np` nameplate, `rg` ground ring, `xh` crosshair, `mf` muzzle flash |
| `r` | `c` common, `r` rare, `e` epic, `l` legendary, `m` mythic (mythic must be a season reward or `"pk":1`) |
| `s` | Art style. Must be one the game can already draw: `hd` cap beanie band bucket cowboy chef party tophat wizard pirate viking kabuto cat bunny horns halo crown prop antenna headset pumpkin mohawk afro flame sombrero santa laurel cone pot mushroom ufo bow spike leaf ghost; `wp` solid stripe dots camo grad spark chev check flame scale; `tr` solid dash dbl zig rain fade; `kf` burst confetti petals hearts coins bolt glitch ghost stars snow flame bubble skull ring hole; `rg` solid dash dbl pulse dots spin; `xh` cross dot ring heart diamond brackets x tri spin plus star. `sk`, `np`, `mf`, `dr` take no style |
| `p` | Colours as `#rrggbb`. `sk` 3 (suit, helmet, accent), `hd` 2, `wp` 2-3, `dr` 3 (body, dark, LED), `tr` 1-4, `kf` 2-4, `np` 2, `rg` 1-4, `xh` 1-2, `mf` 2 (core, outer) |
| `se` | Season group. `m01`..`m12` = that month's built-in pass (every year). Omit for a normal daily-shop/pack item |
| `tier` | 1-30. Where it sits in the pass (season items only) |
| `from` | `YYYY-MM-DD` (Sydney). Normal items enter the daily shop from that date. Default: the day after the game first sees it |
| `id`, `pk` | Optional. `id` defaults to `type_name`; `pk:1` = mystery-pack-only |

**Tier rules (protect players mid-season):** built-in rewards never move. A new pack item only takes an **empty credits/pack tier**; ask for a tier that holds an item and it drops to the next free credits tier (the validator prints a note). Never reuse a tier number for a different item after release.

### Season override
```json
"seasons": [ { "ym": "2027-12", "name": "Festive Fire", "tag": "Special edition", "col": ["#ff4a4a", "#0a1830", "#ffffff"], "grp": "xmas27" } ]
```
Re-themes/renames that exact month (`ym`). With a new `grp`, the pass is built from items carrying that `se`; without it, the built-in track is kept. The normal calendar resumes the next month automatically.

### Announcing a code release
```json
"app": { "version": "0.17.0", "url": "https://github.com/coooooooooooops/R6-Pixel-Seige-Game/releases/latest", "notes": "New operators" }
```
Set this **after** the Release for that version exists. Players on an older version see the banner.

## Releasing a new version (code changes)
1. Change the code, bump `manifest.json` `version`.
2. Push to `main`. `.github/workflows/build.yml` syntax-checks everything, validates content, zips the extension and creates the Release `vX.Y.Z` (skipped if that tag exists).
3. Then update `app` in `content/content.json`.

## Safety
Nothing from the network is executed. Every pack entry is validated (types, styles from a fixed list, hex colours, name charset, size limits) and bad entries are skipped; a bad pack never overwrites the saved one. Names are restricted to a safe charset, so a pack cannot inject markup.

## Dev
- Tests (Playwright + Chromium, in `build/`): `test_seasons.py` (calendar edges, pass, packs, updater, drone skins), `audit.py` / `audit_season.py` (UI fit at 5 sizes), `shoptest.py`, `hudtest.py`, `test_runs.py`.
- Time travel for testing in the console: `R6S.setNow(Date.parse('2026-10-31T12:59:59Z'))`, then `R6S.setNow(null)`.
