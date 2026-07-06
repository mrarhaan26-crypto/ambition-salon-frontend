# Ambition Unisex Salon Software Project Audit

Audit date: 2026-07-06

Scope:
- `Frontend_Angular`
- `Backend_NestJS`

Constraints followed:
- No existing source files were changed.
- No servers, builds, tests, package installs, Prisma commands, migrations, seeds, or database writes were run.

## 1. Architecture Overview

The project is a two-app salon management system:

- Frontend: Angular 20 standalone components under `Frontend_Angular`.
- Backend: NestJS 10 + TypeScript under `Backend_NestJS`.
- Database: PostgreSQL through Prisma under `Backend_NestJS/prisma`.
- API base: backend applies the global `/api` prefix.
- Frontend API target: `Frontend_Angular/src/environments/environment.ts` points to `http://localhost:3000/api`.
- Routing: Angular uses hash routing via `withHashLocation()`.
- Authentication: JWT login/register exists, frontend stores the token in `localStorage`, and an Angular HTTP interceptor sends `Authorization: Bearer ...`.
- API documentation: Swagger is mounted at `/api/docs`.

High-level flow:

1. Angular app boots from `src/main.ts`, registers routes and auth interceptor.
2. Public website routes use `WebsiteLayoutComponent`.
3. Authenticated `/app/*` routes use `AppLayoutComponent` and `authGuard`.
4. Feature components call per-feature Angular services.
5. Backend controllers expose REST endpoints.
6. Backend services use `PrismaService`, which extends Prisma Client.
7. Prisma models map salon, branch, user, booking, client, staff, payments, inventory, reports, automations, messaging, surveys, and delivery settings into PostgreSQL tables.

Current architecture strength:
- The system has wide feature coverage and clear frontend/backend folder separation.
- Nest modules are generally organized as `controller/service/module`.
- Angular mostly follows standalone component conventions.
- Prisma schema has a broad domain model and indexes on several high-traffic fields.

Current architecture weakness:
- Many backend modules are thin CRUD/foundation implementations.
- Auth is not applied consistently across backend modules.
- Most DTO validation is missing despite a global validation pipe.
- Large inline Angular components create a maintenance bottleneck.
- A duplicate root `src/modules` tree exists outside `Backend_NestJS` and is not part of the real backend app.

## 2. Folder Structure

Top-level structure:

```text
.
├── Backend_NestJS/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── scripts/
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── common/
│   │   └── modules/
│   ├── package.json
│   └── tsconfig.json
├── Frontend_Angular/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   ├── features/
│   │   │   ├── website/
│   │   │   └── book-online/
│   │   ├── environments/
│   │   ├── main.ts
│   │   └── styles.css
│   ├── angular.json
│   └── package.json
├── docs/
├── Documentation/
├── src/
│   └── modules/
└── start-ambition.ps1
```

Important note:
- `Backend_NestJS/src` is the backend app source.
- Root `src/modules` appears to be a leftover or duplicate backend source tree. It contains only partial bookings/clients modules and references `../../common/prisma.service`, but no matching root `src/common` exists.

Backend module pattern:

```text
Backend_NestJS/src/modules/<feature>/
├── <feature>.controller.ts
├── <feature>.service.ts
└── <feature>.module.ts
```

Frontend feature pattern:

```text
Frontend_Angular/src/app/features/<feature>/
├── <feature>.component.ts
├── <feature>.service.ts
└── optional models/constants/utils
```

Calendar is the largest frontend feature and has additional sub-engines:
- `calendar-conflict-engine`
- `calendar-drag-engine`
- `calendar-queue-engine`
- `calendar-resource-engine`
- `calendar-staff-timeline`
- `calendar-ai-scheduler`
- `calendar-waitlist`

## 3. Completed Modules

These modules have both visible frontend coverage and backend/API or Prisma backing:

- Authentication: login/register/me with JWT.
- Clients: CRUD, search, pagination on backend, frontend client management.
- Bookings: CRUD, status updates, reschedule/cancel, slots, calendar resource endpoints.
- Calendar: rich frontend calendar shell, day/week/month views, drag/conflict/resource/queue engines.
- Staff: CRUD, schedule, performance, availability.
- Services: service catalog and categories.
- Branches/settings: business settings and branches.
- POS: checkout, sales, refund flow, payment methods.
- Inventory: products, stock transactions, low-stock support.
- Payments: create intent placeholder, mark paid/failed, refund.
- Invoices: invoice list/create/update/void/receipt support.
- Billing rules: taxes, discounts, billing key-value rules.
- Adjustments/refunds/cancellations: finance adjustment flows.
- Reports and advanced reports: dashboards and exports.
- Dashboard analytics: overview, revenue, operations, staff, client activity.
- AI command center and AI insights: rule-based analytics/recommendation services.
- AI scheduler: slot suggestion and day optimization style APIs.
- Notifications: notification list/read/archive/unread flows.
- Notification templates: template CRUD.
- Message center: conversations and messages.
- Automations: rules, enable/disable, event logs.
- Tasks: task CRUD, my tasks, overdue, completion.
- Attendance: clock-in, clock-out, summary.
- Commissions: rules and payments.
- Memberships/packages: plans, packages, client linkage.
- Wallet/gift cards/loyalty: wallet transactions, gift cards, rewards.
- Forms/client timeline/client notes: form templates, submissions, notes, timeline.
- Online profile/public booking/book-online: public profile, services, staff, slots, booking creation.
- Customer portal: customer-facing summaries and history.
- Owner command center: dashboard, health, actions.
- CRM intelligence: segmentation, VIP/inactive/birthday/recommendations.
- Resources: resource CRUD, availability, conflicts.
- Waitlist: entry lifecycle, suggestions, autofill, booking conversion.
- Walk-ins: queue lifecycle, conversion to booking.
- Reputation: reviews and summary.
- Surveys/feedback: survey CRUD, responses, feedback.
- Delivery settings/logs/test: provider config and simulated delivery logs.
- Global search: cross-module search.
- Audit logs: log listing/details/summary.
- Data export: export job creation/list/detail and module export logic.

## 4. Missing Modules

Missing or incomplete as production-grade modules:

- Role-based authorization: roles exist in Prisma, but most controllers do not enforce roles or permissions.
- Tenant/branch scoping: many queries accept optional `branchId`, but there is no consistent ownership or branch access enforcement.
- Password reset: frontend has `ForgotPasswordComponent`, but no backend reset-token/email flow was found.
- Email/SMS/WhatsApp delivery providers: `DeliverySetting.provider` defaults to `PLACEHOLDER`; delivery looks simulated rather than integrated.
- Real payment gateway integration: frontend includes placeholder payment options; backend payment intent flow appears local/simulated.
- File upload/media management: online profile stores `photos` as a string, with no asset upload/storage pipeline.
- Payroll-grade commission settlement: commission models exist, but settlement/approval/audit workflow is light.
- Recurring appointments: no clear recurring booking model or recurrence engine.
- Service package redemption at checkout: packages exist, but full redemption/accounting linkage appears incomplete.
- Gift card redemption in POS/payment flows: gift cards exist, but end-to-end redemption is not clearly enforced.
- Inventory purchase orders/suppliers: inventory supports products and transactions, but supplier ordering is absent.
- Appointment reminders: notification templates exist, but no scheduler/worker process was found.
- Background jobs/queues: automations and notifications are synchronous/service-level; no job runner or retry queue is present.
- Production audit trail enforcement: audit logs can be listed, but writes are not consistently integrated into all mutations.
- API rate limiting/throttling: not present.
- Central error response policy: Nest default exceptions are used; no global exception filter was found.
- Test suites: no meaningful unit/integration/e2e tests were observed in the inspected project structure.

## 5. Duplicate Code

Confirmed duplicates and duplication patterns:

- Root `src/modules/bookings` duplicates part of `Backend_NestJS/src/modules/bookings`.
- Root `src/modules/clients` duplicates part of `Backend_NestJS/src/modules/clients`.
- `Backend_NestJS/package.json.bak` duplicates package metadata and can mislead future edits.
- Backend has both `bcrypt` and `bcryptjs` dependencies, while code uses `bcryptjs`.
- Frontend has repeated CRUD component patterns across many feature components.
- Frontend has repeated service methods like `getAll`, `getById`, `create`, `update`, `remove` across modules.
- Inline templates/styles are repeated across standalone components instead of shared table/form/dialog primitives.
- Dashboard/reporting logic overlaps between `reports`, `advanced-reports`, `dashboard-analytics`, `ai-insights`, and `ai-command-center`.
- Calendar has separate but similar event/cache/extension-point implementations across conflict, drag, queue, and resource engines.

Risk:
- Duplicate backend source outside the real app can cause fixes to be made in the wrong location.
- Repeated frontend CRUD patterns increase the likelihood of inconsistent loading, error, delete-confirmation, and empty-state behavior.

