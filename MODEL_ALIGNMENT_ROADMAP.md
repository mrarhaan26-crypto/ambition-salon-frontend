# Model Alignment — Safe Implementation Roadmap

> Based on frontend model vs Prisma schema audit. Read-only plan. No code, no Prisma, no migrations until explicitly instructed.

---

## Phase 1 — Frontend-Only Type Safety

**Target:** Low-risk model files that have no enum mismatch and no backend contract dependency. Pure type additions/optionality fixes.

### 1a. Add `updatedAt` to Client model

| Item | Detail |
|------|--------|
| **File** | `Frontend_Angular/src/app/features/clients/client.model.ts` |
| **Change** | Add `updatedAt?: string` to `Client` interface |
| **Risk** | None — adding an optional field cannot break existing code |
| **Backend change** | None |
| **Prisma change** | None |
| **Build** | `npm run build` (frontend) — must pass |
| **Rollback** | `git checkout -- client.model.ts` |
| **Approval required** | No |

### 1b. Make `staffId` optional in BookingListItem

| Item | Detail |
|------|--------|
| **File** | `Frontend_Angular/src/app/features/bookings/bookings.models.ts` |
| **Change** | `staffId: string` → `staffId?: string` |
| **Risk** | Low — any component accessing `staffId` without null check will get a TS error. Fix in same pass. |
| **Backend change** | None |
| **Prisma change** | None |
| **Build** | `npm run build` — fix any new TS errors in components |
| **Rollback** | `git checkout -- bookings.models.ts` + any component files changed |
| **Approval required** | No |

### 1c. Add missing fields to AttendanceRecord

| Item | Detail |
|------|--------|
| **File** | `Frontend_Angular/src/app/features/attendance/attendance.models.ts` |
| **Change** | Add `totalMin?: number`, `createdAt?: string`, `updatedAt?: string`. Add comment: `// computed from clockIn/clockOut` on `duration` and `status`. Make `clockIn` optional (`clockIn?: string`). |
| **Risk** | Low — additive changes only. `clockIn` optional may cause TS errors in components that assume it's required. |
| **Backend change** | None |
| **Prisma change** | None |
| **Build** | `npm run build` |
| **Rollback** | `git checkout -- attendance.models.ts` |
| **Approval required** | No |

### 1d. Add missing fields to TaskItem

| Item | Detail |
|------|--------|
| **File** | `Frontend_Angular/src/app/features/tasks/tasks.models.ts` (if exists) |
| **Change** | Add `clientId?: string`, `bookingId?: string`, `updatedAt?: string`. Make `description` optional (`description?: string`). |
| **Risk** | Low — additive. Enum mismatch (status values) is handled in Phase 2. |
| **Backend change** | None |
| **Prisma change** | None |
| **Build** | `npm run build` |
| **Rollback** | `git checkout -- tasks.models.ts` |
| **Approval required** | No |

### 1e. Add missing fields to CommissionRecord

| Item | Detail |
|------|--------|
| **File** | `Frontend_Angular/src/app/features/commissions/commissions.models.ts` |
| **Change** | Add `commissionRuleId?: string`, `bookingId?: string`, `posSaleId?: string`, `updatedAt?: string`. Add comment: `// frontend-only display fields` on `staffName`, `type`, `source`, `date`. |
| **Risk** | Low — additive. Suppresses confusion about which fields exist in the API response vs which are frontend-computed. |
| **Backend change** | None |
| **Prisma change** | None |
| **Build** | `npm run build` |
| **Rollback** | `git checkout -- commissions.models.ts` |
| **Approval required** | No |

### 1f. Add missing fields to CommissionRule

| Item | Detail |
|------|--------|
| **File** | `Frontend_Angular/src/app/features/commissions/commissions.models.ts` |
| **Change** | Add `staffId?: string`, `createdAt?: string`, `updatedAt?: string`. Add comment: `// frontend display only` on `serviceName`. |
| **Risk** | Low |
| **Backend change** | None |
| **Prisma change** | None |
| **Build** | `npm run build` |
| **Rollback** | `git checkout -- commissions.models.ts` |
| **Approval required** | No |

