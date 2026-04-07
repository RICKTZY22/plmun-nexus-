# Frontend Technical Documentation

## PLMun Inventory Nexus — Client-Side Architecture
### BSCS 3D · Software Engineering 1 · AY 2025–2026

---

## 1. Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Language | JavaScript (ES2024) | — | Client-side logic |
| UI Library | React | 18.x | Component-based UI |
| Build Tool | Vite | 5.x | Fast HMR development server + production bundler |
| Routing | React Router | 6.x | SPA routing with protected routes |
| State Management | Zustand | 4.x | Lightweight global state (auth, UI preferences) |
| HTTP Client | Axios | 1.x | API calls with interceptors |
| Styling | Tailwind CSS | 3.x | Utility-first CSS framework |
| Charts | Recharts | 2.x | Dashboard statistics visualization |
| Icons | Lucide React | — | 100+ icons used across the UI |
| PDF Export | jsPDF + jspdf-autotable | — | Client-side PDF generation |
| QR Codes | react-qr-code | — | QR generation for inventory items |
| Hosting | Render.com | — | Static site deployment |

---

## 2. Project Structure

```
frontend/src/
├── main.jsx                         # React entry point
├── App.jsx                          # Root component with RouterProvider
├── index.css                        # Global styles + Tailwind + CSS variables
│
├── assets/                          # Static assets (images, logos)
│
├── routes/                          # Routing configuration
│   └── AppRouter.jsx                # Route definitions with role guards
│
├── store/                           # Zustand global state
│   ├── authStore.js                 # Authentication state (user, tokens, login/logout)
│   └── uiStore.js                   # UI preferences (theme, view mode, items per page)
│
├── services/                        # API communication layer
│   ├── api.js                       # Axios instance with JWT interceptors
│   ├── authService.js               # Login, register, profile API calls
│   ├── inventoryService.js          # Item CRUD + status change
│   ├── requestService.js            # Request lifecycle (submit, approve, reject, return)
│   ├── notificationService.js       # Notification polling + mark read
│   └── userService.js               # User management (admin)
│
├── hooks/                           # Custom React hooks
│   ├── useInventory.js              # Inventory state, CRUD, stats computation
│   ├── useRequests.js               # Request state, workflow actions
│   ├── useNotifications.js          # Real-time notification polling (30s interval)
│   ├── useUsers.js                  # User management state
│   └── useMediaQuery.js             # Responsive breakpoint detection
│
├── components/                      # Reusable UI components
│   ├── ErrorBoundary.jsx            # Global error catcher
│   ├── ThemeProvider.jsx            # Dark/light mode context
│   ├── auth/                        # Authorization components
│   │   └── RoleGuard.jsx            # Role-based rendering (AdminOnly, StaffOnly, FacultyOnly)
│   ├── layout/                      # App layout shell
│   │   ├── Layout.jsx               # Sidebar + content + header
│   │   ├── Sidebar.jsx              # Navigation sidebar
│   │   └── Header.jsx               # Top bar with notifications + user menu
│   ├── ui/                          # Design system primitives
│   │   ├── Button.jsx               # Variants: primary, ghost, danger
│   │   ├── Card.jsx                 # Content container
│   │   ├── Input.jsx                # Form input with validation
│   │   ├── Modal.jsx                # Dialog overlay
│   │   ├── Table.jsx                # Data table (Header, Body, Row, Cell)
│   │   ├── AnimatedInput.jsx        # Floating label input
│   │   └── QRCodeModal.jsx          # QR code display/print modal
│   ├── inventory/                   # Inventory-specific components
│   │   ├── InventoryItemCard.jsx    # Card view for inventory grid
│   │   ├── InventoryFormModal.jsx   # Add/edit item form
│   │   └── InventoryDetailModal.jsx # Full item detail view
│   └── dashboard/                   # Dashboard widgets
│       └── (chart components)
│
├── pages/                           # Route-level page components
│   ├── Login.jsx                    # Login page with animated UI
│   ├── Register.jsx                 # Registration form
│   ├── Dashboard.jsx                # Statistics, charts, recent activity
│   ├── Inventory.jsx                # Item management (card/table view)
│   ├── Requests.jsx                 # Borrow request management
│   ├── Reports.jsx                  # Analytics + CSV/PDF export
│   ├── Settings.jsx                 # User & system preferences
│   ├── Users.jsx                    # Admin user management
│   └── settings/                    # Settings sub-pages
│
└── utils/                           # Utility functions
    ├── roles.js                     # Role hierarchy + permissions matrix
    ├── exportUtils.js               # CSV/PDF export with Save As dialog
    ├── imageUtils.js                # Image URL resolver (relative → absolute)
    ├── errorUtils.js                # API error message extraction
    └── constants.js                 # App-wide constants
```

