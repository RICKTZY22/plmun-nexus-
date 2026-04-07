# Backend Technical Documentation

## PLMun Inventory Nexus — Server-Side Architecture
### BSCS 3D · Software Engineering 1 · AY 2025–2026

---

## 1. Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Language | Python | 3.12 | Server-side logic |
| Framework | Django | 6.0 | Web framework with ORM |
| REST API | Django REST Framework | 3.15 | Serialization, ViewSets, routing |
| Auth | SimpleJWT | 5.3 | JWT access/refresh token management |
| Database | PostgreSQL | 16 | Production (Render.com managed) |
| Database | SQLite3 | — | Local development |
| API Docs | drf-spectacular | — | Swagger/Redoc auto-generation |
| Server | Gunicorn | — | Production WSGI server |
| Hosting | Render.com | — | Cloud deployment |

---

## 2. Project Structure

```
Backend/
├── config/                          # Project configuration
│   ├── settings.py                  # Django settings (DB, JWT, CORS, middleware)
│   ├── urls.py                      # Root URL routing
│   └── wsgi.py                      # WSGI entry point for Gunicorn
│
├── apps/                            # Django applications
│   ├── permissions.py               # Shared permission classes (3 classes)
│   │
│   ├── authentication/              # User auth & audit
│   │   ├── models.py                # User model, AuditLog model
│   │   ├── views.py                 # Login, Register, Profile, AuditLog, Backup, Maintenance
│   │   ├── serializers.py           # User/Register/Profile/Password serializers
│   │   └── urls.py                  # 8 auth endpoints
│   │
│   ├── inventory/                   # Item management
│   │   ├── models.py                # Item model (15+ fields)
│   │   ├── views.py                 # ItemViewSet (CRUD + status transitions)
│   │   ├── serializers.py           # ItemSerializer with computed fields
│   │   └── urls.py                  # Router-based CRUD endpoints
│   │
│   ├── requests/                    # Borrow request workflow
│   │   ├── models.py                # Request, Comment, Notification models
│   │   ├── views.py                 # RequestViewSet (approve/reject/release/return)
│   │   ├── serializers.py           # Request/Comment/Notification serializers
│   │   └── urls.py                  # Router-based endpoints + notifications
│   │
│   └── users/                       # Admin user management
│       ├── views.py                 # UserViewSet (role assignment, deactivation)
│       ├── serializers.py           # Admin user serializer
│       └── urls.py                  # Router-based user management
│
├── media/                           # Uploaded files (avatars, item images)
├── seed_items.py                    # Database seeder (80 inventory items)
├── requirements.txt                 # Python dependencies
├── build.sh                         # Render.com build script
├── Procfile                         # Gunicorn process config
└── manage.py                        # Django CLI
```

---

## 3. Database Models

### 3.1 User Model (`apps.authentication.models.User`)

Extends Django's `AbstractUser` with custom fields for role-based access control.

```python
class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = 'STUDENT'
        FACULTY = 'FACULTY'
        STAFF   = 'STAFF'
        ADMIN   = 'ADMIN'

    role         = CharField(max_length=20, choices=Role.choices, default='STUDENT')
    department   = CharField(max_length=100, blank=True)
    student_id   = CharField(max_length=20, blank=True)
    avatar       = ImageField(upload_to='avatars/', null=True, blank=True)
    phone        = CharField(max_length=20, blank=True)
    is_flagged   = BooleanField(default=False)                # Flagged for overdue
    overdue_count = PositiveIntegerField(default=0)           # Lifetime overdue count
```

**Role Hierarchy:**
```
STUDENT (0) < FACULTY (1) < STAFF (2) < ADMIN (3)
```

**Key Method:**
```python
def has_min_role(self, min_role: str) -> bool:
    """Check if user has at least the specified role level."""
    return ROLE_HIERARCHY.get(self.role, 0) >= ROLE_HIERARCHY.get(min_role, 0)
```

---

