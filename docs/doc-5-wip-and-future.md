# Work In Progress & Future Plans

## PLMun Inventory Nexus — Current Status, Known Issues & Roadmap
### BSCS 3D · Software Engineering 1 · AY 2025–2026

---

## 1. Project Status Overview

### 1.1 Timeline & Milestones

| Milestone | Date | Status |
|-----------|------|--------|
| Sprint 0: Requirements & Setup | Jan 6 – Jan 19 | ✅ Completed |
| Sprint 1: Authentication | Jan 20 – Feb 2 | ✅ Completed |
| Sprint 2: Inventory CRUD | Feb 3 – Feb 16 | ✅ Completed |
| **1st System Checking** | **Feb 9** | **✅ Passed** |
| Sprint 3: Request Workflow | Feb 17 – Mar 2 | ✅ Completed |
| Sprint 4: Reports & Polish | Mar 3 – Apr 5 | ✅ Completed |
| **2nd System Checking** | **Apr 6** | **🔄 In Progress** |
| Final Defense | Late April | ⏳ Upcoming |

### 1.2 Feature Completion Matrix

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| **Auth** | Login with JWT | ✅ Done | Access + refresh tokens |
| | Registration | ✅ Done | Auto-assigns STUDENT role |
| | Progressive lockout | ✅ Done | 5 attempts → 15 min lock |
| | Token refresh (silent) | ✅ Done | Mutex queue for concurrent requests |
| | Profile management | ✅ Done | Edit name, email, phone, avatar, password |
| **Inventory** | Add item with image | ✅ Done | Multipart/form-data upload |
| | Edit item (partial update) | ✅ Done | PATCH support |
| | Delete item | ✅ Done | Hard delete with confirmation modal |
| | Change status | ✅ Done | 4 statuses + notes + maintenance ETA |
| | Browse with filters | ✅ Done | Search, category, status filters |
| | Card/Table view toggle | ✅ Done | Preference saved in localStorage |
| | Stock level grouping | ✅ Done | Out of Stock → Low Stock → Normal |
| | QR code generation | ✅ Done | Per-item QR with print support |
| | Access level filtering | ✅ Done | Backend filters by user role |
| | Favorites | ✅ Done | Client-side localStorage |
| | RBAC (Staff-only edit/delete) | ✅ Fixed | Was FacultyOnly — changed to StaffOnly (Sprint 4 bugfix) |
| **Requests** | Submit borrow request | ✅ Done | With item snapshot and purpose |
| | Approve with atomic stock deduction | ✅ Done | F() expression for race-condition safety |
| | Reject with reason | ✅ Done | Reason sent in notification |
| | Release (physical handover) | ✅ Done | Marks COMPLETED |
| | Return with stock restoration | ✅ Done | Atomic increment |
| | Overdue detection | ✅ Done | Flags user, increments counter |
| | Cancel (by requester) | ✅ Done | Only PENDING requests |
| | Self-approval prevention | ✅ Done | Backend guard |
| | Consumable items (non-returnable) | ✅ Done | Auto-completes on approval |
| | Comments/discussion thread | ✅ Done | With notifications |
| | Soft delete (clear history) | ✅ Done | is_cleared flag |
| **Notifications** | Auto-generate on status change | ✅ Done | 7 trigger event types |
| | 24-hour deduplication | ✅ Done | Prevents spam |
| | Polling (30-second interval) | ✅ Done | Bell icon with badge count |
| | Mark as read (single/all) | ✅ Done | |
| **Reports** | Dashboard stats & charts | ✅ Done | 5 stat cards + 2 charts |
| | CSV export | ✅ Done | UTF-8 BOM for Excel compatibility |
| | PDF export | ✅ Done | jsPDF + autotable, branded |
| | Print report | ✅ Done | Clean print-optimized layout |
| | PDF title fix | ✅ Fixed | Was "Report" → now "Inventory Items List" (Sprint 4 bugfix) |
| **Admin** | User management page | ✅ Done | List, role assignment, delete |
| | Activate/deactivate users | ✅ Done | Reversible |
| | Audit log viewer | ✅ Done | 14 action types, IP tracking |
| | System maintenance | ✅ Done | Clear completed request history |
| **UI** | Dark mode (Light/Dark/System) | ✅ Done | Follows OS preference |
| | Responsive design | ✅ Done | Mobile card view forced |
| | Settings persistence | ✅ Done | Zustand + localStorage |
| | Animated login page | ✅ Done | Split panel, floating labels |

