# Testing, Security & Deployment Documentation

## PLMun Inventory Nexus
### BSCS 3D · Software Engineering 1 · AY 2025–2026

---

## 1. Testing Strategy

### 1.1 Testing Overview

| Layer | Tool | What We Test |
|-------|------|-------------|
| Unit Tests | Vitest + JSDOM | Role utilities, permission logic, helper functions |
| API Tests | Django REST Framework Test Client | Endpoint responses, permissions, validation |
| Browser Tests | Manual + Screen Recording | User flows, responsive layout, dark mode, exports |

### 1.2 Frontend Unit Tests — How They Work

Tests are in `frontend/src/test/` and run using **Vitest** (a Vite-native test runner):

**Test Configuration:**
```javascript
// vite.config.js
test: {
    globals: true,             // No need to import describe/it/expect
    environment: 'jsdom',      // Simulates a browser DOM
    setupFiles: './src/test/setup.js',    // Global test setup
}
```

**Role Permission Tests (`roles.test.js`):**
These are the most critical tests — they verify the permission matrix is correct:

```javascript
describe('roles utilities', () => {
    // Verify the role hierarchy ordering
    it('orders STUDENT < FACULTY < STAFF < ADMIN', () => {
        expect(ROLE_HIERARCHY['STUDENT']).toBeLessThan(ROLE_HIERARCHY['FACULTY']);
        expect(ROLE_HIERARCHY['FACULTY']).toBeLessThan(ROLE_HIERARCHY['STAFF']);
        expect(ROLE_HIERARCHY['STAFF']).toBeLessThan(ROLE_HIERARCHY['ADMIN']);
    });

    // Verify hasMinRole works correctly
    it('ADMIN has min role STUDENT', () => {
        expect(hasMinRole('ADMIN', 'STUDENT')).toBe(true);     // Admin can do student things
    });
    it('STUDENT does NOT have min role STAFF', () => {
        expect(hasMinRole('STUDENT', 'STAFF')).toBe(false);    // Student can't do staff things
    });

    // Verify specific permissions (these caught the FacultyOnly bug)
    it('STAFF can delete inventory (ARCH-04 fix)', () => {
        expect(hasPermission('STAFF', 'DELETE_INVENTORY')).toBe(true);
    });
    it('STUDENT cannot edit inventory', () => {
        expect(hasPermission('STUDENT', 'EDIT_INVENTORY')).toBe(false);
    });

    // Edge cases
    it('returns false for unknown roles', () => {
        expect(hasMinRole('UNKNOWN', 'STUDENT')).toBe(false);
    });
    it('returns false for unknown permissions', () => {
        expect(hasPermission('ADMIN', 'DOES_NOT_EXIST')).toBe(false);
    });
});
```

**How to run the tests:**
```bash
cd frontend
npm run test         # Run all tests
npx vitest --run     # Run once (CI mode)
npx vitest --watch   # Watch mode (re-runs on save)
```

### 1.3 Backend API Testing — How Endpoints Are Verified

Django REST Framework's test client is used to simulate API requests:

```python
# How we test that only Staff can create items
class ItemAPITest(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(username='student', role='STUDENT')
        self.staff = User.objects.create_user(username='staff', role='STAFF')

    def test_student_cannot_create_item(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/inventory/', {'name': 'Laptop', ...})
        self.assertEqual(response.status_code, 403)    # Forbidden

    def test_staff_can_create_item(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.post('/api/inventory/', {'name': 'Laptop', ...})
        self.assertEqual(response.status_code, 201)    # Created

    def test_student_cannot_approve_request(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(f'/api/requests/{req_id}/approve/')
        self.assertEqual(response.status_code, 403)

    def test_cannot_approve_own_request(self):
        self.client.force_authenticate(user=self.staff)
        req = Request.objects.create(requested_by=self.staff, item=item)
        response = self.client.post(f'/api/requests/{req.id}/approve/')
        self.assertEqual(response.status_code, 403)    # Self-approval blocked
```

### 1.4 Manual Testing Checklist

We used this checklist before each system checking:

**Authentication:**
- [ ] Register new account → auto-login works
- [ ] Login with correct credentials → redirects to correct page per role
- [ ] Login with wrong password → shows error, remaining attempts
- [ ] 5 failed attempts → account locked for 15 minutes
- [ ] Token refresh → no visible logout after 60 minutes of activity
- [ ] Inactive account → login rejected with "Account deactivated"