### 1g. Add missing fields to calendar-resource models

| Item | Detail |
|------|--------|
| **File** | `Frontend_Angular/src/app/features/calendar/calendar-resource.models.ts` |
| **Change** | Add `cleaningBufferMin?: number`. Add comment: `// frontend-only UI fields` on `branchScope`, `isFavorite`, `isHidden`, `icon`, `tags`, `metadata`. |
| **Risk** | Low — additive. Enum mismatch handled in Phase 2. |
| **Backend change** | None |
| **Prisma change** | None |
| **Build** | `npm run build` |
| **Rollback** | `git checkout -- calendar-resource.models.ts` |
| **Approval required** | No |

---

## Phase 2 — Enum Mapping Adapters (Frontend Only)

**Target:** Fix enum value mismatches between frontend models and Prisma schema using adapter/helper functions. No API changes, no backend changes.

### 2a. LeaveType mapping adapter

| Item | Detail |
|------|--------|
| **Problem** | Frontend `LeaveType` uses `SICK\|VACATION\|PERSONAL\|BEREAVEMENT\|MATERNITY\|OTHER`. Prisma `LeaveType` enum uses `CASUAL\|SICK\|MEDICAL\|VACATION\|MATERNITY\|PATERNITY\|UNPAID\|EMERGENCY\|PUBLIC_HOLIDAY\|HALF_DAY`. Only `SICK`, `VACATION`, `MATERNITY` overlap. |
| **Files involved** | `Frontend_Angular/src/app/features/calendar/leave.models.ts` |
| **Change** | Add adapter function: `function toPrismaLeaveType(fe: FrontendLeaveType): PrismaLeaveType { /* mapping */ }` and `function toFrontendLeaveType(prisma: PrismaLeaveType): FrontendLeaveType { /* reverse mapping */ }`. Update `LeaveType` type to match Prisma enum exactly. |
| **Risk** | Low — adapter is pure function, no side effects. Components that reference old enum values will need updating. |
| **Backend change** | None |
| **Prisma change** | None |
| **Build** | `npm run build` |
| **Rollback** | `git checkout -- leave.models.ts` |
| **Approval required** | No |

### 2b. ResourceType / ResourceStatus mapping adapter

| Item | Detail |
|------|--------|
| **Problem** | Frontend `ResourceType` uses lowercase `chair\|room\|vip_cabin`. Prisma uses `CHAIR\|ROOM\|EQUIPMENT\|STATION\|MACHINE\|SPA_ROOM\|VIP_ROOM\|MIRROR\|WASH_STATION`. Frontend `ResourceStatus` has extra values `INACTIVE\|OUT_OF_SERVICE\|ARCHIVED` not in Prisma `ACTIVE\|MAINTENANCE\|BLOCKED`. |
| **Files involved** | `Frontend_Angular/src/app/features/calendar/calendar-resource.models.ts` |
| **Change** | Add adapter functions `toPrismaResourceType()`, `toFrontendResourceType()`, `toPrismaResourceStatus()`, `toFrontendResourceStatus()`. Map extra frontend-only status values to nearest Prisma equivalent. |
| **Risk** | Low — pure function adapter. |
| **Backend change** | None |
| **Prisma change** | None |
| **Build** | `npm run build` |
| **Rollback** | `git checkout -- calendar-resource.models.ts` |
| **Approval required** | No |

### 2c. TaskStatus mapping adapter

| Item | Detail |
|------|--------|
| **Problem** | Frontend uses `TODO\|IN_PROGRESS\|DONE\|ARCHIVED`. Prisma defaults to `OPEN` (stored as String, not enum). |
| **Files involved** | `Frontend_Angular/src/app/features/tasks/tasks.models.ts` |
| **Change** | Add adapter. Align frontend status values with whichever set the backend actually sends. If backend sends `OPEN`, map it. |
| **Risk** | Low — adapter isolates the mismatch. |
| **Backend change** | None |
| **Prisma change** | None |
| **Build** | `npm run build` |
| **Rollback** | `git checkout -- tasks.models.ts` |
| **Approval required** | No |

