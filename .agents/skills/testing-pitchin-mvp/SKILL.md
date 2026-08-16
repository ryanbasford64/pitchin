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
- Most reliable recipe found in practice: click the select, press `Escape` to close the native
  popup, then press the member's **first letter** (typeahead) — `d` for Dana, `m` for Marcus,
  `t` for Tomás, `r` for Ruth. Then read the select's displayed name in the screenshot before
  asserting. Arrow-key counting is error-prone and lands on the wrong member.
- Note the computer tool rejects multi-key strings like `"Down Down Down"` (`unknown key`);
  issue separate key actions instead.
- A silently-failed switch is the #1 source of false failures here: a "broken" coordinator-only
  action is often just the old cookie still being in effect. Confirm identity **and** the
  presence/absence of the role-gated control before concluding anything.
- Useful seeded members: coordinator = **Dana Whitfield** (the *only* coordinator); paused member =
  **Sam Rooks**; high show-rate pitch member = **Junie Ballard**; chainsaw/truck member =
  **Marcus Oyelaran**; surge-qualified non-coordinators = Marcus / Wade Sirmon / Junie.

## Known trap: stale server-rendered pages (`db()` vs `dbFresh()`)
`src/lib/store.ts` keeps a module-level `cache`. In dev, route handlers (`src/app/api/**`) and page
server components can live in different module instances, so a page that reads `db()` renders data
from before your mutation. `dbFresh()` re-reads the file when its mtime changes and is correct.
- This bit hard on the original MVP branch, where `/pitch`, `/surge`, `/readiness`, `/print` and
  `/crews` still used `db()` and showed stale data even after a hard reload (Ctrl+Shift+R), while
  `/`, `/needs/[id]` and `/needs/new` used `dbFresh()` and were correct. It has since been fixed,
  but the same class of bug can return whenever a new page is added.
- **Workaround while testing:** navigate to another route and back (this remounts and re-reads);
  a browser reload alone is not enough. If a mutation "does nothing", check the JSON store before
  filing it as a data bug — it is usually this render cache.
- If pages have since been converted to `dbFresh()`, this trap may be gone; re-check with
  `grep -rn "dbFresh()\|db()" src/app --include=page.tsx`. As of the review-followups branch all
  8 page components use `dbFresh()` and pages updated immediately in testing, so treat stale UI as
  a **new regression** rather than an expected quirk — but re-run the grep first.

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

## High-value fixtures for status/verification tests
Verification lives at `/reports/<needId>` ("they showed up" / "they didn't", coordinator or
requester only). Task/need status math is in `src/app/api/coordinator/verify/route.ts`.
- **`need_interpreter` is the ideal single-action fixture**: status `staffed`, exactly one task
  (`task_interpret`, quorum **1**) and exactly one commitment (`cmt_5`, Tomás, `isWeeklyPitch:
  true`). One verify click therefore drives the task status, the parent need status, Board
  open-needs membership, "Met this month" membership, *and* Tomás's Board pitch-card tag.
- **`need_ramp` is the mixed-need fixture**: `task_ramp_build` (quorum 3, Wade) +
  `task_ramp_haul` (quorum 1, Ellis). Verifying one kept on each gives one `unmet` + one `done`
  task, which must make the need `unmet` — this is how you prove `done` requires *every* task done.
- **The Board is the strongest discriminator for need-status bugs.** `openNeeds` in
  `src/lib/derive.ts` = status `open | staffed`, so `done` and `unmet` both *disappear* from the
  Board's open needs; `done` additionally shows under "Met this month" while `unmet` appears in
  **neither** list. A finished need still visible on the Board means the status was wrongly left as
  `staffed`. Assert presence/absence in both lists, not just one.
- `weeklyPitch` returns any **non-`declined`** weekly commitment, so `kept` and `no_show` do reach
  the Board pitch card — good for asserting the tag reflects real state rather than a hardcoded one.

## Testing role gates and inline error handling
- Hiding a control is not proof the server enforces it. To exercise the API gate through the UI
  only: render the privileged page in tab A as the coordinator, switch `viewing as` to a
  non-coordinator in **tab B** (the cookie is shared), then click the still-mounted privileged
  button in tab A. The request goes out with the new cookie and you see the real 403 path.
- Expected inline messages: `Only a coordinator can stand down a surge.`,
  `You can only answer a roll call for yourself.`, `That question already has an answer.` (409).
- For the duplicate logistics-answer path, use the same two-tab trick: ask a question in tab A,
  answer it in tab B, then submit a different answer from tab A's stale form. Correct behavior is
  an inline error **with the typed text preserved** (the handler returns before `setAnswer('')`).
- Logistics Q&A only renders for the requester or a claimant, so switch to a claimant
  (e.g. Marcus on `need_woodpile`) before expecting the ask/answer forms to exist at all.

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
