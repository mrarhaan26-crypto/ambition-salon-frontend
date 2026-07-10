# Ambition Unisex Salon — Production Hardening Phased Plan

> READ ONLY PLAN. Do not modify code, Prisma, or run migrations until explicitly instructed.

---

## Phase A — Zero-Database-Risk Fixes

**Scope:** Backend code changes only. No schema, no migration, no data risk.

### A1. Wire auth guards on unprotected controllers

| Action | Files | Count |
|--------|-------|-------|
| Add `@UseGuards(JwtAuthGuard)` to controller class level | 44 controllers | 44 files |
| Remove dead `UseGuards` import from leaves.controller.ts | `leaves/leaves.controller.ts` | 1 file |

**Files involved:** `src/modules/*/*.controller.ts` (44 files)<br>
**Risk level:** Low — adding guards cannot break data, only deny unauthenticated access. Test by logging in as different roles.<br>
**Migration required:** No<br>
**Data migration required:** No<br>
**Build commands:** `npm run build`<br>
**Rollback:** `git checkout -- src/modules/*/*.controller.ts` or revert per-file via git

### A2. Replace JWT secret placeholder

| Action | Files |
|--------|-------|
| Generate strong secret, update `.env` | `.env` |
| Update `.env.example` with instruction | `.env.example` |

**Files involved:** `Backend_NestJS/.env`, `Backend_NestJS/.env.example`<br>
**Risk level:** Low (config only, no code change)<br>
**Migration required:** No<br>
**Data migration required:** No<br>
**Build commands:** `npm run build` (will pick up new env file)<br>
**Rollback:** Restore previous `.env` from backup or git

### A3. Remove dead RolesGuard code

| Action | Files |
|--------|-------|
| Delete unused `roles.guard.ts` | `src/common/roles.guard.ts` |
| Delete unused `roles.decorator.ts` | `src/common/roles.decorator.ts` |

**Files involved:** `src/common/roles.guard.ts`, `src/common/roles.decorator.ts`<br>
**Risk level:** None (dead code, not imported anywhere)<br>
**Migration required:** No<br>
**Data migration required:** No<br>
**Build commands:** `npm run build`<br>
**Rollback:** `git checkout -- src/common/roles.guard.ts src/common/roles.decorator.ts`

### A4. Remove unused `bcrypt` npm package

| Action | Files |
|--------|-------|
| Remove `bcrypt` from dependencies (keep `bcryptjs`) | `package.json` |

**Files involved:** `Backend_NestJS/package.json`<br>
**Risk level:** None — `bcrypt` is not imported anywhere; all auth uses `bcryptjs`.<br>
**Migration required:** No<br>
**Data migration required:** No<br>
**Build commands:** `npm install` (to update lockfile), `npm run build`<br>
**Rollback:** `npm install bcrypt@^5.1.0` + restore package.json

### A5. Bundle: remove `@angular/material`, `@angular/cdk`, `@angular/animations`

| Action | Files |
|--------|-------|
| Remove three unused Angular packages | `Frontend_Angular/package.json` |

**Files involved:** `Frontend_Angular/package.json`<br>
**Risk level:** None — already verified clean build after removal.<br>
**Migration required:** No<br>
**Data migration required:** No<br>
**Build commands:** `npm install`, `npm run build`<br>
**Rollback:** `npm install @angular/material@^18.0.0 @angular/cdk@^18.0.0 @angular/animations@^18.0.0`

---

## Phase B — Frontend Type/Model Alignment

**Scope:** TypeScript type safety only. No Prisma changes, no API contract changes, no behavior changes.

### B1. Create typed models for 25 model-less features

