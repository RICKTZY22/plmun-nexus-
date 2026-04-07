# Algorithms, Time Complexity & Space Complexity

## PLMun Inventory Nexus
### BSCS 3D · Software Engineering 1 · AY 2025–2026

---

## Summary Table

| # | Algorithm | Where Used | Time | Space |
|---|-----------|-----------|------|-------|
| 1 | Hash Map Lookup (Role Hierarchy) | Permission checking | O(1) | O(1) |
| 2 | Linear Search (Permission Matrix) | `hasPermission()` | O(R) | O(1) |
| 3 | Linear Filter + Multi-field Search | Inventory browse | O(N) | O(N) |
| 4 | Group-By Bucketing (Stock Levels) | Inventory grouping | O(N) | O(N) |
| 5 | Aggregation / Counting (Dashboard) | Statistics computation | O(N) | O(K) |
| 6 | Compare-And-Swap (Atomic F()) | Stock deduction | O(1) | O(1) |
| 7 | Sliding Window Dedup | Notification dedup | O(1)* | O(1) |
| 8 | Mutex Queue (Token Refresh) | API interceptor | O(Q) | O(Q) |
| 9 | Client-Side Pagination (Slicing) | Inventory/Requests | O(N) | O(P) |
| 10 | CSV Serialization | CSV export | O(N × C) | O(N × C) |
| 11 | PDF Table Generation | PDF export | O(N × C) | O(N × C) |
| 12 | Bcrypt Password Hashing | Login/Register | O(2^W) | O(1) |

*N = number of items/requests, R = number of roles (4), K = categories (5), Q = queued requests, C = columns, P = page size, W = bcrypt work factor (default 12)*

---

## 1. Hash Map Lookup — Role Hierarchy Check

### Where: `roles.js` → `hasMinRole()` and Django `User.has_min_role()`

### How It Works:
```javascript
// Frontend (roles.js)
const ROLE_HIERARCHY = {
    'STUDENT': 1,    // Hash map with 4 entries
    'FACULTY': 2,
    'STAFF': 3,
    'ADMIN': 4
};

function hasMinRole(userRole, requiredRole) {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;        // O(1) hash lookup
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 999;  // O(1) hash lookup
    return userLevel >= requiredLevel;                       // O(1) comparison
}
```

### Complexity:
| | Analysis |
|---|---------|
| **Time: O(1)** | JavaScript object property lookup is a hash table operation — constant time regardless of how many roles exist. The comparison `>=` is also O(1). |
| **Space: O(1)** | The hash map has exactly 4 entries (fixed). No new memory allocated per call. |

### Why This Algorithm:
We could have used a linear search through an array (`['STUDENT', 'FACULTY', 'STAFF', 'ADMIN']` and checking index) which would be O(R), but the hash map approach is cleaner and O(1). With only 4 roles the performance difference is negligible, but the code reads better.

---

## 2. Linear Search — Permission Matrix Check

### Where: `roles.js` → `hasPermission()`

### How It Works:
```javascript
const PERMISSIONS = {
    EDIT_INVENTORY: ['STAFF', 'ADMIN'],        // Array of allowed roles
    DELETE_INVENTORY: ['STAFF', 'ADMIN'],
    VIEW_DASHBOARD: ['FACULTY', 'STAFF', 'ADMIN'],
    // ... 18 more permissions
};

function hasPermission(userRole, permission) {
    const allowedRoles = PERMISSIONS[permission];   // O(1) hash lookup
    if (!allowedRoles) return false;
    return allowedRoles.includes(userRole);          // O(R) linear scan
}
```

### Complexity:
| | Analysis |
|---|---------|
| **Time: O(R)** | `Array.includes()` performs a linear scan through the allowed roles array. R = max 4 roles. Effectively O(1) in practice since R is tiny and constant. |
| **Space: O(1)** | No new memory allocated. The PERMISSIONS object is a static constant. |

