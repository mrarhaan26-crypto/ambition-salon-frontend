# Ambition Unisex Salon — Enterprise Features Implementation Plan

> **Status:** Ready for execution — follows existing architecture, no refactoring required
> **Scope:** Phase A (Core Enterprise), Phase B (AI/Optimization), Phase C (Real-time/Offline)
> **Stack:** Angular (standalone) + NestJS + Prisma/PostgreSQL

---

## EXECUTIVE SUMMARY

**Great news:** ~80% of the Prisma models for your enterprise roadmap already exist in `prisma/schema.prisma`. Several backend modules are partially implemented. The main gaps are:
1. **Calendar Sync providers** (Google/Outlook/Apple OAuth + sync logic)
2. **Online Booking Portal** (public-facing booking flow)
3. **Shift Planning** (backend + frontend)
4. **Offline Mode** (service worker + IndexedDB sync queue)
5. **Frontend components** for AI Optimization, Voice Booking, Real-time Collaboration
6. **WhatsApp Business** — already has backend; needs frontend integration

---

## PHASE A — CORE ENTERPRISE FEATURES (Priority ⭐⭐⭐⭐⭐)

### A1. Calendar Sync — Google / Outlook / Apple (CalDAV)

**Existing:**
- Prisma: `CalendarSyncToken`, `CalendarSyncLog` models ✅
- Backend: `calendar-sync` module (service, controller, DTOs) ✅
- Frontend: `calendar-sync.component.ts` with UI for 3 providers ✅

**Missing (Backend):**
| Provider | Files to Create | Key Logic |
|----------|----------------|-----------|
| **Google** | `calendar-sync/providers/google.provider.ts` | Google Calendar API v3, OAuth2, webhook via push notifications, token refresh |
| **Outlook** | `calendar-sync/providers/outlook.provider.ts` | Microsoft Graph API, OAuth2, subscription webhooks, token refresh |
| **Apple/CalDAV** | `calendar-sync/providers/caldav.provider.ts` | CalDAV RFC 4791, basic auth or app-specific password, periodic polling (no webhook) |
| **Common** | `calendar-sync/providers/base.provider.ts` | Abstract base class with `sync()`, `createEvent()`, `updateEvent()`, `deleteEvent()`, `handleWebhook()` |

**Backend Implementation Steps:**
```
1. Create provider interface + base class
2. Implement Google provider (OAuth URL, token exchange, watch/unwatch calendars)
3. Implement Outlook provider (MS Graph, subscription lifecycle)
4. Implement CalDAV provider (Sabre/DAV or custom XML, polling cron)
5. Add provider factory in CalendarSyncService
6. Wire webhook endpoints: /api/calendar-sync/webhook/google, /outlook, /caldav
7. Add sync conflict resolution (last-write-wins + manual override UI)
8. Add unit tests for each provider
```

**Missing (Frontend):**
- OAuth connect flow (redirect to provider, handle callback)
- Calendar selection UI after OAuth
- Sync status polling / real-time updates via WebSocket
- Conflict resolution modal

**API Contract (extend existing):**
```typescript
// POST /api/calendar-sync/connect
{ provider: 'google' | 'outlook' | 'apple', redirectUrl: string }
// GET /api/calendar-sync/callback/:provider?code=...&state=...
// POST /api/calendar-sync/sync/:provider { staffId, direction: 'push' | 'pull' | 'bidirectional' }
// GET /api/calendar-sync/calendars/:provider { staffId }
// POST /api/calendar-sync/disconnect/:provider { staffId }
```

**Dependencies to add (Backend_NestJS/package.json):**
```json
{
  "googleapis": "^130.0.0",
  "@microsoft/microsoft-graph-client": "^3.0.7",
  "ts-caldav": "^0.5.0",  // or use basic fetch + XML parsing
  "ics": "^3.5.0"  // for generating .ics files
}
```

---

### A2. WhatsApp Business API Integration

**Existing:**
- Prisma: `WhatsAppTemplate`, `WhatsAppMessage`, `WhatsAppLog` ✅
- Backend: `whatsapp` module (service, controller, DTOs) with template/text sending, booking confirmations, reminders, OTP, invoices, reviews, birthdays, cancellations, follow-ups ✅
- Frontend: `whatsapp.component.ts`, `whatsapp.models.ts`, `whatsapp.service.ts` ✅

