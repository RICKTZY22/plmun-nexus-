# Backend Development Documentation

## PLMun Inventory Nexus — How We Built the Server
### BSCS 3D · Software Engineering 1 · AY 2025–2026

---

## 1. Backend Setup Process

### 1.1 Project Initialization

```bash
# Create Django project with config/ as the settings directory
django-admin startproject config .

# Create 4 separate Django apps inside an apps/ directory
python manage.py startapp authentication    # Users, JWT login, audit logs
python manage.py startapp inventory          # Item CRUD and status management
python manage.py startapp requests           # Borrow lifecycle + notifications + comments
python manage.py startapp users              # Admin user management
```

### 1.2 Key Django Settings

```python
# Custom user model — MUST be set before first migration
AUTH_USER_MODEL = 'authentication.User'

# All API endpoints require JWT by default
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework_simplejwt.authentication.JWTAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
}

# Token lifetimes
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),    # Short for security
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),       # Long for convenience
    'ROTATE_REFRESH_TOKENS': True,                     # Issue new refresh on use
}

# CORS — only our frontend can make requests
CORS_ALLOWED_ORIGINS = ['http://localhost:5173', 'https://plmun-nexus.onrender.com']
```

---

## 2. How the Models Work

### 2.1 User Model — How Authentication & Roles Work

The User model extends Django's built-in `AbstractUser` which gives us username, password hashing, email, first_name, last_name, and is_active for free. We added:

```python
class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = 'STUDENT'    # Level 0 — browse and request
        FACULTY = 'FACULTY'    # Level 1 — dashboard access
        STAFF   = 'STAFF'      # Level 2 — inventory CRUD, approvals
        ADMIN   = 'ADMIN'      # Level 3 — full system control

    role = CharField(choices=Role.choices, default='STUDENT')
    department = CharField(max_length=100, blank=True)      # e.g., "BSCS", "BSIT"
    student_id = CharField(max_length=20, blank=True)       # e.g., "2023-12345"
    avatar = ImageField(upload_to='avatars/', null=True)    # Profile picture
    phone = CharField(max_length=20, blank=True)
    is_flagged = BooleanField(default=False)                # True = has overdue returns
    overdue_count = PositiveIntegerField(default=0)         # Lifetime overdue count
```

**How `has_min_role()` Works:**

Every role has a numeric level. The `has_min_role()` method checks if a user's level is at least as high as the required level:

```python
ROLE_HIERARCHY = {'STUDENT': 0, 'FACULTY': 1, 'STAFF': 2, 'ADMIN': 3}

def has_min_role(self, min_role):
    my_level = ROLE_HIERARCHY.get(self.role, 0)       # e.g., STAFF = 2
    required_level = ROLE_HIERARCHY.get(min_role, 0)  # e.g., FACULTY = 1
    return my_level >= required_level                   # 2 >= 1 = True ✅
```

This means: a STAFF user passes `has_min_role('FACULTY')` because level 2 ≥ level 1. But a STUDENT fails `has_min_role('STAFF')` because level 0 < level 2.

### 2.2 Item Model — How Inventory Items Are Stored

Each item has 15 fields covering its identity, stock, location, and borrow rules:

| Field | Type | How It's Used |
|-------|------|--------------|
| `name` | CharField(200) | Display name shown everywhere: cards, tables, requests, PDF exports |
| `category` | CharField (5 choices) | ELECTRONICS, FURNITURE, EQUIPMENT, SUPPLIES, OTHER — used for filtering and chart grouping |
| `quantity` | PositiveIntegerField | Current stock count. Decremented on approval, incremented on return. Zero = "Out of Stock" |
| `status` | CharField (4 choices) | AVAILABLE, IN_USE, MAINTENANCE, RETIRED — controls whether item can be requested |
| `location` | CharField(200) | Physical location (e.g., "Room 301, IT Lab") |
| `image` | ImageField | Photo uploaded by staff. Stored in /media/items/. Displayed on cards if user enables images |
| `access_level` | CharField | Minimum role required to SEE this item. A "STAFF" access item is invisible to Students |
| `priority` | CharField | LOW, MEDIUM, HIGH — indicates handling care level (fragile/expensive items = HIGH) |
| `is_returnable` | BooleanField | If False (consumables like paper), the "Return" step is skipped — request goes directly to COMPLETED |
| `borrow_duration` | PositiveIntegerField | Default borrow period used to auto-calculate expected return date |
| `borrow_duration_unit` | CharField | HOURS, DAYS, or WEEKS — combined with borrow_duration to compute timedelta |
| `status_note` | TextField | Staff's explanation for current status (e.g., "Screen cracked, sent to vendor") |
| `maintenance_eta` | DateField | Expected date when a MAINTENANCE item will be available again |

