# Project guidance

## Overview

This is a coffee shop frontend portfolio project, originally built
by following a YouTube tutorial. The owner is adding improvements
while learning. Explain findings and changes in clear,
beginner-friendly language.

The application lives in `Coffee_Shop_Site/`. The frontend uses React,
TypeScript, Vite, and Tailwind CSS with PostCSS and Autoprefixer.
ESLint is configured for TypeScript, React Hooks, and React Refresh.
The backend uses TypeScript Vercel Functions and Neon PostgreSQL.
The project uses npm and has a `package-lock.json`.

## Before editing

- Inspect the relevant code, configuration, and existing behavior
  before proposing changes. Check whether a suitable component,
  dependency, asset, or pattern already exists.
- Explain what you found and how the proposed change would work.
- List the exact files you propose to create, edit, or delete.
  Explain what would change in each file and why.
- Wait for the owner's explicit approval before editing any files.
  Approval covers the agreed scope. Ask again before making a
  materially different change.

## Implementation conventions

- Keep changes focused. Preserve the existing visual style and
  responsive layout unless the owner requests otherwise.
- Follow conventions in the files being edited. Do not reformat
  unrelated code or perform unrelated refactoring.
- `src/App.tsx` assembles the page from default-exported functional
  components in `src/components/`. Reuse existing components where
  appropriate, including the shared `Button`.
- Shared content arrays live in `src/data/index.ts`; image assets
  are imported from `src/assets/images/`.
- Styling currently uses Tailwind utility classes, with global CSS
  in `src/index.css`. Reuse the colors and the Source Serif 4 and
  Bebas Neue font settings in `tailwind.config.js`, and follow the
  existing responsive class patterns such as `lg:`.
- Use the installed `react-icons` library. Existing components
  import Ionicons from `react-icons/io5`. Verify available exports
  rather than copying incompatible tutorial imports.
- Reuse other existing dependencies where appropriate.
  `styled-components` is installed, but the current components
  use Tailwind styling.
- Do not upgrade packages, add dependencies, or change tooling
  without explaining the need and receiving explicit approval.

## Interactions and portfolio scope

- Consider accessibility, keyboard operation, visible focus,
  meaningful labels, mobile layouts, and reduced-motion preferences
  when implementing interactions.
- Reservations are requests for a fictional café portfolio project.
  Success means the database saved a pending request; it does not
  confirm availability or allocate a table.
- The approved backend uses TypeScript Vercel Functions and Neon
  PostgreSQL. Preserve separation between form presentation,
  shared validation, HTTP submission, and database access.
- Validate in both browser and server using Europe/Oslo.
  Use parameterized SQL, database constraints, and idempotent writes.
- Keep credentials server-only. Never put secrets in VITE_ variables,
  commit environment files, or log visitor contact information.
- Reservation records are private. Do not add public record-listing
  or contact-detail retrieval endpoints.
- Email acknowledgement is a separate decision after reliable database
  submissions are verified. No email code or dependencies are currently
  authorized. A future email must acknowledge a request, not confirm a
  table; its failure must not undo a save or create duplicate requests.
- Accounts, admin interfaces, payments, and automatic table allocation
  require separate approval. An admin interface remains optional later work.
- Cloud resources, schema application, and deployment require explicit
  approval for those actions. Implementation approval does not authorize
  deployment or automatic deployments.
- README and Mermaid documentation come after the working system is
  verified and should describe only completed features.

## Commands and verification

Run commands from `Coffee_Shop_Site/`:

- `npm run dev`: start the frontend-only Vite development server.
- `npm run dev:fullstack`: run frontend and Vercel Functions locally.
- `npm run typecheck`: check frontend, shared, backend, and test types.
- `npm test`: run isolated tests without a database.
- `npm run test:integration`: run database tests against a dedicated test
  branch only; requires ignored local test environment configuration.
- `npm run build`: run TypeScript build checks and create the Vite
  production build.
- `npm run lint`: run ESLint.
- `npm run preview`: serve the production build locally.

Use Node 22.20.0 locally (`nvm use`); Vercel uses Node 22.x.
Use `.env.example` as a template; real local secrets belong in ignored
`.env.local` or `.env.test.local`. Never print their contents.

After approved changes, run appropriate available checks. For
frontend/backend changes, run build, lint, typecheck, and relevant tests.
Run real database tests only on an explicitly approved isolated test branch.
For visual or interaction changes, check the affected behavior,
keyboard use, and mobile layout when browser verification is
available.

Report what changed, what checks actually ran, their results, and
any remaining issues or verification limitations. Do not claim
checks passed unless they were run. Explain any failures and seek
approval if fixing them requires changes outside the agreed scope.

Do not commit, push, or deploy unless explicitly requested.
