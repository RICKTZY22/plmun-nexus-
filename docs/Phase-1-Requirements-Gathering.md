# SUPPLY AND FACILITY INVENTORY MANAGEMENT SYSTEM

---

**In partial fulfillment of the requirements in**
**SOFTWARE ENGINEERING 1**

**Leader:** Wagwag, Byron Scott G.
**Members:**
- Bondame, Sean Allen G.
- Dela Cruz, Charisse F.
- Husain, Stephan Yder

**Bachelor of Science in Computer Science – BSCS 3D**

**Mr. Melchor Paz**
*Software Engineering 1 Professor*

---

## PHASE 1: REQUIREMENTS GATHERING

### Sources

- Self-Study: Analysis of existing PLMun inventory and facility management processes.
- Online Research: Study of best practices and modern system architectures for inventory management solutions.

---

## Hardware Requirements

| Component | Specification | Purpose |
|-----------|--------------|---------|
| RAM | Minimum 8GB (16GB recommended for development) | Smooth performance during multi-user operations and local development |
| Processor | Intel i5 or higher | Fast processing of API requests and database queries |
| Storage | 500GB SSD | Fast data retrieval, system responsiveness, and database storage |
| Network | Reliable internet connection | Multi-user access, API communication, and cloud deployment |
| Backup Power | UPS (Uninterruptible Power Supply) | Prevent data loss during power interruptions |

---

## Software Requirements

### Features to be Included in the System

---

### (Module 1) Registration & Login

**Functions:**

#### Registration Restrictions

1. **Admin Approval for New Accounts**
   - Only accounts approved by an administrator can access the system. New registrations default to the Student role and require admin activation.

2. **Role-Based Access Control (RBAC)**
   - Users are assigned specific roles with hierarchical access levels:
     - **Student** (Level 0) — Can submit borrow requests and view own request history.
     - **Faculty** (Level 1) — Can view dashboard, inventory catalog, and submit requests.
     - **Staff** (Level 2) — Can approve/reject requests, manage inventory items, and generate reports.
     - **Admin** (Level 3) — Full system access including user management, system settings, and all administrative functions.
   - Each higher role inherits all permissions of lower roles.

3. **Duplicate Registration Prevention**
   - The system checks for existing accounts using email and username to prevent duplicate registrations.

#### Login Validation

1. **Password Verification**
   - User-entered passwords are compared with securely hashed passwords stored in the database using Django's built-in password hashing (PBKDF2 with SHA-256).

2. **Account Status Check**
   - The system verifies if the user's account is active (`is_active` flag) before allowing access. Deactivated accounts are blocked from login.

3. **Login Attempt Limiting**
   - Rate limiting is enforced on authentication endpoints using `django-ratelimit` to prevent brute-force attacks.

4. **JWT Token-Based Authentication**
   - Upon successful login, the system issues a pair of tokens:
     - **Access Token** (1-hour lifespan) — Attached to every API request as a Bearer token.
     - **Refresh Token** (7-day lifespan) — Used to silently obtain new access tokens without re-login.
   - Token rotation is enabled: each refresh issues a new refresh token, and old tokens are blacklisted on logout.

5. **Idle Auto-Logout**
   - The system monitors user activity (mouse/keyboard) and automatically logs out idle users after a configurable period of inactivity to protect unattended sessions.

6. **Audit Logging**
   - All login attempts (success and failure), registrations, and logouts are recorded in the `AuditLog` table with timestamp, IP address, and user details for accountability.

---

### (Module 2) Supply / Inventory Management

**Functions:**