**Inventory:**
- [ ] Students see only STUDENT-access items
- [ ] Staff see all items regardless of access_level
- [ ] Add item with image → image displays on card
- [ ] Edit item → changes reflected immediately
- [ ] Delete item → confirmation modal, then removed from list
- [ ] Change status → note required, maintenance ETA for maintenance
- [ ] Search → filters items by name in real-time
- [ ] Category filter → shows only selected category
- [ ] Status filter → shows only selected status
- [ ] Card/Table toggle → layout changes, preference saved

**Borrow Requests:**
- [ ] Submit request → appears as PENDING, staff notified
- [ ] Approve → stock deducted, requester notified
- [ ] Approve when stock = 0 → error "Insufficient stock"
- [ ] Reject with reason → requester sees reason in notification
- [ ] Release → status COMPLETED
- [ ] Return → stock restored, overdue check runs
- [ ] Return late → user flagged, overdue count incremented
- [ ] Cancel pending request → no stock impact
- [ ] Cannot cancel approved request

**Exports:**
- [ ] CSV export → opens Save As dialog, file contains correct data
- [ ] PDF export → opens Save As, formatted with table and branding
- [ ] Print → new tab with clean layout, print dialog opens

**Admin:**
- [ ] Change user role → takes effect immediately
- [ ] Deactivate user → user cannot log in
- [ ] Reactivate user → user can log in again
- [ ] Delete user → user removed, cannot delete self
- [ ] Audit logs → shows all actions with timestamps and IPs

---

## 2. Security Implementation — How the System Is Protected

### 2.1 Authentication Security

**Progressive Account Lockout — How It Works Step by Step:**
1. User enters wrong password → `failed_login_attempts` incremented from 0 to 1
2. User enters wrong password again → incremented to 2 (3 remaining)
3. Repeats until `failed_login_attempts` reaches 5
4. Backend sets `lockout_until = now() + 15 minutes`
5. On next login attempt, backend checks: `timezone.now() < user.lockout_until`
   - If locked → returns 429 Too Many Requests with `wait` seconds
   - Frontend shows countdown "Account locked. Try again in X minutes."
6. After 15 minutes, lockout expires → user can try again
7. On successful login → `failed_login_attempts` reset to 0, `lockout_until` cleared

**JWT Token Security:**
| Setting | Value | Why |
|---------|-------|-----|
| Access token lifetime | 60 minutes | If stolen, attacker has limited window |
| Refresh token lifetime | 1 day | Forces re-login daily (was 7 days, reduced for security) |
| Rotate refresh tokens | True | Old refresh token invalidated after use |
| Blacklist after rotation | True | Prevents replay with old refresh tokens |
| Auth header type | Bearer | Industry standard |

### 2.2 API Security — How Every Endpoint Is Protected

**Layer 1: JWT Authentication (Every Request)**
```
Client → Authorization: Bearer eyJ... → Django
Django → SimpleJWT validates signature, checks expiry → User identified
If invalid/expired → 401 Unauthorized
```

**Layer 2: Permission Classes (Per Endpoint)**
```python
# Applied to every view — checked AFTER authentication
class IsStaffOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_min_role('STAFF')
        # STUDENT → False → 403 Forbidden
        # FACULTY → False → 403 Forbidden
        # STAFF   → True  → Allowed
        # ADMIN   → True  → Allowed
```

**Layer 3: Business Logic Guards (Per Action)**
```python
# Self-approval prevention
if req.requested_by == request.user:
    return 403  # "You cannot approve your own request"

# Status guard
if req.status != 'PENDING':
    return 400  # "Only pending requests can be approved"

# Stock guard (atomic)
updated = Item.objects.filter(pk=item.pk, quantity__gte=qty).update(...)
if not updated:
    return 400  # "Insufficient stock"
```

### 2.3 CORS — How Cross-Origin Requests Are Controlled

```python
# Only our frontend URL can make API requests
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',          # Local development
    'http://127.0.0.1:5173',
] + [env_origins]                     # Production frontend URL from env

CORS_ALLOW_CREDENTIALS = True
# Previously used CORS_ALLOW_ALL_ORIGINS = DEBUG → REMOVED for security
# Now uses strict whitelist even in development
```

