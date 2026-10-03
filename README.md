# aussie-frontend-web

The Aussie store website: customer storefront at `/` and the admin panel at `/admin` (Next.js 16,
App Router, TypeScript). It only talks to the platform API; the services live in their own
repositories and are deployed from [aussie-backend-infrastructure](https://github.com/Millwright-HQ/aussie-backend-infrastructure).

```bash
pnpm install
pnpm dev          # http://localhost:3000 (needs the local API: run "pnpm local:deploy" in the infrastructure repo first)
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

`.env.example` lists the settings. For local work the infrastructure repo's `pnpm local:deploy` writes
`.env.development.local` here for you.

`packages/shared-types` and `packages/validation` are **copies** (change them in
[aussie-backend-packages](https://github.com/Millwright-HQ/aussie-backend-packages) and run its `pnpm sync`).
`packages/ui` (design tokens and components) belongs to this repo and is edited here.
