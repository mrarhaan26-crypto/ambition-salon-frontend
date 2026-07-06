# Calendar Sprint 0 — Architecture & Technical Design

## TASK 2: Architecture Design

### 2.1 Component Tree (Frontend)

```text
AppShell
 └─ router-outlet → CalendarComponent  (standalone, existing)
     ├── CommonModule / FormsModule
     ├── calendar-waitlist  (existing sub-component)
     ├── calendar-ai-scheduler  (existing sub-component)
     ├── Client360Component  (existing, reused)
     │
     ├── [View Mode: day/week/month]
     │   ├── day-view       (template section inline, ~700 lines)
     │   ├── week-view      (template section inline)
     │   └── month-view     (template section inline)
     │
     ├── [Drawer sub-views, each inline via *ngIf]
     │   ├── CreateBooking Drawer
     │   ├── EditBooking Drawer
     │   ├── Booking Detail Drawer
     │   ├── ViewBill Drawer (with split payments)
     │   ├── Walk-in Drawer
     │   └── Reschedule Drawer
     │
     └── [Utility layers]
         ├── drag-to-reschedule (pointer events)
         ├── current-time indicator
         └── conflict highlight

Proposed extraction (Sprint 1+):
  CalendarDayViewComponent     — standalone, extracted from day-view template
  CalendarWeekViewComponent    — standalone, extracted from week-view template
  CalendarMonthViewComponent   — standalone, extracted from month-view template
  CreateBookingDrawerComponent — standalone (modal drawer for booking creation)
  BookingDetailDrawerComponent — standalone (view/edit/cancel/reschedule)
```

### 2.2 Service Layer Design (Frontend)

| Service | Responsibility | Existing? |
|---|---|---|
| `CalendarService` | HTTP calls to `/api/bookings/calendar/*`, `/api/ai-scheduler/*` | ✅ Exists |
| `ResourcesService` | CRUD resources | ✅ Exists (separate feature module) |
| `StaffService` | Staff list, leave, working hours | ✅ Exists |
| `ClientsService` | Client lookup | ✅ Exists |
| `ServicesService` | Service catalog lookup | ✅ Exists |
| `WaitlistService` (proposed) | Waitlist CRUD + autofill | Partial (in CalendarService) |

**State management strategy**: Keep as component-local state (no NgRx/Store). The calendar component already manages ~60+ instance variables (`bookings`, `staffList`, `summary`, `dragBooking`, etc.). This is acceptable for Sprint 0 — extraction into a dedicated `CalendarStateService` can happen in a later sprint if complexity grows.

**Data flow**:
```
CalendarComponent
  │
  ├── onInit() → load()
  │     ├── loadBranchList()     → BranchService
  │     ├── loadStaffList()      → StaffService
  │     ├── loadServiceList()    → ServicesService
  │     ├── loadResources()      → ResourcesService
  │     ├── loadClients()        → ClientsService
  │     ├── loadCalendarData()   → CalendarService.getCalendarDay/Week/Month
  │     ├── loadSummary()        → CalendarService.getCalendarSummary
  │     └── loadWaitlist()       → CalendarService / Waitlist API
  │
  ├── onViewChange() → loadCalendarData()
  ├── onBranchChange() → loadCalendarData()
  ├── onStaffFilterChange() → loadCalendarData()
  ├── onStatusFilterChange() → loadCalendarData()
  │
  └── Drawer opens → fetch additional data
        ├── Booking Detail → getBookingPayments(), getClientDetail()
        └── Reschedule → getBookingSlots(), getResourceAvailability()
```

### 2.3 Module Boundaries (Backend)

All calendar-related endpoints live inside the existing `BookingsModule`. This is acceptable for Sprint 0. Proposed separation for later:

| Module | Endpoints | Status |
|---|---|---|
| `BookingsModule` | CRUD bookings, slots, reschedule, cancel, status | ✅ Existing |
| `CalendarModule` (proposed) | `calendar/day`, `calendar/week`, `calendar/month`, `calendar/summary`, `calendar/staff-summary`, `calendar/branch-summary` | Currently inside BookingsModule |

**Decision**: Keep calendar endpoints inside `BookingsModule` for Sprint 0. Extraction to a dedicated `CalendarModule` would require careful coordination with the frontend `CalendarService` base URL and is lower priority.

### 2.4 Data Flow: Create / Reschedule Flow

```
Create Booking Flow:
  User fills form → ConflictEngine.validate() [frontend]
    ├── staff availability check       → GET /api/bookings/slots?staffId&date&serviceIds
    ├── staff time conflict check      → POST /api/bookings (422 on conflict)
    ├── client time conflict check     → (same request)
    ├── resource conflict check        → GET /api/bookings/calendar/resources/conflicts
    └── Pass → POST /api/bookings
              → on success → loadCalendarData() refresh

Reschedule Flow:
  User picks new time → ConflictEngine.validate()
    ├── same checks as create
    └── Pass → PATCH /api/bookings/:id/reschedule
              → on success → loadCalendarData() refresh
```

---

## TASK 3: Database Planning Proposal

### 3.1 Existing Models (No Changes Needed)

| Model | Purpose | Status |
|---|---|---|
| `Booking` | Core appointment record | ✅ Complete |
| `BookingService` | Services per booking | ✅ Complete |
| `StaffAvailability` | Weekly recurring availability | ✅ Complete |
| `Resource` | Rooms/chairs/stations/equipment | ✅ Complete |
| `WaitlistEntry` | Waitlist entries with priority | ✅ Complete |
| `WalkIn` | Walk-in customer tracking | ✅ Complete |

### 3.2 Model Gaps (Proposed for Sprint 1+)

#### `RecurringBookingTemplate`
```prisma
model RecurringBookingTemplate {
  id             String   @id @default(cuid())
  branchId       String
  clientId       String
  staffId        String?
  resourceId     String?
  title          String
  notes          String?
  services       RecurringBookingService[]
  frequency      RecurrenceFrequency  // DAILY/WEEKLY/MONTHLY
  interval       Int        @default(1)
  dayOfWeek      Int?       // for WEEKLY
  dayOfMonth     Int?       // for MONTHLY
  startDate      DateTime
  endDate        DateTime?
  maxOccurrences Int?
  bufferBefore   Int        @default(0)
  bufferAfter    Int        @default(0)
  isActive       Boolean    @default(true)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  branch         Branch     @relation(...)
  client         Client     @relation(...)
  staff          User?      @relation(...)
  resource       Resource?  @relation(...)
}
```

#### `StaffLeave` (currently missing)
```prisma
model StaffLeave {
  id        String   @id @default(cuid())
  staffId   String
  branchId  String
  startDate DateTime
  endDate   DateTime
  reason    String?
  leaveType LeaveType  // ANNUAL/SICK/PERSONAL/TRAINING/OTHER
  approved  Boolean    @default(false)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  staff     User       @relation(...)
  branch    Branch     @relation(...)

  @@index([staffId])
  @@index([branchId])
  @@index([startDate, endDate])
}
```