- **Add, edit, and delete inventory items** (Staff and Admin only).
- **Categorize items** into types: Electronics, Furniture, Equipment, Supplies, and Other.
- **Track item status**: Available, In Use, Maintenance, or Retired.
- **Set access levels per item** (Student, Faculty, Staff, Admin) — users only see items at or below their own role level.
- **Set borrow duration** per item with configurable time units (Minutes, Hours, Days, Months).
- **Returnable vs. Non-Returnable items** — Items can be flagged as returnable (borrowing) or non-returnable (consumable).
- **Low-stock threshold alerts** — Items with quantity ≤ 5 are flagged as low stock; items with quantity = 0 are flagged as out of stock.
- **Status metadata tracking** — Reason notes, who changed the status, and maintenance ETA for items under maintenance.
- **Image upload support** for inventory item photos.
- **QR code generation** for quick item identification and tracking.
- **Real-time inventory statistics** — Total items, available count, in-use count, maintenance count, low-stock items, and out-of-stock items.

---

### (Module 3) Request & Approval Workflow

**Functions:**

- **Faculty, Staff, and Students can submit borrow/supply requests** with the following fields:
  - Item selection (from accessible inventory)
  - Quantity requested
  - Purpose / justification
  - Priority level (Low, Normal, High)
- **Auto-stock check** — The system validates available stock before allowing request submission.
- **Request status lifecycle**:
  - **Pending** → Awaiting Staff/Admin review
  - **Approved** → Item stock atomically deducted; expected return date auto-calculated
  - **Rejected** → Rejection reason required from approver
  - **Completed** → Item returned or fulfilled
  - **Returned** → Borrower confirms return of item
  - **Cancelled** → Request cancelled by the requester
- **No self-approval rule** — A user cannot approve their own request.
- **Comment system** — Users and staff can add comments to any request for communication and clarification.
- **Overdue detection** — System can check for overdue items and send bulk notifications to all Staff+.
- **Automatic notifications** for every status change (approval, rejection, etc.) sent to the requester.
- **Bulk notification** — When a new request is created, all Staff+ users are notified.

---

### (Module 4) Reporting and Analytics

**Functions:**

- **Generate inventory usage reports** — Monthly and quarterly summaries of item demand, fulfillment rates, and shortages.
- **Visual dashboard** with statistics cards showing:
  - Total items, total requests, pending requests, approved requests
  - Low-stock items count, out-of-stock items count
  - Overdue items count
- **Charts and trend analysis** for inventory and request data.
- **Export reports** in PDF and CSV format using client-side generation (jsPDF + file-saver).
- **Audit trail reports** — Complete logs of all user actions (logins, inventory changes, request approvals, etc.) for transparency and accountability.

---

### (Module 5) User Management (Admin Only)

**Functions:**

- **View all registered users** with search, filter by role, and filter by active status.
- **Change user roles** — Admin can promote or demote users between Student, Faculty, Staff, and Admin.
- **Activate / deactivate user accounts** — Toggle user access without deleting accounts.
- **Delete users** permanently from the system.
- **User statistics** — Count of users by role for administrative overview.
- **Flagging system** — Users with overdue returns are automatically flagged, and overdue counts are tracked.

---

### (Module 6) Notification System

**Functions:**

- **Real-time notification bell** with unread count badge in the header.
- **Notification types**:
  - **Status Change** — When a request is approved, rejected, or completed.
  - **Comment** — When a new comment is added to a request.
  - **Reminder** — Custom reminders from staff.
  - **Overdue** — When borrowed items are past their expected return date.
- **Mark as read** — Individual or bulk mark-all-as-read functionality.
- **Notification dropdown** — Quick access to recent notifications from any page.

---

## INTRODUCTION

### Background

The current inventory and facility management process at Pamantasan ng Lungsod ng Muntinlupa (PLMun) is primarily manual, relying on handwritten records and spreadsheets to track supplies, equipment, and facility usage. This traditional approach often leads to inefficiencies, inaccurate data, and mismanagement of resources.

Common problems include difficulties in tracking supply availability, delayed request approvals, loss of records, and lack of real-time visibility on facility usage. These inefficiencies impact not only administrative operations but also the timely delivery of resources to students and faculty.

To address these challenges, the implementation of the **PLMun Inventory Nexus** — a Supply and Facility Inventory Management System — is proposed. The system automates the recording, tracking, and management of university supplies and facilities, improving accuracy, transparency, and efficiency in PLMun's operational processes.

### Purpose