---

## Phase 3 — Waitlist Model Alignment Plan

**Problem:** Three representations of waitlist data exist:

1. **Prisma `WaitlistEntry`** — `id, branchId, clientId, staffId, requestedDate, preferredStart?, preferredEnd?, serviceName?, notes?, status (WaitlistStatus), priority, createdAt, updatedAt`
2. **`calendar/calendar.models.ts::WaitlistEntry`** — simplified, missing `branchId`, `staffId`, `priority`, `preferredStart`, `preferredEnd`
3. **`waiting-list.models.ts::WaitingEntry`** — completely different: `clientName, clientPhone, staffPreference, partySize, position, calledAt`

### Recommended approach (no code, planning only)

```
Step 1: Rename calendar.models.ts::WaitlistEntry to CalendarWaitlistEntry to distinguish from Prisma shape.
        Add all missing Prisma fields as optional (since the calendar may not use all fields).

Step 2: Rewrite waiting-list.models.ts::WaitingEntry to align with Prisma WaitlistEntry.
        Keep clientName, clientPhone, partySize, position, calledAt as frontend-only display fields.
        Add branchId, clientId, staffId, preferredStart, preferredEnd, priority, status, createdAt, updatedAt.

Step 3: Create adapter function in waiting-list.models.ts:
        function toPrismaWaitlistEntry(fe: WaitingEntry): WaitlistEntryCreateInput
        function toFrontendWaitingEntry(prisma: WaitlistEntry): WaitingEntry

Step 4: Update waiting-list.service.ts to use typed methods instead of any.

Step 5: Update any component referencing WaitingEntry to use the new shape.
```

| Item | Detail |
|------|--------|
| **Files involved** | `calendar/calendar.models.ts`, `waiting-list/waiting-list.models.ts`, `waiting-list/waiting-list.service.ts`, any component importing waiting-list models |
| **Risk** | Medium — `WaitingEntry` field names change. All callers must update. |
| **Backend change** | None (API already returns Prisma shape) |
| **Prisma change** | None |
| **Build** | `npm run build` |
| **Rollback** | `git checkout -- Frontend_Angular/src/app/features/waiting-list/ Frontend_Angular/src/app/features/calendar/calendar.models.ts` |
| **Approval required** | Yes — field rename breaks components |

---

## Phase 4 — Leaves Model Alignment Plan

**Problem:** Three layers of leave models with different shapes:

1. **Prisma `StaffLeave`** — `id, staffId, leaveType (LeaveType enum), status (LeaveStatus enum), startDate, endDate, halfDay, reason?, notes?, attachmentUrl?, approvedBy?, approvedAt?, rejectedBy?, rejectedAt?, rejectReason?, branchId?, createdAt, updatedAt`
2. **`leave.models.ts` (calender feature)** — `StaffLeave { id, staffId, staff?, leaveType, status, startDate, endDate, reason?, createdAt? }` — missing `halfDay`, `notes`, `attachmentUrl`, `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `rejectReason`, `branchId`. `LeaveType` enum diverges completely (different values).
3. **`leave.service.ts` (calendar feature)** — Methods typed with `any` parameters in some cases.

### Recommended approach (no code, planning only)

```
Step 1: Update leave.models.ts::LeaveType to match Prisma LeaveType exactly.
        Add adapter for any display mapping (e.g., displayLabel(leaveType: LeaveType): string).

Step 2: Add all missing Prisma fields to StaffLeave interface as optional:
        halfDay?: boolean, notes?: string, attachmentUrl?: string,
        approvedBy?: string, approvedAt?: string, rejectedBy?: string,
        rejectedAt?: string, rejectReason?: string, branchId?: string

