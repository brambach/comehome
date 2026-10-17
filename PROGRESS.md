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