### 3.2 AuditLog Model (`apps.authentication.models.AuditLog`)

Tracks all user actions for administrative accountability.

| Field | Type | Description |
|-------|------|-------------|
| `user` | ForeignKey(User) | Who performed the action |
| `username` | CharField | Cached username (survives user deletion) |
| `action` | CharField(choices) | Action type (Login, Item Created, etc.) |
| `details` | TextField | Additional context |
| `ip_address` | GenericIPAddressField | Client IP address |
| `timestamp` | DateTimeField | Auto-set on creation |

**14 tracked action types:** Login, Logout, Login Failed, Register, Profile Update, Password Changed, Item Created/Updated/Deleted, Request Created/Approved/Rejected, Status Change, History Cleared

---

### 3.3 Item Model (`apps.inventory.models.Item`)

Represents a physical inventory item with full lifecycle tracking.

| Field | Type | Description |
|-------|------|-------------|
| `name` | CharField(200) | Item name |
| `category` | CharField (choices) | ELECTRONICS, FURNITURE, EQUIPMENT, SUPPLIES, OTHER |
| `description` | TextField | Detailed description |
| `quantity` | PositiveIntegerField | Current stock count |
| `status` | CharField (choices) | AVAILABLE, IN_USE, MAINTENANCE, RETIRED |
| `location` | CharField(200) | Physical location |
| `access_level` | CharField | Minimum role to view (STUDENT/FACULTY/STAFF/ADMIN) |
| `image` | ImageField | Item photo |
| `priority` | CharField | HIGH, MEDIUM, LOW |
| `is_returnable` | BooleanField | Whether item must be returned |
| `borrow_duration` | PositiveIntegerField | Max borrow duration |
| `borrow_duration_unit` | CharField | HOURS, DAYS, WEEKS |
| `status_note` | TextField | Reason for current status |
| `maintenance_eta` | DateField | Expected maintenance completion |
| `created_at` | DateTimeField | Auto-set |
| `updated_at` | DateTimeField | Auto-updated |

---

### 3.4 Request Model (`apps.requests.models.Request`)

Tracks the full lifecycle of a borrow request.

| Field | Type | Description |
|-------|------|-------------|
| `item` | ForeignKey(Item) | Requested item |
| `item_name` | CharField | Denormalized — preserves name if item renamed |
| `requested_by` | ForeignKey(User) | Who submitted the request |
| `quantity` | PositiveIntegerField | Number of items requested |
| `purpose` | TextField | Why the item is needed |
| `status` | CharField | PENDING, APPROVED, REJECTED, COMPLETED, RETURNED, CANCELLED |
| `approved_by` | ForeignKey(User) | Staff who approved |
| `approved_at` | DateTimeField | When approved |
| `rejection_reason` | TextField | Why rejected |
| `expected_return` | DateTimeField | When item should be returned |
| `returned_at` | DateTimeField | When item was actually returned |
| `is_cleared` | BooleanField | Soft delete (hidden from active view, preserved for audit) |
| `created_at` | DateTimeField | Submission timestamp |

**Status State Machine:**
```
PENDING ──→ APPROVED ──→ COMPLETED ──→ RETURNED
   │            │
   ↓            ↓
REJECTED    CANCELLED

APPROVED + past expected_return → OVERDUE (user flagged)
```

### 3.5 Comment Model

| Field | Type | Description |
|-------|------|-------------|
| `request` | ForeignKey(Request) | Parent request |
| `author` | ForeignKey(User) | Comment author |
| `text` | TextField | Comment content |
| `created_at` | DateTimeField | Timestamp |

### 3.6 Notification Model

| Field | Type | Description |
|-------|------|-------------|
| `recipient` | ForeignKey(User) | Who receives the notification |
| `sender` | ForeignKey(User) | Who triggered it |
| `request` | ForeignKey(Request) | Related request |
| `type` | CharField | COMMENT, STATUS_CHANGE, REMINDER, OVERDUE |
| `message` | TextField | Notification text |
| `is_read` | BooleanField | Read status |
| `created_at` | DateTimeField | Timestamp |