**How CORS works:**
1. Browser sends `Origin: http://localhost:5173` header with the API request
2. Django CORS middleware checks if origin is in `CORS_ALLOWED_ORIGINS`
3. If allowed → adds `Access-Control-Allow-Origin: http://localhost:5173` header
4. If NOT allowed → no CORS header → browser blocks the response

### 2.4 Content Security Policy (CSP) — How Injection Attacks Are Prevented

Custom middleware in `config/middleware.py` adds CSP headers to every response:

```python
class CSPMiddleware:
    DEFAULT_POLICY = {
        'default-src':    ["'self'"],                        # Only load from same origin
        'script-src':     ["'self'"],                        # No inline scripts, no external scripts
        'style-src':      ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        'font-src':       ["'self'", "https://fonts.gstatic.com"],
        'img-src':        ["'self'", "data:", "blob:", "https:"],  # Allow image uploads
        'connect-src':    ["'self'"],                        # API calls only to same origin
        'frame-ancestors': ["'none'"],                       # Cannot be embedded in iframe
        'base-uri':       ["'self'"],
        'form-action':    ["'self'"],
    }
```

**What this prevents:**
- `script-src: 'self'` → An attacker cannot inject `<script src="evil.com/steal-jwt.js">` because the browser will refuse to load scripts from evil.com
- `frame-ancestors: 'none'` → The site cannot be embedded in an iframe (prevents clickjacking)
- `connect-src: 'self'` → Even if XSS somehow executes, it cannot send stolen data to external servers

### 2.5 Additional HTTP Security Headers

```python
# Prevent MIME-type sniffing (stops browser from guessing file types)
SECURE_CONTENT_TYPE_NOSNIFF = True

# Block page from being embedded in iframes (clickjacking protection)
X_FRAME_OPTIONS = 'DENY'

# Enable browser's built-in XSS filter
SECURE_BROWSER_XSS_FILTER = True

# Don't leak full URLs when linking to external sites
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Production-only: HTTPS enforcement
SECURE_HSTS_SECONDS = 31536000      # Force HTTPS for 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
```

### 2.6 Race Condition Protection — How Atomic Operations Work

**The Problem:** Two staff members click "Approve" on the same request at the same time. Without protection, both would deduct stock, causing a negative quantity.

**The Solution — Django F() Expression:**
```python
# This generates: UPDATE items SET quantity = quantity - 5 WHERE id = 42 AND quantity >= 5
rows = Item.objects.filter(pk=42, quantity__gte=5).update(quantity=F('quantity') - 5)
```

**Why this is safe:** The `WHERE quantity >= 5` check and the `SET quantity = quantity - 5` happen in a single SQL statement. PostgreSQL guarantees this is atomic — even if two queries run simultaneously, the database serializes them:
- Query 1 runs first: quantity 10 → 5 (rows affected = 1 ✅)
- Query 2 runs second: quantity 5 → check quantity >= 5... still passes, quantity 5 → 0 (rows = 1 ✅)
- If both requested 10: Query 2 finds quantity = 0, 0 >= 10 fails, rows = 0 → rejected ❌

### 2.7 Password Security

Django's built-in password validators are enabled:
```python
AUTH_PASSWORD_VALIDATORS = [
    UserAttributeSimilarityValidator,   # Password can't be too similar to username
    MinimumLengthValidator,             # Minimum 8 characters
    CommonPasswordValidator,            # Not in the 20,000 most common passwords list
    NumericPasswordValidator,           # Can't be entirely numeric
]
```

Passwords are hashed using PBKDF2-SHA256 with a per-user salt (Django default). The plaintext is never stored.

---

## 3. Deployment — How the System Runs in Production

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Render.com                           │
│                                                         │
│  ┌──────────────────┐    ┌──────────────────────────┐  │
│  │ Static Site       │    │ Web Service               │  │
│  │ (Frontend)        │    │ (Backend)                 │  │
│  │                   │    │                           │  │
│  │ React SPA         │───>│ Gunicorn + Django         │  │
│  │ Vite build output │    │ REST API + WhiteNoise     │  │
│  │ dist/ folder      │    │                           │  │
│  └──────────────────┘    └───────────┬──────────────┘  │
│                                      │                  │
│                           ┌──────────┴──────────┐      │
│                           │ PostgreSQL 16        │      │
│                           │ Managed Database     │      │
│                           │ (auto-backup daily)  │      │
│                           └─────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Backend Deployment — Step by Step