#### `BufferTime` (optional — currently handled per-request as bufferBeforeMinutes/bufferAfterMinutes)
Can remain as booking-level fields. No new model needed.

---

## TASK 4: API Planning

### 4.1 Existing Calendar Endpoints (All in `GET /api/bookings/calendar/*`)

| Endpoint | Purpose | Used By |
|---|---|---|
| `GET /calendar/day` | Bookings for a single day | Day view |
| `GET /calendar/week` | Bookings for Mon-Sun | Week view |
| `GET /calendar/month` | Bookings for full month | Month view |
| `GET /calendar/summary` | KPIs (counts, revenue, duration) | Summary bar |
| `GET /calendar/staff-summary` | Per-staff utilization | Staff view stats |
| `GET /calendar/branch-summary` | Per-branch utilization | Multi-branch view |
| `GET /calendar/resources` | Resource list | Resource view |
| `GET /calendar/resources/availability` | Per-resource timeline | Resource view |
| `GET /calendar/resources/conflicts` | Bookings needing resource assignment | Conflict badge |
| `GET /slots` | Available time slots | Create/Reschedule |

### 4.2 General Booking Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /bookings` | Filtered booking list |
| `GET /bookings/:id` | Single booking detail |
| `POST /bookings` | Create booking |
| `PATCH /bookings/:id` | Update booking fields |
| `PATCH /bookings/:id/reschedule` | Reschedule (time change) |
| `PATCH /bookings/:id/cancel` | Cancel with reason |
| `PATCH /bookings/:id/status` | Status transition |
| `DELETE /bookings/:id` | Hard delete |
| `GET /bookings/:id/payments` | Payments for a booking |

### 4.3 Proposed New Endpoints (Sprint 1+)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/staff/:id/leave?from=&to=` | Fetch leave for date range |
| `POST` | `/api/staff/:id/leave` | Create leave entry |
| `DELETE` | `/api/staff/:id/leave/:leaveId` | Cancel leave |
| `GET` | `/api/bookings/recurring-templates` | List recurring templates |
| `POST` | `/api/bookings/recurring-templates` | Create recurring template |
| `PATCH` | `/api/bookings/recurring-templates/:id` | Update template |
| `DELETE` | `/api/bookings/recurring-templates/:id` | Delete template |
| `POST` | `/api/bookings/recurring-templates/:id/generate` | Generate next occurrences |
| `GET` | `/api/bookings/conflicts/batch` | Bulk conflict check for multiple staff/resources |

### 4.4 API Contract Consistency

All existing endpoints return:
```json
{
  "date": "2026-07-06",
  "range": { "start": "...", "end": "..." },
  "filters": { "branchId": "...", "staffId": "..." },
  "kpis": { ... }  // or totals/bookings/resources
}
```

Proposed new endpoints should follow the same `{ date, range, filters, data }` envelope pattern.

---

## TASK 5: Conflict Engine Design

### 5.1 Existing Conflict Detection (Backend, in `BookingsService`)

The `create()` method already performs:
1. **Staff availability check** — `StaffAvailability` model (dayOfWeek, startTime, endTime)
2. **Staff time conflict** — overlapping booking for same staff (`ACTIVE_BOOKING_STATUSES`)
3. **Client time conflict** — overlapping booking for same client
4. **Resource conflict** — overlapping booking for same resource (if resourceId provided)
5. **Buffer awareness** — `bufferBeforeMinutes` / `bufferAfterMinutes` extend conflict window

The `reschedule()` method repeats the same checks.

**Status transition rules** (existing):
```
PENDING  → CONFIRMED, CANCELLED, NO_SHOW
CONFIRMED → CHECKED_IN, CANCELLED, NO_SHOW
CHECKED_IN → COMPLETED
COMPLETED → [terminal]
CANCELLED → [terminal]
NO_SHOW → [terminal]
```

### 5.2 Proposed Conflict Engine Enhancements (Sprint 1+)

```typescript
// Proposed: ConflictCheckService (NestJS)
@Injectable()
class ConflictCheckService {
  async checkStaffAvailability(staffId, start, end): Promise<AvailabilityResult>
  async checkStaffBookingOverlap(staffId, start, end, excludeBookingId?): Promise<ConflictOverlap[]>
  async checkClientBookingOverlap(clientId, start, end, excludeBookingId?): Promise<ConflictOverlap[]>
  async checkResourceConflict(resourceId, start, end, excludeBookingId?): Promise<ConflictOverlap[]>
  async checkStaffLeave(staffId, date): Promise<boolean>
  async checkAll(staffId, clientId, start, end, resourceId?, excludeBookingId?): Promise<ConflictReport>
}

// ConflictReport shape
interface ConflictReport {
  hasConflict: boolean;
  conflicts: Array<{
    type: 'STAFF_AVAILABILITY' | 'STAFF_OVERLAP' | 'CLIENT_OVERLAP' | 'RESOURCE_CONFLICT' | 'STAFF_LEAVE';
    severity: 'ERROR' | 'WARNING';
    message: string;
    conflictingEntity?: { id: string; name: string };
    conflictingBooking?: { id: string; title: string; startTime: Date; endTime: Date };
  }>;
  warnings: Array<{ /* same shape */ }>;
}

// Frontend Conflict Pre-check
// Before calling POST /api/bookings, the frontend can run:
// GET /api/bookings/conflicts/batch?staffId=&clientId=&start=&end=&resourceId=
```

### 5.3 Leave-Aware Conflict Detection

The current system does NOT check leave when creating bookings. Proposed logic:

1. On create/reschedule: query `StaffLeave` for overlapping dates with `approved: true`
2. If leave covers the booking date, reject with `STAFF_LEAVE` conflict
3. Daily availability check (`StaffAvailability`) should be aware of leave exceptions:
   - If a staff has leave on a date, their availability is considered zero for that date regardless of `StaffAvailability` entries

### 5.4 Frontend Conflict Highlighting

The existing component already shows:
- `conflict-badge` ⚠ on booking chips with `hasConflict(b)`
- Resource conflict timeline in `GET /calendar/resources/conflicts`

Proposed enhancement: Pre-check conflicts at form-fill time (before submit) using a debounced API call to `/api/bookings/conflicts/batch`.

---

## TASK 6: Performance Strategy

### 6.1 Current Performance Profile

- **Calendar component**: 4448 lines monolithic, ~60+ state variables
- **HTTP calls per load**: ~8-12 parallel calls (branches, staff, services, clients, resources, day/week/month data, summary, waitlist)
- **Template rendering**: Day view renders `dv-time-row` (24h) × `dv-staff-col` (~10 staff) = 240 slot cells, plus booking chips

### 6.2 Proposed Optimizations (Sprint 1+)

