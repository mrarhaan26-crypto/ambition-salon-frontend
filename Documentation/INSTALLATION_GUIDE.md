# Installation Guide

Create master folder:
```bash
mkdir Ambition-Unisex-Salon-Software
```
Extract frontend zip into `frontend`, backend zip into `backend`, docs zip into `docs`.

Run frontend:
```bash
cd frontend
npm install
npm start
```

Run backend in second terminal:
```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npm run start:dev
```
