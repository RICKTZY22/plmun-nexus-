# PLMun Nexus — System Documentation

> **PLMun Inventory Nexus** is a full-stack web application for Pamantasan ng Lungsod ng Muntinlupa (PLMun) that manages inventory items, handles borrow/request workflows, and administers users — all governed by a role-based access control (RBAC) system.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Role Hierarchy & Access Control](#4-role-hierarchy--access-control)
5. [Data Models (ERD)](#5-data-models-entity-relationship-diagram)
6. [API Endpoints Reference](#6-api-endpoints-reference)
7. [Request Workflow (State Machine)](#7-request-workflow-state-machine)
8. [Authentication Flow](#8-authentication-flow)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Notification System](#10-notification-system)
11. [Security Measures](#11-security-measures)
12. [Performance Optimizations](#12-performance-optimizations)
13. [CRUD Operations Summary](#13-crud-operations-summary)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Key Patterns & Conventions](#15-key-patterns--conventions)

---

## 1. System Overview

PLMun Nexus solves the problem of manual inventory tracking at PLMun by providing:

- 📦 **Inventory Management** — Track items by category, quantity, status, and access level
- 📋 **Borrow/Request Workflow** — Faculty and students request items; staff approve or reject
- 👥 **User Administration** — Role-based accounts with activation/deactivation
- 🔔 **Notifications** — Real-time alerts for request updates and overdue items
- 📊 **Reports & Analytics** — Charts, statistics, and CSV/PDF exports

### System at a Glance

| Property | Value |
|----------|-------|
| Institution | Pamantasan ng Lungsod ng Muntinlupa |
| System Type | Inventory & Request Management System |
| Frontend Port | `:5173` (development) |
| Backend Port | `:8000` (development) |
| Database | PostgreSQL (production) / SQLite (dev) |
| Auth Method | JWT (access + refresh tokens) |
| API Style | RESTful (Django REST Framework) |

---

## 2. Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend Framework** | React | 18 | Component-based UI |
| **Frontend Build** | Vite | 5 | Fast bundler & dev server |
| **Routing** | React Router | v6 | SPA client-side routing |
| **State Management** | Zustand | — | Auth state with localStorage persistence |
| **HTTP Client** | Axios | — | API calls with JWT interceptors |
| **Icons** | Lucide React | — | SVG icon set |
| **PDF Export** | jsPDF + AutoTable | — | Client-side PDF generation |
| **CSV Export** | file-saver | — | Client-side CSV download |
| **Backend Framework** | Django | 6.0 | Python web framework |
| **API Layer** | Django REST Framework | — | Serializers, ViewSets, Pagination |
| **Authentication** | SimpleJWT | — | JWT access + refresh tokens |
| **CORS** | django-cors-headers | — | Frontend/backend cross-origin access |
| **API Docs** | drf-spectacular | — | Auto Swagger + ReDoc generation |
| **Rate Limiting** | django-ratelimit | — | Brute-force protection on auth endpoints |
| **Env Variables** | python-dotenv | — | `.env` file management |
| **Database** | PostgreSQL | 18 | Production database |
| **Static Files** | WhiteNoise | — | Serve static files without nginx |
| **WSGI Server** | Gunicorn | — | Production Python server |

---

## 3. System Architecture

### 3.1 High-Level Architecture

```mermaid
graph TB
    subgraph Client["🌐 Client (Browser)"]
        direction TB
        UI["React Pages (JSX)"]
        Hooks["Custom Hooks\n(useInventory, useRequests, useUsers)"]
        Services["API Services (Axios)"]
        Store["Zustand Auth Store\n(persisted to localStorage)"]
        Router["React Router + RoleGuard"]
    end

    subgraph Backend["⚙️ Django Backend (:8000)"]
        direction TB
        URLs["URL Router (config/urls.py)"]
        Views["ViewSets\n(ItemViewSet, RequestViewSet, etc.)"]
        Permissions["Permission Classes\n(IsStaffOrAbove, IsAdmin, etc.)"]
        Serializers["Serializers\n(with strip_tags sanitization)"]
        Models["Django Models"]
        JWT["SimpleJWT\n(token validation)"]
    end

    subgraph DB["🗄️ Database"]
        PG["PostgreSQL"]
    end

    UI --> Hooks
    Hooks --> Services
    Services -->|"HTTP + Bearer Token"| URLs
    Store -->|"Auth State"| UI
    Router -->|"Role check before render"| UI

    URLs --> JWT
    JWT --> Views
    Views --> Permissions
    Views --> Serializers
    Serializers --> Models
    Models --> PG
```

### 3.2 Request-Response Cycle

```mermaid
sequenceDiagram
    participant Browser
    participant AxiosInterceptor as "Axios (Interceptor)"
    participant DjangoURL as "Django URL Router"
    participant Permission as "Permission Class"
    participant ViewSet
    participant Serializer
    participant Model
    participant DB as "PostgreSQL"

    Browser->>AxiosInterceptor: HTTP Request
    AxiosInterceptor->>AxiosInterceptor: Attach Authorization: Bearer {token}
    AxiosInterceptor->>DjangoURL: Forward request
    DjangoURL->>Permission: Check role & auth
    Permission-->>DjangoURL: 403 if denied
    DjangoURL->>ViewSet: Route to correct method
    ViewSet->>Serializer: Validate & sanitize input
    Serializer->>Model: Save to DB
    Model->>DB: SQL Query
    DB-->>Model: Result
    Model-->>Serializer: Object
    Serializer-->>ViewSet: Serialized JSON
    ViewSet-->>Browser: HTTP Response (200/201/400/etc.)
```

---

## 4. Role Hierarchy & Access Control

### 4.1 Role Pyramid

```mermaid
graph BT
    S["👤 STUDENT\nLevel 0\nCan request items"]
    F["🎓 FACULTY\nLevel 1\nCan view dashboard & inventory"]
    ST["🔧 STAFF\nLevel 2\nCan approve requests & manage inventory"]
    A["👑 ADMIN\nLevel 3\nFull system access"]

    S --> F
    F --> ST
    ST --> A
```

Each higher role **inherits all permissions** of lower roles. The `has_min_role()` backend method and frontend `hasMinRole()` utility enforce this.

### 4.2 Page Access Matrix

| Page | Student | Faculty | Staff | Admin |
|------|:-------:|:-------:|:-----:|:-----:|
| **Login / Register** | ✅ | ✅ | ✅ | ✅ |
| **My Requests** | ✅ | ✅ | ✅ | ✅ |
| **Settings** | ✅ | ✅ | ✅ | ✅ |
| **Dashboard** | ❌ | ✅ | ✅ | ✅ |
| **Inventory** (view only) | ❌ | ✅ | ✅ | ✅ |
| **Inventory** (create/edit/delete) | ❌ | ❌ | ✅ | ✅ |
| **Reports** | ❌ | ❌ | ✅ | ✅ |
| **Users** | ❌ | ❌ | ❌ | ✅ |

### 4.3 Inventory Access Level Filtering

Items have an `access_level` field. Users only see items **at or below** their own role level:

| User Role | Sees Items With access_level |
|-----------|------------------------------|
| STUDENT | STUDENT |
| FACULTY | STUDENT, FACULTY |
| STAFF | STUDENT, FACULTY, STAFF |
| ADMIN | STUDENT, FACULTY, STAFF, ADMIN |

### 4.4 API Permission Matrix

| API Group | Endpoint Action | Min Role |
|-----------|----------------|----------|
| Auth | Login, Register, Refresh | Public |
| Auth | Profile (view/edit/password) | Authenticated |
| Inventory | List, Detail | Authenticated |
| Inventory | Create, Update, Delete | Staff |
| Requests | List (own), Create, Cancel, Complete | Authenticated |
| Requests | Approve, Reject | Staff |
| Notifications | List, Mark Read | Authenticated |
| Users | All operations | Admin |
| Reports/Stats | View | Staff |

---

## 5. Data Models (Entity Relationship Diagram)

```mermaid
erDiagram
    USER {
        int id PK
        string username
        string email
        string first_name
        string last_name
        string role "STUDENT|FACULTY|STAFF|ADMIN"
        string department
        string student_id
        image avatar
        string phone
        boolean is_active
        boolean is_flagged
        int overdue_count
        datetime date_joined
        datetime last_login
    }

    ITEM {
        int id PK
        string name
        string category "ELECTRONICS|FURNITURE|EQUIPMENT|SUPPLIES|OTHER"
        int quantity
        string status "AVAILABLE|IN_USE|MAINTENANCE|RETIRED"
        string location
        text description
        image image
        string access_level "STUDENT|FACULTY|STAFF|ADMIN"
        datetime created_at
        datetime updated_at
    }

    REQUEST {
        int id PK
        int item_id FK
        string item_name
        int requested_by_id FK
        int approved_by_id FK
        int quantity
        text purpose
        string status "PENDING|APPROVED|REJECTED|COMPLETED|CANCELLED"
        string priority "LOW|NORMAL|HIGH"
        date request_date
        date expected_return
        datetime approved_at
        text rejection_reason
        datetime created_at
    }

    COMMENT {
        int id PK
        int request_id FK
        int author_id FK
        text text
        datetime created_at
    }

    NOTIFICATION {
        int id PK
        int recipient_id FK
        int request_id FK
        string type "COMMENT|STATUS_CHANGE|REMINDER|OVERDUE"
        string message
        boolean is_read
        datetime created_at
    }

    USER ||--o{ REQUEST : "submits"
    USER ||--o{ REQUEST : "approves"
    USER ||--o{ COMMENT : "writes"
    USER ||--o{ NOTIFICATION : "receives"
    ITEM ||--o{ REQUEST : "requested in"
    REQUEST ||--o{ COMMENT : "has"
    REQUEST ||--o{ NOTIFICATION : "triggers"
```

---

## 6. API Endpoints Reference

### 6.1 Authentication (`/api/auth/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/login/` | JWT login, returns access + refresh tokens + user | Public |
| POST | `/register/` | Create account (auto-login) | Public |
| POST | `/token/refresh/` | Get new access token using refresh token | Public |
| GET | `/profile/` | Get current user profile | Required |
| PUT | `/profile/` | Update profile fields | Required |
| POST | `/profile/password/` | Change password | Required |
| POST | `/profile/picture/` | Upload avatar image | Required |

### 6.2 Inventory (`/api/inventory/`)

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|----------|
| GET | `/` | List items (paginated, filtered by role & access_level) | Authenticated |
| POST | `/` | Create new item | Staff |
| GET | `/{id}/` | Get item details | Authenticated |
| PUT | `/{id}/` | Update item | Staff |
| DELETE | `/{id}/` | Delete item | Staff |
| GET | `/low_stock/` | Items with quantity ≤ 5 | Authenticated |
| GET | `/out_of_stock/` | Items with quantity = 0 | Authenticated |
| GET | `/stats/` | Inventory statistics summary | Authenticated |

**Query parameters**: `?search=`, `?category=`, `?status=`

### 6.3 Requests (`/api/requests/`)

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|----------|
| GET | `/` | List requests (own only for Student/Faculty, all for Staff+) | Authenticated |
| POST | `/` | Create a new borrow request | Authenticated |
| GET | `/{id}/` | Get request details | Authenticated |
| POST | `/{id}/approve/` | Approve a pending request (deducts stock) | Staff |
| POST | `/{id}/reject/` | Reject with required reason | Staff |
| POST | `/{id}/complete/` | Mark approved request as completed | Authenticated |
| POST | `/{id}/cancel/` | Cancel own pending request | Authenticated |
| GET | `/{id}/comments/` | List all comments on a request | Authenticated |
| POST | `/{id}/comments/` | Add a comment | Authenticated |
| GET | `/stats/` | Request statistics aggregation | Authenticated |
| POST | `/check_overdue/` | Trigger overdue check (sends bulk notifications) | Staff |

**Query parameters**: `?status=`, `?priority=`, `?search=`

### 6.4 Users (`/api/users/`)

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|----------|
| GET | `/` | List all users (paginated) | Admin |
| GET | `/{id}/` | Get user detail | Admin |
| PUT | `/{id}/role/` | Change a user's role | Admin |
| POST | `/{id}/toggle_status/` | Activate or deactivate a user | Admin |
| DELETE | `/{id}/` | Delete a user permanently | Admin |
| GET | `/stats/` | User count by role | Admin |

**Query parameters**: `?search=`, `?role=`, `?is_active=`

### 6.5 Notifications (`/api/requests/notifications/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List current user's notifications | Required |
| POST | `/{id}/mark_read/` | Mark a single notification as read | Required |
| POST | `/mark_all_read/` | Mark all notifications as read | Required |

---

## 7. Request Workflow (State Machine)

```mermaid
stateDiagram-v2
    direction LR
    [*] --> PENDING : User submits request

    PENDING --> APPROVED : Staff/Admin approves\n(stock deducted atomically)
    PENDING --> REJECTED : Staff/Admin rejects\n(reason required)
    PENDING --> CANCELLED : Requester cancels

    APPROVED --> COMPLETED : Marked as returned/done

    REJECTED --> [*]
    CANCELLED --> [*]
    COMPLETED --> [*]
```

### Business Rules Table

| Rule | Description |
|------|-------------|
| **No self-approval** | A user cannot approve their own request |
| **Stock check** | Approval fails if `item.quantity < request.quantity` |
| **Atomic deduction** | Stock is deducted using `F()` expression to prevent race conditions |
| **Auto-retire** | If stock reaches 0 after deduction, item status → `RETIRED` |
| **Bulk notifications** | On new request: all Staff+ notified via `bulk_create` |
| **Overdue alerts** | Scheduled check sends bulk `OVERDUE` notifications to Staff+ |
| **Cancel restriction** | Only the requester or Staff+ can cancel, and only from `PENDING` |
| **Priority support** | Requests can be LOW / NORMAL / HIGH priority |

---

## 8. Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend as "React Frontend\n(Zustand Store)"
    participant Axios as "Axios Interceptor"
    participant Backend as "Django + SimpleJWT"

    %% Login
    User->>Frontend: Email + Password
    Frontend->>Backend: POST /api/auth/login/
    Backend->>Backend: Validate credentials
    Backend-->>Frontend: { access_token, refresh_token, user }
    Frontend->>Frontend: Store tokens in Zustand\n(persisted to localStorage)

    %% Authenticated Request
    Frontend->>Axios: API call
    Axios->>Backend: HTTP + Authorization: Bearer {access_token}
    Backend->>Backend: Verify JWT signature
    Backend-->>Frontend: Data (200 OK)

    %% Token Expiry & Refresh
    Note over Frontend,Backend: access_token expires after 1 hour
    Axios->>Backend: Request with expired token
    Backend-->>Axios: 401 Unauthorized
    Axios->>Backend: POST /api/auth/token/refresh/ {refresh_token}
    Backend-->>Axios: New access_token
    Axios->>Backend: Retry original request
    Backend-->>Frontend: Data (200 OK)

    %% Logout
    User->>Frontend: Click Logout
    Frontend->>Backend: POST /api/auth/token/blacklist/ {refresh_token}
    Frontend->>Frontend: Clear Zustand + localStorage
```

**Token Configuration:**

| Token | Lifetime | Notes |
|-------|----------|-------|
| Access Token | 1 hour | Short-lived, sent with every request |
| Refresh Token | 7 days | Long-lived, used only to renew access token |
| Rotation | Enabled | New refresh token issued on every refresh |
| Blacklist | Enabled | Old refresh tokens invalidated on logout |

---

## 9. Frontend Architecture

### 9.1 Project Structure

```
frontend/src/
├── pages/                  # Full-page components
│   ├── Login.jsx           # JWT login form
│   ├── Register.jsx        # Self-registration form
│   ├── Dashboard.jsx       # Stats overview (Faculty+)
│   ├── Inventory.jsx       # Inventory CRUD (Faculty+ view, Staff+ edit)
│   ├── Requests.jsx        # Borrow request management (all roles)
│   ├── Reports.jsx         # Analytics + CSV/PDF export (Staff+)
│   ├── Settings.jsx        # Profile, preferences, admin config
│   └── Users.jsx           # User management (Admin only)
│
├── components/
│   ├── auth/               # RoleGuard, AuthModal
│   ├── layout/             # Sidebar, Header, NotificationDropdown
│   ├── dashboard/          # StatsCard, charts
│   └── ui/                 # Button, Card, Input, Modal, Table, Badge, FAB
│
├── hooks/                  # Data-fetching & state hooks
│   ├── useInventory.js     # Inventory CRUD + stats
│   ├── useRequests.js      # Request lifecycle + comments
│   ├── useUsers.js         # User admin CRUD
│   └── useNotifications.js # Notification fetch + mark read
│
├── services/               # Axios API wrappers
│   ├── api.js              # Base Axios + JWT refresh interceptor
│   ├── authService.js      # /api/auth/ endpoints
│   ├── inventoryService.js # /api/inventory/ endpoints
│   ├── requestService.js   # /api/requests/ endpoints
│   ├── userService.js      # /api/users/ endpoints
│   └── notificationService.js
│
├── store/
│   └── authStore.js        # Zustand: user, tokens, login/logout, idle logout
│
├── routes/
│   └── index.jsx           # Route definitions + ProtectedRoute + RoleGuard
│
└── utils/
    ├── roles.js            # ROLES enum, hasMinRole(), hasPermission()
    └── exportUtils.js      # CSV + PDF export helpers
```

### 9.2 Component Data Flow

```mermaid
graph TD
    Page["Page Component\n(e.g. Inventory.jsx)"]
    Hook["Custom Hook\n(useInventory)"]
    Service["API Service\n(inventoryService)"]
    Axios["Axios Instance\n(api.js)"]
    Backend["Django REST API"]
    Store["Zustand Auth Store"]
    LocalStorage["localStorage\n(token persistence)"]

    Page -->|"call addItem(data)"| Hook
    Hook -->|"inventoryService.create(data)"| Service
    Service -->|"api.post('/inventory/', data)"| Axios
    Axios -->|"HTTP + Bearer token"| Backend
    Backend -->|"JSON response"| Axios
    Axios -->|"data"| Service
    Service -->|"result"| Hook
    Hook -->|"setItems([...items, new])"| Hook
    Hook -->|"re-render"| Page

    Store -->|"user, role, tokens"| Page
    Store <-->|"persist/rehydrate"| LocalStorage
```

### 9.3 Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `RoleGuard` | `components/auth/` | Wraps routes/UI sections, checks `minRole` before rendering |
| `ProtectedRoute` | `routes/index.jsx` | Redirects unauthenticated users to login |
| `Sidebar` | `components/layout/` | Navigation with role-filtered menu items |
| `NotificationDropdown` | `components/layout/` | Bell icon with unread count + notification list |
| `Modal` | `components/ui/` | Reusable dialog (forms, confirmations) |
| `QRCodeModal` | `components/ui/` | Generate/display QR codes for inventory items |
| `FAB` | `components/ui/` | Floating action button for quick create |
| `AnimatedBackground` | `components/ui/` | Visual background effects |

---

## 10. Notification System

```mermaid
graph LR
    subgraph Triggers
        NewReq["New Request Created"]
        StatusChange["Request Status Changed"]
        Comment["Comment Added"]
        Overdue["Overdue Check (scheduled)"]
    end

    subgraph Backend
        BulkCreate["Notification.objects.bulk_create()"]
        NotifModel["Notification Model"]
    end

    subgraph Frontend
        Bell["🔔 Bell Icon\n(unread count badge)"]
        Dropdown["Notification Dropdown List"]
        MarkRead["Mark Read / Mark All Read"]
    end

    NewReq --> BulkCreate
    StatusChange --> BulkCreate
    Comment --> BulkCreate
    Overdue --> BulkCreate
    BulkCreate --> NotifModel
    NotifModel -->|"GET /api/requests/notifications/"| Bell
    Bell --> Dropdown
    Dropdown --> MarkRead
```

### Notification Types

| Type | When Triggered | Recipients |
|------|---------------|------------|
| `STATUS_CHANGE` | Request approved / rejected / completed | Requester |
| `COMMENT` | New comment on a request | All parties on that request |
| `REMINDER` | Custom staff reminder | Specific users |
| `OVERDUE` | Overdue check finds late items | All Staff+ |

---

## 11. Security Measures

| Layer | Measure | Implementation |
|-------|---------|----------------|
| **Secrets** | `SECRET_KEY` required in production | Crashes at startup if missing |
| **Debug** | `DEBUG=False` by default | Env var override for dev |
| **Hosts** | `ALLOWED_HOSTS` from env var | Prevents host header attacks |
| **Auth** | JWT with short-lived access tokens | 1-hour expiry, refresh rotation |
| **Brute Force** | Rate limiting on auth endpoints | `django-ratelimit` |
| **CORS** | Restricted origins in production | `CORS_ALLOW_ALL_ORIGINS = DEBUG` only |
| **XSS (Stored)** | Input sanitization | `strip_tags()` on all user text fields |
| **Race Conditions** | Atomic stock deduction | `F()` expression instead of read-modify-write |
| **IDOR** | Object-level ownership check | Non-staff users can only see their own requests |
| **Role Escalation** | Server-side permission classes | `IsStaffOrAbove`, `IsAdmin` on every sensitive endpoint |
| **Git Secrets** | `.env` excluded from git | `.gitignore` covers `.env` files |
| **Self-Approval** | Blocked in approval logic | `request.requested_by == approver` check |

---

## 12. Performance Optimizations

| Optimization | Where | Detail |
|-------------|-------|--------|
| **Pagination** | All list endpoints | 50 items per page (`PageNumberPagination`) |
| **Bulk Notifications** | Request creation + overdue check | `Notification.objects.bulk_create()` instead of N individual inserts |
| **`select_related`** | Query optimization | `Request` querysets prefetch `requested_by`, `approved_by`, `item` |
| **Atomic F() updates** | Stock deduction | `item.quantity = F('quantity') - request.quantity` |
| **Static Files** | WhiteNoise | Compressed & cached static files served without nginx |
| **Frontend Services** | Paginated API responses | Services extract `.results` from paginated responses |

---

## 13. CRUD Operations Summary

### 13.1 Inventory Items

| Operation | Hook Method | Endpoint | Min Role |
|-----------|-------------|----------|----------|
| List | `fetchInventory()` | `GET /api/inventory/` | Authenticated |
| Create | `addItem(data)` | `POST /api/inventory/` | Staff |
| Read | `inventoryService.getById(id)` | `GET /api/inventory/{id}/` | Authenticated |
| Update | `updateItem(id, data)` | `PUT /api/inventory/{id}/` | Staff |
| Delete | `deleteItem(id)` | `DELETE /api/inventory/{id}/` | Staff |

### 13.2 Requests

| Operation | Hook Method | Endpoint | Min Role |
|-----------|-------------|----------|----------|
| List | `fetchRequests()` | `GET /api/requests/` | Authenticated |
| Create | `createRequest(data)` | `POST /api/requests/` | Authenticated |
| Approve | `approveRequest(id)` | `POST /api/requests/{id}/approve/` | Staff (not self) |
| Reject | `rejectRequest(id, reason)` | `POST /api/requests/{id}/reject/` | Staff |
| Complete | `completeRequest(id)` | `POST /api/requests/{id}/complete/` | Authenticated |
| Cancel | `cancelRequest(id)` | `POST /api/requests/{id}/cancel/` | Owner or Staff+ |
| Comment | `addComment(id, text)` | `POST /api/requests/{id}/comments/` | Authenticated |

### 13.3 Users (Admin Only)

| Operation | Hook Method | Endpoint |
|-----------|-------------|----------|
| List | `fetchUsers()` | `GET /api/users/` |
| Change Role | `updateUserRole(id, role)` | `PUT /api/users/{id}/role/` |
| Toggle Active | `toggleUserStatus(id)` | `POST /api/users/{id}/toggle_status/` |
| Delete | `deleteUser(id)` | `DELETE /api/users/{id}/` |

### 13.4 Profile (Self)

| Operation | Method | Endpoint |
|-----------|--------|----------|
| View | `authService.getProfile()` | `GET /api/auth/profile/` |
| Update | `authStore.updateProfile(data)` | `PUT /api/auth/profile/` |
| Avatar | `authStore.updateAvatar(file)` | `POST /api/auth/profile/picture/` |
| Password | `authStore.changePassword(data)` | `POST /api/auth/profile/password/` |

---

## 14. Deployment Architecture

```mermaid
graph TB
    subgraph Internet["🌐 Internet"]
        Users["Users (Browsers)"]
    end

    subgraph Vercel["▲ Vercel (Frontend)"]
        ViteBuild["Built React App\n(static files)"]
    end

    subgraph Railway["🚂 Railway (Backend)"]
        Gunicorn["Gunicorn WSGI Server"]
        Django["Django + DRF"]
        WhiteNoise["WhiteNoise\n(static files)"]
    end

    subgraph RailwayDB["🗄️ Railway PostgreSQL"]
        PG["PostgreSQL 18"]
    end

    Users -->|"HTTPS"| Vercel
    Users -->|"HTTPS API calls"| Railway
    ViteBuild -->|"VITE_API_URL env var"| Railway
    Gunicorn --> Django
    Django --> WhiteNoise
    Django --> PG
```

### Environment Variables Required

| Variable | Where | Example |
|----------|-------|---------|
| `SECRET_KEY` | Backend | `your-long-random-secret-key` |
| `DEBUG` | Backend | `False` |
| `ALLOWED_HOSTS` | Backend | `your-app.railway.app` |
| `DATABASE_URL` | Backend | `postgres://user:pass@host:5432/db` |
| `VITE_API_URL` | Frontend | `https://your-app.railway.app/api` |

---

## 15. Key Patterns & Conventions

| Pattern | Description |
|---------|-------------|
| **snake_case ↔ camelCase** | Backend uses `snake_case`; frontend uses `camelCase`. Serializers bridge this (e.g. `dateAdded = DateTimeField(source='created_at')`) |
| **Optimistic state updates** | Hooks update local state immediately after a successful API call instead of re-fetching the full list |
| **JWT auto-refresh** | Axios interceptor catches `401` errors, refreshes the token transparently, then retries the original request |
| **Dual-layer RBAC** | Access control enforced on both backend (Django permission classes + queryset filtering) and frontend (RoleGuard + UI hiding) |
| **Zustand persistence** | Auth state (`user`, `tokens`) persisted to `localStorage` via Zustand's `persist` middleware for page-refresh survival |
| **Idle auto-logout** | `authStore` attaches mouse/keyboard listeners — user is automatically logged out after inactivity |
| **Centralized permissions** | Single `apps/permissions.py` module exports all permission classes — no duplication across apps |
| **Paginated APIs** | All list endpoints return `{ count, next, previous, results }` — frontend services extract `.results` with a fallback |
| **Input sanitization** | All user-submitted text fields run through `strip_tags()` in serializer validators before saving |
| **Atomic writes** | Stock deduction uses Django's `F()` expression for race-condition-safe database updates |
