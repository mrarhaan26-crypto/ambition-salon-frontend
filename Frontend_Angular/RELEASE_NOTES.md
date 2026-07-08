# Release Notes — Ambition Unisex Salon v21.0.0

## Features

### Phase 6 — Booking Management
- **Kanban Board** — Drag-and-drop 6-column booking board (Pending/Confirmed/Checked-In/Completed/Cancelled/No-Show) with HTML5 drag-drop and real-time status updates.
- **Timeline/Gantt View** — Horizontal staff timeline with 7 AM–9 PM hour columns, current-time indicator, and color-coded booking blocks.
- **View Switcher** — Toggle between List, Kanban, and Timeline views in the Bookings module.

### Phase 7 — CRM / Client 360
- **Client 360 Panel** — Slide-out overlay with 10 tabs: Overview, Sales, Appointments, Packages, Memberships, Wallet, Rewards, Notes, Documents, Treatments.
- All tabs connected to real backend APIs for live data.

### Phase 8 — Point of Sale (POS)
- Full POS billing with product search, client selection, staff assignment.
- Split bills, multiple payment methods, tax/GST, discounts, receipts.

### Phase 9 — Inventory Management
- Product catalog with stock levels, categories, suppliers.
- Purchase orders, stock adjustments, low-stock alerts.

### Phase 10 — Reports & BI
- Revenue reports, booking analytics, client insights, staff performance.
- Advanced reports, dashboard analytics, data export.

### Phase 11 — Website Booking
- Public booking widget with step-by-step flow.
- Service selection, staff selection, time slot picker, OTP-less confirmation.

### Phase 12 — Staff Workspace
- Staff login portal with daily schedule, tasks, attendance tracking.
- Leave management, shift scheduling, commission tracking.

### Phase 13 — Automation
- Trigger-action rule engine (booking created, client birthday, etc.).
- Automated notifications, email/SMS templates, message center.

### Phase 14 — Roles & Security
- Business settings with branch management, role-based access.
- Audit logs for all user actions, data export for compliance.

### Phase 15 — Enterprise Polish
- **Lazy Loading** — All 48+ feature routes now lazy-loaded; initial bundle reduced from 1.74 MB → 541 kB (69% reduction).
- **PWA Support** — Service worker for offline caching, installable web app manifest, app icons for home screen.
- **Dark Mode** — Theme toggle with CSS custom properties, persisted to localStorage, respects system preference.
- **Animations** — Fade transitions between route changes for smooth navigation.
- **Accessibility** — Skip-to-content link, ARIA navigation roles, focus-visible outlines, semantic landmarks.
- **Responsive** — Mobile sidebar drawer, responsive grid layouts, touch-friendly controls.
- **White-Label** — Brand service for customizable business name, colors, and logo.
- **Code Cleanup** — Removed all console.log/debugger; strict TypeScript enabled; unused imports removed.

## Performance
- Initial bundle: **1.74 MB → 540.71 kB** (lazy loading)
- All 48+ feature components split into individual lazy chunks
- Production builds with AOT, optimization, and hashing

## Build
- `npm run build` — **0 errors, 0 warnings**
- Angular 20, TypeScript 5.8, strict mode enabled
