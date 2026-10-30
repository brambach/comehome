# Design notes

Bryce's taste lives in `github.com/brambach/design-taste` (private). Read its `APPLY.md` before UI work; the closest build note for comehome is `built/arro.md` (phone-first, warm paper, one clay or rust accent).

## Tokens (18 Oct)

The tokens are `@brambach/design-tokens`, vendored in `vendor/design-tokens` and committed, so builds need no access to the private repo. `src/app/layout.tsx` loads `tokens.css`, then `themes/warm-paper.css`, then `globals.css`. `pnpm build` runs `sync.sh --check` first and fails if the vendored copy was edited, added to or trimmed. Override in `globals.css`; never edit the vendored files.

- **Theme:** warm paper. It's Arro's paper, card, sunk tray and inks, within a shade of comehome's old cream.
- **No accent layer.** `accents/clay.css` sets both `--primary` and `--accent` to clay, which would make every primary button the one accent. The base tokens' pine `--primary` and rust `--accent` are byte-identical to comehome's old pine and signal, and `APPLY.md` keeps primary buttons pine.
- **Project values** in `globals.css`: `--danger` (form errors, kept off the accent), `--tap` (52px), `--gutter` and `--measure`. Everything else is shared.
- **Type, option C** from `docs/mockups/type-options.png`: Instrument Serif at its one weight for display, Instrument Sans at 400 and 600, and JetBrains Mono as `--font-mono` (nothing uses mono yet). Fraunces and Hanken Grotesk are gone. The OG image and the flyer embed the same faces from `assets/fonts`.
- **Motion:** the name's statement move is now `--dur-arrive` (480ms) on `--ease-out`, down from 900ms. Utility is `--dur-calm` (220ms) and exits are `--dur-fast` (140ms).
- Non-CSS consumers (OG image, `theme-color`) read `src/lib/palette.ts`, built from `tokens.json`. The map reads `--primary` from computed style, so the JSON stays out of the client bundle.

Bumping: run `sh vendor/design-tokens/sync.sh --ref <tag>` somewhere with access to design-taste, then `pnpm install`, and commit the folder. The first copy came from a tarball of commit `e8404234` (no tag existed yet), with `VERSION` and `SHA256SUMS` written as `sync.sh` writes them.

| Old (hand-copied) | Shared |
|---|---|
| `--cream` | `--paper` |
| `--pine`, `--pine-ink` | `--primary`, `--on-primary` |
| `--signal`, `--signal-ink`, `--signal-wash` | `--accent`, `--on-accent`, `--accent-wash` |
| `--found`, `--sage-wash` | `--done`, `--done-wash` |
| `--radius`, `999px` | `--r3`, `--r-pill` |
| `--display`, `--sans` | `--font-display`, `--font-text` |
| `--dur-statement`, `--dur-utility`, `--dur-exit`, `--dur-press` | `--dur-arrive`, `--dur-calm`, `--dur-fast`, `--dur-instant` |
| `--ease-statement`, `ease-out`, `ease-in` | `--ease-out`, `--ease-in` |
| `--paper`, `--line`, `--hover`, `--press` | unused, dropped |

### Pass against design-taste (17 Oct)

Fixed to match `APPLY.md`:
- Numbers never take the serif: the home page's step numbers are now sans.
- Focus rings use ink (`--focus`), not pine.
- Status is a glyph plus a word: a check beside "is home", an eye-off mark beside "Hidden".
- Lists stay quiet: the public sightings list lost its rule lines between rows.
- Say it once: the list no longer repeats "last seen by owner", which the hero and the map legend already say.
- Left-aligned: the "No account" line under the button no longer centers on phones.

Settled on 18 Oct (see Tokens above):
- **The serif.** The brief named Fraunces and Hanken Grotesk, but design-taste records Fraunces losing to Instrument Serif and Sentient, and comehome used Fraunces at 600 where the serif should be one weight. Bryce picked option C.
- **Motion.** The 900ms statement move became the shared 480ms `--dur-arrive`.

## Earlier sources

- **Dervo** (`brambach/dervo`, `frontend/src/local/DESIGN.md`, `DervoTokens.css`; `brambach/dervo-website`, `public/shared/site.css`): pine as the one primary fill, rust as the one accent that "needs you", hairline edges drawn with inset shadows instead of borders, the layered `--lift` shadow, lit pill buttons that rise a pixel on hover and give on press, tabular numerals for times, a pine focus ring.
- **portfolio-site** (`docs/site-personality.md`): Fraunces over Hanken Grotesk, forest and cream with clay for small marks, one enormous type decision per screen, print DNA (photos sit on paper), voice with no em dashes, contractions, and short concrete sentences.
- **The brief**: cream not white, the pet's photo owns the color, the accent spent once on "I saw this pet", panic-proof tap targets, motion at 900ms / 200ms / 140ms on transform and opacity only.

The original M0 mapping, replaced by the shared tokens above:

| Role | Token | Value |
|---|---|---|
| Page | `--cream` | #f4efe4 |
| Cards, inputs | `--raised` | #fffdf9 |
| Primary button | `--pine` | #22382b |
| "I saw this pet" only | `--signal` | #b0461f (Dervo's rust) |
| Found | `--found` | #2f5d3a |

The statement move on each page is the pet's name (or the home headline) rising into place. Everything else is a short fade or nothing.

## Patterns studied (no code copied)

- **rubyforgood/homeward-tails** (MIT): people and their contact details live apart from the public `Pet` record; public listings go through named scopes (`published`, `unadopted`); visitors reach staff through a contact form that emails them rather than seeing an address. comehome mirrors this: owner email and reporter contact sit in private columns, public pages read only through `src/lib/public.ts`, and contact reaches the owner by email.
- **Turf** (MIT): `convex` then `buffer` for the hull, falling back to a buffered line or point when `convex` returns null (fewer than 3 points, or collinear).
- **MapLibre GL JS** (BSD-3-Clause): GeoJSON source with data-driven `circle-opacity` for fading old sightings; `cooperativeGestures` so phones can scroll past the map.
- **react-pdf and node-qrcode** (MIT): `renderToBuffer` on the server; the QR code as a PNG data URL in an `<Image>`.