**Missing:**
| Feature | Location | Work |
|---------|----------|------|
| **Webhook handler** | Backend `whatsapp.service.ts` | Add `handleIncomingMessage(payload)` for 2-way chat, status callbacks (sent/delivered/read/failed) |
| **Media support** | Backend + Frontend | Image/document/video messages, media upload to WhatsApp CDN |
| **Interactive messages** | Backend | Buttons, lists, catalog messages via template |
| **Session management** | Backend | 24-hour customer service window tracking |
| **Frontend chat UI** | Frontend `whatsapp.component.ts` | Real-time conversation view, agent assignment, quick replies |
| **Template management UI** | Frontend | Create/edit/submit templates, sync status from Meta |

**Backend Implementation:**
```typescript
// Add to WhatsAppService
async handleWebhook(payload: any) {
  // Verify signature (X-Hub-Signature-256)
  // Handle: messages, statuses, template_status_update
  // Update WhatsAppMessage status, create inbound MessageConversation
}
async sendInteractive(to: string, header: string, body: string, buttons: Button[], footer?: string)
async uploadMedia(file: Buffer, mimeType: string): Promise<string> // returns media_id
```

**Frontend Implementation:**
- Add WebSocket listener for real-time message updates
- Chat list with search/filter by client
- Message composer with template quick-insert
- Media preview (images, PDFs)

---

### A3. Online Booking Portal (Public-Facing)

**Existing:**
- Prisma: `BookingPortalSettings`, `OnlineBooking` ✅
- Backend: `public-booking` module (services, staff, slots, create booking) ✅
- Frontend: `book-online` feature (service, component) ✅

**Missing (Backend):**
| Feature | Work |
|---------|------|
| **Portal settings CRUD** | `BookingPortalSettingsService` with slug uniqueness, customization (colors, hero, rules) |
| **Deposit payment** | Integrate with payment gateway (Razorpay/Stripe) for `requireDeposit` + `depositPercent` |
| **Cancellation policy enforcement** | Auto-cancel/no-show logic based on `cancellationPolicy` + `cancellationWindow` |
| **Guest booking flow** | OTP verification for `requirePhone`/`requireEmail` |
| **Slot buffer/preparation time** | Respect `minAdvanceHours`, `slotDurationMin`, resource cleaning buffer |
| **Public API rate limiting** | Throttle `/api/public/*` endpoints |
| **SEO/meta tags** | Dynamic meta for each portal slug |

**Missing (Frontend):**
| Feature | Work |
|---------|------|
| **Portal builder UI** | Admin page: drag-drop hero, color picker, toggle settings, preview |
| **Public booking flow** | Multi-step: Service → Staff → Date/Time → Details → Confirm → Payment |
| **Client self-service** | View/cancel/reschedule own bookings via email link + token |
| **Embeddable widget** | `<ambition-booking-portal>` web component for external sites |

**API Extensions:**
```typescript
// Admin
GET/POST/PATCH /api/booking-portal/settings/:branchId
GET /api/booking-portal/:slug/public-config  // no auth

// Public
GET /api/public/booking/:slug/services
GET /api/public/booking/:slug/staff
GET /api/public/booking/:slug/slots?date=&staffId=&serviceId=
POST /api/public/booking/:slug/book  // create OnlineBooking + PaymentIntent
GET /api/public/booking/:slug/verify/:token  // email/sms verification
POST /api/public/booking/:slug/cancel/:id  // with token
```

---

### A4. Staff Leave Management

