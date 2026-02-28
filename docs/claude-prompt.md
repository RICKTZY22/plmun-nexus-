# PROMPT FOR CLAUDE SONNET (Web) — PLMun Nexus Documentation Generator

Copy everything below the line and paste it into Claude Sonnet at claude.ai:

---

You are a professional academic document writer for a Software Engineering 1 class at Pamantasan ng Lungsod ng Muntinlupa (PLMun). I need you to create formal academic documentation papers (Phase 1: Requirements Gathering and Phase 2: System Planning Outline with Feasibility Study) for our system.

## DOCUMENT FORMAT REQUIREMENTS

- Use formal academic writing style (3rd person, professional tone)
- Font: Times New Roman, 12pt (indicate this in your output)
- Line spacing: 1.5
- Margins: 1 inch all sides
- Use proper heading hierarchy (bold headings, numbered sections)
- Tables should have borders and clear headers
- Bullet points should use round bullets (●)
- Sub-bullets should use dashes (–) or open circles (○)
- Include a title/cover page with the school header format:

```
PAMANTASAN NG LUNGSOD NG MUNTINLUPA
NBP, Reservation Muntinlupa City

SUPPLY AND FACILITY INVENTORY MANAGEMENT SYSTEM

In partial fulfillment of the requirements in
SOFTWARE ENGINEERING 1

Leader: Wagwag, Byron Scott G.
Members:
Bondame, Sean Allen G.
Dela Cruz, Charisse F.
Husain, Stephan Yder

Bachelor of Science in Computer Science – BSCS 3D

Mr. Melchor Paz
Software Engineering 1 Professor
```

---

## ABOUT OUR ACTUAL SYSTEM (USE THIS AS THE BASIS)

Our system is called **PLMun Inventory Nexus** — a full-stack web application for PLMun that manages inventory items, handles borrow/request workflows, and administers users, all governed by role-based access control (RBAC).

### TECH STACK (ACTUAL — use these exact technologies)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | React 18 | Component-based UI |
| Frontend Build | Vite 5 | Fast bundler & dev server |
| Routing | React Router v6 | SPA client-side routing |
| State Management | Zustand | Auth state with localStorage persistence |
| HTTP Client | Axios | API calls with JWT interceptors |
| Icons | Lucide React | SVG icon set |
| PDF Export | jsPDF + AutoTable | Client-side PDF generation |
| CSV Export | file-saver | Client-side CSV download |
| Backend Framework | Django 6.0 | Python web framework |
| API Layer | Django REST Framework | Serializers, ViewSets, Pagination |
| Authentication | SimpleJWT | JWT access + refresh tokens |
| CORS | django-cors-headers | Frontend/backend cross-origin access |
| API Docs | drf-spectacular | Auto Swagger + ReDoc generation |
| Rate Limiting | django-ratelimit | Brute-force protection on auth endpoints |
| Env Variables | python-dotenv | .env file management |
| Database | PostgreSQL 18 | Production database |
| Static Files | WhiteNoise | Serve static files without nginx |
| WSGI Server | Gunicorn | Production Python server |
| Frontend Deployment | Vercel | Static site hosting |
| Backend Deployment | Railway | Django + PostgreSQL hosting |

### ROLE HIERARCHY (4 levels, hierarchical — each higher role inherits lower role permissions)

| Role | Level | Permissions |
|------|-------|------------|
| Student | 0 | Submit borrow requests, view own requests, update own profile |
| Faculty | 1 | Everything Student can do + view dashboard, view inventory catalog |
| Staff | 2 | Everything Faculty can do + approve/reject requests, manage inventory (CRUD), generate reports |
| Admin | 3 | Everything Staff can do + manage users (CRUD, role changes, activate/deactivate), system settings, full access |

### PAGE ACCESS MATRIX

| Page | Student | Faculty | Staff | Admin |
|------|---------|---------|-------|-------|
| Login / Register | ✅ | ✅ | ✅ | ✅ |
| My Requests | ✅ | ✅ | ✅ | ✅ |
| Settings (own profile) | ✅ | ✅ | ✅ | ✅ |
| Dashboard | ❌ | ✅ | ✅ | ✅ |
| Inventory (view only) | ❌ | ✅ | ✅ | ✅ |
| Inventory (create/edit/delete) | ❌ | ❌ | ✅ | ✅ |
| Reports | ❌ | ❌ | ✅ | ✅ |
| Users Management | ❌ | ❌ | ❌ | ✅ |

### DATA MODELS (Actual database tables)

**USER model** (extends Django AbstractUser):
- id, username, email, first_name, last_name
- role (STUDENT | FACULTY | STAFF | ADMIN)
- department, student_id, avatar (image), phone
- is_active, is_flagged (for overdue returns), overdue_count
- date_joined, last_login
- Methods: has_min_role(), is_faculty_or_above, is_staff_or_above, is_admin