The purpose of this project is to enhance the management of supplies and facilities at PLMun by replacing the manual tracking system with an automated, centralized, and user-friendly web-based solution.

The system aims to:

- Digitize inventory management and request workflows
- Enable real-time monitoring of supply availability and usage
- Reduce administrative workload and human error
- Improve accountability and transparency in resource allocation through audit trails
- Provide data-driven insights via analytics dashboards and exportable reports

This solution benefits both administrative and academic departments by ensuring smooth, accurate, and timely handling of supply and facility-related operations.

### Scope

#### System Features

The proposed system includes the following core functions:

- **Supply / Inventory Management**: Add, update, categorize, and monitor supply stocks with role-based access filtering and automated low-stock alerts.
- **Request & Approval Workflow**: Faculty, staff, and students request items; staff approve or reject with full comment threads and priority tagging.
- **Real-Time Reporting**: Generate automated reports on inventory levels, usage frequency, and request statistics with PDF/CSV export.
- **User Management**: Role-based user administration with activation/deactivation and audit logging.
- **Notification System**: Real-time alerts for request updates, comments, and overdue items.

#### Integration and Access

- The system is deployed as a web application accessible via any modern browser.
- A centralized PostgreSQL database manages real-time updates on supplies and requests.
- Role-based user access (Student, Faculty, Staff, Admin) ensures proper authorization at both the frontend (RoleGuard) and backend (Permission Classes).
- JWT token-based authentication secures all API communications.

### Stakeholders

| Stakeholder | Description / Role |
|-------------|-------------------|
| Students | Submit borrow requests for supplies and equipment; track request status. |
| Faculty Members | Request supplies for academic purposes; view inventory catalog and dashboard. |
| Staff / Inventory Officers | Manage inventory, approve/reject requests, issue supplies, and generate reports. |
| Administration (PLMun Management) | Oversee usage, manage users, generate reports, and ensure accountability. |
| IT Department | Maintain the system's technical integrity, database, deployment, and user access. |

---

## PROBLEM STATEMENT

### Current Situation

At present, PLMun's supply and facility management relies on manual processes such as written logs, spreadsheets, and physical documents. This leads to:

- Delayed updates and inaccurate inventory data
- Difficulty in tracking supply availability and borrow status
- Loss or duplication of records
- Time-consuming approval processes
- Lack of a centralized database for inventory and request records
- No audit trail for accountability

The proposed system seeks to address these challenges through automation, improving operational efficiency and data reliability.

### Impact Analysis

| Aspect | Current Impact |
|--------|---------------|
| Efficiency | Manual encoding and checking cause delays and redundancy. |
| Data Accuracy | Errors in record-keeping lead to inaccurate inventory tracking. |
| Transparency | Limited access to records affects accountability. |
| Resource Management | Difficulty in predicting shortages or overstocking. |
| User Experience | Time-consuming processes frustrate both staff and administrators. |
| Security | Paper-based records lack access control and audit trails. |

### Justification

The development of the Supply and Facility Inventory Management System is necessary to:

- Improve inventory accuracy and minimize loss of resources through automated stock tracking.
- Increase efficiency through automated request workflows and approval processes.
- Enhance security and accountability by monitoring user activities via comprehensive audit logging.
- Provide data-driven insights for better decision-making and budgeting through analytics dashboards.

---

## PROPOSED SOLUTION

### Alternative Approaches

1. **Spreadsheet-Based Tracking**
   - Uses Excel or Google Sheets to record supply and facility information.

2. **Off-the-Shelf Inventory Software**
   - Uses commercial solutions like NetSuite or Odoo for inventory management.

3. **Custom Web-Based Supply and Facility Management System**
   - A centralized system where users can log in to manage supplies, requests, and reports — tailored to PLMun's specific needs.

### Pros and Cons

| Alternative | Pros | Cons |
|-------------|------|------|
| Spreadsheet Tracking | Easy to implement, low cost | Prone to human error, lacks automation, no role-based access |
| Off-the-Shelf Software | Feature-rich, well-tested | Expensive licensing, may not fit PLMun workflows, limited customization |
| Custom Web-Based System | Centralized, scalable, secure, tailored to PLMun | Requires development time and initial setup |