| Technique | Where | Impact |
|---|---|---|
| `trackBy` on all `*ngFor` | Template | Medium — prevents full re-render |
| `ChangeDetectionStrategy.OnPush` | CalendarComponent + extracted sub-components | High — reduces change detection cycles |
| `virtualScroll` for staff columns | Day/Week view with 10+ staff | Medium — only render visible columns |
| Debounce filter changes | `onBranchChange`, `onStaffFilterChange` | Medium — prevents rapid API calls |
| Cache branch/staff/service lists | `CalendarService` with `shareReplay(1)` | Low — these rarely change |
| Prefetch month data | On view switch, prefetch next view | Low — perceived speed improvement |
| Lazy load AI scheduler | Already a separate component | ✅ Done |
| Lazy load Waitlist panel | Already a separate component | ✅ Done |
| Client-side slot calculation | Move slot calc to `Web Worker` for large date ranges | Low (only for 15min slots across 10+ staff) |

### 6.3 Backend Performance

| Technique | Impact |
|---|---|
| Add composite indexes on Booking: `[branchId, startTime]`, `[staffId, startTime]`, `[clientId, startTime]` | High — all calendar queries use these |
| Use `$transaction` for parallel count queries (already done in `calendarSummary`) | ✅ Done |
| Paginate month view if > 500 bookings | Medium |
| Add Redis cache for staff availability lookups | Low — infrequent changes |

---

## TASK 7: Responsive Strategy

### 7.1 Current Layout

The existing calendar does NOT have responsive breakpoints — it renders as a fixed-width desktop layout with side-by-side staff columns and 24-hour timeline.

### 7.2 Proposed Breakpoints (Sprint 1+)

| Breakpoint | Width | Strategy |
|---|---|---|
| Desktop | > 1024px | Full layout: staff columns + sidebar + time grid |
| Tablet | 768-1024px | Single staff column + sidebar toggle (slide-over) |
| Mobile | < 768px | Day-only view, stacked timeline, bottom sheet drawers |

### 7.3 Specific UX Changes per Breakpoint

**Desktop (current behavior + minor polish)**:
- 10+ staff columns side by side with horizontal scroll
- AI scheduler + Waitlist as sidebar panels (300px each)
- Drawers overlay on right side (400px width)

**Tablet (768-1024px)**:
- Single staff column (dropdown to select staff member)
- Summary bar collapses to compact (inline icons only)
- Sidebar panels become slide-over modal
- Drawers become full-width overlay with transparent backdrop

**Mobile (< 768px)**:
- Day view only (week/month view links shown as dropdown)
- 24h timeline stacked vertically, single column
- Create/Edit/Detail drawers become full-screen pages (swipe to dismiss)
- Filter bar collapses to a single "Filters" expandable section
- Walk-in, Waitlist, AI buttons become floating action buttons (FAB)

### 7.4 CSS Approach

```scss
// Proposed media query structure
// No CSS framework change — keep using component-scoped styles

// Desktop (default styles — already in place)
.dv-container { display: flex; }

// Tablet
@media (max-width: 1024px) {
  .dv-staff-scroll { overflow-x: auto; }
  .dv-sidebar-stack { position: fixed; right: 0; top: 0; width: 320px; z-index: 100; }
  .summary-bar { flex-wrap: wrap; gap: 4px; }
}

// Mobile
@media (max-width: 767px) {
  .view-tabs, .filter-bar { display: none; }  // replaced by mobile-top-bar
  .dv-time-col { min-width: 50px; }
  .booking-chip { font-size: 12px; padding: 2px 6px; }
  .dv-sidebar-stack { position: fixed; inset: 0; width: 100%; z-index: 200; }
}
```

---

## TASK 8: Final Architecture Report — Summary of Deliverables

### What Exists (No Changes Needed)
- 22 backend endpoints under `/api/bookings/calendar/*` and `/api/bookings/*`
- Full conflict detection for staff/client/resource overlaps
- Staff weekly availability via `StaffAvailability` model
- Resource management (CRUD + seed + availability + conflicts)
- Waitlist with priority scoring and autofill
- AI scheduler (suggestions + optimize-day)
- Frontend calendar component with Day/Week/Month views, Staff/Resource modes, Walk-in, Waitlist panel, AI panel, booking drawers, drag-to-reschedule

### What's Missing (Proposed for Sprint 1+)

| Gap | Priority | Effort |
|---|---|---|
| **Staff Leave model** | High | 1 day |
| **Recurring bookings** | Medium | 3 days |
| **Leave-aware conflict detection** | High | 1 day |
| **Component extraction** (day/week/month view components) | Medium | 2 days |
| **Responsive layout** (tablet/mobile) | Medium | 3 days |
| **OnPush + trackBy** performance | Low | 1 day |
| **Bulk conflict check endpoint** | Low | 1 day |
| **Calendar dedicated module** (back-end) | Low | 1 day |
| **Composite indexes** for calendar queries | Low | 0.5 day |

### Architecture Principles (For Sprint 1+)
1. All new features maintain backward compatibility with existing API contracts
2. No redesign — work within current layout and component structure
3. Frontend state remains component-local (no external state management)
4. New backend features go into existing modules unless extraction is justified by complexity
5. Database migrations must be additive only (no destructive changes)
6. All existing calendar functionality (walk-in, waitlist, AI, drag-drop, resource view) must remain untouched

---

## Sprint 0.5: Resource Engine

### Resource Type Taxonomy

| Type | Code | Capacity Model | Booking Rules |
|---|---|---|---|
| **Staff** | `STAFF` | 1 booking at a time per staff | Requires `StaffAvailability` + no leave conflict |
| **Chair** | `CHAIR` | 1 client per chair | Can be assigned to any staff; optional per booking |
| **Room** | `ROOM` | 1 booking at a time; may contain multiple staff | Private rooms for facials, therapy, bridal |
| **Equipment** | `EQUIPMENT` | 1 booking at a time; may be mobile | Hair spa machine, steamer, laser device |
| **Wash Station** | `WASH_STATION` | 1 client per station | Used during service flow — shampoo/blowdry step |
| **VIP Cabin** | `VIP_CABIN` | 1 client + dedicated staff; premium | Exclusive use, minimum booking duration enforced |

### Resource State Machine

```
                    ┌──────────────┐
                    │  AVAILABLE   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
         ┌─────────│  BOOKED      │◄───── from Booking create
         │         └──────┬───────┘
         │                │
         │         ┌──────▼───────┐
         │         │ IN_USE       │◄───── from CHECKED_IN / IN_PROGRESS
         │         └──────┬───────┘
         │                │
         │         ┌──────▼───────┐
         │         │ CLEANING     │◄───── after COMPLETED (optional turnover)
         │         └──────┬───────┘
         │                │
         │         ┌──────▼───────┐
         └────────►│ AVAILABLE    │
                  └──────────────┘

Other states:
  MAINTENANCE ──► manual toggle by admin, blocks booking
  OFFLINE     ──► deactivated (isActive = false)
```

### Resource Manager (Proposed Backend Service)

