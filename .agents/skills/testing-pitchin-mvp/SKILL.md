---
name: testing-pitchin-mvp
description: How to run and end-to-end test the PitchIn town mutual-aid MVP (Next.js App Router + JSON file store, cookie-based viewer identity). Use when exercising the Board, needs/claiming, weekly pitch, crews, coordinator, reports/AAR, readiness, print, or surge surfaces.
---

# Testing the PitchIn MVP

## Running it
- `npm install` then `npm run dev` (port 3000). No DB, no auth, no API keys.
- State is a JSON file at `data/pitchin.json` (gitignored). It is seeded on first read.
- Reset between passes with `POST /api/demo/reset`, or the "Reset demo data" button on `/readiness`.
  Deleting `data/pitchin.json` also reseeds.
- Inspecting/asserting state directly is fast and reliable:
  `python3 -c "import json;d=json.load(open('data/pitchin.json'));print(d['commitments'])"`.
  Use this to distinguish a *persistence* bug from a *rendering* bug — the two look identical in the UI.

## Viewer identity
- Identity is the `pitchin_member` cookie, switched via the `viewing as` select in the nav
  (`src/components/MemberSwitcher.tsx`, POST `/api/session`). There is no login.
- Clicking the `<select>` then clicking an option can silently fail; the reliable pattern is
  click the select, then `Home` / arrow keys / `Return`, or click the select and then click the
  option row in the opened native dropdown and verify `selectedindex` in the DOM afterwards.
  **Always confirm the switch took effect before asserting**, otherwise you will attribute one
  member's view to another.
- Useful seeded members: coordinator = **Dana Whitfield**; paused member = **Sam Rooks**;
  high show-rate pitch member = **Junie Ballard**; chainsaw/truck member = **Marcus Oyelaran**.

## Known trap: stale server-rendered pages (`db()` vs `dbFresh()`)
`src/lib/store.ts` keeps a module-level `cache`. In dev, route handlers (`src/app/api/**`) and page
server components can live in different module instances, so a page that reads `db()` renders data
from before your mutation. `dbFresh()` re-reads the file when its mtime changes and is correct.
- At time of writing, `/`, `/needs/[id]`, `/needs/new` use `dbFresh()` and update immediately.
- `/pitch`, `/surge`, `/readiness`, `/print`, `/crews` use `db()` and can show stale data even after
  a hard reload (Ctrl+Shift+R).
- **Workaround while testing:** navigate to another route and back (this remounts and re-reads);
  a browser reload alone is not enough. If a mutation "does nothing", check the JSON store before
  filing it as a data bug — it is usually this render cache.
- If pages have since been converted to `dbFresh()`, this trap may be gone; re-check with
  `grep -rn "dbFresh()\|db()" src/app --include=page.tsx`.

## Time-dependent behavior
- The seeded scenario sits in a fixed pitch week (`week of 2026-08-10`) and most seeded tasks are
  scheduled in the *past*. `/needs/[id]` only offers "Can't make it (free to decline)" for tasks
  that are `mine && future`, so **unclaim cannot be tested on most seeded tasks**. Exercise
  claim/unclaim on a need you create and approve yourself via `/coordinator` — the generated tasks
  land at now+3d (`src/app/coordinator/propose.ts`).

## Deterministic behavior worth asserting
- `/coordinator` decomposition is keyword-driven (`src/app/coordinator/propose.ts`): an ask
  mentioning a chainsaw and a truck yields exactly "Haul materials to the site" (40 min, quorum 1,
  truck) and "Cut and clear limbs" (120 min, quorum 2, chainsaw + `chainsaw_operator`).
- The weekly pitch offer is a deterministic score (`src/app/api/pitch/logic.ts` `pitchCandidate`),
  so the offered task and the task offered after "Not this week" are both predictable.
- Board order comes from `rankNeedsFor` (urgency x capability fit, **not** recency) in
  `src/lib/derive.ts`. A recency-ordered board is a real failure, and the seeded data is arranged so
  the two orders visibly differ.
- Show-rate reads denormalized member counters (`commitmentsMade` / `commitmentsKept`), not the
  commitment rows. Aggregate crew/town percentages are rounded, so a single verification can be
  absorbed by rounding — compute the expected percentage from the JSON before calling it a bug.

## Privacy invariants to attack
- Private and crews-only needs must not appear on `/`, `/print`, or `/readiness` for unauthorized
  viewers, and exact street addresses must only be visible to claimants (non-claimants see an
  "N00 block of X" approximation).
- `/needs/<privateId>` correctly 404s, **but also check `/reports/<privateId>` separately** — the
  report route has leaked the private title, exact address, and task text to unauthorized viewers.
  Always test both routes for the same id; they are gated independently.
- AAR publishing is gated on the requester's `publishConsent`: with consent the form offers an
  "Optional line from the requester" textarea and names them; without it the form says the requester
  did not consent and `/print` falls back to naming the coordinator on the call line.

## Devin Secrets Needed
None. The app runs fully locally with no credentials.