**How access_level filtering works in the API:**

```python
def get_queryset(self):
    user = self.request.user
    user_level = ROLE_HIERARCHY.get(user.role, 0)

    # A Student (level 0) can see items where access_level is STUDENT (level 0)
    # A Staff (level 2) can see items where access_level is STUDENT, FACULTY, or STAFF
    accessible_levels = [role for role, level in ROLE_HIERARCHY.items() if level <= user_level]
    return Item.objects.filter(access_level__in=accessible_levels)
```

### 2.3 Request Model — How the Borrow Lifecycle Is Tracked

```python
class Request(models.Model):
    # What was requested
    item = ForeignKey(Item, on_delete=SET_NULL, null=True)     # FK to item (nullable if item deleted)
    item_name = CharField(max_length=200)                       # Snapshot at creation time
    quantity = PositiveIntegerField(default=1)                  # How many units

    # Who requested
    requested_by = ForeignKey(User, related_name='requests')
    purpose = TextField()                                       # Why they need it

    # Approval workflow
    status = CharField(default='PENDING')                       # PENDING → APPROVED → COMPLETED → RETURNED
    approved_by = ForeignKey(User, null=True, blank=True)       # Staff who approved
    approved_at = DateTimeField(null=True)
    rejection_reason = TextField(blank=True)                    # Only set if REJECTED

    # Return tracking
    expected_return = DateTimeField(null=True)                  # Auto-calculated from item borrow_duration
    returned_at = DateTimeField(null=True)                      # When item was actually returned

    # Soft delete
    is_cleared = BooleanField(default=False)                   # Hidden from active view, preserved for reports

    created_at = DateTimeField(auto_now_add=True)
```

**Why `item_name` is denormalized:** If a student requests "Dell Laptop" and later the staff renames the item to "Dell Latitude 5540", the request history still shows "Dell Laptop" — the name the student saw when they made the request. If the item is deleted entirely, the request still has a readable name instead of showing "None" or crashing.

### 2.4 AuditLog Model — How Every Action Is Tracked

```python
class AuditLog(models.Model):
    user = ForeignKey(User, on_delete=SET_NULL, null=True)
    username = CharField(max_length=150)    # Cached — survives user deletion
    action = CharField(choices=ACTION_CHOICES)
    details = TextField(blank=True)
    ip_address = GenericIPAddressField(null=True)
    timestamp = DateTimeField(auto_now_add=True)
```

**14 tracked actions:** Login, Logout, Login Failed, Register, Profile Update, Password Changed, Item Created, Item Updated, Item Deleted, Request Created, Request Approved, Request Rejected, Status Change, History Cleared

**How IP address is captured:**
```python
def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()    # Behind proxy/load balancer
    return request.META.get('REMOTE_ADDR')           # Direct connection
```

---

## 3. How the API Endpoints Work

### 3.1 Permission System — How Access Is Enforced

Three reusable permission classes in `apps/permissions.py`:

```python
class IsFacultyOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_min_role('FACULTY')

class IsStaffOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_min_role('STAFF')

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin
```

**How permissions are applied per action:**
```python
class ItemViewSet(ModelViewSet):
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]      # Anyone can read
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'change_status']:
            return [IsStaffOrAbove()]        # Only Staff/Admin can write
        return [IsAuthenticated()]
```

If a Student sends `POST /api/inventory/` (trying to create an item), the IsStaffOrAbove permission class checks `has_min_role('STAFF')` → Student (level 0) < Staff (level 2) → returns 403 Forbidden.

### 3.2 How Login Works — Step by Step

```python
class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        username = request.data.get('username', '')

        # Step 1: Find the user
        user = User.objects.filter(username=username).first()

        # Step 2: Check lockout
        if user and user.failed_login_attempts >= 5:
            lockout_until = user.last_failed_login + timedelta(minutes=15)
            if timezone.now() < lockout_until:
                remaining = (lockout_until - timezone.now()).total_seconds()
                raise Throttled(wait=remaining)    # 429 with countdown

        # Step 3: Attempt login (SimpleJWT handles password verification)
        response = super().post(request, *args, **kwargs)

        # Step 4: On success — reset counter, log, embed profile
        if response.status_code == 200:
            user.failed_login_attempts = 0
            user.save()
            log_action('Login', user=user, request=request)
            response.data['user'] = UserProfileSerializer(user).data

        return response
```

**What the frontend receives on successful login:**
```json
{
    "access": "eyJ...",        // JWT access token (60 min)
    "refresh": "eyJ...",       // JWT refresh token (7 days)
    "user": {
        "id": 1,
        "username": "jdelacruz",
        "first_name": "Juan",
        "last_name": "Dela Cruz",
        "email": "juan@plmun.edu.ph",
        "role": "STUDENT",
        "department": "BSCS",
        "student_id": "2023-12345",
        "avatar": "/media/avatars/juan.jpg",
        "is_flagged": false,
        "overdue_count": 0
    }
}
```

