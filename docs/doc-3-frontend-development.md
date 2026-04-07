# Frontend Development Documentation

## PLMun Inventory Nexus — How We Built the Client
### BSCS 3D · Software Engineering 1 · AY 2025–2026

---

## 1. Frontend Setup & Architecture

### 1.1 Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.2 | Component-based UI rendering |
| Vite | 5.1 | Dev server with Hot Module Replacement (HMR) — instant preview on save |
| Zustand | 4.5 | Global state management for auth and UI preferences |
| React Router | 6.22 | Client-side routing — no full page reloads |
| Axios | 1.6 | HTTP client with interceptors for JWT token management |
| Tailwind CSS | 3.4 | Utility-first CSS framework for rapid, consistent styling |
| Recharts | 2.12 | SVG chart library for dashboard analytics |
| Lucide React | 0.344 | Icon library (200+ icons used across the app) |
| jsPDF | 4.1 | Client-side PDF generation (no server needed) |
| jspdf-autotable | 5.0 | Auto-formats data tables inside PDFs |
| qrcode.react | 4.2 | Generates QR codes for inventory items |
| date-fns | 3.3 | Date formatting (e.g., "2 hours ago", "April 6, 2026") |
| Vitest | 4.0 | Unit testing framework |

### 1.2 How the Code is Organized

```
src/
├── services/        ← 1 file per backend app — wraps API calls
│   ├── api.js           ← Axios instance with JWT interceptor
│   ├── authService.js   ← login(), register(), getProfile(), updateProfile()
│   ├── inventoryService.js  ← getItems(), createItem(), updateItem(), deleteItem()
│   └── requestService.js   ← getRequests(), approve(), reject(), return()
│
├── store/           ← Global state (Zustand)
│   ├── authStore.js     ← user, token, isAuthenticated, login(), logout()
│   └── uiStore.js       ← theme, viewMode, itemsPerPage, sidebarCollapsed
│
├── hooks/           ← 1 hook per data domain — data fetching logic
│   ├── useInventory.js  ← fetch, add, edit, delete items
│   ├── useRequests.js   ← fetch, submit, approve, reject, return requests
│   ├── useNotifications.js  ← polling, mark read, unread count
│   └── useUsers.js      ← fetch users, change role, toggle active
│
├── components/      ← Reusable UI pieces
│   ├── ui/              ← Button, Modal, Input, Card, Table
│   ├── auth/            ← RoleGuard, StaffOnly, FacultyOnly, AdminOnly
│   ├── layout/          ← Sidebar, Header, Layout, MobileDrawer
│   └── inventory/       ← InventoryItemCard, InventoryFormModal, DetailModal
│
├── pages/           ← 1 file per route — full page components
│   ├── Login.jsx        ← 78KB — animated split-panel login
│   ├── Dashboard.jsx    ← 42KB — stats, charts, activity
│   ├── Inventory.jsx    ← 51KB — browse, CRUD, filters, export
│   ├── Requests.jsx     ← 50KB — submit, approve, reject, return
│   ├── Reports.jsx      ← 49KB — analytics, CSV/PDF export
│   ├── Settings.jsx     ← 36KB — profile, appearance, admin
│   └── Users.jsx        ← 18KB — user management (admin only)
│
├── utils/           ← Pure helper functions
│   ├── roles.js         ← hasMinRole(), PERMISSIONS, getRoleBadge()
│   └── exportUtils.js   ← exportCSV(), exportPDF(), printReport()
│
└── routes/          ← Router configuration
    └── AppRouter.jsx    ← Route definitions with role guards
```

**Why this structure?** When working on the "Inventory" feature, a developer only needs to touch 4 files:
1. `inventoryService.js` — API calls
2. `useInventory.js` — data logic
3. `Inventory.jsx` — page UI
4. `components/inventory/` — sub-components

---

## 2. How the Frontend Communicates with the Backend

### 2.1 The API Layer — How Every Request Is Sent

All API communication goes through a single Axios instance in `services/api.js`:

```javascript
// Create Axios instance with base URL
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,    // e.g., "http://localhost:8000/api"
    headers: { 'Content-Type': 'application/json' },
});

// REQUEST INTERCEPTOR — attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;    // Read from Zustand store
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

**What happens on every API call:**
1. Component calls a service function: `inventoryService.getItems()`
2. Service calls: `api.get('/inventory/')`
3. Request interceptor attaches: `Authorization: Bearer eyJ...`
4. Axios sends the HTTP request to the backend
5. Backend validates the JWT, processes the request, returns JSON
6. Response arrives in the component for rendering

### 2.2 How Token Refresh Works — The Mutex Pattern

The most complex piece of frontend infrastructure. Here's the problem and solution:

**Problem:** User has been active for 60 minutes. Their access token expires. The Dashboard page simultaneously fires 3 API calls: fetch items, fetch requests, fetch notifications. All 3 get 401 Unauthorized.

**Without the mutex:** All 3 calls would try to refresh the token simultaneously. The first succeeds, but the second and third get a stale refresh token → all fail → user is logged out unexpectedly.

**The solution — a mutex queue:**

```javascript
let isRefreshing = false;      // Is a refresh request currently in flight?
let failedQueue = [];           // Queue of requests waiting for the refresh

api.interceptors.response.use(null, async (error) => {
    if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        if (isRefreshing) {
            // Another request is already refreshing — wait in the queue
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(newToken => {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);    // Retry with the new token
            });
        }

        // I'm the first one — do the refresh
        isRefreshing = true;
        try {
            const { data } = await axios.post('/auth/token/refresh/', { refresh: refreshToken });
            authStore.setToken(data.access);

            // Process everyone waiting in the queue
            failedQueue.forEach(req => req.resolve(data.access));
            failedQueue = [];

            // Retry the original request
            originalRequest.headers.Authorization = `Bearer ${data.access}`;
            return api(originalRequest);
        } catch (err) {
            failedQueue.forEach(req => req.reject(err));
            failedQueue = [];
            authStore.logout();    // Refresh failed → log out
            return Promise.reject(err);
        } finally {
            isRefreshing = false;
        }
    }
});
```

**Result:** Only 1 refresh request is sent. The other 2 wait in the queue, receive the new token, and retry automatically. The user sees no interruption.

---

## 3. How State Management Works (Zustand)

### 3.1 Auth Store — How User Session Is Managed

```javascript
const useAuthStore = create(
    persist(
        (set, get) => ({
            // State
            user: null,              // { id, username, role, department, ... }
            token: null,             // JWT access token string
            refreshToken: null,      // JWT refresh token string
            isAuthenticated: false,

            // Actions
            login: async (credentials) => {
                const response = await authService.login(credentials);
                set({
                    user: response.user,
                    token: response.access,
                    refreshToken: response.refresh,
                    isAuthenticated: true,
                });
            },

            logout: () => {
                set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
                window.location.href = '/login';
            },

            setToken: (token) => set({ token }),    // Called by the refresh interceptor
            updateUser: (userData) => set({ user: { ...get().user, ...userData } }),
        }),
        { name: 'auth-storage' }    // <-- persisted to localStorage
    )
);
```

**How persistence works:** Zustand's `persist` middleware automatically:
1. On state change → serializes to JSON → saves to `localStorage['auth-storage']`
2. On page load → reads from `localStorage['auth-storage']` → hydrates the store

This means: refreshing the browser, closing the tab, or even restarting the browser does NOT log you out (as long as the refresh token hasn't expired after 7 days).

### 3.2 UI Store — How Preferences Are Saved

```javascript
const useUIStore = create(
    persist(
        (set) => ({
            theme: 'system',         // light | dark | system
            viewMode: 'card',        // card | table
            itemsPerPage: 12,        // 6 | 12 | 24 | 48
            showImages: true,
            sidebarCollapsed: false,

            setTheme: (theme) => set({ theme }),
            setViewMode: (mode) => set({ viewMode: mode }),
            setItemsPerPage: (n) => set({ itemsPerPage: n }),
        }),
        { name: 'ui-storage' }
    )
);
```

---

## 4. How Each Page Works

### 4.1 Login Page — How the Animated Login Experience Works

The Login page (78KB) is the largest single file because it contains:

1. **Split-panel layout:**
   - Left panel: dark gradient background with system logo, animated floating particles, and tagline
   - Right panel: white form with animated input fields
   - On mobile (< 768px): left panel becomes a compact header

2. **AnimatedInput components:** Custom form inputs where the label starts inside the field, then floats up and shrinks when the user clicks (focus) or types. Uses CSS transitions:
   ```css
   .label { transform: translateY(0); font-size: 14px; } /* Default: inside */
   .focused .label { transform: translateY(-22px); font-size: 11px; } /* Focused: floats up */
   ```

3. **Progressive lockout display:** After each failed login, the frontend shows:
   - "Invalid credentials. 4 attempts remaining." (attempts 1–4)
   - After 5 failures, the backend returns 429 with `wait` seconds
   - Frontend shows a countdown: "Account locked. Try again in 12 minutes."
   - A progress bar visually decreases as lockout time passes

4. **Auto-redirect:** On successful login:
   - Students → `/requests` (they mostly want to submit/track requests)
   - Faculty/Staff/Admin → `/dashboard` (they need the overview first)

### 4.2 Dashboard Page — How Stats & Charts Are Computed

When the Dashboard mounts:

```javascript
function Dashboard() {
    const { items, fetchItems } = useInventory();
    const { requests, fetchRequests } = useRequests();

    useEffect(() => {
        fetchItems();      // GET /api/inventory/
        fetchRequests();   // GET /api/requests/
    }, []);

    // COMPUTE STATS from raw data
    const stats = useMemo(() => ({
        total: items.length,
        available: items.filter(i => i.status === 'AVAILABLE').length,
        inUse: items.filter(i => i.status === 'IN_USE').length,
        maintenance: items.filter(i => i.status === 'MAINTENANCE').length,
        lowStock: items.filter(i => i.quantity > 0 && i.quantity <= 5).length,
    }), [items]);

    // CHART DATA — group items by category for pie chart
    const categoryData = useMemo(() => {
        const groups = {};
        items.forEach(item => {
            groups[item.category] = (groups[item.category] || 0) + 1;
        });
        return Object.entries(groups).map(([name, value]) => ({ name, value }));
    }, [items]);

    // MONTHLY TRENDS — group requests by month for bar chart
    const monthlyData = useMemo(() => {
        const months = {};
        requests.forEach(req => {
            const month = format(new Date(req.created_at), 'MMM yyyy');
            months[month] = (months[month] || 0) + 1;
        });
        return Object.entries(months).map(([name, count]) => ({ name, count }));
    }, [requests]);
}
```

**Low Stock Alert Navigation:** Clicking a low-stock item card:
```javascript
navigate(`/inventory?item=${item.id}`);
// On the Inventory page, useEffect reads the URL param:
const params = new URLSearchParams(location.search);
const itemId = params.get('item');
if (itemId) openDetailModal(parseInt(itemId));
```

### 4.3 Inventory Page — How Browsing, Filtering, and Grouping Work

**Step 1: Fetch and Filter**
```javascript
const filteredItems = useMemo(() => {
    return items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !categoryFilter || item.category === categoryFilter;
        const matchesStatus = !statusFilter || item.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
    });
}, [items, search, categoryFilter, statusFilter]);
```

**Step 2: Group by Stock Level**
```javascript
const stockGroups = [
    { label: '🔴 Out of Stock', items: filteredItems.filter(i => i.quantity === 0) },
    { label: '🟡 Low Stock',    items: filteredItems.filter(i => i.quantity > 0 && i.quantity <= 5) },
    { label: '🟢 Normal Stock', items: filteredItems.filter(i => i.quantity > 5) },
];
// Each group is collapsible — user can expand/collapse
```

**Step 3: Paginate**
```javascript
const itemsPerPage = uiStore.itemsPerPage;    // 6, 12, 24, or 48
const paged = currentGroupItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
);
```

**Step 4: Render**
- If `viewMode === 'card'`: renders `<InventoryItemCard>` in a responsive CSS grid (1–4 columns based on screen width)
- If `viewMode === 'table'`: renders a `<Table>` with sortable columns
- On mobile (< 768px): forced to card view regardless of setting

### 4.4 Requests Page — How the Approval Workflow Looks to Each Role

**Student View:**
- Sees only their OWN requests (backend filters by `requested_by=current_user`)
- Can submit new requests: "Request Item" button opens a form modal
- Can cancel PENDING requests (button disappears once approved)
- Can add comments to discuss with staff
- Status badges show the current lifecycle stage

**Staff View:**
- Sees ALL requests from ALL users (backend returns full list)
- Filter tabs: All | Pending (badge: 3) | Approved | Completed | Returned
- Each pending request shows Approve/Reject buttons
- Clicking Approve → immediate stock deduction, status change, notification sent
- Clicking Reject → text field for rejection reason → save → notification sent
- Approved requests show Release button (for physical handover)
- Released requests show Return button (when item comes back)

**How a single request card renders:**
```jsx
<RequestCard>
    <Avatar user={request.requested_by} />
    <ItemName>{request.item_name}</ItemName>
    <Quantity>×{request.quantity}</Quantity>
    <Purpose>{request.purpose}</Purpose>
    <StatusBadge status={request.status} />
    <Date>{formatDistanceToNow(request.created_at)} ago</Date>

    <StaffOnly>
        {request.status === 'PENDING' && (
            <>
                <Button onClick={() => handleApprove(request.id)}>Approve</Button>
                <Button onClick={() => handleReject(request.id)}>Reject</Button>
            </>
        )}
        {request.status === 'APPROVED' && (
            <Button onClick={() => handleRelease(request.id)}>Release</Button>
        )}
        {request.status === 'COMPLETED' && request.item?.is_returnable && (
            <Button onClick={() => handleReturn(request.id)}>Return Item</Button>
        )}
    </StaffOnly>
