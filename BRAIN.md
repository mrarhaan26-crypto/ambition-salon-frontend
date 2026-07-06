# BRAIN.md - Ambition Salon CRM/POS Coding Brain

## Main mindset

Code kam files me, safe, current architecture ke hisaab se likhna hai. Existing project ko improve karna hai, replace nahi.

## Current project

- Frontend: Angular app in `Frontend_Angular/`
- Backend: NestJS + TypeScript app in `Backend_NestJS/`
- Database: PostgreSQL + Prisma
- Local DB port normally: `2620`

## Before coding

1. Read `AGENTS.md`.
2. Identify exact module.
3. Read only related files.
4. Do not scan whole repo unless needed.
5. Do not modify code until task is clear.

## Coding rules

- Existing pattern follow karo.
- Small focused change karo.
- Reuse services/modules/components.
- No dummy data if real API exists.
- No duplicate project folder.
- No direct ZIP editing; work in extracted folder only.

## Backend brain

- Use NestJS modules/controllers/services.
- Use Prisma Client.
- Keep database schema and migrations safe.
- Do not run DB reset/migration without approval.
- Preserve booking/payment/client/service/resource links.

## Frontend brain

- Existing Angular component style follow karo.
- Current theme and drawer design preserve karo.
- Form payloads backend contract ke saath align karo.
- ID fields ko selector se replace karna ho to existing services reuse karo.

## Git and commands

Bina user approval:

- git commit/push/pull/merge/reset/clean nahi.
- npm install/build/test/start nahi.
- prisma migrate/reset/seed nahi.
- server start nahi.

## Stop rules

2-3 unsuccessful attempts ke baad loop mat karo. Short blockage report do aur next exact command/user action batao.

## Final reply

```text
Changed:
- file/path: kya change kiya

Not Run:
- commands not run

You Run:
- manual commands
```