| Feature | Create file | Based on |
|---------|-------------|----------|
| reports | `reports/reports.models.ts` | Backend API response shape |
| marketing | `marketing/marketing.models.ts` | Backend API + Prisma `MarketingCampaign` |
| settings | `settings/settings.models.ts` | Backend API + Prisma `BusinessSetting` |
| memberships | `memberships/memberships.models.ts` | Prisma `MembershipPlan` + `ClientMembership` |
| packages | `packages/packages.models.ts` | Prisma `Package` + `ClientPackage` |
| wallet | `wallet/wallet.models.ts` | Prisma `WalletTransaction` |
| gift-cards | `gift-cards/gift-cards.models.ts` | Prisma `GiftCard` |
| payments | `payments/payments.models.ts` | Prisma `Payment` |
| invoices | `invoices/invoices.models.ts` | Prisma `Invoice` + `InvoiceItem` + `Receipt` |
| billing-rules | `billing-rules/billing-rules.models.ts` | Prisma `BillingRule` + `Discount` + `Tax` |
| adjustments | `adjustments/adjustments.models.ts` | Prisma `Adjustment` + `Refund` + `Cancellation` |
| automations | `automations/automations.models.ts` | Prisma `AutomationRule` + `AutomationEventLog` |
| message-center | `message-center/message-center.models.ts` | Prisma `MessageConversation` + `Message` |
| notification-templates | `notification-templates/notification-templates.models.ts` | Prisma `NotificationTemplate` |
| branches | `branches/branches.models.ts` | Prisma `Branch` |
| advanced-reports | `advanced-reports/advanced-reports.models.ts` | API response shape |
| audit-logs | `audit-logs/audit-logs.models.ts` | Prisma `AuditLog` |
| data-export | `data-export/data-export.models.ts` | Prisma `DataExportJob` |
| staff-workspace | (already has models) | — skip |
| owner-command-center | `owner-command-center/owner-command-center.models.ts` | API aggregation shape |
| crm-intelligence | `crm-intelligence/crm-intelligence.models.ts` | API aggregation shape |
| resources | `resources/resources.models.ts` | Prisma `Resource` (align with existing calendar-resource.models.ts) |
| reputation | `reputation/reputation.models.ts` | Prisma `Review` + `Feedback` |
| surveys | `surveys/surveys.models.ts` | Prisma `Survey` + `SurveyResponse` |
| delivery-settings | `delivery-settings/delivery-settings.models.ts` | Prisma `DeliverySetting` + `DeliveryLog` |
| client-timeline | `client-timeline/client-timeline.models.ts` | API timeline response |
| online-profile | `online-profile/online-profile.models.ts` | Prisma `OnlineProfile` |
| customer-portal | `customer-portal/customer-portal.models.ts` | API portal response |
| forms | `forms/forms.models.ts` | Prisma `FormTemplate` + `ClientFormSubmission` |

**Files involved:** ~25 new `.models.ts` files in `Frontend_Angular/src/app/features/*/`<br>
**Risk level:** Low — new files, no imports changed yet. Safe to create and verify in isolation.<br>
**Migration required:** No<br>
**Data migration required:** No<br>
**Build commands:** `npm run build` (verify no TS errors in new files)<br>
**Rollback:** Delete the new model files

### B2. Align existing frontend models with Prisma schema