### Recommended Solution

The recommended approach is to implement a **Custom Web-Based Supply and Facility Inventory Management System (PLMun Inventory Nexus)**, as it offers a balanced combination of efficiency, scalability, security, and affordability. The system centralizes all records, automates tracking and approval workflows, and provides analytical reporting tools to improve decision-making — all tailored specifically to PLMun's operational requirements.

---

## REQUIREMENTS GATHERING DETAILS

### Hardware Requirements

| Component | Specification | Purpose |
|-----------|--------------|---------|
| PC/Server | Local or cloud-based host (Railway / AWS / DigitalOcean) | System hosting |
| RAM | 8GB (server) / 4GB (client) | Smooth performance |
| Storage | 250GB SSD (server) / 500GB backup | Reliable data access |
| Processor | Intel i5 or higher | Fast system response |
| Network | Stable internet connection | Multi-user access and API communication |
| UPS | Backup power supply | Prevent data loss during outages |

### Software Requirements

| Category | Specification |
|----------|--------------|
| Operating System | Windows / Linux Server (Ubuntu) |
| Database | PostgreSQL 18 (production) / SQLite (development) |
| Backend Framework | Django 6.0 with Django REST Framework |
| Frontend Framework | React 18 with Vite 5 (build tool) |
| Programming Language | Python 3.x (backend), JavaScript ES6+ (frontend) |
| State Management | Zustand (with localStorage persistence) |
| HTTP Client | Axios (with JWT interceptor for automatic token refresh) |
| Authentication | SimpleJWT (JWT access + refresh tokens with rotation and blacklisting) |
| API Documentation | drf-spectacular (auto-generated Swagger + ReDoc) |
| Rate Limiting | django-ratelimit (brute-force protection on auth endpoints) |
| Icons | Lucide React (SVG icon library) |
| PDF Export | jsPDF + AutoTable (client-side PDF generation) |
| CSV Export | file-saver (client-side CSV download) |
| Static Files | WhiteNoise (serve static files without nginx) |
| WSGI Server | Gunicorn (production Python server) |
| CORS Handling | django-cors-headers (frontend/backend cross-origin access) |
| Version Control | Git / GitHub |
| Environment Variables | python-dotenv (.env file management) |
| Deployment | Vercel (frontend) + Railway (backend + PostgreSQL) |

---

## SYSTEM FEATURES (DETAILED)

### Registration & Login

**Functions:**

- Account creation using PLMun email with username and password.
- Admin-managed user activation before system access is granted.
- Role-based access control with 4 hierarchical levels (Student, Faculty, Staff, Admin).
- Duplicate registration prevention via email and username validation.
- Secure login validation with PBKDF2+SHA-256 password hashing.
- JWT token-based session management (access + refresh tokens).
- Automatic token refresh via Axios interceptor (transparent to user).
- Idle auto-logout after configurable inactivity period.
- All authentication events logged in the audit trail.

### Inventory Management

**Functions:**

- View and update real-time stock levels.
- Add / Edit / Delete inventory items (Staff and Admin only).
- Categorize items: Electronics, Furniture, Equipment, Supplies, Other.
- Track item status: Available, In Use, Maintenance, Retired.
- Role-based access level filtering (users only see items at or below their role level).
- Set returnable vs. non-returnable (consumable) item flags.
- Configure borrow duration per item (Minutes, Hours, Days, Months).
- Track status change history with notes, who changed it, and when.
- Maintenance ETA tracking for items under maintenance.
- Image upload for item photos.
- QR code generation and display for quick item identification.
- Automatic low-stock alerts (quantity ≤ 5) and out-of-stock detection (quantity = 0).
- Search, filter by category, and filter by status.
- Paginated item listing (50 items per page).

### Send / Submit Request

**Functions:**