**Existing:**
- Prisma: `StaffLeave` with full enum (CASUAL, SICK, MEDICAL, VACATION, MATERNITY, PATERNITY, UNPAID, EMERGENCY, PUBLIC_HOLIDAY, HALF_DAY) ✅
- Backend: `leaves` module (CRUD, approve/reject/cancel, conflict detection, stats, today's leaves) ✅
- Frontend: Check `features/leaves/` or `features/calendar/leave*`

**Gap Analysis:** This feature appears **~90% complete** on backend. Frontend likely needs:
- Leave calendar view (month/week) with color-coded types
- Team leave overview for managers
- Leave balance tracking (accrual, carry-over)
- Integration with calendar (block slots during approved leave)
- Mobile-friendly leave request flow

**Quick Wins:**
1. Add leave balance fields to `User` model or new `LeaveBalance` model
2. Calendar integration: when leave approved → block `StaffAvailability` for those dates
3. Notification on status change (WhatsApp/email/in-app)

---

### A5. Shift Planning & Scheduling

**Existing:**
- Prisma: `ShiftTemplate`, `ShiftAssignment`, `ShiftSwap` ✅

**Missing (Backend):**
| Module | Files | Key Features |
|--------|-------|--------------|
| `shifts` | `shifts.module.ts`, `shifts.service.ts`, `shifts.controller.ts` | CRUD templates, assignments, swaps, conflicts, coverage reports |
| `shifts/dto` | `create-template.dto.ts`, `assign-shift.dto.ts`, `swap-request.dto.ts` | Validation |
| **Scheduler** | `shifts/scheduler.service.ts` | Auto-assign from templates, respect availability, fair distribution |

**Business Logic:**
- Templates: recurring patterns (weekly, bi-weekly, custom)
- Assignments: staff + date + template, with check-in/out tracking
- Swaps: request → approve/deny → notify both parties
- Coverage: validate minimum staff per role per shift
- Payroll export: hours worked per staff per period

**Frontend:**
- Shift calendar (weekly grid, drag-drop assignments)
- Template builder (visual)
- Swap request modal
- Coverage heatmap

---

### A6. Real-Time Collaboration (Multi-User Calendar Editing)

**Existing:**
- Prisma: `CollaborationSession`, `RealtimeEvent` ✅
- Backend: `real-time` module (session management, broadcast, heartbeats) ✅
- Frontend: `real-time` feature likely exists

**Missing:**
| Component | Work |
|-----------|------|
| **WebSocket Gateway** | NestJS `@WebSocketGateway` with rooms per `branchId`, auth via JWT handshake |
| **Event types** | `booking:created`, `booking:updated`, `booking:deleted`, `resource:changed`, `staff:status`, `leave:approved`, `cursor:move`, `selection:change` |
| **Conflict detection** | Server-side: reject concurrent edits to same booking; UI: show other user's cursor/selection |
| **Presence indicators** | Avatar badges on calendar showing who's viewing/editing what |
| **Offline sync queue** | See A7 |

**Implementation:**
```typescript
// real-time.gateway.ts
@WebSocketGateway({ cors: true, namespace: '/realtime' })
export class RealTimeGateway {
  @SubscribeMessage('joinBranch')
  handleJoinBranch(client: Socket, branchId: string) { ... }

  @SubscribeMessage('calendarEvent')
  handleCalendarEvent(client: Socket, event: RealtimeEvent) {
    this.server.to(event.branchId).emit(event.type, event.payload);
  }
}
```

---

### A7. Offline Mode (PWA + Background Sync)

**Existing:**
- Prisma: `OfflineQueue` model ✅

**Missing (Frontend - Primary Work):**
| Feature | Technology | Work |
|---------|------------|------|
| **Service Worker** | `@angular/service-worker` + Workbox | Cache app shell, API GET requests, fallback offline page |
| **IndexedDB Queue** | `idb` or `dexie.js` | Store mutations (POST/PATCH/DELETE) with metadata |
| **Background Sync** | Service Worker `sync` event | Replay queue when online, handle conflicts |
| **Optimistic UI** | Angular signals + local state | Immediate feedback, rollback on sync failure |
| **Conflict Resolution** | Custom merge logic | Last-write-wins + manual resolution for bookings |
| **Network Status** | `navigator.onLine` + heartbeat | Banner indicator, auto-retry |

**Data Model (IndexedDB):**
```typescript
interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'booking' | 'client' | 'walkin' | 'posSale' | 'leave';
  payload: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  serverId?: string;  // populated after successful sync
}
```

**Backend Support:**
- Idempotency keys on all mutation endpoints (`Idempotency-Key` header)
- `/api/sync/batch` endpoint for bulk replay
- Conflict response: `409 Conflict` with server state for merge

---

### A8. Native Mobile Apps (iOS/Android)

**Status:** **Out of scope for current backend/frontend repo.** Requires separate codebase.

**Options:**
| Approach | Pros | Cons |
|----------|------|------|
| **Capacitor** (wrap Angular PWA) | Single codebase, access native APIs | Limited performance, no true native UX |
| **React Native** | True native, large ecosystem | Separate codebase, different skills |
| **Flutter** | High performance, single codebase for iOS/Android/Web | New language (Dart), separate team |
| **Native (Swift/Kotlin)** | Best UX, platform features | 2 codebases, highest cost |

**Recommendation:** Start with **Capacitor** to ship PWA as app store apps quickly. Use `@capacitor/push-notifications`, `@capacitor/calendar`, `@capacitor/camera`. Later migrate to React Native/Flutter if needed.

**Shared API Contract:** All features above expose REST + WebSocket — mobile apps consume same endpoints.

---

## PHASE B — AI & OPTIMIZATION (Priority ⭐⭐⭐⭐)

### B1. AI Chair/Resource Optimization

**Existing:**
- Prisma: `ChairOptimization` ✅
- Backend: `AiOptimizationService.analyzeChairUtilization()` ✅

**Missing:**
- **Cron job** to run daily analysis + persist to `ChairOptimization`
- **Frontend dashboard** with heatmap, recommendations, one-click apply
- **Auto-reassignment** logic for underutilized chairs

---

### B2. AI Staff Optimization

**Existing:**
- Prisma: `StaffOptimization` ✅
- Backend: `AiOptimizationService.analyzeStaffUtilization()` ✅

**Missing:**
- Cron job + persistence
- Frontend: staff utilization board, idle alerts, shift suggestions

---

### B3. AI Revenue Optimization

**Existing:**
- Prisma: `RevenueOptimization` ✅
- Backend: `AiOptimizationService.getRevenueOptimization()` ✅

**Missing:**
- Dynamic pricing engine (integrate with `BillingRule` + `Service.price`)
- Promotion auto-trigger for off-peak hours
- Frontend: revenue optimizer panel

---

### B4. Occupancy Heatmap

**Existing:**
- Prisma: `OccupancyHeatmap` ✅
- Backend: `AiOptimizationService.generateHeatmap()` ✅

**Missing:**
- Cron job (hourly) to persist snapshots
- Frontend: real-time heatmap component (calendar view + resource grid)

---

### B5. Booking Prediction

**Existing:**
- Prisma: `BookingPrediction` ✅
- Backend: `AiOptimizationService.predictBookings()` ✅

**Missing:**
- Cron job (daily) for next 30 days
- Frontend: predicted vs actual chart, staffing recommendations

---

### B6. No-Show Prediction

**Existing:**
- Prisma: `NoShowPrediction` ✅
- Backend: `AiOptimizationService.predictNoShows()` ✅

**Missing:**
- **Automated actions**: auto-send reminder, double-book high-risk slots, require deposit
- Frontend: risk badges on calendar, bulk actions for high-risk bookings

---

### B7. Auto Waitlist Fill

**Existing:**
- Prisma: `WaitlistAutoFill` ✅
- Backend: `AiOptimizationService.autoFillWaitlist()` ✅

**Missing:**
- **Trigger**: hook into booking cancellation → call auto-fill
- **Notification**: WhatsApp/SMS/email to waitlisted client with deep link to confirm
- **Frontend**: waitlist panel with auto-fill status, manual override

---

### B8. Smart Double Booking Rules

**Existing:**
- Prisma: `DoubleBookingRule` ✅

**Missing:**
- **Backend validation**: in `BookingsService.create/update`, check rules before allowing overlap
- **Rule builder UI**: visual condition builder (service pattern, staff pattern, max overlap)
- **Frontend**: conflict warning with rule explanation

---

### B9. AI Service Route Optimization

**Existing:**
- Prisma: `ServiceRoute` ✅
- Backend: `AiOptimizationService.getServiceRoutes()`, `optimizeRoute()` ✅

**Missing:**
- **Multi-resource routing**: chain services across chairs/rooms/staff
- **Travel time**: buffer between resources
- **Frontend**: route builder, drag-drop reorder, revenue projection

---

### B10. Enterprise Resource Map (Floor Plan)

**Existing:**
- Prisma: `FloorPlan`, `FloorPlanElement` ✅

**Missing:**
- **Frontend editor**: Canvas/SVG drag-drop (chairs, rooms, equipment, walls)
- **Real-time status**: overlay booking status on floor plan (green/red/yellow)
- **Drag-to-book**: click resource on map → create booking

---

### B11. Voice Booking Assistant

**Existing:**
- Prisma: `VoiceCommand` ✅

**Missing:**
- **Speech-to-Text**: Web Speech API (browser) or Whisper API (server)
- **Intent parsing**: NLP to extract {service, staff, date, time, client}
- **Backend endpoint**: `POST /api/voice/process` → returns structured intent + confidence
- **Frontend**: Voice button on calendar, transcript preview, confirm/edit before booking

---

### B12. AI Receptionist

**Existing:**
- Prisma: `AIReceptionistLog` ✅
- Backend: `ai-receptionist` module (service, controller) ✅

**Missing:**
- **Channel connectors**: WhatsApp webhook, website chat widget, phone (Twilio)
- **Conversation flow**: greeting → intent → slot check → confirm → booking
- **Handoff**: escalate to human with context
- **Frontend**: conversation monitor, takeover UI

---

### B13. Predictive Analytics (Revenue Forecasting)

**Existing:**
- Prisma: `RevenuePrediction` ✅

**Missing:**
- **ML model**: train on historical data (seasonality, trends, events)
- **API**: `GET /api/predictions/revenue?period=monthly&horizon=90d`
- **Frontend**: forecast chart with confidence intervals, scenario planner

---

### B14. Smart Promotions Engine

**Existing:**
- Prisma: `SmartPromotion` ✅
- Backend: `AiOptimizationService.getSmartPromotions()`, `createSmartPromotion()` ✅

**Missing:**
- **Segmentation**: RFM, churn risk, birthday, VIP, inactive > 90d
- **A/B testing**: variant tracking, statistical significance
- **Frontend**: promotion builder, audience preview, performance dashboard

---

## PHASE C — REAL-TIME & OFFLINE (Priority ⭐⭐⭐)

### C1. Real-Time Collaboration (Full Implementation)

See **A6** above. Key deliverables:
1. NestJS WebSocket Gateway with JWT auth
2. Event types + TypeScript interfaces shared via `libs/shared-types`
3. Frontend: `RealTimeService` (Angular), presence indicators, cursor positions
4. Conflict resolution: operational transform (OT) or CRDT for booking edits

---

### C2. Offline Mode (Full Implementation)

See **A7** above. Key deliverables:
1. `@angular/service-worker` configuration
2. `OfflineQueueService` (IndexedDB + background sync)
3. Idempotency keys on all mutation endpoints
4. Conflict resolution UI

---

### C3. Mobile Push Notifications

**Backend:**
- `Notification` model exists ✅
- Add: `PushSubscription` model (endpoint, p256dh, auth, userId)
- Service: `PushService` (Web Push Protocol / VAPID)

**Frontend:**
- Request permission, register service worker push
- Handle `push` event in service worker
- Deep link to relevant screen (booking, chat, leave)

---

## IMPLEMENTATION SEQUENCE (Recommended)

### Sprint 1-2: Calendar Sync Providers
```
Week 1: Google provider (OAuth, webhook, sync)
Week 2: Outlook provider (MS Graph, subscription)
Week 3: CalDAV provider (polling)
Week 4: Frontend OAuth flow, calendar selection, conflict UI
```

### Sprint 3: Online Booking Portal Polish
```
Week 1: Portal settings CRUD, deposit integration
Week 2: Public booking flow + guest OTP
Week 3: Client self-service (view/cancel/reschedule)
Week 4: Embeddable widget, SEO, rate limiting
```

### Sprint 4: WhatsApp Business Completion
```
Week 1: Webhook handler (inbound, status callbacks)
Week 2: Interactive messages, media upload
Week 3: Frontend chat UI (real-time, agent assignment)
Week 4: Template management UI
```

### Sprint 5: Shift Planning
```
Week 1: Backend shifts module (templates, assignments, swaps)
Week 2: Scheduler service (auto-assign, coverage)
Week 3: Frontend shift calendar, template builder
Week 4: Swap requests, coverage heatmap, payroll export
```

### Sprint 6: Real-Time Collaboration
```
Week 1: WebSocket gateway, auth, rooms
Week 2: Event types, broadcast, presence
Week 3: Frontend presence, cursors, conflict detection
Week 4: Operational transform for booking edits
```

### Sprint 7: Offline Mode
```
Week 1: Service worker setup, caching strategy
Week 2: IndexedDB queue, optimistic updates
Week 3: Background sync, idempotency keys
Week 4: Conflict resolution UI, testing
```

### Sprint 8-10: AI Optimization Frontend + Cron Jobs
```
Week 1-2: AI Optimization dashboard (utilization, revenue, heatmap)
Week 3-4: No-show prediction + auto-actions
Week 5-6: Waitlist auto-fill + smart promotions
Week 7-8: Service routes, floor plan editor
Week 9-10: Voice booking, AI receptionist integration
```

---

## TECHNICAL DEBT TO ADDRESS (Parallel)

| Item | Priority | Effort |
|------|----------|--------|
| Add `JwtAuthGuard` to all controllers (Phase A1 in PHASED_PLAN) | ⭐⭐⭐⭐⭐ | 1 day |
| Replace `Float` money fields with `Decimal` (planned migration) | ⭐⭐⭐⭐ | 2 weeks |
| Add compound indexes (Phase D in PHASED_PLAN) | ⭐⭐⭐ | 3 days |
| Global exception filter + standard error shape | ⭐⭐⭐⭐ | 2 days |
| DTO validation for all endpoints (Phase C) | ⭐⭐⭐ | 1 week |
| Frontend model alignment (Phase B in PHASED_PLAN) | ⭐⭐⭐ | 2 weeks |

---

## FILE STRUCTURE ADDITIONS

### Backend (New/Extended)
```
Backend_NestJS/src/modules/
├── calendar-sync/
│   ├── providers/
│   │   ├── base.provider.ts
│   │   ├── google.provider.ts
│   │   ├── outlook.provider.ts
│   │   └── caldav.provider.ts
│   ├── calendar-sync.gateway.ts  (webhook endpoints)
│   └── cron/calendar-sync.cron.ts
├── booking-portal/
│   ├── booking-portal.service.ts
│   ├── booking-portal.controller.ts
│   ├── dto/
│   └── public-booking.service.ts (extend)
├── shifts/
│   ├── shifts.service.ts
│   ├── shifts.controller.ts
│   ├── shifts.module.ts
│   ├── dto/
│   └── scheduler.service.ts
├── real-time/
│   ├── real-time.gateway.ts
│   ├── events/
│   │   ├── booking.events.ts
│   │   ├── resource.events.ts
│   │   └── presence.events.ts
│   └── ot/booking-ot.service.ts
├── offline/
│   ├── offline.service.ts
│   ├── offline.controller.ts
│   └── dto/sync-batch.dto.ts
├── push/
│   ├── push.service.ts
│   ├── push.controller.ts
│   └── dto/subscribe.dto.ts
└── voice/
    ├── voice.service.ts
    ├── voice.controller.ts
    └── dto/process-voice.dto.ts
```

### Frontend (New/Extended)
```
Frontend_Angular/src/app/features/
├── calendar-sync/
│   ├── providers/
│   │   ├── google-oauth.component.ts
│   │   ├── outlook-oauth.component.ts
│   │   └── caldav-setup.component.ts
│   ├── sync-status.component.ts
│   └── conflict-resolver.component.ts
├── booking-portal/
│   ├── portal-builder/
│   │   ├── portal-builder.component.ts
│   │   ├── hero-editor.component.ts
│   │   ├── theme-picker.component.ts
│   │   └── settings-form.component.ts
│   ├── public-booking/
│   │   ├── booking-flow.component.ts
│   │   ├── steps/
│   │   └── verification.component.ts
│   └── client-portal/
│       ├── my-bookings.component.ts
│       └── booking-detail.component.ts
├── whatsapp/
│   ├── chat-list.component.ts
│   ├── chat-window.component.ts
│   ├── message-composer.component.ts
│   └── template-manager.component.ts
├── shifts/
│   ├── shift-calendar.component.ts
│   ├── template-builder.component.ts
│   ├── swap-requests.component.ts
│   └── coverage-heatmap.component.ts
├── real-time/
│   ├── presence.service.ts
│   ├── presence-indicator.component.ts
│   └── cursor-overlay.component.ts
├── offline/
│   ├── offline-queue.service.ts
│   ├── sync-indicator.component.ts
│   └── conflict-resolver.component.ts
├── ai-optimization/
│   ├── utilization-dashboard.component.ts
│   ├── revenue-optimizer.component.ts
│   ├── heatmap.component.ts
│   ├── no-show-panel.component.ts
│   ├── waitlist-auto-fill.component.ts
│   ├── service-route-builder.component.ts
│   └── floor-plan-editor.component.ts
├── voice/
│   ├── voice-booking.component.ts
│   └── transcript-preview.component.ts
└── push/
    └── push-permission.component.ts
```

---

## SHARED TYPES (New Library)

Create `libs/shared-types` (Nx workspace or simple npm package) for:
```typescript
// Real-time events
export interface RealtimeEvent<T = any> {
  type: string;
  branchId: string;
  userId: string;
  payload: T;
  timestamp: string;
}

// Calendar sync
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string;
  staffId?: string;
  clientName?: string;
  serviceName?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  source: 'internal' | 'google' | 'outlook' | 'apple';
  externalId?: string;
}

// Offline sync
export interface OfflineAction { ... }

// AI Optimization
export interface UtilizationData { ... }
export interface NoShowPrediction { ... }
```

---

## TESTING STRATEGY

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Backend Unit | Jest + Prisma mock | 80% services |
| Backend Integration | Testcontainers (PostgreSQL) | Critical paths |
| Frontend Unit | Jest + Angular Testing Library | 70% components |
| E2E | Playwright | Login, booking, calendar, POS, WhatsApp |
| Contract | Pact or OpenAPI validation | All public APIs |

---

## DEPLOYMENT CHECKLIST

- [ ] Environment variables for all providers (Google, Microsoft, Meta, CalDAV, Push VAPID)
- [ ] Webhook URLs configured in provider consoles (HTTPS required)
- [ ] Service worker registered, caching verified
- [ ] Database indexes created (run migration)
- [ ] Cron jobs scheduled (cron or BullMQ + Redis)
- [ ] Rate limiting on public endpoints
- [ ] Monitoring: Sentry (errors), Prometheus/Grafana (metrics), Logtail (logs)
- [ ] Backup strategy for PostgreSQL + offline queue

---

## RISK MITIGATION

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Provider API changes (Google, Meta, Microsoft) | Medium | High | Abstract providers, version pinning, monitoring |
| Webhook delivery failures | Medium | Medium | Retry with exponential backoff, dead letter queue |
| Offline conflict data loss | Low | High | Server-authoritative, manual resolution UI |
| Mobile PWA limitations (iOS push, background sync) | High | Medium | Capacitor native plugins, fallback to polling |
| Calendar sync conflicts (concurrent edits) | Medium | Medium | OT/CRDT, last-write-wins + user notification |
| WhatsApp Business policy changes | Low | High | Template pre-approval, fallback to SMS/email |

---

## APPROVAL REQUIRED

Before starting implementation, confirm:
1. [ ] **Calendar Sync providers priority order** (Google → Outlook → Apple)
2. [ ] **Payment gateway** for booking deposits (Razorpay/Stripe/Other)
3. [ ] **WhatsApp Business Account** verified (Meta Business Manager)
4. [ ] **Push notification** VAPID keys generated
5. [ ] **Mobile strategy** (Capacitor PWA vs separate native)
6. [ ] **Team capacity** for parallel sprints
7. [ ] **Migration window** for Decimal money fields + indexes

---

*Document Version: 1.0*  
*Generated: 2026-07-09*  
*Based on: PHASED_PLAN.md, PROJECT_AUDIT.md, prisma/schema.prisma, existing modules*