Step 3: Update leave.service.ts to return typed Observable<StaffLeave[]> 
        instead of Observable<any[]>.

Step 4: Update leave components to handle new optional fields.
```

| Item | Detail |
|------|--------|
| **Files involved** | `calendar/leave.models.ts`, `calendar/leave.service.ts`, any leave-related components |
| **Risk** | Low-Medium — additive fields won't break. Enum alignment may require component updates. |
| **Backend change** | None (API already returns Prisma shape) |
| **Prisma change** | None |
| **Build** | `npm run build` |
| **Rollback** | `git checkout -- Frontend_Angular/src/app/features/calendar/leave.*` |
| **Approval required** | No for additive fields. Yes for enum rename if it touches components. |

---

## Phase 5 — Tasks / Attendance / Commissions Model Alignment Plan

### 5a. Tasks

**Problem:** Prisma `Task { id, title, description?, dueDate?, priority (String), status (String default "OPEN"), assignedTo?, clientId?, bookingId?, createdAt, updatedAt }`.

Frontend `TaskItem` has extra `assignedName` (frontend join), missing `clientId`, `bookingId`, `updatedAt`. Status values differ (`TODO/IN_PROGRESS/DONE/ARCHIVED` vs `OPEN`).

**Plan (no code):**
```
1. Add clientId?, bookingId?, updatedAt? to TaskItem interface.
2. Mark assignedName with // frontend-only display comment.
3. Create TaskStatus adapter if backend sends "OPEN" but frontend displays "TODO".
4. Type tasks.service.ts return values.
```

**Risk:** Low — additive fields, adapter isolates enum mismatch.

### 5b. Attendance

**Problem:** Prisma `StaffAttendance { id, staffId, date, clockIn?, clockOut?, totalMin, notes?, createdAt, updatedAt }`.

Frontend `AttendanceRecord` has `staffName`, `duration`, `status` (computed), missing `totalMin`, `createdAt`, `updatedAt`. `clockIn` is required in frontend but optional in Prisma.

**Plan (no code):**
```
1. Add totalMin?, createdAt?, updatedAt? to AttendanceRecord.
2. Add // computed comment to duration, status, staffName.
3. Make clockIn optional (clockIn?: string).
4. Type attendance.service.ts return values.
```

**Risk:** Low — additive fields. `clockIn` optional may trigger TS errors in components.

### 5c. Commissions

**Problem:** Frontend `CommissionRecord` has fields (`staffName`, `type`, `source`, `date`) with no Prisma equivalent, missing `commissionRuleId`, `bookingId`, `posSaleId`, `updatedAt`. Prisma `CommissionPayment` is the actual DB model.

Frontend `CommissionRule` has extra `serviceName` (frontend join), missing `staffId`, `createdAt`, `updatedAt`.

**Plan (no code):**
```
1. Add commissionRuleId?, bookingId?, posSaleId?, updatedAt? to CommissionRecord.
2. Mark staffName, type, source, date as // frontend-only display.
3. Rename CommissionRecord to match Prisma convention or add alias comment.
4. Add staffId?, createdAt?, updatedAt? to CommissionRule.
5. Mark serviceName as // frontend-only display.
6. Type commissions.service.ts return values.
```

**Risk:** Low-Medium — additive fields are safe. Any field rename would require approval.

---

## Phase 6 — Prisma Migration Plan (Indexes / Enums)

**Planning only — requires approval to execute.**

### 6a. Add missing indexes

**Models with ZERO indexes (only @id):**

| Model | Suggested index |
|-------|-----------------|
| `Salon` | `@@index([ownerId])` |
| `Branch` | `@@index([salonId])`, `@@index([city])` |
| `Lead` | `@@index([status])`, `@@index([createdAt])`, `@@index([formType])` |
| `MembershipPlan` | `@@index([isActive])` |
| `Package` | `@@index([isActive])` |
| `NotificationTemplate` | `@@index([channel])`, `@@index([isActive])` |
| `AutomationRule` | `@@index([triggerType])`, `@@index([isActive])` |
| `DataExportJob` | `@@index([status])`, `@@index([requestedBy])` |
| `Review` | `@@index([clientId])`, `@@index([rating])`, `@@index([status])`, `@@index([source])` |
| `Survey` | `@@index([isActive])` |
| `Feedback` | `@@index([clientId])`, `@@index([rating])`, `@@index([source])` |
| `CommissionRule` | `@@index([type])`, `@@index([serviceId])`, `@@index([staffId])`, `@@index([isActive])` |

**Additional FK/composite indexes on existing models:**

| Model | Suggested index |
|-------|-----------------|
| `User` | `@@index([role])`, `@@index([isActive])` |
| `Client` | `@@index([phone])`, `@@index([loyaltyPoints])` |
| `Task` | `@@index([dueDate])`, `@@index([priority])` |
| `StaffAttendance` | `@@index([staffId, date])` (composite) |
| `CommissionPayment` | `@@index([status])`, `@@index([commissionRuleId])` |
| `Invoice` | `@@index([invoiceNumber])`, `@@index([issuedAt])` |
| `Payment` | `@@index([createdAt])` |
| `MessageConversation` | `@@index([channel])`, `@@index([createdAt])` |
| `GiftCard` | `@@index([expiresAt])` |
| `WalletTransaction` | `@@index([type])` |
| `LoyaltyReward` | `@@index([type])` |

**Migration command:** `npx prisma migrate dev --name add_indexes`<br>
**Risk:** Low — indexes are additive and cannot break data. May slow writes slightly but improve reads significantly.<br>
**Data migration required:** No<br>
**Rollback:** `npx prisma migrate dev --name rollback_add_indexes` (revert the migration file)

### 6b. Convert String status fields to Prisma enums

**New enums to define:**

| Enum Name | Values |
|-----------|--------|
| `GiftCardStatus` | `ACTIVE`, `EXPIRED`, `REDEEMED`, `VOID` |
| `CampaignStatus` | `DRAFT`, `SCHEDULED`, `SENT`, `FAILED` |
| `CampaignType` | `SMS`, `EMAIL`, `PUSH`, `IN_APP` |
| `TaskStatus` | `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `ARCHIVED` |
| `TaskPriority` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `PaymentMethod` | `CASH`, `CARD`, `UPI`, `BANK_TRANSFER`, `WALLET`, `GIFT_CARD` |
| `PaymentStatus` | `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED` |
| `InvoiceStatus` | `DRAFT`, `SENT`, `PAID`, `PARTIALLY_PAID`, `OVERDUE`, `VOID`, `CANCELLED` |
| `PosSaleStatus` | `PENDING`, `COMPLETED`, `REFUNDED`, `CANCELLED` |
| `CommissionType` | `PERCENTAGE`, `FIXED` |
| `CommissionStatus` | `PENDING`, `APPROVED`, `PAID`, `CANCELLED` |
| `DiscountType` | `PERCENTAGE`, `FIXED_AMOUNT` |
| `AdjustmentType` | `MANUAL_CREDIT`, `MANUAL_DEBIT`, `DISCOUNT`, `REFUND`, `VOID` |
| `MessageSender` | `STAFF`, `CLIENT`, `SYSTEM`, `AI` |
| `MessageChannel` | `IN_APP`, `SMS`, `EMAIL`, `WHATSAPP` |
| `DataExportStatus` | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `ReviewStatus` | `PUBLISHED`, `HIDDEN`, `PENDING_REVIEW`, `FLAGGED` |
| `ReviewSource` | `MANUAL`, `GOOGLE`, `FACEBOOK`, `YELP`, `TRUSTPILOT` |
| `DeliveryChannel` | `SMS`, `EMAIL`, `WHATSAPP`, `IN_APP` |
| `DeliveryLogStatus` | `SIMULATED`, `SENT`, `DELIVERED`, `FAILED`, `BOUNCED` |
| `WalletTransactionType` | `CREDIT`, `DEBIT`, `REFUND`, `ADJUSTMENT` |
| `LoyaltyRewardType` | `EARNED`, `REDEEMED`, `EXPIRED`, `ADJUSTMENT` |
| `AutomationTriggerType` | (extract from existing data) |
| `AutomationActionType` | (extract from existing data) |
| `MessageConversationChannel` | (same as MessageChannel or reuse) |