---

## 2. Bugs Fixed in Sprint 4

### 2.1 Bug: Faculty Could Edit/Delete Items (Critical — Security)

**Problem:** The `<FacultyOnly>` component was used to wrap Edit, Delete, Add, and Status Change buttons in the Inventory page. This meant Faculty members (level 1) could perform Staff-level operations.

**Root Cause:** `FacultyOnly` checks `has_min_role('FACULTY')` which passes for Faculty, Staff, and Admin. It should have been `StaffOnly` which checks `has_min_role('STAFF')`.

**Files Changed:**
- `frontend/src/pages/Inventory.jsx` — Changed all `<FacultyOnly>` to `<StaffOnly>` on management buttons
- `frontend/src/components/inventory/InventoryItemCard.jsx` — Changed `<FacultyOnly>` to `<StaffOnly>` on card action buttons
- Removed unused `FacultyOnly` import from Inventory.jsx

**Impact:** Faculty members can now only VIEW items and SUBMIT requests. They cannot Add, Edit, Delete, or change item status. The backend permission `IsStaffOrAbove` was already correct, so even if the UI bug was exploited, the backend would have returned 403.

### 2.2 Bug: PDF Export Title Said "Inventory Report" (Minor — Usability)

**Problem:** The PDF export from the Inventory page had the title "Inventory Report" and exported the wrong data columns (report-style instead of inventory items).

**Root Cause:** The `handleExportPDF()` function was using report-oriented data instead of the inventory items array.

**Fix:** Changed the export to:
- Title: "PLMun Inventory Items List"
- Columns: Name, Category, Quantity, Status, Location, Priority, Date Added
- Data source: current filtered inventory items (not requests)

---

## 3. Known Issues & Limitations

### 3.1 Current Known Issues

| Issue | Severity | Description | Workaround |
|-------|----------|-------------|-----------|
| Media files lost on redeploy | Medium | Render uses ephemeral disk — uploaded images (avatars, item photos) are not persisted across deployments | Re-upload images after each deploy. Future fix: migrate to cloud storage (S3/Cloudinary) |
| No email notifications | Low | System only has in-app notifications. Users must be logged in to see them | Users check the app regularly. Polling interval is 30 seconds |
| No real-time updates (WebSocket) | Low | Uses 30-second polling instead of WebSocket push notifications | Acceptable for the current scale (6-person team). Data is at most 30 seconds stale |
| Pagination is client-side only | Low | All items fetched in one API call, then paginated on the frontend | Works fine for current dataset (~80 items). Would need server-side pagination for 10,000+ items |
| No offline support | Low | System requires active internet connection | Expected for a web-based system. All operations need server confirmation |

### 3.2 Technical Debt

| Item | Description | Priority |
|------|-------------|----------|
| Login.jsx is 78KB | The animated login page is the largest file. Could be split but the animations and state are tightly coupled | Low — works correctly, just large |
| Tagalog code comments | Some backend code has Tagalog comments (e.g., "i-filter yung items"). Should be standardized to English for professional consistency | Low — does not affect functionality |
| No API rate limiting enforced | `django-ratelimit` is installed but not actively applied to endpoints beyond login | Medium — should add rate limits to all write endpoints |
| Test coverage is partial | Unit tests cover role utilities but not all API endpoints or components | Medium — should add more integration tests before final defense |
| No pagination on backend | All items returned in one response. `PAGE_SIZE = 50` is configured but not enforced on all endpoints | Low — acceptable for current scale |

---

## 4. Future Improvements — Post-Defense Roadmap

### 4.1 Short-Term (Before Final Defense)

| Improvement | Description | Effort |
|-------------|-------------|--------|
| Increase test coverage | Add API integration tests for approve/reject/return flows | 2 days |
| Add API rate limiting | Apply `@ratelimit` to POST endpoints (prevent abuse) | 1 day |
| Standardize code comments | Convert Tagalog comments to English | 1 day |
| Prepare defense presentation | Script, slides, demo walkthrough | 2 days |

### 4.2 Long-Term (If Project Continues)

