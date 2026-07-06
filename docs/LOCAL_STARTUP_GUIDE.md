# Ambition Unisex Salon Software — Local Startup Guide

## Prerequisites

| Tool         | Version        | Check command           |
|--------------|----------------|-------------------------|
| Node.js      | >=18           | `node --version`        |
| npm          | >=8            | `npm --version`         |
| PostgreSQL   | 14+            | `psql --version`        |
| Angular CLI  | >=20           | `ng version`            |

---

## Database Setup

### 1. Ensure PostgreSQL is running

PostgreSQL must be running on **127.0.0.1:2620**.

- **Windows (pg_ctl):**
  ```powershell
  pg_ctl -D "C:\Program Files\PostgreSQL\16\data" start
  ```
- **Windows (service):**
  ```powershell
  Start-Service postgresql-x64-16
  ```
- **Docker:**
  ```powershell
  docker run -d --name ambition-postgres -e POSTGRES_PASSWORD=MyWaliden262 -e POSTGRES_DB=ambition_salon -p 2620:5432 postgres:16
  ```

Verify:
```powershell
psql -U postgres -h 127.0.0.1 -p 2620 -d ambition_salon -c "SELECT 1"
```
Password: `MyWaliden262`

### 2. Push Prisma schema & seed data (first-time only)

```powershell
cd Backend_NestJS
npx prisma db push
npx prisma db seed
```

> This creates tables and inserts demo data. You only need to run it once.
> The database and its data **persist** across restarts — the startup script
> never resets or deletes data.

---

## Quick Start (one-click)

1. Open **PowerShell** in the project root:
   ```powershell
   cd "C:\Users\mrzub\OneDrive\Ambition Unisex Salon Software"
   ```

2. Run:
   ```powershell
   .\start-ambition.ps1
   ```
   If you get an execution policy error:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```

3. The script will:
   - Kill any stale `node.exe` processes on ports 3000 / 4200
   - Verify PostgreSQL is running on **127.0.0.1:2620** (exits if not found)
   - Auto-install npm dependencies if missing
   - Start NestJS backend on **http://127.0.0.1:3000**
   - Start Angular dev server on **http://127.0.0.1:4200**
   - Open **http://127.0.0.1:4200/#/login** in your default browser

4. Press **Ctrl+C** in the PowerShell window to stop both servers.

---

## Manual Start (step by step)

### 1. Start Backend (NestJS)

```powershell
cd "C:\Users\mrzub\OneDrive\Ambition Unisex Salon Software\Backend_NestJS"
npm install              # only first time
npm run start:dev        # starts on http://127.0.0.1:3000
```

### 2. Start Frontend (Angular)

In a **separate** terminal:

```powershell
cd "C:\Users\mrzub\OneDrive\Ambition Unisex Salon Software\Frontend_Angular"
npm install              # only first time
npx ng serve --host 127.0.0.1 --port 4200
```

### 3. Open the app

http://127.0.0.1:4200  
Login: http://127.0.0.1:4200/#/login

---

## Demo Credentials

| Role     | Email                | Password     |
|----------|----------------------|--------------|
| Admin    | `admin@ambition.com` | `password123`|

---

## Environment Variables

Create `Backend_NestJS/.env` (already exists with defaults):

```env
DATABASE_URL=postgresql://postgres:MyWaliden262@127.0.0.1:2620/ambition_salon
JWT_SECRET=change-this-secret
JWT_EXPIRES_IN=7d
PORT=3000
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser → http://127.0.0.1:4200                        │
│  Angular 20 (Frontend_Angular/)                         │
│         │                                                │
│         │  API calls to http://127.0.0.1:3000            │
│         ▼                                                │
│  NestJS API → http://127.0.0.1:3000                     │
│  (Backend_NestJS/)                                      │
│         │                                                │
│         │  Prisma ORM                                    │
│         ▼                                                │
│  PostgreSQL → 127.0.0.1:2620/ambition_salon             │
└─────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

| Symptom                      | Fix                                              |
|------------------------------|--------------------------------------------------|
| Execution policy error       | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` |
| "PostgreSQL NOT running"     | Start PostgreSQL on port 2620 (see Database Setup above) |
| "port already in use"        | Run `start-ambition.ps1` — it kills stale processes |
| Backend won't start          | Check `.env` exists in `Backend_NestJS/`; `npm --prefix Backend_NestJS install` |
| Frontend won't start         | Delete `Frontend_Angular\node_modules` + `package-lock.json`, then `npm install` |
| Prisma errors                | `cd Backend_NestJS && npx prisma generate && npx prisma db push` |
| Blank page in browser        | Open DevTools console and check for API errors  |

---

## Files

| File / Directory          | Purpose                         |
|---------------------------|---------------------------------|
| `start-ambition.ps1`      | One-click launcher script       |
| `Backend_NestJS/`         | NestJS API source + Prisma      |
| `Backend_NestJS/.env`     | Database & JWT configuration    |
| `Backend_NestJS/prisma/`  | Prisma schema + seed            |
| `Frontend_Angular/`       | Angular 20 frontend source      |
| `docs/LOCAL_RUNBOOK.md`   | Alternative runbook             |