**Fields to convert** (String → Enum):

```prisma
model GiftCard {
  status GiftCardStatus @default(ACTIVE)    // was: String @default("ACTIVE")
}

model MarketingCampaign {
  type   CampaignType   @default(SMS)       // was: String @default("SMS")
  status CampaignStatus @default(DRAFT)     // was: String @default("DRAFT")
}

model Task {
  priority TaskPriority  @default(MEDIUM)   // was: String @default("MEDIUM")
  status   TaskStatus    @default(OPEN)     // was: String @default("OPEN")
}

// ... same pattern for all other models listed in schema.prisma
```

**Migration command:** `npx prisma migrate dev --name convert_to_enums`<br>
**Risk:** High — enum conversion requires existing string values to exactly match enum member names (case-sensitive). Pre-migration data cleanup required.<br>
**Data migration required:** Yes — SQL UPDATE statements to normalize existing string values before enum conversion. Example:
```sql
UPDATE "GiftCard" SET status = 'ACTIVE' WHERE status NOT IN ('ACTIVE', 'EXPIRED', 'REDEEMED', 'VOID');
UPDATE "GiftCard" SET status = 'ACTIVE' WHERE status IS NULL;
-- Repeat for each enum field
```
**Rollback:** `npx prisma migrate dev --name rollback_enums` — revert enum → String. Data preserved as string values.<br>
**Approval required:** Yes — high risk, requires explicit approval.

