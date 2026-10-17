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

## M2: sightings and upload

- `/p/[slug]/seen` is the report page; the public page's "I saw this pet" is a plain link to it, so the share page carries no form JS.
- Required inputs: the location (tap the map or "Use my location") and the time, which is prefilled with now. That makes 2 required; photo, note and contact are optional. The e2e reporter does exactly one thing (share location) and taps send.
- `POST /api/pets/[slug]/sightings`: honeypot (silently accepted, nothing saved), Postgres fixed-window rate limit (6 per pet per IP per 10 min, 30 per IP per hour), service-area check, zod validation.
- Photos are shrunk in the browser (for one bar of signal and serverless body limits), then always re-encoded server-side by `stripExif`.

```
$ pnpm test
 ✓ tests/unit/exif.test.ts (3 tests)
   - removes GPS and all other EXIF   # fixture has GPS 39.3267N; after stripExif exifr.gps() is undefined, no EXIF/ICC/XMP
   - keeps the image upright when it drops the orientation tag
   - downsizes large photos and rejects non-images
 Test Files  3 passed (3)
      Tests  9 passed (9)

$ pnpm exec playwright test
[3/6] sighting.spec.ts › a stranger reports a sighting with at most 4 required inputs
[4/6] sighting.spec.ts › optional photo, note and contact reach the owner but not the public
[5/6] sighting.spec.ts › honeypot submissions are dropped and floods are rate limited
[6/6] sighting.spec.ts › reports outside the Tahoe area are refused
  6 passed (13.7s)
```

Screenshot: `docs/screenshots/m2-seen-mobile.png`