### Alternative Considered:
Could use a `Set` instead of an array for O(1) `has()` lookup, but with only 4 roles the overhead of creating a Set outweighs the benefit.

---

## 3. Linear Filter with Multi-Field Search — Inventory Browse

### Where: Backend `ItemViewSet.get_queryset()` and Frontend `Inventory.jsx`

### How It Works:
```python
# Backend — Django ORM (translates to SQL)
queryset = Item.objects.all()                                  # Start with all items
queryset = queryset.filter(access_level__in=accessible_levels) # Filter by role
queryset = queryset.filter(
    Q(name__icontains=search) |                                # OR search across 3 fields
    Q(description__icontains=search) |
    Q(location__icontains=search)
)
queryset = queryset.filter(category=category)                  # Exact match filter
queryset = queryset.filter(status=item_status)                 # Exact match filter
```

```javascript
// Frontend — additional client-side filtering
const filtered = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    const matchesStatus = !statusFilter || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
});
```

### Complexity:
| | Analysis |
|---|---------|
| **Time: O(N)** | Each filter pass scans all N items once. The `icontains` search does a substring check on each item's name, description, and location — this is O(N × L) where L is average string length, but L is bounded (max 200 chars), so it's effectively O(N). Multiple `.filter()` calls are chained — Django ORM compiles them into a single SQL WHERE clause, so it's one O(N) pass, not multiple. |
| **Space: O(N)** | The filtered result set can be up to N items (worst case: all match). In practice, usually much smaller. |

### SQL Generated:
```sql
SELECT * FROM inventory_item
WHERE access_level IN ('STUDENT', 'FACULTY')
  AND status != 'RETIRED'
  AND (name ILIKE '%laptop%' OR description ILIKE '%laptop%' OR location ILIKE '%laptop%')
  AND category = 'ELECTRONICS'
  AND status = 'AVAILABLE'
```

### Why No Index:
With ~80 items, a full table scan is faster than an index lookup (index lookup has overhead of B-tree traversal). Indexes would be worthwhile at ~10,000+ items.

---

## 4. Group-By Bucketing — Stock Level Grouping

### Where: `Inventory.jsx` — items grouped into Out of Stock / Low Stock / Normal Stock

### How It Works:
```javascript
// Three-bucket classification — single pass through all filtered items
const outOfStock = [];    // Bucket 1
const lowStock = [];      // Bucket 2
const normalStock = [];   // Bucket 3

filteredItems.forEach(item => {
    if (item.quantity === 0) {
        outOfStock.push(item);     // O(1) amortized
    } else if (item.quantity <= 5) {
        lowStock.push(item);       // O(1) amortized
    } else {
        normalStock.push(item);    // O(1) amortized
    }
});
```

### Complexity:
| | Analysis |
|---|---------|
| **Time: O(N)** | Single pass through all N items. Each item is classified with a constant-time comparison and pushed to one of 3 arrays (O(1) amortized push). |
| **Space: O(N)** | The three buckets together hold all N items — total space is O(N). No item is duplicated across buckets. |

### Algorithm Pattern:
This is a **Partition / Bucket Sort** variant — we partition items into K=3 buckets based on a numeric threshold. Unlike a general sort (O(N log N)), bucketing by known thresholds is O(N).

---

## 5. Aggregation / Counting — Dashboard Statistics

### Where: `Dashboard.jsx` — computing stats, chart data, and monthly trends

### How It Works:
```javascript
// STAT COUNTING — single pass per stat
const stats = {
    total: items.length,                                          // O(1)
    available: items.filter(i => i.status === 'AVAILABLE').length, // O(N)
    inUse: items.filter(i => i.status === 'IN_USE').length,       // O(N)
    maintenance: items.filter(i => i.status === 'MAINTENANCE').length, // O(N)
    lowStock: items.filter(i => i.quantity > 0 && i.quantity <= 5).length, // O(N)
};

// CATEGORY PIE CHART — hash map counting (Counting Sort variant)
const categoryCount = {};            // Hash map
items.forEach(item => {
    categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
});
// categoryCount = { ELECTRONICS: 25, FURNITURE: 20, EQUIPMENT: 15, ... }

// MONTHLY TRENDS — hash map counting with date grouping
const monthlyCounts = {};
requests.forEach(req => {
    const month = format(new Date(req.created_at), 'MMM yyyy'); // O(1)
    monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
});
```