## 6. Dead Code

Likely dead or orphaned code:

- Root `src/modules/*` is outside `Backend_NestJS` and not imported by `Backend_NestJS/src/app.module.ts`.
- `Backend_NestJS/package.json.bak` is a stale copy.
- `UsersService` returns placeholder objects instead of using Prisma.
- `LeadsService` returns placeholder objects despite a `Lead` Prisma model.
- Some frontend modules likely call endpoints that exist only as placeholders or partially implemented foundations.
- `ForgotPasswordComponent` is UI-only and not wired to a backend recovery flow.
- Placeholder comments exist in calendar shell methods.
- Delivery provider defaults and Razorpay placeholder UI indicate non-production paths.

Potential dead-code candidates requiring confirmation before removal:
- Old docs under both `docs/` and `Documentation/` may overlap.
- Root `package-lock.json` has no matching root `package.json` visible in the top-level listing.
- Some calendar engine extension-point files may be scaffolding rather than active dependencies.

No deletion is recommended until each candidate is confirmed against imports, runtime routes, and user workflow expectations.

## 7. Performance Issues

Backend:

- Many endpoints use `findMany` without pagination or with hardcoded `take` values.
- Dashboard/reporting services perform multiple independent queries and some per-row follow-up queries.
- `DashboardAnalyticsService.staff()` groups bookings and then fetches each user plus counts per staff member, which can become an N+1 pattern.
- `DataExportService` fetches full module datasets for exports without streaming or pagination.
- Global search can issue multiple broad `contains` searches across tables.
- Prisma uses `Float` for money, which can cause rounding drift and reconciliation issues.
- Some reports group by `startTime` and then aggregate in application code by day; this can become expensive at scale.
- No caching layer is present for dashboard, global search, permissions, settings, or public booking profile.
- No background queue exists for exports, reminders, automations, or delivery retries.

Frontend:

- `calendar.component.ts` is about 4,197 lines.
- `module-shell.component.ts` is about 1,560 lines.
- `bookings.component.ts` is about 1,159 lines.
- `pos.component.ts` is about 1,108 lines.
- Many standalone components contain large inline templates and inline styles, increasing rebuild and review cost.
- Dashboard makes many independent subscriptions and uses `setTimeout` to decide when loading is complete.
- Several screens subscribe directly in components without a consistent cancellation/error strategy.
- Frontend services often fetch large lists without pagination awareness.
- Hash routing is simple but can limit SEO and clean URL behavior for public pages.

Database:

- Indexes exist on many fields, but compound indexes for common filters are missing in places, such as branch/date/status combinations for bookings and branch/status/date for waitlist/walk-ins.
- Reporting-heavy queries may need materialized views or summary tables later.

## 8. Security Issues

High priority:

- `JWT_SECRET` falls back to `change-this-secret` in both auth module/strategy paths.
- `app.enableCors()` is open with default permissive behavior.
- Most backend controllers do not use `JwtAuthGuard`.
- No role/permission guard is enforced across business modules.
- Register accepts `role` from request body, allowing privilege selection unless constrained elsewhere.
- Frontend stores JWT in `localStorage`, which is vulnerable to token theft if XSS occurs.
- Global validation uses `whitelist: true` but not `forbidNonWhitelisted: true`; unexpected fields can be silently stripped rather than rejected.
- Many request bodies use `any`, limiting validation and Swagger contract accuracy.
- Swagger docs are exposed at `/api/docs` with no access control.

Medium priority:

- Seed file contains a known demo password.
- Some controllers return related objects broadly; for example salon queries include `owner`, which can risk exposing sensitive fields if not carefully selected.
- No rate limiting on auth endpoints.
- No account lockout or login attempt throttling.
- No CSRF strategy if future cookie auth is introduced.
- No centralized output sanitization policy for free-text fields.
- Public booking endpoints need explicit abuse protection.
- Destructive endpoints use hard deletes in many modules.

## 9. UI/UX Improvements

Recommended improvements:

- Fix encoding issues in visible labels/icons. Examples in inspected templates include mojibake such as `Ã—`, `â˜°`, `â€”`, and malformed emoji text.
- Replace browser `confirm()` calls with consistent in-app confirmation dialogs.
- Standardize loading, empty, error, and success states across CRUD screens.
- Add consistent form validation and field-level error messages.
- Add route-level page titles/breadcrumbs for long sidebar navigation.
- Add role-aware sidebar visibility once permissions are enforced.
- Break the long sidebar into grouped sections: Operations, Clients, Finance, Marketing, Staff, Reports, Admin, AI.
- Improve mobile navigation for the large app module list.
- Move large inline templates/styles into separate files for complex screens.
- Add virtual scrolling or pagination for clients, bookings, audit logs, messages, inventory, and exports.
- Improve accessibility: button labels, focus states, semantic dialogs, keyboard support, ARIA consistency.
- Replace placeholder pages/flows with clear disabled states or production integrations.
- For public website pages, avoid hash routes if SEO matters.
- Use a shared design system for tables, forms, modals, stats cards, filter bars, and status chips.

## 10. Database Improvements

Recommended schema improvements:

- Replace money `Float` fields with `Decimal` for payments, invoices, taxes, discounts, wallet, gift cards, POS, bookings, commissions, refunds, and adjustments.
- Add explicit tenant ownership to most business records, preferably `salonId` and/or consistent `branchId`.
- Add compound indexes:
  - `Booking(branchId, startTime)`
  - `Booking(branchId, status, startTime)`
  - `Booking(staffId, startTime)`
  - `Booking(clientId, startTime)`
  - `WalkIn(branchId, status, arrivalTime)`
  - `WaitlistEntry(branchId, status, requestedDate, priority)`
  - `Payment(clientId, status, createdAt)`
  - `Invoice(clientId, status, createdAt)`
  - `InventoryProduct(branchId, isActive, quantity)`
- Add soft-delete fields where history matters: `deletedAt`, `deletedById`.
- Add audit fields consistently: `createdById`, `updatedById`.
- Convert JSON-like `String` columns to `Json`:
  - `BusinessSetting.notificationPreferences`
  - `FormTemplate.fields`
  - `ClientFormSubmission.answers`
  - `OnlineProfile.photos`
  - `NotificationTemplate.variables`
  - `AutomationRule.config`
  - `AutomationEventLog.details`
  - `AuditLog.metadata`
  - `Survey.questions`
  - `SurveyResponse.answers`
  - `DeliverySetting.config`
  - `DeliveryLog.response`
- Add stronger unique constraints where appropriate:
  - SKU per branch
  - service category name per salon/branch
  - staff email already unique through `User.email`
  - invoice/receipt numbering by salon if multi-tenant
- Add explicit relations for fields currently stored as raw strings:
  - `Task.assignedTo` to `User`
  - `Adjustment.createdById` to `User`
  - `CommissionPayment.staffId` to `User`
  - `StaffAttendance.staffId` to `User`
- Add booking recurrence tables if recurring appointments are required.
- Add external integration tables for payment gateway IDs, delivery provider message IDs, and webhook events.

## 11. API Improvements

Recommended backend/API changes:

- Apply authentication globally, then mark only public endpoints as public.
- Add role/permission guards and decorators.
- Replace `any` request bodies/queries with DTOs and class-validator decorators.
- Enable stricter validation: `forbidNonWhitelisted`, `transformOptions.enableImplicitConversion`, and explicit DTO transforms.
- Standardize pagination response shape across list endpoints.
- Standardize error response shape with a global exception filter.
- Add OpenAPI decorators for DTOs and response types.
- Add API versioning before external integrations depend on current contracts.
- Add idempotency keys for payments, checkout, booking creation, refunds, and delivery sends.
- Prefer soft delete/archive endpoints over hard deletes for business-critical records.
- Add consistent branch/salon scoping from the authenticated user.
- Add transactional boundaries around finance and booking lifecycle changes.
- Add audit-log writes to all sensitive mutations.
- Add rate limiting for auth, public booking, search, exports, and delivery-test endpoints.
- Add health checks for database and environment configuration.
- Move export generation and notification delivery to jobs with retry and status tracking.

## 12. Technical Debt

Primary debt items:

- Root duplicate `src/modules` tree can confuse future backend work.
- Large Angular components make local changes risky and slow.
- Inline templates/styles dominate many frontend components.
- Inconsistent formatting: several files are minified or one-line TypeScript.
- Heavy use of `any` on both frontend and backend.
- Inconsistent backend maturity: some modules are production-like, others still return placeholders.
- Authentication is implemented but not consistently enforced.
- Authorization model is present conceptually but not implemented as guards.
- Money uses floating-point numbers.
- Public/private API boundaries are implicit rather than enforced.
- Hard deletes are common for important records.
- No automated test safety net is visible.
- No lint/format workflow was confirmed.
- No CI workflow was found in the inspected tree.
- Reporting and dashboard calculations are spread across several modules.
- Delivery, payment, AI, and automation terminology overstates the current level of real integration in some areas.

