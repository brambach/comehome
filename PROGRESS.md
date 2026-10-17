# Progress

Evidence per milestone: the command, the tail of its output, and screenshot paths.

## Setup notes

- `brambach/comehome` didn't exist when the session started. Bryce created it empty; I pushed a one-line README to `main` as the PR base and work on `claude/comehome-mvp`.
- The repo had no `design/` folder. Bryce asked mid-session to use his other repos as reference, especially Dervo, so the tokens follow `brambach/dervo`, `brambach/dervo-website` and `brambach/portfolio-site`. See `docs/DESIGN.md`.
- Next 16.4 scaffold. `cacheComponents` is off: pet pages read live data on every request.

## M0: scaffold

```
$ pnpm lint && pnpm test && pnpm build
> eslint . && next typegen && tsc --noEmit
✓ Types generated successfully
 Test Files  1 passed (1)
      Tests  3 passed (3)
Route (app)
┌ ○ /
└ ○ /_not-found
```

Screenshot (390px): `docs/screenshots/m0.png`

## M1: create flow, public page, edit link

- `POST /api/pets` (multipart, honeypot, rate limit, zod) creates the pet; photos go through `saveImage` → `stripExif` → storage adapter.
- `/p/[slug]` is server-rendered: photo, name, last seen, the "I saw this pet" button, description. It reads only through `src/lib/public.ts`.
- `/p/[slug]/edit?t=…` is the owner page: token checked against a SHA-256 hash in constant time, `noindex`, `no-referrer`. Owner actions are server actions (hide/show sighting, mark found, edit details).
- The owner gets an email with the edit link on create (console mailer in dev).
- Photos for tests and the seed are three CC0 images from Wikimedia Commons (`tests/fixtures/README.md`).

```
$ pnpm test
 ✓ tests/unit/basics.test.ts (3 tests)
 ✓ tests/unit/public.test.ts (3 tests)   # public queries never return owner email, token hash, reporter contact; hidden sightings excluded
 Test Files  2 passed (2)
      Tests  6 passed (6)

$ pnpm exec playwright test
[1/2] [mobile] › tests/e2e/create.spec.ts › owner creates a pet page and opens it
[2/2] [mobile] › tests/e2e/create.spec.ts › the edit link works and a wrong token does not
  2 passed (5.4s)
```

Screenshots: `docs/screenshots/m1-pet-mobile.png`, `docs/screenshots/m1-pet-desktop.png`, `docs/screenshots/m1-new-mobile.png`