```
ResourceManagerService
  ├── getAvailability(branchId, date, type?) → ResourceAvailability[]
  ├── assignResource(bookingId, resourceId) → void
  ├── releaseResource(resourceId, startTime, endTime) → void
  ├── getConflicts(resourceId, start, end) → Conflict[]
  ├── getUtilization(branchId, from, to) → UtilizationReport[]
  └── setMaintenance(resourceId, start, end, reason) → void
```

### Per-Resource Capacity Rules

| Resource | Simultaneous Clients | Simultaneous Staff | Notes |
|---|---|---|---|
| Staff | 1 | N/A | One booking at a time |
| Chair | 1 | 0-1 | Staff may be standing |
| Room | 1 (or group) | 1+ | Party booking can use same room |
| Equipment | 1 | 1 operator | Must be operated by staff |
| Wash Station | 1 | 1 | Short-duration (15-20 min) |
| VIP Cabin | 1 | 1 dedicated | Blocked for whole session duration |

### Resource Conflicts Matrix

Two resources conflict if they share ANY dependency:

```
             Staff  Chair  Room  Equip  Wash  VIP
  Staff       ✅     ✳️    ✳️     ✳️    ✳️    ✳️
  Chair       ✳️     ✅     ❌    ❌    ❌    ❌
  Room        ✳️     ❌     ✅    ❌    ❌    ❌
  Equip       ✳️     ❌     ❌    ✅    ❌    ❌
  Wash        ✳️     ❌     ❌    ❌    ✅    ❌
  VIP         ✳️     ❌     ❌    ❌    ❌    ✅

  ✅ = same type conflicts
  ✳️ = cross-type conflict (staff overlaps any resource use)
  ❌ = independent types
```

---

## Sprint 0.5: Appointment Lifecycle

### Full State Graph

```
                         ┌──────────┐
                         │  BLOCKED  │ (time-based blocks, no client)
                         └─────┬─────┘
                               │
┌──────────┐             ┌─────▼──────┐
│  DRAFT   │────────────►│  PENDING   │
└──────────┘             └─────┬──────┘
                               │
                        ┌──────▼───────┐
                        │  CONFIRMED   │◄────── auto-confirm / manual
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │  CHECKED_IN  │◄────── client arrives
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │ IN_PROGRESS  │◄────── service started
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │  COMPLETED   │◄────── service finished
                        └──────┬───────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
             ┌──────▼──────┐      ┌───────▼───────┐
             │   PAID      │      │ PENDING_PAYMENT│
             └──────┬──────┘      └───────┬───────┘
                    │                     │
                    └──────────┬──────────┘
                               │
                        ┌──────▼───────┐
                        │   ARCHIVED   │
                        └──────────────┘

Terminal / Cancellation States:
  ┌──────────┐     ┌──────────┐     ┌──────────┐
  │CANCELLED │     │ NO_SHOW  │     │ LEFT_EARLY│
  └──────────┘     └──────────┘     └──────────┘
       │                │                │
       └────────────────┼────────────────┘
                        ▼
                  ┌──────────┐
                  │ ARCHIVED │
                  └──────────┘
```

### State Definitions

| State | Description | Entered By | Exit To |
|---|---|---|---|
| `DRAFT` | Unsaved booking form, not yet persisted | User opens create form | PENDING |
| `PENDING` | Awaiting confirmation, may auto-confirm | POST /bookings | CONFIRMED / CANCELLED |
| `CONFIRMED` | Approved, on schedule | Manual confirm or auto-rule | CHECKED_IN / CANCELLED / NO_SHOW |
| `CHECKED_IN` | Client arrived at salon | Staff marks arrival | IN_PROGRESS / CANCELLED |
| `IN_PROGRESS` | Service actively being performed | Staff starts service | COMPLETED / CANCELLED (partial) |
| `COMPLETED` | Service finished, payment may be pending | Staff completes service | PAID / PENDING_PAYMENT / ARCHIVED |
| `PAID` | Full payment received | Payment processed | ARCHIVED |
| `PENDING_PAYMENT` | Awaiting payment or partial payment | COMPLETED without full payment | PAID / ARCHIVED |
| `CANCELLED` | Cancelled before or during service | Staff/client cancels | ARCHIVED |
| `NO_SHOW` | Client did not arrive within grace period | Auto after grace timeout | ARCHIVED |
| `LEFT_EARLY` | Client left before service completed | Staff marks early exit | ARCHIVED |
| `BLOCKED` | Time block (no client), e.g. lunch, meeting | Admin creates block | (removed when block ends) |
| `ARCHIVED` | Final state, read-only, moved to cold storage | Auto after configurable days | Terminal |

### State Transition Validation

Each transition must satisfy preconditions:

| Transition | Preconditions |
|---|---|
| DRAFT → PENDING | Client, staff, time slot, services all valid; no conflicts |
| PENDING → CONFIRMED | Conflict re-check passed; within capacity |
| CONFIRMED → CHECKED_IN | Client present at branch; within ±15 min of start |
| CHECKED_IN → IN_PROGRESS | Staff ready; resource assigned and available |
| IN_PROGRESS → COMPLETED | All services marked done |
| COMPLETED → PAID | Amount settled (full or split) |
| COMPLETED → PENDING_PAYMENT | Partial payment taken; balance due |
| ANY → CANCELLED | Reason required; refund policy applied |
| CONFIRMED → NO_SHOW | Auto after 15 min past start; notification sent |
| ANY → ARCHIVED | Configurable days in current state (default 90) |

### State Timing & SLA Rules

```
PENDING → auto-CANCELLED     if not confirmed within 24h (configurable)
CONFIRMED → auto-NO_SHOW     if not checked in by startTime + gracePeriod
NO_SHOW → auto-ARCHIVED      after 7 days
COMPLETED → auto-ARCHIVED    after 90 days
```

### Booking History / Audit Log

Every state transition should record:
- `bookingId`, `fromState`, `toState`, `changedBy` (userId), `changedAt`, `reason` (optional)
- Stored in a `BookingHistory` table for full traceability

---

## Sprint 0.5: Time Slot Engine

### Slot State Definitions

| State | Visual | Description | Persisted |
|---|---|---|---|
| `AVAILABLE` | Green / empty | Open for booking | Computed on demand |
| `RESERVED` | Yellow | Held temporarily (e.g. during checkout, 5 min TTL) | In-memory + Redis TTL |
| `BLOCKED` | Grey | Owner/admin blocked time (staff meeting, lunch, closed) | `BlockedSlot` model or Booking with `BLOCKED` status |
| `BREAK` | Orange | Staff personal break (within shift) | `StaffAvailability` break periods or separate model |
| `HOLIDAY` | Red stripe | Branch closed (public holiday) | `Holiday` model (branch-level) |
| `BUFFER` | Striped | Turnover time between bookings | Computed from `bufferBeforeMinutes` / `bufferAfterMinutes` per staff |
| `MAINTENANCE` | Red | Resource under maintenance | `ResourceMaintenance` model |

### Slot Generation Engine