Largest code hotspots by line count:

- `Frontend_Angular/src/app/features/calendar/calendar.component.ts`: about 4,197 lines.
- `Frontend_Angular/src/app/features/module-shell.component.ts`: about 1,560 lines.
- `Backend_NestJS/src/modules/bookings/bookings.service.ts`: about 1,294 lines.
- `Frontend_Angular/src/app/features/bookings/bookings.component.ts`: about 1,159 lines.
- `Frontend_Angular/src/app/features/pos/pos.component.ts`: about 1,108 lines.
- `Backend_NestJS/src/modules/ai-command-center/ai-command-center.service.ts`: about 615 lines.

## 13. Recommended Phase 16 Roadmap

### Phase 16.1 - Stabilize Project Shape

- [x] Decide whether root `src/modules` is obsolete; if yes, remove it in a dedicated cleanup after approval.
- Remove or archive `Backend_NestJS/package.json.bak` after approval.
- Normalize formatting for one-line/minified TypeScript files.
- Document canonical app roots:
  - Frontend: `Frontend_Angular`
  - Backend: `Backend_NestJS`
- Add a short API/module ownership map.

### Phase 16.2 - Security and Access Control

- [x] Require `JWT_SECRET`; remove fallback secret.
- [x] Restrict CORS by environment.
- Add global auth guard with explicit public-route decorator.
- Implement role/permission guards using existing `Role` and permissions module.
- [x] Prevent role self-assignment during public registration.
- Add auth rate limiting and password policy.
- Decide whether to keep localStorage tokens or move to a safer cookie/session strategy.

### Phase 16.3 - API Contract Hardening

- Add DTOs for high-risk modules first:
  - auth
  - bookings
  - clients
  - payments
  - POS
  - staff
  - inventory
  - public booking
- Turn on stricter validation.
- Add consistent pagination/query DTOs.
- Add global exception filter.
- Add Swagger response contracts.

### Phase 16.4 - Database Correctness

- Plan a safe Decimal migration for all money fields.
- Add tenant/branch scoping fields where missing.
- Add compound indexes for calendar, waitlist, walk-ins, payments, invoices, and inventory.
- Convert JSON-string fields to Prisma `Json`.
- Add soft-delete and audit fields for business-critical tables.

### Phase 16.5 - Booking, Calendar, POS Reliability

- Split `calendar.component.ts` into smaller view/container/services.
- Split `bookings.component.ts` and `pos.component.ts` into focused child components.
- Add transactional tests for booking create/reschedule/cancel/payment flows.
- Add conflict checks at the backend boundary, not only the frontend.
- Add idempotency for checkout, payments, refunds, and booking creation.

### Phase 16.6 - Production Integrations

- Replace placeholder payment intent flow with the selected real provider.
- Add webhook handling and reconciliation.
- Replace simulated delivery with provider adapters.
- Add reminder scheduling jobs.
- Add retryable delivery logs.
- Add export jobs that stream or generate files asynchronously.

### Phase 16.7 - UX and Design System

- Build shared Angular primitives:
  - data table
  - filter bar
  - stat card
  - confirmation dialog
  - empty state
  - loading skeleton
  - status chip
  - form field wrapper
- Fix visible encoding issues.
- Group sidebar navigation.
- Add role-aware menus.
- Standardize mobile layouts.
- Improve accessibility and keyboard navigation.

### Phase 16.8 - Testing and Release Safety

- Add backend unit tests for services with mocked Prisma.
- Add backend integration tests for critical APIs.
- Add frontend component tests for major screens.
- Add Playwright smoke tests for login, dashboard, booking, calendar, POS, and client flows.
- Add CI for typecheck/build/test once approved.
- Add seed/test-data separation to avoid demo credentials leaking into production workflows.

## Priority Summary

Recommended first fixes:

1. Lock down backend auth/CORS/JWT secret and role assignment.
2. Remove ambiguity from duplicate root `src/modules`.
3. Add DTO validation to auth/bookings/clients/payments/POS.
4. Convert money fields from `Float` to `Decimal` through a planned migration.
5. Split the largest Angular components and standardize shared UI patterns.
6. Add tests around booking, POS, payments, clients, and public booking.

Overall assessment:
- The project has broad Phase 15/21-style feature coverage and a usable full-stack skeleton.
- The next phase should focus less on adding new modules and more on production hardening: security, data correctness, API contracts, test coverage, and maintainability.