| Model File | Misalignment | Fix |
|------------|-------------|-----|
| `attendance/attendance.models.ts` | Extra `staffName`, `duration`, `status`. Missing `totalMin`, `createdAt`, `updatedAt`. `clockIn` required in FE but optional in Prisma. | Add missing fields, make `clockIn` optional, mark computed fields with comment |
| `tasks/tasks.models.ts` | Extra `assignedName`. Missing `clientId`, `bookingId`, `updatedAt`. `description` required in FE but optional. Status enum mismatch (TODO/IN_PROGRESS/DONE/ARCHIVED vs Prisma OPEN). Priority mismatch. | Add missing fields, align enum values, make `description` optional |
| `commissions/commissions.models.ts` | `CommissionRecord` completely diverges from Prisma `CommissionPayment`. Extra `staffName`, `type`, `source`, `date`. Missing `commissionRuleId`, `bookingId`, `posSaleId`, `updatedAt`. | Rewrite to match Prisma `CommissionPayment` shape |
| `calendar/leave.models.ts` | LeaveType enum values differ from Prisma `LeaveType` completely. Missing `halfDay`, `notes`, `attachmentUrl`, `rejectedBy`, `rejectedAt`, `rejectReason`, `branchId`. | Align enum values, add missing fields |
| `calendar/calendar.models.ts` | `WaitlistEntry` diverges from Prisma `WaitlistEntry` (missing `branchId`, `staffId`, `priority`, `preferredStart`, `preferredEnd`). | Add missing fields to match Prisma |
| `waiting-list.models.ts` | Completely different structure from Prisma `WaitlistEntry` (uses `clientName`, `clientPhone`, `staffPreference`, `partySize`, `position`, `calledAt`). | Rewrite to match Prisma shape; keep display-only fields as optional |
| `calendar-resource.models.ts` | `ResourceType` enum uses lowercase values (`chair`, `room`, `vip_cabin`) vs Prisma `CHAIR`, `ROOM`, etc. `ResourceStatus` has extra values (`INACTIVE`, `OUT_OF_SERVICE`, `ARCHIVED`). Extra fields: `branchScope`, `isFavorite`, `isHidden`, `icon`, `tags`, `metadata`. Missing: `cleaningBufferMin`. | Align enums, add missing field, mark FE-only fields as optional |
| `client.model.ts` | Missing `updatedAt`. | Add `updatedAt?: string` |
| `bookings/bookings.models.ts` | `staffId` is required but optional in Prisma. | Make `staffId` optional |
| `dashboard.models.ts` | 7 interfaces use `[key: string]: any` index signatures. | Replace with explicit typed fields |

**Files involved:** ~10 existing `.models.ts` files<br>
**Risk level:** Low-Medium — interface changes may cause TS errors in components. Fix those as part of the same change. Build must pass before committing.<br>
**Migration required:** No<br>
**Data migration required:** No<br>
**Build commands:** `npm run build`<br>
**Rollback:** `git checkout -- Frontend_Angular/src/app/features/*/*.models.ts`

### B3. Type service method signatures (replace `Observable<any>`)

| Service | `: any` count | Priority |
|---------|---------------|----------|
| advanced-reports.service.ts | 8 | High |
| reports.service.ts | 7 | High |
| adjustments.service.ts | 6 | High |
| inventory.service.ts | 5 | High |
| attendance.service.ts | 5 | High |
| billing-rules.service.ts | 5 | High |
| services.service.ts | 5 | High |
| staff.service.ts | 5 | High |
| surveys.service.ts | 5 | High |
| marketing.service.ts | 4 | Medium |
| pos.service.ts | 4 | Medium |
| online-profile.service.ts | 4 | Medium |
| invoices.service.ts | 4 | Medium |
| smart-time-suggestions.service.ts | 6 | Medium |
| (all remaining) | ~400 across ~35 services | Low |

**Files involved:** ~40 service files in `Frontend_Angular/src/app/features/*/*.service.ts`<br>
**Risk level:** Medium — changing return types may break callers. Do per-feature, build after each batch.<br>
**Migration required:** No<br>
**Data migration required:** No<br>
**Build commands:** `npm run build` after each batch<br>
**Rollback:** `git checkout -- Frontend_Angular/src/app/features/*/*.service.ts`

### B4. Type component properties and method parameters (replace `: any`)

| Component | `: any` count | Priority |
|-----------|---------------|----------|
| pos.component.ts | 36 | High |
| module-shell.component.ts | 27 | High |
| calendar.component.ts | 23 | High |
| resources.component.ts | 10 | Medium |
| advanced-reports.component.ts | 9 | Medium |
| billing-rules.component.ts | 9 | Medium |
| appointment-dialog.component.ts | 9 | Medium |
| branches.component.ts | 8 | Medium |
| commissions.component.ts | 7 | Medium |
| (all others) | ~380 across ~50 components | Low-Medium |