### 3.3 How Request Approval Works — The Critical Path

This is the most important and most complex API endpoint:

```python
@action(detail=True, methods=['post'])
def approve(self, request, pk=None):
    req = self.get_object()

    # Guard 1: Only PENDING requests can be approved
    if req.status != 'PENDING':
        return Response({'error': 'Only pending requests can be approved'}, status=400)

    # Guard 2: Cannot approve your own request (prevents self-service)
    if req.requested_by == request.user:
        return Response({'error': 'You cannot approve your own request'}, status=403)

    # CRITICAL: Atomic stock deduction using F() expression
    # This translates to: UPDATE items SET quantity = quantity - N WHERE id = X AND quantity >= N
    # If two staff approve simultaneously, only the first one succeeds (rows = 1)
    # The second finds quantity < N, so rows = 0 → rejected
    updated = Item.objects.filter(
        pk=req.item.pk,
        quantity__gte=req.quantity
    ).update(quantity=F('quantity') - req.quantity)

    if not updated:
        item.refresh_from_db()
        return Response({
            'error': f'Insufficient stock. Only {item.quantity} available, but {req.quantity} requested.'
        }, status=400)

    # If stock hit zero, auto-mark item as IN_USE
    item.refresh_from_db()
    if item.quantity == 0:
        item.status = 'IN_USE'
        item.save(update_fields=['status'])

    # For consumables (not returnable), skip the "release" and "return" steps
    if not item.is_returnable:
        req.status = 'COMPLETED'    # Done — nothing to return
    else:
        req.status = 'APPROVED'
        # Auto-calculate expected return date
        if item.borrow_duration:
            req.expected_return = timezone.now() + item.get_return_timedelta()

    req.approved_by = request.user
    req.approved_at = timezone.now()
    req.save()

    # Notify requester (with dedup check)
    _create_notif_if_new(
        recipient=req.requested_by,
        notif_type='STATUS_CHANGE',
        message=f'Your request for "{req.item_name}" has been approved',
        sender=request.user,
    )

    # Audit trail
    log_action('Request Approved', user=request.user,
               details=f'Approved request #{req.id} for "{req.item_name}" (qty: {req.quantity})')
```

### 3.4 How Item Return Works — Stock Restoration & Overdue Detection

```python
@action(detail=True, methods=['post'])
def return_item(self, request, pk=None):
    req = self.get_object()

    # Guard: Only approved/completed requests can be returned
    if req.status not in ('APPROVED', 'COMPLETED'):
        return Response({'error': 'Only approved or completed requests can be returned'}, status=400)

    # Guard: Item must be returnable (consumables can't be returned)
    if not req.item.is_returnable:
        return Response({'error': 'This item is not returnable'}, status=400)

    # RESTORE STOCK — atomic increment
    Item.objects.filter(pk=req.item.pk).update(quantity=F('quantity') + req.quantity)

    # If item was marked IN_USE (quantity was 0), restore to AVAILABLE
    req.item.refresh_from_db()
    if req.item.status == 'IN_USE':
        req.item.status = 'AVAILABLE'
        req.item.save(update_fields=['status'])

    # Set return timestamp
    req.status = 'RETURNED'
    req.returned_at = timezone.now()
    req.save()

    # OVERDUE DETECTION
    if req.expected_return and req.returned_at > req.expected_return:
        overdue_delta = req.returned_at - req.expected_return
        overdue_str = _format_overdue_duration(overdue_delta)   # "3 day(s)"

        # Flag the user
        requester = req.requested_by
        requester.is_flagged = True
        requester.overdue_count = F('overdue_count') + 1    # Atomic increment
        requester.save(update_fields=['is_flagged', 'overdue_count'])

        # Notify about overdue
        _create_notif_if_new(
            recipient=requester,
            notif_type='OVERDUE',
            message=f'Your return of "{req.item_name}" was overdue by {overdue_str}',
        )
```

### 3.5 How Notification Deduplication Works

The `_create_notif_if_new()` function prevents notification spam:

```python
def _create_notif_if_new(recipient, request_obj, notif_type, message, sender=None):
    """
    Rule 1: If there's an UNREAD notification of same type+request → skip
            (user hasn't seen the first one yet, don't pile on)
    Rule 2: If the last READ notification was within 24 hours → skip
            (only remind once per day after they've read it)
    Rule 3: Otherwise → create the notification
    """
    base_filter = {'recipient': recipient, 'type': notif_type, 'request': request_obj}

    # Rule 1: Unread exists → skip
    if Notification.objects.filter(**base_filter, is_read=False).exists():
        return

    # Rule 2: Read within 24h → skip (cooldown)
    one_day_ago = timezone.now() - timedelta(days=1)
    if Notification.objects.filter(**base_filter, is_read=True, created_at__gte=one_day_ago).exists():
        return

    # Rule 3: Safe to create
    Notification.objects.create(
        recipient=recipient, sender=sender,
        request=request_obj, type=notif_type, message=message,
    )
```

---

## 4. How Data Flows Between Frontend and Backend

### 4.1 Complete API Request Lifecycle

```
1. User clicks "Approve" button in React frontend
2. useRequests() hook calls requestService.approve(id)
3. requestService sends: POST /api/requests/42/approve/
     Headers: { Authorization: "Bearer eyJ...", Content-Type: "application/json" }
4. Django receives the request
5. JWT middleware extracts user identity from the token
6. IsStaffOrAbove permission checks user.has_min_role('STAFF')
7. RequestViewSet.approve() runs the business logic
8. Database queries execute (atomic stock deduction, status update)
9. AuditLog entry created
10. Notification created (if dedup passes)
11. Django returns: 200 OK with updated request JSON
12. Axios receives the response
13. useRequests() hook updates the local requests array
14. React re-renders the request card with "APPROVED" badge
```

### 4.2 How File Uploads Work (Item Images & Avatars)

```
1. Staff fills Add Item form, selects an image file
2. Frontend creates FormData (not JSON — required for file upload):
     const formData = new FormData();
     formData.append('name', 'Dell Laptop');
     formData.append('image', fileBlob);
3. Axios sends POST with Content-Type: multipart/form-data
4. Django's MultiPartParser handles the file
5. Pillow (Python library) validates it's a real image
6. File saved to /media/items/filename.jpg
7. Serializer returns imageUrl: "/media/items/filename.jpg"
8. Frontend resolves relative URL to absolute: https://api-domain/media/items/filename.jpg
```

---

## 5. Database Seeding

`seed_items.py` creates 80 realistic items across all categories for demo purposes:

| Category | Example Items | Count |
|----------|--------------|-------|
| ELECTRONICS | Dell Laptop, Epson Projector, Canon Camera, USB Cables | ~25 |
| FURNITURE | Steel Desk, Folding Chair, Filing Cabinet, Whiteboard | ~20 |
| EQUIPMENT | Oscilloscope, 3D Printer, Soldering Station, Multimeter | ~15 |
| SUPPLIES | Bond Paper, Markers, Ink Cartridges, Cleaning Supplies | ~15 |
| OTHER | First Aid Kit, Extension Cord, Safety Goggles, Toolbox | ~5 |

Run: `python seed_items.py`

---

## 6. Deployment to Render.com

### 6.1 Build Process
```bash
# build.sh — runs on every deploy
pip install -r requirements.txt      # Install Python packages
python manage.py collectstatic       # Gather static files for WhiteNoise
python manage.py migrate             # Apply database migrations
```

### 6.2 Production Configuration
- **Server:** Gunicorn WSGI server with `--bind 0.0.0.0:$PORT`
- **Database:** PostgreSQL 16 (managed by Render, connection via DATABASE_URL)
- **Static files:** Served by WhiteNoise middleware (no separate Nginx needed)
- **Security:** DEBUG=False, SECRET_KEY from env, CORS limited to frontend domain

---

## 7. Challenges Encountered & How We Solved Them

| Challenge | Root Cause | Solution |
|-----------|-----------|---------|
| Two staff approve same request → double stock deduction | Python-level check was not atomic | Used Django `F()` expression for SQL-level UPDATE with WHERE clause |
| Notification spam on rapid status changes | No dedup logic | Added 2-rule dedup: skip if unread exists, skip if read within 24h |
| Request history unreadable after item rename | item_name was just a FK | Denormalized item_name as a string snapshot at creation time |
| Audit logs show "None" after user deleted | user FK cascades to NULL | Cached username as a separate CharField that survives deletion |
| Self-approval exploit | No check preventing staff from approving own requests | Added `req.requested_by == request.user` guard with 403 response |
| Consumable items stuck in "awaiting return" | All items followed the same return flow | Added `is_returnable` flag — non-returnable items skip to COMPLETED |
| Auto-marking IN_USE when stock hits zero | Had to check quantity after every approval | Auto-check after atomic deduction: if quantity == 0, set status = IN_USE |

---

*PLMun Inventory Nexus — Backend Development Documentation*
*BSCS 3D · Software Engineering 1 · Prof. Mr. Melchor Paz*
*Academic Year 2025–2026*