```
Input: date, branchId, staffId?, resourceId?, slotSizeMinutes
Output: TimeSlot[]

Algorithm:
  1. Load business hours for branch + dayOfWeek
  2. Load staff availability for staffId + dayOfWeek
  3. Load holidays → mark HOLIDAY for entire day
  4. Load maintenance schedules → mark MAINTENANCE for affected resources
  5. Load staff breaks → mark BREAK for staff
  6. Generate all slots by dividing [open, close] into slotSize chunks
  7. For each slot:
     a. If date is holiday → HOLIDAY ✓
     b. If slot falls in maintenance → MAINTENANCE ✓
     c. If slot falls in staff break → BREAK ✓
     d. If slot overlaps existing booking → RESERVED ✓
     e. If slot overlaps buffer zone (before/after booking) → BUFFER ✓
     f. If slot is manually blocked → BLOCKED ✓
     g. Otherwise → AVAILABLE
```

### Reservation Lock (Prevent Double-Booking)

```
User selects slot → POST /api/bookings/reserve
  → Creates in-memory reservation with 5 min TTL
  → Slot state changes to RESERVED for that user session
  → If not confirmed within TTL, reservation expires → slot reverts to AVAILABLE
  → On confirm → POST /api/bookings → slot becomes BOOKED
```

### Slot Availability Rules Priority

| Priority | Rule | Source |
|---|---|---|
| 1 (highest) | Holiday | `Holiday` model |
| 2 | Maintenance | `ResourceMaintenance` model |
| 3 | Blocked | `BlockedSlot` model |
| 4 | Break | `StaffAvailability.breaks` |
| 5 | Buffer | Service-level `bufferBeforeMinutes/AfterMinutes` |
| 6 | Existing booking | `Booking` table |
| 7 (lowest) | Available | Default |

### Proposed Models

```prisma
model Holiday {
  id        String   @id @default(cuid())
  branchId  String
  name      String    // e.g. "Christmas", "New Year"
  date      DateTime  // date only (time ignored)
  isRecurring Boolean @default(false)  // yearly recurring
  createdAt DateTime @default(now())
  branch    Branch   @relation(...)

  @@unique([branchId, date])
}

model BlockedSlot {
  id        String   @id @default(cuid())
  branchId  String
  staffId   String?
  resourceId String?
  startTime DateTime
  endTime   DateTime
  reason    String?
  createdBy String
  createdAt DateTime @default(now())
  branch    Branch   @relation(...)
  staff     User?    @relation(...)
  resource  Resource? @relation(...)

  @@index([startTime, endTime])
}

model ResourceMaintenance {
  id         String   @id @default(cuid())
  resourceId String
  startTime  DateTime
  endTime    DateTime
  reason     String?
  createdAt  DateTime @default(now())
  resource   Resource @relation(...)

  @@index([resourceId, startTime])
}
```

---

## Sprint 0.5: Calendar Settings

### Setting Categories

| Category | Keys | Type | Scope | Description |
|---|---|---|---|---|
| **Business Hours** | `businessHours` | JSON array `[{dayOfWeek, open, close}]` | Per-branch | Operating hours per day |
| **Slot Duration** | `defaultSlotSize` | enum: 15 / 30 / 60 | Per-branch (user override) | Default calendar grid interval |
| **Buffer** | `defaultBufferBefore` | number (minutes) | Per-staff / per-branch | Default turnover time before booking |
| | `defaultBufferAfter` | number (minutes) | Per-staff / per-branch | Default turnover time after booking |
| **Holidays** | `holidays` | JSON array `[{date, name}]` | Per-branch | Branch closure dates |
| **Week Start** | `weekStartDay` | enum: MON / SUN | Per-user | First day of week in calendar |
| **Color Rules** | `colorRules` | JSON array `[{field, operator, value, color}]` | Per-user | Conditional coloring of bookings |
| **Time Format** | `timeFormat` | enum: 12h / 24h | Per-user | Display preference |
| **Grace Period** | `noShowGraceMinutes` | number (default 15) | Per-branch | Wait time before marking NO_SHOW |
| **Auto Archive** | `autoArchiveDays` | number (default 90) | Per-branch | Days after which completed bookings archive |

### CalendarSettings Model

```prisma
model CalendarSettings {
  id        String   @id @default(cuid())
  branchId  String   @unique
  settings  Json     // stores all setting categories as a JSON document
  updatedBy String
  updatedAt DateTime @updatedAt
  branch    Branch   @relation(...)
}
```

Default settings JSON structure:

```json
{
  "businessHours": [
    { "dayOfWeek": 1, "open": "09:00", "close": "20:00" },
    { "dayOfWeek": 2, "open": "09:00", "close": "20:00" },
    { "dayOfWeek": 3, "open": "09:00", "close": "20:00" },
    { "dayOfWeek": 4, "open": "09:00", "close": "20:00" },
    { "dayOfWeek": 5, "open": "09:00", "close": "20:00" },
    { "dayOfWeek": 6, "open": "09:00", "close": "18:00" },
    { "dayOfWeek": 0, "open": null, "close": null }
  ],
  "defaultSlotSize": 30,
  "defaultBufferBefore": 5,
  "defaultBufferAfter": 5,
  "noShowGraceMinutes": 15,
  "autoArchiveDays": 90,
  "weekStartDay": "MON",
  "timeFormat": "12h",
  "colorRules": [
    { "field": "status", "operator": "equals", "value": "CONFIRMED", "color": "#4A90D9" },
    { "field": "status", "operator": "equals", "value": "CHECKED_IN", "color": "#50C878" },
    { "field": "status", "operator": "equals", "value": "COMPLETED", "color": "#2E7D32" },
    { "field": "status", "operator": "equals", "value": "CANCELLED", "color": "#9E9E9E" },
    { "field": "status", "operator": "equals", "value": "NO_SHOW", "color": "#E57373" },
    { "field": "priority", "operator": "equals", "value": "VIP", "color": "#FFD700" }
  ]
}
```

### Settings API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/branches/:id/calendar-settings` | Get settings for a branch |
| `PUT` | `/api/branches/:id/calendar-settings` | Update settings (full replace) |
| `PATCH` | `/api/branches/:id/calendar-settings` | Partial update (merge) |
| `GET` | `/api/users/me/calendar-preferences` | Get user preferences (timeFormat, weekStartDay, colorRules) |
| `PUT` | `/api/users/me/calendar-preferences` | Update user preferences |

### Settings Hierarchy (Override Order)

```
User Preference (highest)
  │
  ▼
Branch Settings
  │
  ▼
System Defaults (lowest)
```

---

## Sprint 0.5: Role Permission Matrix

### Roles

| Role | Code | Description |
|---|---|---|
| **Owner** | `OWNER` | Full access, all branches, all settings, billing |
| **Admin** | `ADMIN` | Branch-level full access, staff management, no billing |
| **Receptionist** | `RECEPTIONIST` | Bookings CRUD, client management, walk-in, no settings |
| **Stylist** | `STYLIST` | Own bookings view, status update, client notes |
| **Viewer** | `VIEWER` | Read-only calendar, no modifications |

