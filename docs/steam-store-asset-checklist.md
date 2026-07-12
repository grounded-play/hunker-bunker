# Steam Store Asset Checklist

This is the practical checklist for the Steam store page and Steam client
assets. It separates what we already have in the repo, what must be captured
from the real game, and what is a good fit for `image_gen` / Figma / Photoshop.

## What We Already Have

These files are useful source material, but they are not all the final Steam
deliverables yet.

| File | Size | Good For |
| --- | --- | --- |
| `public/title_key_art.png` | 1024x1024 | Key art source for capsules, library art, background composites |
| `public/hunker_bunker_hero.png` | 1024x576 | Horizontal marketing source for capsules and hero art |
| `public/hunker_bunker_select.png` | 1024x576 | Alternate horizontal marketing source |
| `public/icon-512.png` | 512x512 | Base source for app/shortcut icon work |
| `public/icon-192.png` | 192x192 | Fallback icon source |
| `public/Scout.Intro.gif` | 480x270 | Promo motion snippet or concept reference |
| `public/Tank.Intro.gif` | 480x270 | Promo motion snippet or concept reference |
| `public/Eng.Intro.gif` | 480x270 | Promo motion snippet or concept reference |
| `public/cutscenes/*-poster.jpg` | 1920x1080 | Screenshot-like promo stills and event art source |

## Store Assets

These are the four required store capsules plus the optional page background.

| Asset | Steam Size | Status | Capture From Game? | Good For `image_gen`? | Notes |
| --- | --- | --- | --- | --- | --- |
| Header Capsule | 920x430 | Not finished | No | Yes | Branding-first banner, logo must be readable |
| Small Capsule | 462x174 | Not finished | No | Yes, but keep logo simple | Logo should nearly fill the frame |
| Main Capsule | 1232x706 | Not finished | No | Yes | Featured/recommended carousel image |
| Vertical Capsule | 748x896 | Not finished | No | Yes | Strong sale-page poster composition |
| Page Background | 1438x810 | Not finished | No | Yes | Subtle, ambient, low-contrast background |

## Screenshot Assets

Steam wants at least five screenshots at 16:9, 1920x1080 or larger.
These should be captured from the actual build, not generated.

| Shot | What It Should Show | Capture From Game? | Good For `image_gen`? | Notes |
| --- | --- | --- | --- | --- |
| 1 | Core bunker exploration with HUD visible | Yes | No | Best "this is the game" screenshot |
| 2 | Combat or enemy encounter | Yes | No | Show tension, class ability, or weapon use |
| 3 | Camp or base management view | Yes | No | Shows progression and strategy loop |
| 4 | Terminal, codex, or lore interaction | Yes | No | Shows narrative systems and UI polish |
| 5 | Cave reveal, boss, or ending-facing scene | Yes | No | Use the most dramatic late-game beat |

## Library / Client Assets

Steam library presentation usually wants a few connected pieces. The core set is
the library capsule, library header, library hero, and library logo, plus client
icons.

If your Steamworks page shows 5 slots in this area, it is usually counting a
client/shortcut icon alongside the core library pieces.

| Asset | Steam Size | Status | Capture From Game? | Good For `image_gen`? | Notes |
| --- | --- | --- | --- | --- | --- |
| Library Capsule | 600x900 | Not finished | No | Yes | Must include logo and artwork, no extra text |
| Library Header | 920x430 | Not finished | No | Yes | Branding image for Steam Library views |
| Library Hero | 3840x1240 | Not finished | No | Yes, best candidate | No text allowed, safe area matters |
| Library Logo | 1280x720 or 1280 wide / 720 tall | Not finished | No | Usually hand-finished, not raw AI text | Transparent logo only, no extra words |
| Shortcut Icon | 256x256 png or ico | Not finished | No | Yes, if based on a clean mark | Small icon for Steam client/desktop use |
| App Icon | 184x184 jpg | Not finished | No | Yes, if based on a clean mark | Simple and readable at tiny size |

## Broadcast / Event Assets

These are suggested, but not required until you start posting Steam events or
announcements.

| Asset | Steam Size | Status | Capture From Game? | Good For `image_gen`? | Notes |
| --- | --- | --- | --- | --- | --- |
| Event Cover | 800x450 | Suggested | No | Yes | For Steam event cards and announcement lists |
| Event Header | 1920x622 | Optional | No | Yes | For the top of event detail pages |

## What Should Be Captured

These should come from the real running build so the store page stays truthful.

- Gameplay screenshots for the 5 required Steam screenshots.
- Any shot that shows UI, combat, camp management, terminal interactions, or the
  actual art style as players will see it.
- A final "menu/home" screenshot if you want a store image that reflects the
  game flow rather than just combat.

## What Can Be Made With `image_gen`

These are the best candidates for generated or heavily composited art.

- Header Capsule
- Small Capsule
- Main Capsule
- Vertical Capsule
- Page Background
- Library Capsule
- Library Header
- Library Hero
- Event Cover
- Event Header

Best practice:

- Use `image_gen` for atmosphere, composition, lighting, and background scenes.
- Add the logo and final typography in Figma or Photoshop so the text is crisp.
- Do not use `image_gen` for the five required store screenshots.
- Do not rely on `image_gen` for tiny logo text that has to stay readable at capsule size.

## Recommended Priority Order

1. Capture the five gameplay screenshots from the current build.
2. Finish the logo treatment for the store and library assets.
3. Produce the four required store capsules and the library set.
4. Create the page background.
5. Create the broadcast/event covers once you know the first announcement theme.

## Suggested File Naming

- `steam_header_capsule_en.png`
- `steam_small_capsule_en.png`
- `steam_main_capsule_en.png`
- `steam_vertical_capsule_en.png`
- `steam_page_background_en.png`
- `steam_screenshot_01_en.png` through `steam_screenshot_05_en.png`
- `steam_library_capsule_en.png`
- `steam_library_header_en.png`
- `steam_library_hero_en.png`
- `steam_library_logo_en.png`
- `steam_event_cover_en.png`
- `steam_event_header_en.png`

If you want, I can turn this checklist into a strict "have / need / generate /
capture" production tracker next.