### Complexity:
| | Analysis |
|---|---------|
| **Time: O(N + M)** | N = items, M = requests. Status counting does 5 passes over N items = O(5N) = O(N). Category grouping: O(N). Monthly trends: O(M). Total: O(N + M). Could be optimized to a single pass, but React's `useMemo` caches the result so it only recomputes when data changes. |
| **Space: O(K + T)** | K = number of categories (5) for the pie chart hash map. T = number of distinct months (~12) for the trends hash map. Both are small constants. |

### Algorithm Pattern:
This is **Counting / Frequency Analysis** — a hash-map-based counting pattern common in data analytics. It's essentially the same algorithm as histogram computation.

---

## 6. Compare-And-Swap (Atomic F()) — Stock Deduction

### Where: `RequestViewSet.approve()` — the most critical algorithm in the system

### How It Works:
```python
# This single SQL statement is atomic — guaranteed by PostgreSQL
updated = Item.objects.filter(
    pk=item.pk,              # WHERE id = 42
    quantity__gte=req_qty     # AND quantity >= 5 (the "Compare")
).update(
    quantity=F('quantity') - req_qty  # SET quantity = quantity - 5 (the "Swap")
)
# updated = 1 if successful, 0 if quantity was insufficient
```

### Generated SQL:
```sql
UPDATE inventory_item
SET quantity = quantity - 5
WHERE id = 42 AND quantity >= 5;
-- Returns affected rows: 1 (success) or 0 (insufficient stock)
```

### Complexity:
| | Analysis |
|---|---------|
| **Time: O(1)** | Primary key lookup in PostgreSQL is a B-tree index search = O(log N), but since we're looking up by PK (which is unique), it's effectively O(1). The UPDATE is a single row operation. |
| **Space: O(1)** | No temporary data structures. The operation modifies one row in-place. |

### Algorithm Pattern:
This is a **Compare-And-Swap (CAS)** pattern — the same concurrency primitive used in lock-free data structures. The `WHERE quantity >= N` is the "Compare" (check precondition), and `SET quantity = quantity - N` is the "Swap" (atomic modification). PostgreSQL's row-level locking ensures serializability.

### Why This Is Critical:
Without CAS, two concurrent approvals could both read `quantity = 10`, both compute `10 - 5 = 5`, and both write `5`, causing only 5 items to be removed instead of 10 (a **lost update** bug). The CAS pattern prevents this by making the check-and-modify atomic.

---

## 7. Sliding Window Deduplication — Notification Anti-Spam

### Where: `_create_notif_if_new()` in `requests/views.py`

### How It Works:
```python
def _create_notif_if_new(recipient, request_obj, notif_type, message, sender=None):
    base_filter = {'recipient': recipient, 'type': notif_type, 'request': request_obj}

    # Rule 1: Check if UNREAD duplicate exists → O(1)* DB indexed query
    if Notification.objects.filter(**base_filter, is_read=False).exists():
        return  # Skip — user hasn't read the first one

    # Rule 2: Check if READ duplicate exists within 24-hour window → O(1)* DB query
    one_day_ago = timezone.now() - timedelta(days=1)
    if Notification.objects.filter(**base_filter, is_read=True, created_at__gte=one_day_ago).exists():
        return  # Skip — 24-hour cooldown

    # Rule 3: No duplicate found → create
    Notification.objects.create(...)
```

### Complexity:
| | Analysis |
|---|---------|
| **Time: O(1) amortized** | Each `.exists()` query filters by recipient + type + request (indexed fields) and uses `LIMIT 1` internally. With database indexes, this is O(log N) where N is total notifications, but effectively O(1) for practical purposes. The 24-hour window acts as a **sliding window** that bounds the search space. |
| **Space: O(1)** | No local data structures. The database handles storage. |

