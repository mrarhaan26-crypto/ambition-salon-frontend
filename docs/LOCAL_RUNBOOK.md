# Local Runbook

## Prerequisites
- Node.js 18+
- PostgreSQL running on 127.0.0.1:2620 (database: `ambition_salon`)
- Angular CLI (`npm install -g @angular/cli`)

## Steps

### 1. Clone & Install
```bash
cd Backend_NestJS
npm install
cd ../Frontend_Angular
npm install
```

### 2. Database Setup
```bash
cd Backend_NestJS
npx prisma db push
```

### 3. Environment Variables
Create `Backend_NestJS/.env`:
```
DATABASE_URL=postgresql://postgres:password@127.0.0.1:2620/ambition_salon?schema=public
JWT_SECRET=your-secret-key
PORT=3000
FRONTEND_URL=http://localhost:4200
```

### 4. Start Backend
```bash
cd Backend_NestJS
npm run start:dev
```
Server runs on http://localhost:3000

### 5. Start Frontend
```bash
cd Frontend_Angular
ng serve
```
App runs on http://localhost:4200

### 6. Login
- URL: http://localhost:4200/#/auth/login
- Email: `admin@ambition.com`
- Password: `password123`

### 7. Public Booking
- URL: http://localhost:4200/book-online

## Verify APIs
```powershell
# From Backend_NestJS directory
.\scripts\verify-apis.ps1
```
