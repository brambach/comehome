# comehome

Lost-pet recovery pages for Tahoe and Truckee. Next.js 16 (App Router), Drizzle + Postgres, MapLibre, react-pdf. Read `PLAN.md` for the design and `AGENTS.md` for Next 16 notes (read `node_modules/next/dist/docs` before using an unfamiliar Next API).

## Commands

- `pnpm dev`: dev server on :3000 (needs Postgres; `pnpm db:migrate` first)
- `pnpm test`: Vitest unit tests (some use the database in `DATABASE_URL`)
- `pnpm e2e`: build, then Playwright against `next start` on :3100
- `pnpm lint`: ESLint + `tsc --noEmit`
- `pnpm seed`: demo pet with 8 sightings; prints its public and edit links
- `pnpm db:generate` / `pnpm db:migrate`: Drizzle migrations

## Rules

- Fix problems with structure first, then a test or lint rule, and only then a line in this file.
- Never expose a reporter's contact info or the owner's email publicly. Public pages read only through `src/lib/public.ts`.
- Every upload goes through `stripExif` (`src/lib/exif.ts`) before it reaches storage.
- Public pages stay light: no client JS beyond the map and the sighting form.
- Don't build anything on the "Pending interviews" list in `docs/INTERVIEWS.md`.
- Storage and email go through the adapters in `src/lib/storage` and `src/lib/mail`; never call Blob or Resend directly.
- Design: before building or reviewing UI, read `APPLY.md` and `built/arro.md` in `github.com/brambach/design-taste` (private; clone it from a cloud session). Its tokens are vendored in `vendor/design-tokens`; override them in `src/app/globals.css`, never in the vendored copy (`pnpm build` checks).
- Motion: transform and opacity only, never `transition: all`; honor reduced motion. Use the shared `--dur-*` and `--ease-*` tokens.
- The signal color (`.btn-signal`) is spent once: on "I saw this pet."
- After each milestone, record evidence in `PROGRESS.md` and push.
