# AGENTS.md - Ambition Unisex Salon Software Safe Coding Rules

Purpose: keep AI coding safe, focused, and compatible with this current project.

## Current stack

- Frontend: Angular, standalone component pattern where existing code uses it.
- Backend: NestJS + TypeScript.
- Database: PostgreSQL through Prisma.
- Local database target: the current `.env` DATABASE_URL, commonly `127.0.0.1:2620/ambition_salon`.

Do not change the existing stack. Do not suggest Express/SQLite/MongoDB/Redis or a rebuild unless the user explicitly asks.

## Core rules

- Work only inside the opened extracted project folder.
- Do not work directly inside ZIP/7z archives.
- Do not create duplicate project copies unless the user asks.
- Reuse existing frontend services, backend modules, DTO/model shapes, and Prisma schema.
- Make small, focused changes.
- Do not delete files, routes, APIs, schema, UI, or business logic without explicit approval.
- Do not commit, push, reset, clean, rebase, merge, or force push without explicit approval.
- Do not run migrations, reset database, seed database, install packages, start servers, or run build/test unless the user approves.
- If a command can change data or code state, ask first.

## Backend rules

- Follow existing NestJS module/controller/service structure.
- Use Prisma Client and existing Prisma models.
- Keep API response contracts backward compatible.
- Preserve booking, calendar, payments, clients, services, staff, resources, walk-in, and branch behavior.
- Do not create fake APIs or hardcoded mock data when real APIs exist.
- Do not run `prisma migrate dev`, `prisma migrate reset`, or `prisma db push` unless user explicitly approves.

## Frontend rules

- Follow existing Angular architecture and styling.
- Reuse existing feature services where possible.
- Add only required imports.
- Do not rewrite large components for small fixes.
- Keep UI responsive and consistent with existing drawer/card design.

## Verification policy

Only run these after user approval:

```powershell
npm.cmd run build
npm.cmd start
npm.cmd run start:dev
npx prisma generate
npx prisma db seed
npx prisma migrate dev
```

Never answer that a build passed unless it was actually run and the output was checked.

## Final response format

Use this concise format:

```text
Changed:
- path: short reason

Not Run:
- list commands not run

You Run:
- exact manual commands if needed
```
