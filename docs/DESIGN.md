# Design notes

Bryce's taste now lives in `github.com/brambach/design-taste` (private). Read its `APPLY.md` before UI work; the closest build note for comehome is `built/arro.md` (phone-first, warm paper, one clay or rust accent). This project's tokens win where they exist; that repo fills gaps and is the checklist for reviews.

### Pass against design-taste (17 Oct)

Fixed to match `APPLY.md`:
- Numbers never take the serif: the home page's step numbers are now sans.
- Focus rings use ink (`--focus`), not pine.
- Status is a glyph plus a word: a check beside "is home", an eye-off mark beside "Hidden".
- Lists stay quiet: the public sightings list lost its rule lines between rows.
- Say it once: the list no longer repeats "last seen by owner", which the hero and the map legend already say.
- Left-aligned: the "No account" line under the button no longer centers on phones.

Kept on purpose:
- The 900ms statement move on the name, 200ms utility and 140ms exits: that's `motion/default` exactly, one move per screen, played once.

Open, for Bryce to pick:
- **The serif.** The brief named Fraunces and Hanken Grotesk. design-taste records Fraunces losing to Instrument Serif (Dervo, 18 Sep) and to Sentient (portfolio, 2 Oct), and "i dont like the font" covering Fraunces on `/next`. The serif is also meant to be one weight and never bold, and comehome uses Fraunces 600. Side-by-side options are in `docs/mockups/type-options.png`.

## Earlier sources

- **Dervo** (`brambach/dervo`, `frontend/src/local/DESIGN.md`, `DervoTokens.css`; `brambach/dervo-website`, `public/shared/site.css`): pine as the one primary fill, rust as the one accent that "needs you", hairline edges drawn with inset shadows instead of borders, the layered `--lift` shadow, lit pill buttons that rise a pixel on hover and give on press, tabular numerals for times, a pine focus ring.
- **portfolio-site** (`docs/site-personality.md`): Fraunces over Hanken Grotesk, forest and cream with clay for small marks, one enormous type decision per screen, print DNA (photos sit on paper), voice with no em dashes, contractions, and short concrete sentences.
- **The brief**: cream not white, the pet's photo owns the color, the accent spent once on "I saw this pet", panic-proof tap targets, motion at 900ms / 200ms / 140ms on transform and opacity only.

Mapping:

| Role | Token | Value |
|---|---|---|
| Page | `--cream` | #f4efe4 |
| Cards, inputs | `--raised` | #fffdf9 |
| Primary button | `--pine` | #22382b |
| "I saw this pet" only | `--signal` | #b0461f (Dervo's rust) |
| Found | `--found` | #2f5d3a |

The statement move on each page is the pet's name (or the home headline) rising into place. Everything else is a 200ms fade or nothing.

## Patterns studied (no code copied)

- **rubyforgood/homeward-tails** (MIT): people and their contact details live apart from the public `Pet` record; public listings go through named scopes (`published`, `unadopted`); visitors reach staff through a contact form that emails them rather than seeing an address. comehome mirrors this: owner email and reporter contact sit in private columns, public pages read only through `src/lib/public.ts`, and contact reaches the owner by email.
- **Turf** (MIT): `convex` then `buffer` for the hull, falling back to a buffered line or point when `convex` returns null (fewer than 3 points, or collinear).
- **MapLibre GL JS** (BSD-3-Clause): GeoJSON source with data-driven `circle-opacity` for fading old sightings; `cooperativeGestures` so phones can scroll past the map.
- **react-pdf and node-qrcode** (MIT): `renderToBuffer` on the server; the QR code as a PNG data URL in an `<Image>`.