### Permission Matrix

| Permission | Owner | Admin | Receptionist | Stylist | Viewer |
|---|---|---|---|---|---|
| **Calendar View** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create Booking** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Edit Booking** | ✅ | ✅ | ✅ | Own only | ❌ |
| **Cancel Booking** | ✅ | ✅ | ✅ | Own only | ❌ |
| **Reschedule Booking** | ✅ | ✅ | ✅ | Own only | ❌ |
| **Change Status** (check-in, complete) | ✅ | ✅ | ✅ | Own only | ❌ |
| **Mark No-Show** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Walk-in** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View All Staff Schedule** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View Own Schedule** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manage Resources** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage Staff Availability** | ✅ | ✅ | ❌ | Own only | ❌ |
| **Manage Leave** | ✅ | ✅ | ❌ | Request only | ❌ |
| **Calendar Settings** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage Holidays** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Block Time Slots** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View Waitlist** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Manage Waitlist** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **AI Scheduler Access** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Undo/Redo** | ✅ | ✅ | ✅ | Own only | ❌ |
| **Export Calendar** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Integration Sync** (Google/Outlook) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Payments** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Process Payments** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Delete Booking** | ✅ | ❌ | ❌ | ❌ | ❌ |

### Enforcement Strategy

```
Backend: @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('calendar:create')
  @Post('/bookings')
  create() { ... }

Frontend: *ngIf="canCreateBooking()" or *appPermission="'calendar:create'"
```

Permission strings format: `{resource}:{action}`.
Actions: `create`, `read`, `update`, `delete`, `cancel`, `reschedule`, `manage`, `approve`.

---

## Sprint 0.5: Calendar Event Bus

### Event Architecture

```
CalendarService / Backend
  │
  ├── EventEmitter (NestJS built-in)
  │     ├── onModuleInit → register handlers
  │     └── emit(event) → all handlers receive
  │
  ├── WebSocket Gateway (socket.io)
  │     └── broadcast(event, payload) → connected clients
  │
  └── Webhook Dispatcher (optional)
        └── POST configured URLs for external systems
```

### Published Events (Backend → Frontend)

| Event Name | Payload | When Fired |
|---|---|---|
| `booking.created` | `{ bookingId, clientId, staffId, startTime, endTime }` | POST /bookings success |
| `booking.updated` | `{ bookingId, changes: [...] }` | PATCH /bookings/:id |
| `booking.cancelled` | `{ bookingId, reason, cancelledBy }` | PATCH /bookings/:id/cancel |
| `booking.rescheduled` | `{ bookingId, oldStart, newStart, oldEnd, newEnd }` | PATCH /bookings/:id/reschedule |
| `booking.status.changed` | `{ bookingId, fromStatus, toStatus, changedBy }` | Any status transition |
| `booking.checked_in` | `{ bookingId, arrivedAt }` | Status → CHECKED_IN |
| `booking.in_progress` | `{ bookingId, startedAt }` | Status → IN_PROGRESS |
| `booking.completed` | `{ bookingId, completedAt }` | Status → COMPLETED |
| `booking.no_show` | `{ bookingId, markedAt }` | Status → NO_SHOW |
| `booking.archived` | `{ bookingId }` | Status → ARCHIVED |
| `booking.conflict.detected` | `{ bookingId, conflictType, details }` | Conflict found during create/reschedule |
| `slot.reserved` | `{ slotKey, userId, ttl }` | POST /bookings/reserve |
| `slot.released` | `{ slotKey, userId }` | Reservation TTL expired or cancelled |
| `resource.status.changed` | `{ resourceId, oldStatus, newStatus }` | Resource state transition |
| `resource.maintenance.scheduled` | `{ resourceId, startTime, endTime }` | Maintenance created |
| `staff.availability.updated` | `{ staffId, changes }` | Staff availability changed |
| `staff.leave.created` | `{ staffId, startDate, endDate, type }` | Leave approved |
| `staff.leave.cancelled` | `{ staffId, leaveId }` | Leave removed |
| `waitlist.entry.added` | `{ entryId, clientId, serviceName }` | POST waitlist |
| `waitlist.entry.fulfilled` | `{ entryId, bookingId }` | Waitlist → Booking conversion |
| `waitlist.entry.removed` | `{ entryId, reason }` | Waitlist entry removed |
| `ai.suggestion.ready` | `{ staffId, date, suggestionCount }` | AI suggestions computed |
| `calendar.settings.updated` | `{ branchId, changedKeys }` | Settings changed |
| `calendar.view.refresh` | `{ reason, dateRange }` | Forced refresh (e.g. after undo) |

### Subscribed Events (Frontend)

| Event | Handler |
|---|---|
| `booking.created` | Reload calendar data for affected date range |
| `booking.updated` | Update single booking in local cache + UI |
| `booking.cancelled` | Remove/update booking chip + update summary KPIs |
| `booking.rescheduled` | Move booking chip to new time slot |
| `booking.status.changed` | Update chip color + summary KPI counts |
| `booking.no_show` | Show toast + play sound (if enabled) |
| `booking.checked_in` | Highlight chip + show arrival toast |
| `booking.completed` | Remove from active view or dim chip |
| `resource.status.changed` | Update resource list UI |
| `staff.leave.created` | Re-check availability for affected date |
| `slot.reserved` | Gray out slot in grid (other users) |
| `slot.released` | Restore slot to AVAILABLE |
| `waitlist.entry.fulfilled` | Remove from waitlist panel |
| `calendar.view.refresh` | Full reload (used after undo/redo) |

### WebSocket Channel Layout

```
Channel: /calendar/{branchId}
  Events: all booking.*, resource.*, slot.*, waitlist.*, calendar.*

Channel: /user/{userId}/notifications
  Events: booking.checked_in, booking.cancelled, waitlist.entry.fulfilled

Channel: /admin/{branchId}
  Events: staff.availability.*, staff.leave.*, calendar.settings.*
```

### Client Event Bus (Frontend)

```typescript
// Injectable service wrapping socket.io + local event system
@Injectable({ providedIn: 'root' })
class CalendarEventBus {
  private socket: io.Socket;
  private localEvents = new Subject<CalendarEvent>();

  // Subscribe to any event
  on(eventName: string): Observable<CalendarEvent>;

  // Subscribe to events matching a pattern (e.g. 'booking.*')
  onPattern(pattern: string): Observable<CalendarEvent>;

  // Emit a local event (for undo/redo, no server broadcast)
  emitLocal(event: CalendarEvent): void;

  // Connect to branch channel
  connect(branchId: string): void;
}
```

---

## Sprint 0.5: Undo / Redo Architecture

### Command Pattern

Every mutable operation is wrapped as a Command object:

```typescript
interface Command {
  readonly id: string;
  readonly type: CommandType;
  readonly timestamp: number;
  readonly userId: string;
  readonly description: string;    // e.g. "Created booking for John Doe"
  readonly affectedBookingIds: string[];

  // Execute the command (for redo)
  execute(): Promise<void>;

  // Reverse the command (for undo)
  undo(): Promise<void>;
}

type CommandType =
  | 'CREATE_BOOKING'
  | 'UPDATE_BOOKING'
  | 'CANCEL_BOOKING'
  | 'RESCHEDULE_BOOKING'
  | 'CHANGE_STATUS'
  | 'BLOCK_SLOT'
  | 'ASSIGN_RESOURCE'
  | 'RELEASE_RESOURCE'
  | 'CREATE_WALKIN';
```

### Command History Stack

```
CalendarUndoRedoService
  ├── undoStack: Command[]       (max 50, per user session)
  ├── redoStack: Command[]       (cleared on new command)
  │
  ├── push(command): void        → push to undoStack, clear redoStack
  ├── undo(): Promise<Command>   → pop undoStack, execute undo(), push to redoStack
  ├── redo(): Promise<Command>   → pop redoStack, execute execute(), push to undoStack
  ├── canUndo: boolean
  ├── canRedo: boolean
  └── clear(): void              → on branch switch or full reload
```

### Command Implementations

```typescript
class CreateBookingCommand implements Command {
  constructor(private bookingData: CreateBookingDto) {}

  async execute(): Promise<void> {
    // POST /api/bookings
    // Store returned bookingId for undo
  }

  async undo(): Promise<void> {
    // PATCH /api/bookings/:id/cancel with reason "Undone by user"
    // Or DELETE /api/bookings/:id (hard delete, based on policy)
  }
}

class CancelBookingCommand implements Command {
  constructor(private bookingId: string, private originalStatus: string) {}

  async execute(): Promise<void> {
    // PATCH /api/bookings/:id/cancel
  }

  async undo(): Promise<void> {
    // PATCH /api/bookings/:id/status → originalStatus
    // Restore original startTime/endTime if modified
  }
}

class RescheduleBookingCommand implements Command {
  constructor(
    private bookingId: string,
    private originalStart: string,
    private originalEnd: string,
    private newStart: string,
    private newEnd: string,
  ) {}

  async execute(): Promise<void> {
    // PATCH /api/bookings/:id/reschedule with new times
  }

  async undo(): Promise<void> {
    // PATCH /api/bookings/:id/reschedule back to original times
  }
}

class ChangeStatusCommand implements Command {
  constructor(
    private bookingId: string,
    private fromStatus: string,
    private toStatus: string,
  ) {}

  async execute(): Promise<void> {
    // PATCH /api/bookings/:id/status → toStatus
  }

  async undo(): Promise<void> {
    // PATCH /api/bookings/:id/status → fromStatus
  }
}
```

### Undo/Redo Constraints

| Operation | Undoable | Notes |
|---|---|---|
| CREATE_BOOKING | ✅ | Cancels (soft) or deletes (hard) the booking |
| UPDATE_BOOKING | ✅ | Restores original field values |
| CANCEL_BOOKING | ✅ | Restores to previous status (unless COMPLETED) |
| RESCHEDULE_BOOKING | ✅ | Reverts to original time slot |
| CHANGE_STATUS | ✅ | Reverts to previous status |
| BLOCK_SLOT | ✅ | Removes block |
| ASSIGN_RESOURCE | ✅ | Unassigns resource |
| CREATE_WALKIN | ✅ | Same as CREATE_BOOKING |
| DELETE_BOOKING | ❌ | Not undoable (permanent) |
| PROCESS_PAYMENT | ❌ | Not undoable (financial) |

### UI Integration

```
Undo/Redo buttons in calendar toolbar:
  [↩ Undo] [↪ Redo]    (disabled when stack empty)

Tooltip shows description of next action:
  "Undo: Created booking for John Doe"
  "Redo: Cancelled booking for Jane Smith"

Keyboard shortcuts:
  Ctrl+Z → undo()
  Ctrl+Shift+Z / Ctrl+Y → redo()

Toast notification after undo/redo:
  "Booking cancelled. [Undo] [Dismiss]"
```

### Persistence Strategy

| Context | Storage | Scope |
|---|---|---|
| Current session | In-memory (service instance) | Per user session |
| Page refresh | `sessionStorage` (serialized Command[]) | Survives F5 |
| Cross-tab | N/A — cleared on new session | — |
| Long-term | N/A — commands are ephemeral | — |

---

## Sprint 0.5: Calendar Filters Architecture

### Filter Categories

| Category | Filters | Backend Param |
|---|---|---|
| **Time** | Date range, view mode (day/week/month) | `date`, `startDate`, `endDate`, `view` |
| **Branch** | Selected branch(es) | `branchId` |
| **Staff** | Selected staff, multi-select | `staffId` |
| **Resource** | Resource type, resource ID | `resourceId`, `type` |
| **Status** | Booking status filter | `status` |
| **Client** | Client name/ID search | `clientId` |
| **Service** | Service category, service ID | `serviceId` |
| **Search** | Free text (client name, phone, booking title) | `q` |

### Filter State Shape

```typescript
interface CalendarFilterState {
  date: string;            // ISO date string
  view: 'day' | 'week' | 'month';
  branchId: string;
  staffId: string[];       // multi-select
  resourceId: string[];
  resourceType: string[];
  status: string[];
  clientId: string;
  serviceId: string[];
  search: string;
}
```

### Filter Pipeline

```
User changes filter
       │
       ▼
Update filter state (local state service)
       │
       ├──► Serialize to URL query params (optional)
       │
       ▼
Debounce (300ms for text, immediate for selects)
       │
       ▼
Build API query params from active filters
       │
       ▼
Cancel in-flight requests (switchMap)
       │
       ▼
Fetch calendar data with new params
       │
       ▼
Update UI bindings (async pipe / signal)
```

### URL Sync Strategy

```
URL format (optional, opt-in):
  /calendar?view=week&date=2026-07-06&branchId=xxx&staffId=yyy,zzz&status=CONFIRMED

Read on init:
  route.queryParams → filterState

Write on change:
  filterState → router.navigate([], { queryParams, replaceUrl: true })
```

### Filter Persistence

| Scope | Storage | Cleared On |
|---|---|---|
| Session | In-memory `CalendarFilterService` | Browser tab close |
| Cross-session (optional) | `localStorage` key `calendar_filters_${branchId}` | Manual reset |
| Shareable | URL query params | Navigation |

### Active Filter Indicator

```text
Filters: [Branch: Downtown ✕] [Staff: Sarah ✕] [Status: Confirmed ✕] [Clear All]
         ↑ chip pill for each active filter, click ✕ to remove
```

### Filter Change Events

```
filter.changed
  └─► Event: 'calendar.filters.updated'
       └─► Payload: { oldState, newState, changedKeys: ['branchId', 'status'] }

filter.cleared
  └─► Event: 'calendar.filters.cleared'
       └─► Payload: { previousState }
```

---

## Sprint 0.5: Future Integrations

### Integration Architecture