---

## 3. State Management

### 3.1 Auth Store (`store/authStore.js`)

Manages authentication state with Zustand + localStorage persistence.

**State:**
```javascript
{
    user: { id, username, first_name, last_name, email, role, department, ... },
    token: 'eyJ...',                    // JWT access token
    refreshToken: 'eyJ...',            // JWT refresh token
    isAuthenticated: true/false,
    loading: false,
}
```

**Actions:**
| Action | Description |
|--------|-------------|
| `login(credentials)` | Authenticate → store tokens + user |
| `register(data)` | Create account → auto-login |
| `logout()` | Clear all state + localStorage + redirect |
| `setToken(token)` | Update access token (after refresh) |
| `updateProfile(data)` | Sync profile changes to store |
| `refreshProfile()` | Re-fetch profile from API |

**Persistence:** Uses Zustand's `persist` middleware with `localStorage`. Key: `auth-storage`.

---

### 3.2 UI Store (`store/uiStore.js`)

Manages user interface preferences, also persisted to localStorage.

**State:**
```javascript
{
    theme: 'light' | 'dark' | 'system',    // Color scheme
    viewMode: 'card' | 'table',            // Inventory display mode
    itemsPerPage: 12,                      // Pagination size
    showImages: true,                      // Show item thumbnails
    sidebarCollapsed: false,               // Sidebar state
}
```

---

## 4. API Communication Layer

### 4.1 Axios Configuration (`services/api.js`)

```javascript
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    headers: { 'Content-Type': 'application/json' },
});
```

**Request Interceptor:** Automatically attaches `Bearer {token}` header to every request.

**Response Interceptor — Token Refresh with Mutex Queue:**

```
Request fails with 401
  ↓
Is another refresh already in progress?
  ├─ YES → Queue this request, wait for refresh result
  └─ NO  → Start refresh
               ├─ Success → Retry original + all queued requests
               └─ Failure → Logout user, redirect to /login
```

This mutex pattern prevents **3+ simultaneous refresh requests** when multiple API calls fail at the same time (e.g., dashboard loading stats + recent activity + notifications simultaneously).

---

### 4.2 Service Modules

| Service | File | Endpoints |
|---------|------|-----------|
| **Auth** | `authService.js` | `POST /auth/login/`, `POST /auth/register/`, `GET/PUT /auth/profile/` |
| **Inventory** | `inventoryService.js` | `GET/POST /inventory/`, `PUT/DELETE /inventory/{id}/`, `POST /inventory/{id}/change_status/` |
| **Requests** | `requestService.js` | `GET/POST /requests/`, `POST /requests/{id}/approve/reject/release/return_item/cancel/` |
| **Notifications** | `notificationService.js` | `GET /requests/notifications/`, `POST /{id}/mark_read/`, `POST /mark_all_read/` |
| **Users** | `userService.js` | `GET/PUT/DELETE /users/`, `POST /users/{id}/toggle_active/` |

---

## 5. Custom Hooks

### 5.1 `useInventory()`

Manages inventory state with optimistic updates.

```javascript
const {
    inventory,           // Item[]
    loading,             // boolean
    stats,               // { total, available, inUse, maintenance, retired }
    fetchInventory,      // (filters?) => void — fetches + computes stats
    addItem,             // (formData) => { success, data?, error? }
    updateItem,          // (id, formData) => { success, data?, error? }
    deleteItem,          // (id) => { success, error? }
    changeItemStatus,    // (id, { status, note, maintenanceEta }) => { success }
} = useInventory();
```

**Stats Computation:** Calculates `total`, `available`, `inUse`, `maintenance`, `retired`, and `lowStock` counts client-side from the fetched array.

---

### 5.2 `useRequests()`

Manages the full request lifecycle.

```javascript
const {
    requests,            // Request[]
    loading,
    fetchRequests,       // () => void
    createRequest,       // (data) => { success }
    approveRequest,      // (id) => { success }
    rejectRequest,       // (id, reason) => { success }
    releaseRequest,      // (id) => { success }
    returnRequest,       // (id) => { success }
    cancelRequest,       // (id) => { success }
    addComment,          // (requestId, text) => { success }
} = useRequests();
```

---

### 5.3 `useNotifications()`

Polls the server every 30 seconds for new notifications.

```javascript
const {
    notifications,       // Notification[]
    unreadCount,         // number
    markAsRead,          // (id) => void
    markAllAsRead,       // () => void
} = useNotifications();
```