### Algorithm Pattern:
This is a **Sliding Window Deduplication** (also called **Time-Windowed Idempotency**). The 24-hour window ensures that for any given (recipient, request, type) triple, at most one notification can be created per day. Similar to a rate limiter but applied to data creation rather than request limiting.

---

## 8. Mutex Queue — Token Refresh Concurrency Control

### Where: `services/api.js` — Axios response interceptor

### How It Works:
```javascript
let isRefreshing = false;   // Mutex flag
let failedQueue = [];       // FIFO queue of pending requests

// When a 401 error occurs:
if (isRefreshing) {
    // ENQUEUE: another request is refreshing — wait in line
    return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });   // O(1) push
    }).then(newToken => {
        // RETRY with new token when mutex holder finishes
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
    });
}

// ACQUIRE MUTEX: I'm the first one — do the refresh
isRefreshing = true;
try {
    const { access } = await refreshToken();
    processQueue(null, access);    // DEQUEUE: resolve all waiting promises
    return api(originalRequest);   // Retry original
} catch (err) {
    processQueue(err, null);       // DEQUEUE: reject all waiting promises
    logout();
} finally {
    isRefreshing = false;          // RELEASE MUTEX
}

// Process the queue
function processQueue(error, token) {
    failedQueue.forEach(prom => {              // O(Q) — iterate all queued
        error ? prom.reject(error) : prom.resolve(token);
    });
    failedQueue = [];                           // Clear queue
}
```

### Complexity:
| | Analysis |
|---|---------|
| **Time: O(Q)** | Where Q = number of concurrent requests that failed with 401. The mutex holder does O(1) work (one refresh call). Processing the queue is O(Q). In practice Q is very small (typically 2-5 concurrent API calls). |
| **Space: O(Q)** | The `failedQueue` array stores one Promise resolver per queued request. Q is bounded by the number of concurrent API calls (typically < 10). |

### Algorithm Pattern:
This is a **Mutex with FIFO Wait Queue** — a classic concurrency control pattern. It's the same principle as a database connection pool or a thread lock with a waitlist. The `isRefreshing` boolean is the mutex, and `failedQueue` is the wait queue.

---

## 9. Client-Side Pagination — Array Slicing

### Where: `Inventory.jsx`, `Requests.jsx`

### How It Works:
```javascript
const itemsPerPage = 12;    // Configurable: 6, 12, 24, 48
const currentPage = 1;      // User-controlled

// Slice the filtered array for the current page
const pagedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,     // Start index
    currentPage * itemsPerPage             // End index (exclusive)
);
// For page 1 with 12 items per page: slice(0, 12)
// For page 2: slice(12, 24)
```

### Complexity:
| | Analysis |
|---|---------|
| **Time: O(P)** | `Array.slice()` copies P elements (page size). The slice operation itself is O(P), not O(N), because it directly calculates start/end indices and copies only that chunk. |
| **Space: O(P)** | Creates a new array of P elements for the current page. P is at most 48. |

---

## 10. CSV Serialization — Export to File

### Where: `exportUtils.js` → `exportCSV()`

### How It Works:
```javascript
function exportCSV(filename, headers, rows) {
    const csvLines = [
        headers.join(','),                              // O(C) — join C columns
        ...rows.map(row =>                              // O(N) — map over N rows
            row.map(cell =>                             // O(C) — map over C columns
                `"${String(cell ?? '').replace(/"/g, '""')}"`  // O(L) — escape quotes
            ).join(',')                                 // O(C) — join columns
        ),
    ];
    const csvContent = '\uFEFF' + csvLines.join('\r\n'); // O(N × C × L) — join all lines
}
```

### Complexity:
| | Analysis |
|---|---------|
| **Time: O(N × C × L)** | N rows × C columns × L average cell length. For our system: N ≈ 80 items, C = 7 columns, L ≈ 30 chars average = ~16,800 character operations. Trivial. |
| **Space: O(N × C × L)** | The entire CSV string is constructed in memory. For 80 items ≈ 20KB. Negligible. |

---

## 11. PDF Table Generation — jsPDF AutoTable

### Where: `exportUtils.js` → `exportPDF()`

### How It Works:
```javascript
const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });

autoTable(doc, {
    head: [headers],     // 1 row of C headers
    body: rows,          // N rows × C columns
    theme: 'grid',
    // AutoTable internally:
    //   1. Measures text width for each cell → O(N × C)
    //   2. Calculates column widths → O(C)
    //   3. Determines page breaks → O(N)
    //   4. Renders each cell as PDF primitives → O(N × C)
});
```

### Complexity:
| | Analysis |
|---|---------|
| **Time: O(N × C)** | AutoTable iterates every cell twice: once for measurement, once for rendering. N rows × C columns × 2 passes = O(2NC) = O(NC). |
| **Space: O(N × C)** | The PDF document object stores all cell data in memory before serializing to binary. Also stores font metrics and page layout data. |

---

## 12. Bcrypt Password Hashing — Authentication

### Where: Django's `AbstractUser.set_password()` used during registration and password change

### How It Works:
```python
# Django internally uses PBKDF2-SHA256 (similar work factor to bcrypt)
# The hash function is intentionally SLOW to prevent brute-force attacks

# Registration:
user.set_password('mypassword123')
# Internally: PBKDF2(password, salt, iterations=600000) → O(2^W) where W ≈ 19

# Login verification:
check_password('mypassword123', stored_hash)
# Same computation: hash the attempt, compare with stored hash
```

### Complexity:
| | Analysis |
|---|---------|
| **Time: O(2^W)** | W is the work factor. Django uses PBKDF2 with 600,000 iterations (as of Django 6.0). This takes ~200ms per hash on modern hardware. This is intentional — it makes brute-force attacks computationally expensive. An attacker trying 10,000 passwords would need ~33 minutes. |
| **Space: O(1)** | The hash output is a fixed-length string (128 chars). The salt is 22 chars. No variable-size memory allocation. |

---

## Overall System Complexity Summary

| Operation | Time | Space | Bottleneck |
|-----------|------|-------|-----------|
| Login (with password hash) | O(2^W) | O(1) | Intentionally slow (security) |
| Browse inventory | O(N) | O(N) | Linear scan of all items |
| Search items (multi-field) | O(N × L) | O(N) | Substring search on 3 fields |
| Dashboard stats | O(N + M) | O(K + T) | Iterate all items + requests |
| Approve request (stock deduction) | O(1) | O(1) | Single atomic DB operation |
| Notification dedup check | O(1)* | O(1) | Two indexed DB queries |
| Export CSV | O(N × C) | O(N × C) | String concatenation |
| Export PDF | O(N × C) | O(N × C) | Cell measurement + rendering |
| Token refresh (concurrent) | O(Q) | O(Q) | Queue processing |
| Pagination (per page) | O(P) | O(P) | Array slice |

**N** = total items (~80), **M** = total requests (~200), **K** = categories (5), **T** = months (~12), **C** = columns (7), **P** = page size (12-48), **Q** = concurrent 401s (2-5), **L** = avg string length (~30), **W** = hash work factor (~19)

### Key Takeaway:
The system is dominated by **linear algorithms** (O(N)) because the dataset is small (~80 items, ~200 requests). No O(N²) or worse algorithms exist in the codebase. The most performance-critical operation — stock deduction — is O(1) thanks to atomic database operations. The intentionally slowest operation is password hashing at O(2^W), which is a security feature, not a bottleneck.

---

*PLMun Inventory Nexus — Algorithm & Complexity Analysis*
*BSCS 3D · Software Engineering 1 · Prof. Mr. Melchor Paz*
*Academic Year 2025–2026*