```
CalendarEngine (core)
       │
       ├── IntegrationManager
       │     ├── GoogleCalendarAdapter
       │     ├── OutlookCalendarAdapter
       │     ├── AppleCalendarAdapter
       │     ├── WhatsAppAdapter
       │     ├── EmailAdapter
       │     ├── SMSAdapter
       │     └── AiSchedulerAdapter
       │
       ├── SyncQueue
       │     ├── pending: SyncJob[]
       │     ├── rateLimiter per provider
       │     └── retry with exponential backoff
       │
       └── WebhookRegistry
             ├── registered webhooks per branch
             └── event → webhook dispatch
```

### Google Calendar Integration

| Direction | Flow | Sync Method |
|---|---|---|
| Inbound | Import Google events → Calendar blocks | OAuth 2.0, watch channel (webhook) |
| Outbound | Push Ambition bookings → Google Calendar | OAuth 2.0, events.insert / update / delete |
| Recurring | Sync recurring booking templates | Recurring event series |

```
Sync logic:
  1. User authenticates via OAuth 2.0 (Google Calendar API scope)
  2. Store refresh token securely (encrypted in DB)
  3. On booking create → POST Google Calendar Event
     - Store googleEventId on Booking model
  4. On booking update → PATCH Google Calendar Event
  5. On booking cancel → DELETE Google Calendar Event
  6. On booking reschedule → PATCH Google Calendar Event (move time)
  7. Periodic sync (every 15 min) → reconcile differences
```

### Outlook Calendar Integration

| Direction | Flow | Sync Method |
|---|---|---|
| Inbound | Import Outlook events → Calendar blocks | Microsoft Graph API, change notifications |
| Outbound | Push Ambition bookings → Outlook Calendar | Graph API events endpoint |

```
Auth flow:
  1. Azure AD app registration
  2. OAuth 2.0 with Microsoft Graph Calendar.ReadWrite scope
  3. Same lifecycle as Google (create/update/delete on booking events)
```

### Apple Calendar Integration

| Direction | Flow | Sync Method |
|---|---|---|
| Outbound | Publish CalDAV feed (read-only) | CalDAV server URL |
| Outbound | Push via EWS (Exchange Web Services) | EWS credentials |

```
Strategy:
  - Generate read-only .ics feed URL per staff member
  - Staff subscribes in Apple Calendar via URL
  - Push model not feasible due to Apple's CalDAV-only approach
  - Alternative: use a third-party sync service (e.g. Zapier)
```

### WhatsApp Integration

| Purpose | Trigger | Template |
|---|---|---|
| Booking confirmation | Booking created | "Hi {client}, your appointment at {branch} on {date} at {time} is confirmed." |
| Booking reminder | 24h before start | "Reminder: You have an appointment tomorrow at {time} with {staff}." |
| Check-in prompt | 15min before start | "Your appointment at {branch} starts soon. Reply 1 to check in." |
| Reschedule notification | Booking rescheduled | "Your appointment has been moved to {newTime}. Tap to confirm." |
| Cancellation notice | Booking cancelled | "Your appointment on {date} has been cancelled." |
| Waitlist offer | Slot opens for waitlist | "A slot opened at {time} with {staff}. Reply YES to claim." |
| Post-visit feedback | After COMPLETED | "Thanks for visiting! Rate your experience 1-5." |

```
Implementation via:
  - WhatsApp Business API (official) or
  - Twilio WhatsApp API (simpler, sandbox then production)
```

### Email Integration

| Purpose | Trigger | Template |
|---|---|---|
| Booking invoice | Booking completed + PAID | PDF attachment with service breakdown |
| Receipt | Payment processed | Payment confirmation with amount |
| Appointment summary | Day-start (batch) | List of today's appointments for staff |
| Weekly report | Every Monday | Staff utilization, revenue, new clients |
| Promotional | Manual trigger | Seasonal offers, package deals |

```
Implementation:
  - SMTP via existing mail provider (SendGrid / AWS SES / Mailgun)
  - HTML templates with liquid/mustache syntax
  - PDF generation via puppeteer or pdfkit
```

### SMS Integration

| Purpose | Trigger | Notes |
|---|---|---|
| Booking reminder | 24h before | Same as WhatsApp fallback |
| No-show follow-up | NO_SHOW marked | "We missed you! Reschedule here: {link}" |
| Promotional | Manual | Limited to opt-in clients only |

```
Implementation:
  - Twilio SMS API
  - Rate limited: max 3 SMS per client per day
  - Opt-out: STOP keyword processing
```

### AI Scheduler Integration

The existing AI scheduler (`/api/ai-scheduler/`) provides:

| Feature | Endpoint | Description |
|---|---|---|
| **Slot suggestions** | `GET /ai-scheduler/suggest` | Best time slots based on historical patterns |
| **Day optimization** | `GET /ai-scheduler/optimize-day` | Reorder bookings to minimize gaps |
| **Waitlist matching** | `GET /waitlist/suggestions` | Match waitlist entries to available slots |
| **Waitlist autofill** | `POST /waitlist/autofill` | Automatically assign waitlist to slots |

Proposed enhancements:

| Feature | Description |
|---|---|
| **No-show risk scoring** | ML model predicts no-show probability based on history |
| **Staff scheduling optimization** | Suggest optimal staff allocation for walk-ins |
| **Peak hour prediction** | Forecast busy periods for proactive staffing |
| **Revenue optimization** | Suggest premium service upselling opportunities |
| **Client preference learning** | Learn preferred staff/time/services per client |

### Sync Queue & Conflict Resolution

```
SyncJob:
  - id, provider, action (CREATE/UPDATE/DELETE), entityType, entityId
  - status: PENDING / IN_PROGRESS / COMPLETED / FAILED
  - retryCount, maxRetries (3)
  - lastError, createdAt, completedAt

Conflict Resolution:
  1. Timestamp wins: last-modified wins
  2. Direction: Ambition is source of truth (outbound sync)
  3. For inbound: imported events become BLOCKED slots (not BOOKED)
  4. Manual override: user can accept/reject individual sync changes
```

### Integration Settings Per Branch

```json
{
  "googleCalendar": {
    "enabled": false,
    "clientEmail": "",
    "calendarId": "primary"
  },
  "outlookCalendar": {
    "enabled": false,
    "tenantId": "",
    "calendarId": ""
  },
  "appleCalendar": {
    "enabled": false,
    "feedUrl": ""
  },
  "whatsapp": {
    "enabled": false,
    "phoneNumberId": "",
    "businessAccountId": ""
  },
  "email": {
    "enabled": true,
    "provider": "sendgrid",
    "fromAddress": "noreply@ambitionsalon.com",
    "reminderEnabled": true,
    "reminderHours": [24, 2],
    "invoiceEnabled": true
  },
  "sms": {
    "enabled": false,
    "provider": "twilio",
    "reminderEnabled": true,
    "reminderHours": [24]
  },
  "aiScheduler": {
    "enabled": true,
    "autoSuggest": false,
    "autoOptimize": false,
    "noShowModelVersion": "v1"
  }
}
```

---