**Build Script (`build.sh`) — Runs on every git push:**
```bash
#!/bin/bash
set -o errexit                             # Stop on any error

echo "==> Installing Python dependencies..."
pip install -r requirements.txt            # Install all packages

echo "==> Collecting static files..."
python manage.py collectstatic --noinput   # Gather admin CSS/JS for WhiteNoise

echo "==> Running migrations..."
python manage.py migrate                   # Apply database schema changes

echo "==> Seeding admin account..."
python manage.py seed_admin                # Create default admin if not exists

echo "==> Build complete!"
```

**Start Command:**
```bash
gunicorn config.wsgi --bind 0.0.0.0:$PORT
# Gunicorn is a production WSGI server (not the Django dev server)
# $PORT is provided by Render's environment
```

**Environment Variables on Render:**
| Variable | Purpose | Example |
|----------|---------|---------|
| `SECRET_KEY` | Django crypto key | `kd83jd...` (64 random chars) |
| `DATABASE_URL` | PostgreSQL connection | `postgres://user:pass@host:5432/dbname` |
| `CORS_ORIGINS` | Allowed frontend URL | `https://plmun-nexus.onrender.com` |
| `DEBUG` | Debug mode | `False` (NEVER True in production) |
| `ALLOWED_HOSTS` | Valid hostnames | `plmun-nexus-api.onrender.com` |

### 3.3 Frontend Deployment

**Build Process:**
```bash
npm install          # Install node_modules
npm run build        # Vite production build → outputs to dist/
```

**What Vite Build Does:**
1. **Tree-shaking** — removes unused code (e.g., unused Recharts components)
2. **Code splitting** — each route loaded on-demand (lazy loading)
3. **Minification** — JavaScript and CSS compressed to smallest size
4. **Asset hashing** — filenames include content hashes (e.g., `main.a3f8c2d.js`) for cache busting
5. **PurgeCSS** — unused Tailwind classes removed (shrinks CSS from ~3MB to ~30KB)

**Render Static Site Config:**
| Setting | Value |
|---------|-------|
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |
| Environment Variable | `VITE_API_URL=https://plmun-nexus-api.onrender.com/api` |
| Rewrite Rules | `/* → /index.html` (SPA routing) |

### 3.4 Database — How Data Is Stored in Production

- **Engine:** PostgreSQL 16 (managed by Render — automated daily backups)
- **Connection:** Via `DATABASE_URL` environment variable, parsed by `dj-database-url`
- **Fallback:** SQLite for local development (auto-detected when no DATABASE_URL)
- **Timezone:** Asia/Manila (UTC+8)

### 3.5 Static & Media Files — How They're Served

**Static Files (CSS, JS, admin assets):**
- Collected by `collectstatic` into `staticfiles/` directory
- Served by WhiteNoise middleware (compressed, cached, no separate web server needed)

**Media Files (User uploads — avatars, item images):**
- Stored in `media/` directory on the Render instance
- **Limitation:** Render uses ephemeral disks — files are lost on redeploy
- **Current workaround:** Images are re-uploaded as needed after deploy
- **Future plan:** Migrate to cloud storage (AWS S3 or Cloudinary)

---

## 4. Local Development Setup — How to Run the System

### 4.1 Start Both Servers

The project includes a `start.ps1` script that launches both servers:

```powershell
# Terminal 1: Backend
cd Backend
python -m venv venv                  # Create virtual environment (first time only)
.\venv\Scripts\Activate              # Activate venv
pip install -r requirements.txt      # Install dependencies (first time only)
python manage.py migrate             # Apply migrations
python manage.py runserver           # Start Django dev server at localhost:8000

# Terminal 2: Frontend
cd frontend
npm install                          # Install node_modules (first time only)
npm run dev                          # Start Vite dev server at localhost:5173
```

### 4.2 Environment Variables

**Backend `.env`:**
```env
DEBUG=True
SECRET_KEY=django-insecure-dev-key-change-in-production
DATABASE_URL=                        # Empty = use SQLite
CORS_ORIGINS=http://localhost:5173
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:8000/api
```

---

*PLMun Inventory Nexus — Testing, Security & Deployment Documentation*
*BSCS 3D · Software Engineering 1 · Prof. Mr. Melchor Paz*
*Academic Year 2025–2026*