**Polling Strategy:** `setInterval(30_000)` with cleanup on unmount. Considered WebSockets but polling was simpler for the scale of this project.

---

### 5.4 `useMediaQuery()` / `useIsMobile()`

Responsive breakpoint detection using `window.matchMedia`.

```javascript
const isMobile = useIsMobile();      // true when viewport < 768px
// Used to force card view on mobile (table is unusable on narrow screens)
```

---

## 6. Role-Based Access Control (Frontend)

### 6.1 RoleGuard Component

```jsx
// Renders children only if user meets role requirement
<RoleGuard minRole="STAFF">
    <AdminPanel />          {/* Only visible to Staff + Admin */}
</RoleGuard>

// Convenience wrappers:
<AdminOnly>...</AdminOnly>          // minRole="ADMIN"
<StaffOnly>...</StaffOnly>          // minRole="STAFF"
<FacultyOnly>...</FacultyOnly>      // minRole="FACULTY"
```

**Behavior when unauthorized:**
- `fallback={null}` (default) → Renders nothing (content hidden)
- `showAccessDenied={true}` → Shows "Access Denied" message
- `redirectTo="/dashboard"` → Navigates away

### 6.2 Frontend Permissions Matrix

```javascript
// utils/roles.js — Single source of truth
PERMISSIONS = {
    VIEW_INVENTORY:     [STUDENT*, FACULTY, STAFF, ADMIN],
    EDIT_INVENTORY:     [STAFF, ADMIN],
    DELETE_INVENTORY:   [STAFF, ADMIN],
    CREATE_REQUEST:     [STUDENT, FACULTY, STAFF, ADMIN],
    VIEW_ALL_REQUESTS:  [STAFF, ADMIN],
    APPROVE_REQUEST:    [STAFF, ADMIN],
    VIEW_REPORTS:       [STAFF, ADMIN],
    EXPORT_REPORTS:     [STAFF, ADMIN],
    VIEW_USERS:         [ADMIN],
    EDIT_USERS:         [ADMIN],
    // ... 21 total permissions
}
```

*\*Students see items filtered by `access_level` on the backend.*

---

## 7. Pages Overview

### 7.1 Login Page (`Login.jsx`) — 78KB

- Animated login form with floating label inputs
- Progressive lockout display (shows remaining wait time)
- Failed attempt counter with warning messages
- Dynamic copyright year
- Desktop: side illustration + form | Mobile: full-screen form

### 7.2 Register Page (`Register.jsx`) — 21KB

- Multi-field form (name, email, student ID, department, password)
- Browser autofill prevention (`autoComplete="one-time-code"` on Student ID)
- Client-side validation with error feedback
- Auto-login on successful registration

### 7.3 Dashboard (`Dashboard.jsx`) — 42KB

- **Stats Cards:** Total items, available, in use, maintenance, low stock
- **Charts:** Category distribution (pie), Monthly requests (bar), Status breakdown
- **Recent Activity:** Today's requests with status badges
- **Low Stock Alerts:** Clickable cards → navigate to inventory item detail
- **Quick Actions:** Add item, new request shortcuts
- Role-filtered: Faculty+ only

### 7.4 Inventory (`Inventory.jsx`) — 51KB

- **Dual View:** Card grid or data table (toggle in Settings)
- **Smart Grouping:** Items grouped by stock category (Low Stock / Out of Stock / Normal)
- **Filters:** Search by name, filter by category, filter by status
- **Pagination:** Configurable items per page
- **Staff Actions:** Add, Edit, Delete, Change Status, QR Code, Export CSV/PDF/Print
- **Student/Faculty View:** Read-only with "Request" button

### 7.5 Requests (`Requests.jsx`) — 50KB

- **Student View:** Own requests with "Submit New Request" form
- **Staff View:** All requests with approve/reject/release/return workflow
- **Comments:** Threaded conversation per request
- **Status Tracking:** Visual pipeline (Pending → Approved → Released → Returned)
- **Bulk Clear:** Staff can archive completed/returned requests

### 7.6 Reports (`Reports.jsx`) — 49KB

- **Analytics Dashboard:** Summary statistics with trend indicators
- **Charts:** Category distribution, request trends, status breakdown
- **Data Table:** Full request history with sorting and filtering
- **Export:** CSV and PDF export with Save As dialog (File System Access API)
- Staff+ only

### 7.7 Settings (`Settings.jsx`) — 36KB

- **Profile Tab:** Edit name, email, phone, department, avatar
- **Appearance Tab:** Theme (light/dark/system), view mode, items per page
- **Inventory Tab (Staff+):** Default category, status, location for new items
- **Admin Tab:** Audit logs viewer, user management link, system maintenance