**Files involved:** ~55 component files<br>
**Risk level:** Medium — requires careful typing of local state. Do per-component, build after each.<br>
**Migration required:** No<br>
**Data migration required:** No<br>
**Build commands:** `npm run build`<br>
**Rollback:** `git checkout -- Frontend_Angular/src/app/features/*/*.component.ts`

### B5. Remove `[key: string]: any` from model files

| File | Count |
|------|-------|
| `dashboard.models.ts` | 7 |
| `calendar.models.ts` | 3 |
| `ai-insights.models.ts` | 2 |
| `ai-command-center.models.ts` | 1 |

**Files involved:** 4 model files<br>
**Risk level:** Medium — removing index signatures means every property access must be typed. May expose existing unchecked access in components.<br>
**Migration required:** No<br>
**Data migration required:** No<br>
**Build commands:** `npm run build`<br>
**Rollback:** `git checkout -- Frontend_Angular/src/app/features/*/*.models.ts`

---

## Phase C — Backend DTO Validation

**Scope:** Improve DTO validation and API contracts. No schema changes.

### C1. Add missing validation decorators

| Module | DTO files | Current state | Action |
|--------|-----------|---------------|--------|
| auth | 2 files | Has `@IsString()`, `@IsEmail()` etc. | Verify complete |
| bookings | 4 files | Has decorators | Verify complete |
| walkins | 2 files | Has decorators | Verify complete |
| leaves | 3 files | Has decorators | Verify complete |
| waitlist | 2 files | Has decorators | Verify complete |
| notifications | 2 files | Has decorators | Verify complete |
| dashboard-analytics | 1 file | Has decorators | Verify complete |
| ai-insights | 1 file | Has decorators | Verify complete |
| global-search | 1 file | Has decorators | Verify complete |

**Finding:** All 18 existing DTO files already use `class-validator` decorators. No `: any` found. **No action needed for existing DTOs.**

### C2. Create DTOs for endpoints missing validation

Many controllers accept raw body without DTO classes. Audit each controller for parameters without DTO types.

| Controller | Endpoint | Missing DTO |
|------------|----------|-------------|
| clients.controller | `POST /clients` | Check if uses `CreateClientDto` |
| staff.controller | `POST /staff` | Check if uses DTO |
| services.controller | `POST /services` | Check |
| ... | ... | (full audit required per controller) |

**Files involved:** TBD after per-controller audit<br>
**Risk level:** Low — adding DTO validation is additive, cannot break existing behavior since `ValidationPipe` is already registered globally with `whitelist: true` (strips unknown fields).<br>
**Migration required:** No<br>
**Data migration required:** No<br>
**Build commands:** `npm run build`<br>
**Rollback:** Remove new DTO files; restore controller parameter types

---

## Phase D — Prisma Indexes (Migration Required)

**Scope:** Add missing database indexes. Requires `prisma migrate dev`.

### D1. Add indexes for performance-critical queries

**Models with ZERO indexes** (only primary key):

| Model | Suggested indexes | Justification |
|-------|-------------------|---------------|
| `Salon` | `@@index([ownerId])` | Filter salons by owner |
| `Branch` | `@@index([salonId])`, `@@index([city])` | Filter branches by salon/city |
| `Lead` | `@@index([status])`, `@@index([createdAt])`, `@@index([formType])` | Filter/report on leads |
| `MembershipPlan` | `@@index([isActive])` | Filter active plans |
| `Package` | `@@index([isActive])` | Filter active packages |
| `OnlineProfile` | (single row, no index needed) | Skip |
| `BusinessSetting` | (few rows, no index needed) | Skip |
| `BillingRule` | `@@index([key])` | Lookup by key (already has `@unique`) |
| `NotificationTemplate` | `@@index([channel])`, `@@index([isActive])` | Filter by channel/active |
| `AutomationRule` | `@@index([triggerType])`, `@@index([isActive])` | Filter by trigger type |
| `DataExportJob` | `@@index([status])`, `@@index([requestedBy])` | Filter by status/user |
| `Review` | `@@index([clientId])`, `@@index([rating])`, `@@index([status])`, `@@index([source])` | Filter reviews |
| `Survey` | `@@index([isActive])` | Filter active surveys |
| `Feedback` | `@@index([clientId])`, `@@index([rating])`, `@@index([source])` | Filter feedback |
| `DeliverySetting` | `@@index([channel])` (already unique) | Skip |
| `CommissionRule` | `@@index([type])`, `@@index([serviceId])`, `@@index([staffId])`, `@@index([isActive])` | Filter rules |

