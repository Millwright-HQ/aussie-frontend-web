# CLAUDE.md: aussie-frontend-web

The Aussie website (storefront + `/admin`). **Platform decisions, architecture and docs are in the
`aussie-backend-infrastructure` repo** (`CLAUDE.md`, `docs/DESIGN_GUIDELINES.md`, `docs/SECURITY.md`): read them first.
Ask before assuming anything not written there.

@AGENTS.md

## Commands
```
pnpm install
pnpm dev
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Layout
- `app/(store)/`: storefront. `app/admin/`: admin panel. `proxy.ts`: guards `/admin`, sets the CSP.
- `lib/`: server-side API clients and pure helpers. `components/`: shared client components.
- `packages/ui`: design tokens (`src/tokens.css` is the only place for colours) and components.
- `packages/shared-types`, `packages/validation`: **copies**; change `aussie-backend-packages` and sync.

## Rules that apply here
- Auth is server-side (BFF): tokens live only in encrypted httpOnly cookies, never in the browser.
- Validate every server action input with the shared zod schemas.
- No hard-coded colours: use the token names (`bg-primary`, `text-muted`, ...).
- Money is integer cents; format with `formatLkr`.
- Admin pages call `requirePermission(...)`; the API enforces permissions again.