- Faculty, Staff, and Students submit supply/borrow requests with priority tagging (Low, Normal, High).
- Auto-check current stock availability before submission.
- Full request lifecycle: Pending → Approved → Completed/Returned (or Rejected/Cancelled).
- Atomic stock deduction on approval using Django `F()` expressions (race-condition safe).
- Auto-calculation of expected return date based on item's borrow duration setting.
- No self-approval enforcement.
- Comment threads on each request for communication between requester and approver.
- Notifications for every request state change (approval, rejection, comments, overdue).
- Low-stock and overdue alerts to Staff and Admin users.
- Overdue item detection with bulk notification capability.

### Reports & Analytics

**Functions:**

- Generate inventory usage reports with statistics and trend data.
- Visual dashboard with stat cards (totals, pending, approved, low-stock, overdue).
- Charts for supply usage and request trends.
- Export reports to PDF (jsPDF + AutoTable) and CSV (file-saver).
- Complete audit log trail for all system actions.
- Filter and search capabilities across all report data.

### User Management (Admin Only)

**Functions:**

- View all registered users with pagination.
- Search and filter by role (Student, Faculty, Staff, Admin) and active status.
- Change user roles (promote/demote).
- Activate / deactivate user accounts.
- Delete users permanently.
- User statistics dashboard (count by role).
- Automatic flagging of users with overdue returns.

---

## SECURITY & DATA PRIVACY

- **Password Hashing**: All passwords are hashed using PBKDF2 with SHA-256 (Django's default, industry-standard).
- **JWT Authentication**: Short-lived access tokens (1 hour) with refresh token rotation and blacklisting.
- **Rate Limiting**: Authentication endpoints are rate-limited to prevent brute-force attacks.
- **Input Sanitization**: All user-submitted text fields run through `strip_tags()` in serializer validators before saving (XSS prevention).
- **CORS Protection**: Restricted origins in production; `CORS_ALLOW_ALL_ORIGINS` only in debug mode.
- **Object-Level Security**: Non-staff users can only see their own requests (IDOR prevention).
- **Role-Based Access Control**: Dual-layer enforcement on both backend (Django permission classes + queryset filtering) and frontend (RoleGuard component + UI hiding).
- **Audit Logging**: All security-relevant actions (logins, failed logins, data changes, deletions) are recorded with timestamp, IP address, and user details.
- **Environment Secrets**: All sensitive configuration (SECRET_KEY, DATABASE_URL) stored in `.env` files excluded from version control.
- **Self-Approval Prevention**: Backend logic explicitly blocks users from approving their own requests.
- **Atomic Database Operations**: Stock deduction uses Django's `F()` expression for race-condition-safe updates.
- **Compliance**: Aligns with Data Privacy Act of 2012 (RA 10173) for secure handling of user and institutional data.

---

## PROGRAMMING TOOLS

| Component | Technology |
|-----------|-----------|
| Front-End Framework | React 18 |
| Front-End Build Tool | Vite 5 |
| Front-End Routing | React Router v6 |
| State Management | Zustand |
| HTTP Client | Axios |
| Icons | Lucide React |
| PDF Export | jsPDF + AutoTable |
| CSV Export | file-saver |
| Back-End Framework | Django 6.0 |
| API Layer | Django REST Framework (DRF) |
| Authentication | SimpleJWT |
| API Documentation | drf-spectacular |
| Rate Limiting | django-ratelimit |
| Database | PostgreSQL 18 |
| Static Files Server | WhiteNoise |
| WSGI Server | Gunicorn |
| Version Control | Git / GitHub |
| Frontend Deployment | Vercel |
| Backend Deployment | Railway |

---

## PEOPLEWARE REQUIREMENTS

| User Type | Role |
|-----------|------|
| Students | Submit supply/borrow requests; track personal request status. |
| Faculty Members | Submit supply/facility requests; view inventory catalog and dashboard. |
| Staff / Inventory Officers | Manage inventory, approve/reject requests, issue items, generate reports. |
| Admin / PLMun Management | Full system access: manage users, monitor usage, generate reports, configure settings. |
| IT Support Team | Maintain the system, manage deployments, ensure uptime and data security. |