---

## Execution Order

```
Phase 1 (Frontend-only type safety — no approval needed)
  ├── 1a: Add updatedAt to Client model
  ├── 1b: Make staffId optional in BookingListItem
  ├── 1c: Add missing fields to AttendanceRecord
  ├── 1d: Add missing fields to TaskItem
  ├── 1e: Add missing fields to CommissionRecord
  ├── 1f: Add missing fields to CommissionRule
  └── 1g: Add cleaningBufferMin + comments to resource models
  Build after each sub-step.

Phase 2 (Enum adapters — frontend only, no approval needed)
  ├── 2a: LeaveType adapter function
  ├── 2b: ResourceType/ResourceStatus adapter functions
  └── 2c: TaskStatus adapter function
  Build after each.

Phase 3 (Waitlist alignment — approval required)
  ├── 3.1: Rename calendar WaitlistEntry → CalendarWaitlistEntry
  ├── 3.2: Align WaitingEntry with Prisma WaitlistEntry
  ├── 3.3: Add adapter functions
  ├── 3.4: Type waiting-list.service.ts
  └── 3.5: Update components
  Build after each.

Phase 4 (Leaves alignment — approval required for enum rename)
  ├── 4.1: Align LeaveType with Prisma enum
  ├── 4.2: Add missing fields to StaffLeave interface
  ├── 4.3: Type leave.service.ts
  └── 4.4: Update leave components
  Build after each.

Phase 5 (Tasks / Attendance / Commissions — no approval for additive changes)
  ├── 5a: Tasks — additive fields + adapter
  ├── 5b: Attendance — additive fields + clockIn optional
  └── 5c: Commissions — additive fields + display comments
  Build after each.

── Migration Boundary (requires explicit approval to proceed) ──

Phase 6 (Prisma migration planning — no code until approved)
  ├── 6a: Add indexes — prisma migrate dev
  ├── 6b: Pre-migration data cleanup SQL
  └── 6c: Convert String to enums — prisma migrate dev
```