### 7.8 Users (`Users.jsx`) — 18KB

- User list with role badges and stats
- Role assignment dropdown
- Activate/deactivate toggle
- Delete confirmation modal
- Admin only

---

## 8. Key Technical Patterns

### 8.1 Optimistic UI Updates

```javascript
// After adding an item:
setInventory(prev => [...prev, newItem]);     // Instant UI update
recomputeStats();                             // Recalculate counts
// No need to refetch entire list from server
```

### 8.2 FormData for File Uploads

```javascript
// Item images use FormData instead of JSON
const formData = new FormData();
formData.append('name', item.name);
formData.append('image', fileBlob);
api.post('/inventory/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
```

### 8.3 URL Parameter Navigation

Dashboard low stock items link to Inventory with `?item=ID` parameter:
```javascript
// Dashboard.jsx
navigate(`/inventory?item=${item.id}`);

// Inventory.jsx — auto-opens detail modal
useEffect(() => {
    const itemId = searchParams.get('item');
    if (itemId && inventory.length > 0) {
        const found = inventory.find(i => String(i.id) === String(itemId));
        if (found) setDetailItem(found);
    }
}, [searchParams, inventory]);
```

### 8.4 Client-Side PDF Generation

```javascript
// Uses jsPDF + jspdf-autotable
// File System Access API for native "Save As" dialog
const handle = await window.showSaveFilePicker({
    suggestedName: filename,
    types: [{ accept: { 'application/pdf': ['.pdf'] } }],
});
const writable = await handle.createWritable();
await writable.write(pdfBlob);
await writable.close();
// Fallback: anchor download for browsers without File System Access API
```

### 8.5 Dark Mode Implementation

```javascript
// ThemeProvider.jsx watches system preference + user setting
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

// When theme === 'system', follows OS setting
// When theme === 'dark' or 'light', overrides OS
document.documentElement.classList.toggle('dark', isDark);
```

### 8.6 Mobile-First Responsive Design

```javascript
// Inventory page: table view is disabled on mobile
const isMobile = useIsMobile();
const viewMode = isMobile ? 'card' : storedViewMode;
// Forces card grid on screens < 768px
```

---

## 9. Design System

### 9.1 Color Palette

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-primary` | `#2563eb` | `#3b82f6` | Buttons, links, accents |
| `--color-background` | `#f8fafc` | `#0f172a` | Page background |
| `--color-surface` | `#ffffff` | `#1e293b` | Card/modal background |
| `--color-text` | `#1e293b` | `#e2e8f0` | Body text |
| Status: Available | `emerald` | `emerald` | Green badges |
| Status: In Use | `blue` | `blue` | Blue badges |
| Status: Maintenance | `amber` | `amber` | Yellow badges |
| Status: Retired | `gray` | `gray` | Gray badges |

### 9.2 Typography

- **Font:** System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto...`)
- **Headings:** `font-bold` (700 weight)
- **Body:** `font-normal` (400 weight)
- **Monospace:** Used for status codes, IDs

### 9.3 Component Variants

**Button:**
- `primary` — Blue filled
- `ghost` — Transparent with hover background
- `danger` — Red for destructive actions

**Card:** Rounded corners (`rounded-xl`), subtle border, shadow on hover

**Modal:** Centered overlay with backdrop blur, animated entry

---

## 10. Build & Deployment

### 10.1 Development

```bash
cd frontend
npm install
npm run dev          # Starts Vite dev server on :5173
```

**Environment Variable:**
```env
VITE_API_URL=http://localhost:8000/api
```

### 10.2 Production Build

```bash
npm run build        # Outputs to dist/
```

Vite handles:
- Tree-shaking (removes unused code)
- Code splitting (lazy loading per route)
- Asset hashing (cache busting)
- CSS minification

### 10.3 Render.com Static Site

```
Build Command: npm install && npm run build
Publish Directory: dist
Environment: VITE_API_URL=https://plmun-nexus-api.onrender.com/api
```

---

## 11. Dependencies (`package.json`)

| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | UI framework |
| `react-router-dom` | Client-side routing |
| `zustand` | Global state management |
| `axios` | HTTP client |
| `tailwindcss` | Utility CSS |
| `lucide-react` | Icon library |
| `recharts` | Dashboard charts |
| `jspdf` + `jspdf-autotable` | PDF export |
| `react-qr-code` | QR code generation |
| `vite` | Build tool & dev server |
| `@vitejs/plugin-react` | React JSX support |

---

*PLMun Inventory Nexus — Frontend Technical Documentation*
*BSCS 3D · Software Engineering 1 · Prof. Mr. Melchor Paz*
*Academic Year 2025–2026*