---

## 4. API Endpoints

### 4.1 Authentication (`/api/auth/`)

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| `POST` | `/login/` | Public | JWT login, returns access + refresh tokens |
| `POST` | `/token/refresh/` | Public | Refresh expired access token |
| `POST` | `/register/` | Public | Create new user account |
| `GET/PUT` | `/profile/` | Authenticated | View/update profile |
| `PUT` | `/profile/password/` | Authenticated | Change password |
| `PUT` | `/profile/picture/` | Authenticated | Upload avatar |
| `GET` | `/audit-logs/` | Staff+ | View system audit trail |
| `POST` | `/backup/` | Admin | System backup operations |
| `POST` | `/maintenance/` | Staff+ | System maintenance (clear history) |

### 4.2 Inventory (`/api/inventory/`)

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| `GET` | `/` | Authenticated | List all items (filtered by access_level) |
| `POST` | `/` | Staff+ | Create new item |
| `GET` | `/{id}/` | Authenticated | Get item details |
| `PUT/PATCH` | `/{id}/` | Staff+ | Update item |
| `DELETE` | `/{id}/` | Staff+ | Delete item |
| `POST` | `/{id}/change_status/` | Staff+ | Change item status (with note) |

**Query Parameters:**
- `?search=` — Filter by name (case-insensitive)
- `?category=` — Filter by category
- `?status=` — Filter by status

### 4.3 Requests (`/api/requests/`)

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| `GET` | `/` | Authenticated | List requests (own for students, all for staff) |
| `POST` | `/` | Authenticated | Submit new borrow request |
| `GET` | `/{id}/` | Authenticated | Get request details |
| `POST` | `/{id}/approve/` | Staff+ | Approve request (deducts stock atomically) |
| `POST` | `/{id}/reject/` | Staff+ | Reject with reason |
| `POST` | `/{id}/release/` | Staff+ | Mark item as released to requester |
| `POST` | `/{id}/return_item/` | Staff+ | Process item return (restores stock) |
| `POST` | `/{id}/cancel/` | Owner | Cancel own pending request |
| `POST` | `/{id}/comments/` | Authenticated | Add comment to request |
| `GET` | `/{id}/comments/` | Authenticated | List comments on request |
| `POST` | `/clear_history/` | Staff+ | Clear completed/returned requests (soft delete) |

### 4.4 Notifications (`/api/requests/notifications/`)

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| `GET` | `/` | Authenticated | List user's notifications |
| `POST` | `/{id}/mark_read/` | Authenticated | Mark notification as read |
| `POST` | `/mark_all_read/` | Authenticated | Mark all as read |

### 4.5 Users (`/api/users/`)

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| `GET` | `/` | Admin | List all users with stats |
| `GET` | `/{id}/` | Admin | Get user details |
| `PUT/PATCH` | `/{id}/` | Admin | Update user (role, department) |
| `POST` | `/{id}/toggle_active/` | Admin | Activate/deactivate user |
| `DELETE` | `/{id}/` | Admin | Delete user account |

---

## 5. Permission System

### 5.1 Backend Permission Classes

```python
# apps/permissions.py — 3 reusable permission classes

class IsFacultyOrAbove(BasePermission):
    """Faculty, Staff, Admin"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_min_role('FACULTY')

class IsStaffOrAbove(BasePermission):
    """Staff, Admin only"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_min_role('STAFF')

class IsAdmin(BasePermission):
    """Admin only"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin
```

### 5.2 Permission Matrix