**Files involved:** `prisma/schema.prisma`<br>
**Risk level:** Medium — indexes are additive and safe, but require migration. No data loss risk.<br>
**Migration required:** Yes (`prisma migrate dev`)<br>
**Data migration required:** No<br>
**Build commands:** `npx prisma generate`, `npx prisma migrate dev --name add_performance_indexes`, `npm run build`<br>
**Rollback:** `npx prisma migrate dev --name rollback_add_performance_indexes` or `prisma migrate reset` (destructive)

### D2. Add foreign key indexes on existing models

Models that already have some indexes but may be missing FK indexes:

| Model | Missing FK index |
|-------|-----------------|
| `User` (Salon) | No `@@index([role])`, `@@index([isActive])` — useful for filtering staff by role |
| `Client` (Salon) | No `@@index([phone])` — lookup by phone, `@@index([loyaltyPoints])`, `@@index([totalSpend])` |
| `PosSale` | Has branchId, clientId, staffId, createdAt indexes — complete |
| `InventoryProduct` | Has branchId, sku, isActive, quantity — complete |
| `Task` | Has assignedTo, clientId, status — consider `@@index([dueDate])`, `@@index([priority])` |
| `StaffAttendance` | Has staffId, date — consider `@@index([staffId, date])` composite |
| `StaffLeave` | Has staffId, startDate, endDate, status, branchId — complete |
| `CommissionPayment` | Only has `@@index([staffId])` — consider `@@index([status])`, `@@index([commissionRuleId])` |
| `Invoice` | Has clientId, status — consider `@@index([invoiceNumber])`, `@@index([issuedAt])` |
| `Payment` | Has posSaleId, bookingId, clientId, status — consider `@@index([createdAt])` |
| `MessageConversation` | Only has `@@index([clientId])` — consider `@@index([channel])`, `@@index([createdAt])` |
| `GiftCard` | Has clientId, code, status — consider `@@index([expiresAt])` |
| `WalletTransaction` | Has clientId, createdAt — consider `@@index([type])` |
| `LoyaltyReward` | Has clientId, createdAt — consider `@@index([type])` |

**Files involved:** `prisma/schema.prisma`<br>
**Risk level:** Medium. Same as D1.<br>
**Migration required:** Yes<br>
**Data migration required:** No<br>
**Build commands:** `npx prisma generate`, `npx prisma migrate dev --name add_fk_indexes`, `npm run build`<br>
**Rollback:** Same as D1.

---

## Phase E — Enum Migration Plan

**Scope:** Replace `String` fields with Prisma enums for type safety. Requires migration.

### E1. Define new enums in Prisma schema