**ITEM model** (Inventory items):
- id, name, category (ELECTRONICS | FURNITURE | EQUIPMENT | SUPPLIES | OTHER)
- quantity, status (AVAILABLE | IN_USE | MAINTENANCE | RETIRED)
- location, description, image
- access_level (STUDENT | FACULTY | STAFF | ADMIN) — users only see items at or below their role level
- is_returnable (boolean)
- borrow_duration, borrow_duration_unit (MINUTES | HOURS | DAYS | MONTHS)
- status_note, status_changed_at, status_changed_by, maintenance_eta
- created_at, updated_at
- LOW_STOCK_THRESHOLD = 5
- Properties: is_low_stock (quantity ≤ 5), is_out_of_stock (quantity = 0)

**REQUEST model** (Borrow/supply requests):
- id, item (FK to Item), item_name (denormalized snapshot)
- requested_by (FK to User), quantity, purpose
- status (PENDING | APPROVED | REJECTED | COMPLETED | RETURNED | CANCELLED)
- priority (LOW | NORMAL | HIGH)
- request_date, expected_return
- approved_by (FK to User), approved_at, rejection_reason, returned_at
- created_at, updated_at

**COMMENT model** (on requests):
- id, request (FK), author (FK to User), text, created_at

**NOTIFICATION model**:
- id, recipient (FK to User), sender (FK to User), request (FK)
- type (COMMENT | STATUS_CHANGE | REMINDER | OVERDUE)
- message, is_read, created_at

**AUDIT_LOG model** (System-wide audit trail):
- id, action (Login | Logout | Login Failed | Register | Profile Update | Password Changed | Item Created | Item Updated | Item Deleted | Request Created | Request Approved | Request Rejected | Item Returned | User Created | User Updated | User Deleted | Backup Export | Other)
- user (FK), username (snapshot), details, ip_address, timestamp

### API ENDPOINTS (Actual)

**Authentication (/api/auth/):**
- POST /login/ — JWT login (returns access + refresh tokens + user data)
- POST /register/ — Create account
- POST /token/refresh/ — Refresh access token
- GET/PUT /profile/ — View/update profile
- POST /profile/password/ — Change password
- POST /profile/picture/ — Upload avatar

**Inventory (/api/inventory/):**
- GET / — List items (paginated, filtered by role & access_level)
- POST / — Create item (Staff+)
- GET/PUT/DELETE /{id}/ — CRUD (Staff+)
- GET /low_stock/ — Items with quantity ≤ 5
- GET /out_of_stock/ — Items with quantity = 0
- GET /stats/ — Inventory statistics

**Requests (/api/requests/):**
- GET / — List requests (own for Student/Faculty, all for Staff+)
- POST / — Create borrow request
- POST /{id}/approve/ — Approve (Staff+, not self)
- POST /{id}/reject/ — Reject with reason (Staff+)
- POST /{id}/complete/ — Mark completed
- POST /{id}/cancel/ — Cancel own request
- GET/POST /{id}/comments/ — Comments on request
- POST /check_overdue/ — Trigger overdue check (Staff+)

**Users (/api/users/) — Admin only:**
- GET / — List users
- PUT /{id}/role/ — Change role
- POST /{id}/toggle_status/ — Activate/deactivate
- DELETE /{id}/ — Delete user

**Notifications (/api/requests/notifications/):**
- GET / — List notifications
- POST /{id}/mark_read/ — Mark read
- POST /mark_all_read/ — Mark all read

### SECURITY MEASURES (Actual implementations)

- PBKDF2 + SHA-256 password hashing (Django default)
- JWT tokens: access (1 hour), refresh (7 days), rotation enabled, blacklist on logout
- Rate limiting on auth endpoints (django-ratelimit)
- Input sanitization with strip_tags() on all text fields (XSS prevention)
- CORS restricted in production
- Object-level ownership checks (IDOR prevention)
- Atomic stock deduction using Django F() expressions (race-condition safe)
- Self-approval blocked in backend logic
- Idle auto-logout on frontend
- Full audit logging with IP addresses

### FRONTEND ARCHITECTURE (Actual structure)

```
frontend/src/
├── pages/              (Login, Register, Dashboard, Inventory, Requests, Reports, Settings, Users)
├── components/
│   ├── auth/           (RoleGuard, AuthModal)
│   ├── layout/         (Sidebar, Header, NotificationDropdown)
│   ├── dashboard/      (StatCard, charts)
│   ├── inventory/      (InventoryItemCard, InventoryDetailModal)
│   └── ui/             (Button, Card, Input, Modal, Table, Badge, FAB, QRCodeModal,
│                        CommentBox, DueCountdown, RequestProgressBar, AnimatedBackground)
├── hooks/              (useInventory, useRequests, useUsers, useNotifications, useMediaQuery)
├── services/           (api.js, authService, inventoryService, requestService, userService, notificationService)
├── store/              (authStore.js with Zustand, uiStore.js)
├── routes/             (Route definitions + ProtectedRoute + RoleGuard)
└── utils/              (roles.js, exportUtils.js, errorUtils.js, imageUtils.js, constants.js)
```