| Action | Student | Faculty | Staff | Admin |
|--------|---------|---------|-------|-------|
| Browse inventory | ✅ | ✅ | ✅ | ✅ |
| Submit borrow request | ✅ | ✅ | ✅ | ✅ |
| View own requests | ✅ | ✅ | ✅ | ✅ |
| View dashboard | ❌ | ✅ | ✅ | ✅ |
| Add/Edit/Delete items | ❌ | ❌ | ✅ | ✅ |
| Approve/Reject requests | ❌ | ❌ | ✅ | ✅ |
| Export reports (CSV/PDF) | ❌ | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ✅ | ✅ |
| System settings | ❌ | ❌ | ❌ | ✅ |

---

## 6. Authentication Flow

### 6.1 JWT Token Strategy

```
Login → Server returns {access_token (60 min), refresh_token (7 days)}
  ↓
Every API call → Bearer token in Authorization header
  ↓
Token expires → Client sends refresh_token to /token/refresh/
  ↓
New access_token returned → Client retries original request
  ↓
Refresh also expired → User redirected to login page
```

### 6.2 Progressive Lockout (Brute Force Protection)

| Failed Attempts | Wait Time |
|----------------|-----------|
| 1–4 | No lockout |
| 5 | 15-minute lockout |
| Each subsequent | Lockout resets to 15 minutes |

Implementation: Failed login attempts tracked per user. Lockout checked before password validation. Successful login resets counter.

---

## 7. Key Technical Patterns

### 7.1 Atomic Stock Deduction

Prevents race conditions when two staff members approve the same request simultaneously:

```python
# Uses F() expression — the database handles concurrency
rows = Item.objects.filter(
    id=item.id,
    quantity__gte=requested_quantity   # Only proceed if enough stock
).update(
    quantity=F('quantity') - requested_quantity
)

if rows == 0:
    raise ValidationError("Insufficient stock")
    # Second approver's update affects 0 rows → rejected safely
```

### 7.2 Notification Deduplication (24-hour Cooldown)

```python
recent_exists = Notification.objects.filter(
    recipient=user,
    request=request_obj,
    type=notif_type,
    created_at__gte=now() - timedelta(hours=24)
).exists()

if not recent_exists:
    Notification.objects.create(...)   # Only create if none sent in 24h
```

### 7.3 Soft Delete for Requests

```python
# is_cleared=True hides from active view but preserves for audit/reports
Request.objects.filter(
    status__in=['RETURNED', 'REJECTED', 'CANCELLED'],
    is_cleared=False
).update(is_cleared=True)
```

### 7.4 Denormalized Item Name

```python
# item_name stored on Request model so the name persists even if the item
# is renamed or deleted after the request was made
request.item_name = item.name  # Snapshot at creation time
```

---

## 8. Deployment Configuration

### 8.1 Render.com Setup

```
Web Service: Django (Gunicorn)
Database: PostgreSQL 16 (Managed)
Build Command: ./build.sh
Start Command: gunicorn config.wsgi --bind 0.0.0.0:$PORT
```

### 8.2 Environment Variables

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | False in production |
| `DATABASE_URL` | PostgreSQL connection string |
| `ALLOWED_HOSTS` | Comma-separated hostnames |
| `CORS_ALLOWED_ORIGINS` | Frontend URL(s) |
| `RENDER_EXTERNAL_HOSTNAME` | Auto-set by Render |

### 8.3 Build Script (`build.sh`)

```bash
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
```

---

## 9. Dependencies (`requirements.txt`)

| Package | Purpose |
|---------|---------|
| `django` | Web framework |
| `djangorestframework` | REST API |
| `djangorestframework-simplejwt` | JWT authentication |
| `django-cors-headers` | CORS handling |
| `drf-spectacular` | API schema/docs generation |
| `Pillow` | Image processing (avatars, item photos) |
| `gunicorn` | Production WSGI server |
| `psycopg2-binary` | PostgreSQL adapter |
| `whitenoise` | Static file serving in production |
| `dj-database-url` | Parse DATABASE_URL env var |

---

*PLMun Inventory Nexus — Backend Technical Documentation*
*BSCS 3D · Software Engineering 1 · Prof. Mr. Melchor Paz*
*Academic Year 2025–2026*
