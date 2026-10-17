# Design notes

No `design/` folder shipped with the repo, so the direction comes from the brief plus Bryce's other work:

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