### BACKEND ARCHITECTURE (Actual structure)

```
Backend/
├── apps/
│   ├── authentication/  (User model, AuditLog, login/register/profile views, JWT)
│   ├── inventory/       (Item model, CRUD ViewSet, stats, low-stock/out-of-stock endpoints)
│   ├── requests/        (Request/Comment/Notification models, approval workflow, overdue check)
│   ├── users/           (User management ViewSet - admin only)
│   └── permissions.py   (IsStaffOrAbove, IsAdmin, IsFacultyOrAbove permission classes)
├── config/              (Django settings, URL routing, WSGI)
└── manage.py
```

### REQUEST WORKFLOW (State Machine)

```
[User submits] → PENDING
  ├→ APPROVED (Staff/Admin approves → stock atomically deducted → expected return auto-calculated)
  │    ├→ COMPLETED (marked as done)
  │    └→ RETURNED (item returned)
  ├→ REJECTED (Staff/Admin rejects → reason required)
  └→ CANCELLED (requester cancels own request)
```

Business rules:
- No self-approval (user cannot approve own request)
- Stock check before approval (fails if item.quantity < request.quantity)
- Atomic deduction using F() expression (prevents race conditions)
- Auto-retire: item status → RETIRED if stock reaches 0
- Bulk notifications: all Staff+ notified on new request
- Overdue alerts: scheduled check sends OVERDUE notifications

### DEPLOYMENT ARCHITECTURE

- Frontend: Vercel (static React build)
- Backend: Railway (Gunicorn + Django)
- Database: Railway PostgreSQL 18
- Communication: HTTPS, REST API with VITE_API_URL env var
- Environment variables: SECRET_KEY, DEBUG, ALLOWED_HOSTS, DATABASE_URL, VITE_API_URL

---

## WHAT I NEED YOU TO CREATE

### PAPER 1: PHASE 1 — REQUIREMENTS GATHERING

Create a formal academic document with these sections (follow the same structure as a Software Engineering 1 class paper):

1. Cover Page (with school header as shown above)
2. Requirements Gathering Sources
3. Hardware Requirements (table format)
4. Software Requirements — Features to be included:
   - Module 1: Registration & Login (with Registration Restrictions and Login Validation subsections)
   - Module 2: Inventory Management
   - Module 3: Request & Approval Workflow
   - Module 4: Reporting and Analytics
   - Module 5: User Management
   - Module 6: Notification System
5. Introduction (Background, Purpose, Scope, Stakeholders table)
6. Problem Statement (Current Situation, Impact Analysis table, Justification)
7. Proposed Solution (Alternative Approaches, Pros/Cons table, Recommended Solution)
8. Requirements Gathering Details (Hardware table, Software table)
9. System Features (detailed per module)
10. Security & Data Privacy
11. Programming Tools (table format)
12. Peopleware Requirements (table format)

### PAPER 2: PHASE 2 — SYSTEM PLANNING OUTLINE

Create a formal academic document with these sections:

1. Cover Page
2. Introduction (Project Description, Objectives, Scope, Stakeholders)
3. Feasibility Study
   - Objectives of the Study
   - Scope of the System
   - Operational Feasibility
   - Technical Feasibility (Hardware & Software tables)
   - Economic Feasibility (Development costs, Hardware costs, Operational costs, Contingency — all in table format with ₱ amounts)
   - Expected Benefits table
   - Funding Sources
   - Break-Even Analysis
4. Operational Feasibility — Organizational Structure (table)
5. Process Workflows (numbered steps)
6. Risk Assessment (table with Risk, Impact, Mitigation)
7. Schedule Feasibility (Phase table)
8. Legal and Regulatory Considerations
9. Requirements Gathering (Methods, Hardware table, Software table)
10. System Features (per module)
11. Data Flow Diagram (Level 0 Context Diagram and Level 1 System Decomposition)
12. Programming Tools (table)
13. Peopleware Requirements (table)

**IMPORTANT:** All technical details must match exactly what I provided above (Django 6.0, React 18, PostgreSQL 18, Vite 5, Zustand, SimpleJWT, etc.). Do NOT use generic technologies — use the EXACT stack listed. The system has 4 roles (Student, Faculty, Staff, Admin), NOT 3. Include all features I listed including QR codes, audit logging, overdue detection, comment threads, atomic stock deduction, idle auto-logout, etc.

Please generate both papers as complete, ready-to-submit documents.
