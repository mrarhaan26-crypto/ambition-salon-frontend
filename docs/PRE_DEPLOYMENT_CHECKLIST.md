# Pre-Deployment Checklist

## Database
- [ ] PostgreSQL running on 127.0.0.1:2620
- [ ] Prisma schema applied: `npx prisma db push`
- [ ] No pending migrations

## Backend (NestJS)
- [ ] `npm run build` passes (0 errors)
- [ ] Server starts on port 3000
- [ ] All modules registered in `app.module.ts`
- [ ] Swagger/OpenAPI docs accessible at `/api/docs` (if enabled)

## Frontend (Angular)
- [ ] `ng build` passes (0 errors)
- [ ] All routes registered in `app.routes.ts`
- [ ] Hash routing works (`/#/app/...`)
- [ ] `/book-online` public route accessible without auth

## Environment Variables
- [ ] `DATABASE_URL` set to PostgreSQL connection string
- [ ] `JWT_SECRET` set
- [ ] `PORT` (default 3000)
- [ ] `FRONTEND_URL` (default `http://localhost:4200`)
- [ ] `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` (for email)

## Authentication & Security
- [ ] JWT login works for `admin@ambition.com`
- [ ] Auth guards protect `/api/auth/*` routes
- [ ] Public `/api/public/*` routes accessible without token
- [ ] Role-based access enforced (if implemented)

## API Verification
- [ ] All core endpoints return 200 (run `scripts/verify-apis.ps1`)
- [ ] All new endpoints return 200 (Steps 65-71)
- [ ] CORS configured for frontend origin

## Not Production-Ready
- Real payment gateway (Razorpay/Stripe) not integrated
- Real SMS/WhatsApp/email provider not connected
- Real Google Reviews API not integrated
- No production hosting, domain, or SSL
- No automated database backup plan
- No monitoring or error tracking (Sentry, etc.)
- Background workers are placeholder-only
- Branch-scoped data isolation not implemented
- Real-time WebSocket notifications not implemented