</RequestCard>
```

### 4.5 Reports Page — How Export Works Step by Step

**CSV Export Process:**
1. Staff clicks "Export CSV" button
2. `exportCSV()` function compiles data:
   ```javascript
   const headers = ['Name', 'Category', 'Quantity', 'Status', 'Location', 'Date Added'];
   const rows = items.map(item => [item.name, item.category, item.quantity, ...]);
   const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\r\n');
   // \uFEFF = UTF-8 BOM marker — tells Excel to use UTF-8 encoding
   ```
3. Browser's File System Access API opens native "Save As" dialog:
   ```javascript
   const handle = await window.showSaveFilePicker({
       suggestedName: `inventory_${format(new Date(), 'yyyy-MM-dd')}.csv`,
       types: [{ accept: { 'text/csv': ['.csv'] } }],
   });
   const writable = await handle.createWritable();
   await writable.write(csvBlob);
   await writable.close();
   ```
4. If `showSaveFilePicker` is not supported (Firefox/Safari): falls back to anchor download

**PDF Export Process:**
1. Staff clicks "Export PDF" button
2. `exportPDF()` creates a jsPDF document client-side:
   ```javascript
   const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
   doc.setFontSize(18);
   doc.text('PLMun Inventory Items List', 14, 20);
   doc.setFontSize(10);
   doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 28);

   autoTable(doc, {
       head: [['Name', 'Category', 'Qty', 'Status', 'Location', 'Priority']],
       body: items.map(i => [i.name, i.category, i.quantity, i.status, i.location, i.priority]),
       startY: 35,
       theme: 'grid',
       headStyles: { fillColor: [37, 99, 235] },    // Blue header
       alternateRowStyles: { fillColor: [245, 247, 250] },
   });

   // Footer with page numbers
   const pages = doc.internal.getNumberOfPages();
   for (let i = 1; i <= pages; i++) {
       doc.setPage(i);
       doc.text(`Page ${i} of ${pages}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
   }
   ```
3. Same "Save As" dialog as CSV

---

## 5. How Role-Based Access Control Works on the Frontend

### 5.1 The RoleGuard Component

```jsx
function RoleGuard({ minRole, children, fallback = null }) {
    const user = useAuthStore(state => state.user);
    const hasAccess = hasMinRole(user?.role, minRole);
    return hasAccess ? children : fallback;
}

// Convenience wrappers
const StaffOnly = ({ children }) => <RoleGuard minRole="STAFF">{children}</RoleGuard>;
const AdminOnly = ({ children }) => <RoleGuard minRole="ADMIN">{children}</RoleGuard>;
```

**How it's used throughout the app:**
```jsx
// Inventory page — Add button only for Staff+
<StaffOnly>
    <Button onClick={() => setShowAddModal(true)}>+ Add Item</Button>
</StaffOnly>

// Item card — Edit/Delete only for Staff+
<StaffOnly>
    <IconButton onClick={() => handleEdit(item)}>✏️</IconButton>
    <IconButton onClick={() => handleDelete(item.id)}>🗑️</IconButton>
</StaffOnly>

// Users page — entire route protected
<Route path="/users" element={
    <AdminOnly fallback={<AccessDenied />}>
        <Users />
    </AdminOnly>
} />
```

**Important: this is VISUAL protection only.** Even if someone hacks the frontend to show the "Add Item" button, clicking it would send `POST /api/inventory/` which the backend rejects with 403 because the backend ALSO checks permissions. Double protection.

### 5.2 Route Protection

```jsx
function AppRouter() {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);

    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />

            {/* Protected — must be logged in */}
            <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<RoleGuard minRole="FACULTY"><Dashboard /></RoleGuard>} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/requests" element={<Requests />} />
                <Route path="/reports" element={<RoleGuard minRole="STAFF"><Reports /></RoleGuard>} />
                <Route path="/users" element={<RoleGuard minRole="ADMIN"><Users /></RoleGuard>} />
            </Route>
        </Routes>
    );
}
```

---

## 6. How Dark Mode Works

```javascript
// In the Layout component, on mount and whenever theme changes:
useEffect(() => {
    const applyTheme = () => {
        const isDark =
            theme === 'dark' ||
            (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', isDark);
    };

    applyTheme();

    // If theme is 'system', listen for OS changes
    if (theme === 'system') {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', applyTheme);
        return () => mq.removeEventListener('change', applyTheme);
    }
}, [theme]);
```

In Tailwind CSS, the `dark:` prefix activates when `<html class="dark">` is present:
```html
<div class="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">
    <!-- White background in light mode, dark slate in dark mode -->
</div>
```

---

## 7. How Notifications Are Polled

```javascript
function useNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        const data = await requestService.getNotifications();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
    };

    useEffect(() => {
        fetchNotifications();                                    // Fetch immediately on mount
        const interval = setInterval(fetchNotifications, 30000); // Then every 30 seconds
        return () => clearInterval(interval);                    // Cleanup on unmount
    }, []);

    return { notifications, unreadCount, fetchNotifications, markAsRead, markAllRead };
}
```

**In the Header component:**
```jsx
<button onClick={toggleDropdown}>
    <Bell />
    {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
</button>
```

---

## 8. How Responsive Design Works

```javascript
// Custom hook to detect mobile
function useMediaQuery(query) {
    const [matches, setMatches] = useState(window.matchMedia(query).matches);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const handler = (e) => setMatches(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [query]);
    return matches;
}

const isMobile = useMediaQuery('(max-width: 768px)');
```

**How it affects the UI:**
- **Sidebar:** Full sidebar on desktop, hamburger drawer on mobile
- **Inventory:** Card grid on mobile (forced), card/table on desktop (user choice)
- **Tables:** Horizontally scrollable on mobile
- **Modals:** Full-screen on mobile, centered overlay on desktop

---

## 9. Challenges & How We Solved Them

| Challenge | Root Cause | Solution |
|-----------|-----------|---------|
| Faculty could edit/delete items | Used `<FacultyOnly>` wrapper instead of `<StaffOnly>` | Changed all management buttons to `<StaffOnly>` |
| PDF exported "Report" instead of inventory items | Wrong data payload and title in `handleExportPDF()` | Fixed to use items array with title "PLMun Inventory Items List" |
| 3 simultaneous 401s caused triple refresh → logout | No mutex on token refresh | Added `isRefreshing` flag + `failedQueue` array |
| Circular import: authStore ↔ api | authStore imports api.js, api.js imports authStore | Used lazy dynamic import: `() => import('../store/authStore')` |
| Inventory page was 1100+ lines | All inventory UI logic in one file | Extracted: InventoryItemCard, InventoryFormModal, InventoryDetailModal |
| Table view unusable on phones | Columns overflow screen | Auto-switch to card view when `window.width < 768px` |
| Search losing URL sync | Filter state only in React state | Synced filters to URL params so bookmarking/sharing works |

---

*PLMun Inventory Nexus — Frontend Development Documentation*
*BSCS 3D · Software Engineering 1 · Prof. Mr. Melchor Paz*
*Academic Year 2025–2026*