| Improvement | Description | Why |
|-------------|-------------|-----|
| **Cloud storage for media** | Migrate image uploads to AWS S3 or Cloudinary | Solve the ephemeral disk problem — images persist across deploys |
| **WebSocket notifications** | Replace 30-second polling with Django Channels + WebSocket | Real-time push notifications, reduces server load |
| **Email/SMS notifications** | Send email on approval/rejection/overdue using SendGrid or Twilio | Users notified even when not logged in |
| **Server-side pagination** | Return paginated API responses with cursor-based pagination | Handle 10,000+ items without performance degradation |
| **Barcode/QR scanner** | Use phone camera to scan QR codes for quick item lookup | Faster physical inventory audits |
| **Mobile app** | React Native or Flutter app using the same REST API | Better mobile experience than responsive web |
| **Multi-department support** | Separate inventories per department with cross-department lending | Support for multiple PLMun departments independently |
| **Maintenance scheduling** | Calendar integration for scheduled maintenance with reminders | Proactive maintenance instead of reactive |
| **Analytics dashboard v2** | Item utilization rates, borrow frequency heatmaps, forecasting | Data-driven inventory purchasing decisions |
| **Batch import** | Upload CSV of items to bulk-create inventory records | Faster initial data loading for new departments |
| **Approval chains** | Multi-level approvals (e.g., Faculty → Department Head → Staff) | More formal approval workflows for expensive items |

---

## 5. Lessons Learned

### 5.1 Technical Lessons

| Lesson | Context |
|--------|---------|
| **Always use atomic operations for stock management** | We initially used Python-level checks (`if item.quantity >= qty: item.quantity -= qty`) which has a race condition. Switching to F() expressions made it database-atomic. |
| **Denormalize data that needs to survive deletions** | Item names, usernames, and other referential data should be stored as snapshots when the relationship is created. Foreign keys can be SET_NULL but the readable name should remain. |
| **Frontend role guards are NOT security** | `<StaffOnly>` hides buttons but doesn't prevent API calls. Always enforce permissions on the backend too. We caught this when the FacultyOnly bug was discovered. |
| **Token refresh needs a mutex** | Without it, concurrent 401s cause multiple refresh attempts, race conditions, and unexpected logouts. The queue pattern is essential for SPAs. |
| **Test your permission matrix** | The `roles.test.js` file caught the ARCH-04 permission bug. Every permission combination should have a test case. |

### 5.2 Process Lessons

| Lesson | Context |
|--------|---------|
| **Start with the data model** | Getting the models right at Sprint 0 saved weeks of rework. The User, Item, and Request models were designed with all edge cases upfront (denormalization, soft delete, overdue tracking). |
| **Deploy early, deploy often** | We deployed to Render in Sprint 1 — not at the end. This caught the SSL redirect loop issue early and forced us to handle environment variables properly. |
| **Fix bugs in the same sprint** | The FacultyOnly and PDF export bugs were discovered and fixed in Sprint 4. Delaying would have left them for the defense demo. |
| **Documentation is not optional** | Creating DFDs, ERDs, and technical docs during development (not after) ensured they accurately reflected the system. Writing docs after would have missed implementation details. |

---

## 6. Documentation Index

All project documentation is stored in the `docs/` directory:

| File | Contents |
|------|----------|
| `doc-1-planning.md` | Project overview, problem statement, architecture, technology choices, user flows, UI prototypes, permissions matrix, security planning |
| `doc-2-backend-development.md` | Django models, API endpoints, permission classes, login flow, approval logic, return logic, notification dedup, deployment |
| `doc-3-frontend-development.md` | React architecture, state management, API interceptor, page implementations, role guards, dark mode, responsive design |
| `doc-4-testing-security-deployment.md` | Testing strategy, unit tests, security implementation (CSP, CORS, lockout, F()), deployment to Render |
| `doc-5-wip-and-future.md` | This file — completion status, bugs fixed, known issues, technical debt, future roadmap, lessons learned |
| `backend-documentation.md` | API reference — all endpoints, models, and serializers |
| `frontend-documentation.md` | Component library, hooks, services, utilities reference |
| `dfd-1 through dfd-6` | Data Flow Diagrams Level 1 for all 6 processes |
| `dfd-erd.html` | Interactive DFD Level 0 + ERD visualization |
| `diagrams.html` | System architecture and flow diagrams |
| `gantt.html` | Project Gantt chart with sprint timelines |
| `uiux-design.md` | UI/UX design system documentation |

---

*PLMun Inventory Nexus — Work In Progress & Future Plans*
*BSCS 3D · Software Engineering 1 · Prof. Mr. Melchor Paz*
*Academic Year 2025–2026*