| New enum needed | Values | Used by |
|-----------------|--------|---------|
| `GiftCardStatus` | `ACTIVE`, `EXPIRED`, `REDEEMED`, `VOID` | `GiftCard.status` |
| `CampaignStatus` | `DRAFT`, `SCHEDULED`, `SENT`, `FAILED` | `MarketingCampaign.status` |
| `CampaignType` | `SMS`, `EMAIL`, `PUSH`, `IN_APP` | `MarketingCampaign.type` |
| `TaskStatus` | `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `ARCHIVED` | `Task.status` |
| `TaskPriority` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` | `Task.priority` |
| `PaymentMethod` | `CASH`, `CARD`, `UPI`, `BANK_TRANSFER`, `WALLET`, `GIFT_CARD` | `Payment.method` |
| `PaymentStatus` | `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED` | `Payment.status` |
| `InvoiceStatus` | `DRAFT`, `SENT`, `PAID`, `PARTIALLY_PAID`, `OVERDUE`, `VOID`, `CANCELLED` | `Invoice.status` |
| `PosSaleStatus` | `PENDING`, `COMPLETED`, `REFUNDED`, `CANCELLED` | `PosSale.status` |
| `CommissionType` | `PERCENTAGE`, `FIXED` | `CommissionRule.type` |
| `CommissionStatus` | `PENDING`, `APPROVED`, `PAID`, `CANCELLED` | `CommissionPayment.status` |
| `DiscountType` | `PERCENTAGE`, `FIXED_AMOUNT` | `Discount.type` |
| `AdjustmentType` | `MANUAL_CREDIT`, `MANUAL_DEBIT`, `DISCOUNT`, `REFUND`, `VOID` | `Adjustment.type` |
| `MessageSender` | `STAFF`, `CLIENT`, `SYSTEM`, `AI` | `Message.sender` |
| `MessageChannel` | `IN_APP`, `SMS`, `EMAIL`, `WHATSAPP` | `Message.channel`, `MessageConversation.channel` |
| `AutomationTriggerType` | (per existing rules) | `AutomationRule.triggerType`, `AutomationEventLog.triggerType` |
| `AutomationActionType` | (per existing rules) | `AutomationRule.actionType`, `AutomationEventLog.actionType` |
| `DataExportStatus` | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` | `DataExportJob.status` |
| `ReviewStatus` | `PUBLISHED`, `HIDDEN`, `PENDING_REVIEW`, `FLAGGED` | `Review.status` |
| `ReviewSource` | `MANUAL`, `GOOGLE`, `FACEBOOK`, `YELP`, `TRUSTPILOT` | `Review.source` |
| `DeliveryChannel` | `SMS`, `EMAIL`, `WHATSAPP`, `IN_APP` | `DeliverySetting.channel`, `DeliveryLog.channel` |
| `DeliveryLogStatus` | `SIMULATED`, `SENT`, `DELIVERED`, `FAILED`, `BOUNCED` | `DeliveryLog.status` |
| `WalletTransactionType` | `CREDIT`, `DEBIT`, `REFUND`, `ADJUSTMENT` | `WalletTransaction.type` |
| `LoyaltyRewardType` | `EARNED`, `REDEEMED`, `EXPIRED`, `ADJUSTMENT` | `LoyaltyReward.type` |

### E2. Change String fields to enum references

After defining each enum, change the corresponding model field:
- `String` → `EnumName` (e.g., `status String @default("ACTIVE")` → `status GiftCardStatus @default(ACTIVE)`)
- Update all `@default(...)` string values to match enum naming (e.g., `"COMPLETED"` → `COMPLETED`)

**Data migration strategy:**
- For each changed field, Prisma will generate SQL: `ALTER TABLE ... ALTER COLUMN ... TYPE "EnumName" USING ...`
- String values in the database must exactly match enum member names (case-sensitive). If any existing data uses lower-case, extra spaces, or different values, the migration will fail.
- **Pre-migration step:** Run a script to normalize existing data (e.g., `UPDATE "GiftCard" SET status = 'ACTIVE' WHERE status ILIKE 'active'`).

**Files involved:** `prisma/schema.prisma`<br>
**Risk level:** High — enum changes require careful data migration. String values in DB that don't match enum members will cause migration failure.<br>
**Migration required:** Yes (`prisma migrate dev`)<br>
**Data migration required:** Yes — SQL to normalize existing string values before enum conversion<br>
**Build commands:** `npx prisma generate`, `npx prisma migrate dev --name add_enums`, `npm run build`<br>
**Rollback:** `npx prisma migrate dev --name rollback_add_enums` (revert enum to String). Data will revert to string values.

---

## Phase F — Computed Fields Consistency Plan

**Scope:** Ensure computed/derived fields are kept in sync or replaced with computed queries.

### F1. Audit computed fields

| Model | Computed Field | Currently | Recommended |
|-------|---------------|------------|-------------|
| `Client` | `loyaltyPoints` | Stored `Int @default(0)` | Keep stored for performance, but add a comment indicating source (`SUM of LoyaltyReward.points`). Ensure calculation is always applied when points change. |
| `Client` | `walletBalance` | Stored `Float @default(0)` | Same approach — stored value synced from WalletTransaction |
| `Client` | `totalVisits` | Stored `Int @default(0)` | Same — synced from Booking count |
| `Client` | `totalSpend` | Stored `Float @default(0)` | Same — synced from Payment/PosSale totals |
| `Client` | `lastVisitAt` | Stored `DateTime?` | Synced from latest Booking.startTime |
| `Invoice` | `subtotal`, `discount`, `discountPercent`, `tax`, `taxRate`, `total` | Stored | Computed from InvoiceItem + rates. OK as stored for invoice integrity (never recalculated after issue). |
| `InvoiceItem` | `totalPrice` | Stored `Float` | Computed = `quantity * unitPrice`. OK as stored snapshot. |
| `PosSaleItem` | `totalPrice` | Stored `Float` | Same as InvoiceItem. |
| `PosSale` | `totalAmount` | Stored `Float` | Sum of PosSaleItem.totalPrice. OK as stored snapshot. |
| `WalletTransaction` | `balanceAfter` | Stored `Float` | Computed from previous balance + amount. Must be set correctly on insert. |
| `StaffAttendance` | `totalMin` | Stored `Int @default(0)` | Computed from clockIn/clockOut. OK as stored. |
| `GiftCard` | `balance` | Stored `Float` | Must be decremented on use. Requires synchronization. |

**Files involved:** `prisma/schema.prisma` (add comments), backend service files (add recalculation triggers)<br>
**Risk level:** Low — no schema change needed for comments. Medium for adding recalculation logic (could introduce bugs if wrong).<br>
**Migration required:** No (comments only). Yes if removing stored fields (not recommended).<br>
**Data migration required:** No<br>
**Build commands:** `npm run build` (backend only)<br>
**Rollback:** Revert comment/service changes via git

---

## Phase G — Missing Feature Models Plan

**Scope:** Add Prisma models for features that currently exist only in the frontend or lack database persistence.

### G1. Features with frontend-only models (no Prisma backing)

| Feature | Frontend Models File | Suggested Prisma Model | Priority |
|---------|---------------------|----------------------|----------|
| Coupons/Discounts | `coupons.models.ts` | `Coupon { code, discountType, discountValue, minPurchase, maxUses, currentUses, expiresAt, isActive }` — consider merging with existing `Discount` model | Medium |
| Chat | `chat.models.ts` — `ChatMessage`, `ChatConversation` | Already have `MessageConversation` + `Message`. Frontend chat models may be redundant. | Low — investigate if frontend models match existing Prisma models |
| WhatsApp | `whatsapp.models.ts` — `WhatsAppTemplate`, `WhatsAppSettings` | Add `WhatsAppTemplate { name, body, variables, isActive }` and extend `DeliverySetting` for WhatsApp provider config | Low |
| SEO | `seo.models.ts` — `SeoPage` | SEO is typically handled at framework level (Angular SSR) — may not need DB model | Lowest |
| Tips | `tips.models.ts` — `TipRecord`, `TipSummary` | Add `Tip { id, posSaleId, staffId, amount, method, createdAt }` | Low |
| Shifts | `shifts.models.ts` — `Shift`, `ShiftTemplate` | Add `Shift { id, staffId, branchId, date, startTime, endTime, breakDuration, notes }` and/or `ShiftTemplate` | Medium |
| Targets | `targets.models.ts` — `StaffTarget`, `TargetSummary` | Add `StaffTarget { id, staffId, month, year, revenueTarget, bookingTarget, isAchieved, notes }` | Low |
| Daily Closing | `daily-closing.models.ts` — `DailyClosing`, `ClosingSummary` | Add `DailyClosing { id, branchId, date, cashIn, cashOut, cardIn, upiIn, totalRevenue, expenses, notes, closedBy, closedAt }` | Medium |
| Online Payment Config | `online-payment.models.ts` — `PaymentTransaction`, `PaymentGatewayConfig` | Add `PaymentGatewayConfig { id, branchId, provider, apiKey, apiSecret, isActive }`. `PaymentTransaction` may overlap with existing `Payment` model | Medium |
| SMS Provider | `sms.models.ts` — `SmsProvider` | Already have `DeliverySetting` + `DeliveryLog`. Extend with SMS-specific config or add `SmsProvider` model | Low |
| Performance Reviews | `performance.models.ts` — `PerformanceReview`, `PerformanceSummary` | Add `PerformanceReview { id, staffId, reviewerId, rating, strengths, areasForImprovement, reviewDate, createdAt }` | Low |
| Payroll | `payroll.models.ts` — `PayrollRecord`, `PayrollSummary` | Add `PayrollRecord { id, staffId, month, year, baseSalary, commission, deductions, netPay, paidAt, notes }` | Low |
| CRM Enhancements | `enterprise-crm.models.ts` — `CrmClient`, `MedicalNote`, `Allergy`, etc. | Extend `Client` model with `tags`, `leadSource`, `marketingConsent`, `riskScore`, `segment`, `isVip`, `isBlacklisted`, `referralCode`, `referredBy`. Add separate `MedicalNote`, `Allergy`, `CustomerImage`, `FamilyMember`, `CommunicationRecord`, `ReferralRecord` models | High |
| Calendar Queue | `calendar-queue.models.ts` | Already have `WaitlistEntry` + `WalkIn` — queue models may be frontend-only views | Low — investigate |
| AI Suggestions | (embedded in calendar models) | AI suggestions are ephemeral — may not need DB persistence | Lowest |

### G2. Priority recommendations

| Priority | Models to add | Rationale |
|----------|--------------|-----------|
| **High** | CRM enhancements (tags, segments, marketing fields on Client) | Core business logic that needs persistence |
| **Medium** | Coupon, Shift, DailyClosing, OnlinePaymentGatewayConfig | Operational features referenced across the app |
| **Low** | WhatsAppTemplate, Tip, StaffTarget, PerformanceReview, PayrollRecord | Niche features, can be deferred |

**Files involved:** `prisma/schema.prisma` (new model blocks)<br>
**Risk level:** Medium — adding new models is additive and safe. Migration required.<br>
**Migration required:** Yes (`prisma migrate dev`)<br>
**Data migration required:** No (new tables, no existing data)<br>
**Build commands:** `npx prisma generate`, `npx prisma migrate dev --name add_feature_models`, `npm run build`<br>
**Rollback:** `npx prisma migrate dev --name rollback_feature_models` (drops new tables — data loss if populated)

---

## Execution Order Summary

```
Phase A (Zero DB Risk)
  ├── A1: Wire auth guards (44 controllers)
  ├── A2: Replace JWT secret placeholder
  ├── A3: Remove dead RolesGuard code
  ├── A4: Remove unused bcrypt package
  └── A5: Remove unused Angular packages
  Build after each sub-step.

Phase B (Frontend Types — No DB)
  ├── B1: Create 25+ new model files
  ├── B2: Align 10 existing model files
  ├── B3: Type ~40 service files
  ├── B4: Type ~55 component files
  └── B5: Remove [key: string]: any from 4 model files
  Build after each sub-step.

Phase C (Backend DTO — No DB)
  └── C2: Create missing DTOs per controller (TBD count)
  Build after.

── Migration Boundary ──

Phase D (Prisma Indexes)
  └── D1 + D2: Add indexes, migrate

Phase E (Enums)
  └── E1 + E2: Define enums, convert String fields, data migration, migrate

Phase F (Computed Fields)
  └── F1: Add comments + recalculation logic (no schema change)

Phase G (New Feature Models)
  └── G1 + G2: Add new Prisma models, migrate
```
