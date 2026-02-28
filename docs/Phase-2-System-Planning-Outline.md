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

## PHASE 2: SYSTEM PLANNING OUTLINE

---

## INTRODUCTION

### Project Description

The Supply and Facility Inventory Management System (**PLMun Inventory Nexus**) is a digital solution designed for Pamantasan ng Lungsod ng Muntinlupa (PLMun) to efficiently manage the university's supplies and facilities.

Currently, inventory tracking and facility management are handled manually through logbooks and paper-based requests, which often result in delays, data inaccuracies, and stock shortages.

This system automates supply requests, inventory updates, and facility monitoring through a secure, centralized web-based platform built with **Django** (backend) and **React** (frontend) — enhancing transparency, efficiency, and accountability across departments.

### Objectives and Purpose of the System

The purpose of the Supply and Facility Inventory Management System is to streamline the processes of supply distribution and facility utilization at PLMun. Specifically, it aims to:

- Digitize and automate supply and facility request procedures through a web-based borrow/request workflow.
- Provide real-time tracking of inventory levels, item statuses, and borrow durations.
- Reduce human error and administrative workload through automated stock deduction and status management.
- Improve accountability through comprehensive audit trails logging all user actions with timestamps and IP addresses.
- Support informed decision-making via analytics dashboards, trend charts, and exportable reports (PDF/CSV).

### Scope of the System

The system includes the following features:

- **Supply Inventory Management**: Real-time tracking of supply levels, item categorization (Electronics, Furniture, Equipment, Supplies, Other), role-based access filtering, borrow duration settings, low-stock alerts, and QR code generation.
- **Request Management**: Online submission of borrow/supply requests with priority tagging, automated approval workflow, comment threads, and overdue detection.
- **User Management**: Role-based access control with four hierarchical levels (Student, Faculty, Staff, Admin), account activation/deactivation, and user statistics.
- **Notification System**: Real-time notifications for status changes, comments, reminders, and overdue alerts.
- **Reports and Analytics**: Automated report generation with visual dashboards, inventory/request statistics, and PDF/CSV export.

**Excluded from scope:**
- Integration with external ERP or financial systems (optional future enhancement).
- Handling of external supplier transactions outside PLMun's internal inventory.
- Facility room booking and scheduling (future phase).

### Stakeholders Involved

| Stakeholder | Role / Benefit |
|-------------|---------------|
| Students | Submit borrow requests for supplies and equipment; check request status and history. |
| Faculty Members | Submit requests for office and classroom supplies; view inventory catalog and dashboard. |
| Staff / Inventory Officers | Manage inventory items, approve/reject requests, issue supplies, and generate reports. |
| Administrators (PLMun Management) | Full system access: manage users, monitor usage, generate reports, and configure system settings. |
| IT Department | Maintain the system, manage deployments, handle updates, and ensure data security. |

---

## FEASIBILITY STUDY

The Supply and Facility Inventory Management System aims to automate and streamline the process of managing office and school supplies within PLMun. Currently, the supply office relies on manual or semi-digital methods, resulting in inefficiencies such as inaccurate tracking, delays in request approvals, and stock shortages. This system addresses these issues by providing an online platform for students and faculty to submit requests, supply staff to manage stock, and administrators to oversee reports and trends.

### Objectives of the Study

- To develop an automated system that tracks supply requests, approvals, and inventory levels in real time.
- To improve transparency and accountability in supply distribution through audit logging.
- To generate automated reports for administrative monitoring and data-driven decision-making.
- To reduce manual paperwork and human errors in the supply management process.

### Scope of the System

The system covers the following functionalities:

- **Registration & Login**: Secure user registration with admin-managed activation and JWT token-based authentication.
- **Request Module**: Students and faculty submit borrow requests with priority tagging, filtered by item access levels.
- **Inventory Module**: Staff manage stock levels, add/edit items, set borrow durations, and receive automated low-stock alerts.
- **Reports Module**: Admins and Staff generate reports on item usage, request statistics, and audit trails.
- **Notification Module**: Real-time notifications for status changes, comments, and overdue items.

Users include students, faculty members, supply office staff, and university administrators.

---

### Operational Feasibility

The proposed system simplifies and improves current operations by:

- Allowing students and faculty to submit and track supply/borrow requests online through a user-friendly React interface.
- Providing supply staff with a centralized dashboard to approve/reject requests, update stock, and manage items.
- Automatically alerting users of low inventory levels (≤ 5 items) and out-of-stock items to prevent shortages.
- Giving administrators a data-driven view of supply usage, request trends, and audit trails for better planning.
- Supporting multiple concurrent users through a RESTful API architecture with JWT authentication.

Since the system aligns with existing workflows but replaces manual processes with automation, it is **highly operationally feasible**.

---

### Technical Feasibility

#### Hardware Requirements

| Component | Specification | Purpose |
|-----------|--------------|---------|
| Server/PC | Cloud-hosted (Railway) or local Intel i5+ | System hosting |
| RAM | 8GB for server; 4GB for client | Smooth performance |
| Storage | 250GB SSD for server; cloud backup | Reliable data access |
| Network | Stable internet connection | Multi-user access and API communication |
| UPS | Backup power supply | Prevent data loss during outages |

#### Software Requirements

| Category | Specification |
|----------|--------------|
| Operating System | Windows / Linux Server (Ubuntu) |
| Database | PostgreSQL 18 (production) / SQLite (development) |
| Back-End Framework | Django 6.0 with Django REST Framework |
| Front-End Framework | React 18 with Vite 5 |
| State Management | Zustand (persisted to localStorage) |
| Authentication | SimpleJWT (access + refresh tokens, rotation, blacklisting) |
| API Documentation | drf-spectacular (auto-generated Swagger + ReDoc) |
| Version Control | Git / GitHub |
| Frontend Deployment | Vercel (static site hosting) |
| Backend Deployment | Railway (Django + PostgreSQL hosting) |
| WSGI Server | Gunicorn |
| Static Files | WhiteNoise |

The technologies selected are well-established, open-source, and actively maintained. The development team has experience with Django and React, making this **technically feasible**.

---

### Economic Feasibility

#### Estimated Costs

**A. Development Costs**

| Item Description | Estimated Cost (₱) | Remarks |
|-----------------|-------------------|---------|
| System Analysis & Design | ₱50,000 | Requirements gathering, system architecture, prototyping |
| Software Development | ₱120,000 | Frontend (React), backend (Django), database integration, testing |
| UI/UX Design | ₱25,000 | Interface design, wireframing, responsiveness testing |
| Quality Assurance & Testing | ₱20,000 | Functional testing, bug fixing, pre-deployment |
| Deployment Setup | ₱15,000 | Vercel + Railway hosting config, SSL, domain |
| **Subtotal (Development)** | **₱230,000** | One-time investment |

**B. Hardware & Equipment Costs**

| Item Description | Estimated Cost (₱) | Remarks |
|-----------------|-------------------|---------|
| Cloud Hosting (Railway) | ₱12,000 / year | Django + PostgreSQL hosting |
| Frontend Hosting (Vercel) | ₱0 – ₱6,000 / year | Free tier available; Pro plan optional |
| Workstations (3 units) | ₱90,000 | ₱30,000 each (for supply staff and admin) |
| Printers (2 units) | ₱10,000 | ₱5,000 each (for receipts and reports) |
| UPS (Uninterruptible Power Supply) | ₱6,000 | One-time cost |
| Network Equipment | ₱8,000 | Routers, LAN cables, modems |
| **Subtotal (Hardware)** | **₱132,000** | One-time + minor recurring |

**C. Operational & Maintenance Costs**

| Item Description | Estimated Cost (₱) | Remarks |
|-----------------|-------------------|---------|
| Cloud Hosting Renewal | ₱12,000 / year | Recurring annual |
| System Maintenance | ₱30,000 / year | Updates, bug fixes, monitoring |
| Data Backup & Storage | ₱6,000 / year | Cloud backups and redundancy |
| User Training | ₱15,000 | One-time workshop for initial users |
| Technical Support | ₱10,000 / year | Ticket-based support during maintenance |
| **Subtotal (Operational)** | **₱73,000 / year** | Recurring annual cost |

**D. Contingency & Miscellaneous**

| Item Description | Estimated Cost (₱) | Remarks |
|-----------------|-------------------|---------|
| Contingency Fund (10%) | ₱23,000 | Standard contingency |
| **TOTAL PROJECT COST (Initial Year)** | **₱458,000** | Including development & hardware |

#### Expected Benefits

| Benefit | Description | Estimated Annual Value (₱) |
|---------|-------------|---------------------------|
| Reduced Manual Labor | Less time spent on paperwork and manual inventory tracking | ₱120,000 (equivalent to 1 staff workload saved) |
| Operational Efficiency | Faster request processing, reduced errors, improved coordination | ₱80,000 |
| Reduced Supply Wastage | Better tracking prevents overordering and losses | ₱50,000 |
| Improved Data Accuracy | Reliable reporting reduces auditing errors | ₱30,000 |
| **TOTAL ANNUAL BENEFIT** | | **₱280,000 / year** |

#### Funding Sources

- **PLMun Internal IT Budget**: Allocated under campus digitalization projects.
- **Government Grants**: Potential funding under CHED or LGU smart-campus initiatives.
- **Private Sponsors/Partnerships**: Collaboration with local IT firms or educational tech partners.

#### Break-Even Analysis

| Category | Amount (₱) |
|----------|-----------|
| Initial Investment (Year 1) | ₱458,000 |
| Annual Recurring Cost (Maintenance) | ₱73,000 |
| Annual Savings/Benefit | ₱280,000 |
| Net Annual Benefit After Maintenance | ₱207,000 |

**Projected Break-Even Point:**
≈ **2.2 years** (₱458,000 ÷ ₱207,000 ≈ 2.2)

After approximately **2 years**, the system will start generating net savings for the university through reduced manual work, time savings, and improved inventory efficiency.

---

### Operational Feasibility — Organizational Structure

| Role | Responsibility |
|------|---------------|
| Project Manager | Oversees system implementation and coordinates between departments. |
| System Developers | Build and test system functionalities (Django backend + React frontend). |
| Database Administrator | Manage and secure the PostgreSQL database, backups, and migrations. |
| IT Support Team | Provide system maintenance, deployment updates, and user support. |
| Supply Office Personnel | Operate the system for inventory management, request approvals, and reporting. |

#### Process Workflows

1. Student or Faculty submits an online supply/borrow request with priority and purpose.
2. All Staff+ users receive a notification about the new request.
3. Supply staff reviews the request, checks stock availability, and approves or rejects.
4. Upon approval, inventory stock is atomically deducted, and the expected return date is auto-calculated.
5. The requester is notified of the decision and can track status through their dashboard.
6. When the item is returned, staff marks the request as completed/returned.
7. Admin generates monthly reports for tracking usage, stock trends, and audit trails.

#### Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| System Downtime | Delays in operations | Cloud hosting with uptime guarantees; scheduled maintenance windows |
| User Resistance | Slow adoption | Conduct training workshops; provide user-friendly UI with intuitive design |
| Data Breach | Loss of sensitive data | JWT authentication, input sanitization, rate limiting, encrypted passwords, audit logging |
| Token Theft | Unauthorized access | Short-lived access tokens (1 hour), refresh token rotation, blacklisting on logout |
| Race Conditions | Incorrect stock data | Atomic `F()` expression for database updates; no read-modify-write patterns |

---

### Schedule Feasibility

| Phase | Activity | Duration |
|-------|---------|----------|
| Phase 1 | Requirements Analysis & Planning | 2 weeks (August 12 – 23) |
| Phase 2 | System Design & Prototyping | 2 months (August 26 – October 23) |
| Phase 3 | Development & Testing | N/A |
| Phase 4 | Pilot Implementation | N/A |
| Phase 5 | Full Deployment & Monitoring | N/A |

---

### Legal and Regulatory Considerations

- **Data Privacy Act of 2012 (RA 10173)** — Secure handling of user and inventory data. All personal data is encrypted and access-controlled.
- **Institutional Data Governance Policies** — Compliance with PLMun data security protocols and IT governance.
- **Accessibility Standards** — Web-based interface ensures usability across modern browsers and devices.
- **Intellectual Property Rights** — Software ownership retained by PLMun and the development team.

---

## REQUIREMENTS GATHERING

### Methods

- **Interviews with Faculty Members**: Identify frequently requested supplies and current pain points in the request process.
- **Interviews with Supply Staff**: Understand workflow bottlenecks, inventory challenges, and approval processes.
- **Review of Related Systems**: Examine best practices from inventory management platforms (NetSuite, Odoo, similar educational institution systems).
- **Online Research**: Analyze data on commonly used educational supplies, modern web development practices, and REST API design patterns.

### Hardware Requirements

| Component | Specification | Purpose |
|-----------|--------------|---------|
| PC/Server | Cloud-hosted (Railway) or local server | System hosting |
| RAM | 8GB (server) / 4GB (client) | Smooth performance |
| Storage | 250GB SSD (server) / cloud backup | Reliable data access |
| Processor | Intel i5 or higher | Fast system response |
| Network | Stable internet connection | Multi-user access and API communication |
| UPS | Backup power supply | Prevent data loss during outages |

### Software Requirements

| Category | Specification |
|----------|--------------|
| Operating System | Windows / Linux Server (Ubuntu) |
| Database | PostgreSQL 18 |
| Back-End Framework | Django 6.0 + Django REST Framework |
| Front-End Framework | React 18 + Vite 5 |
| Authentication | SimpleJWT (RBAC with 4 roles) |
| State Management | Zustand (persisted to localStorage) |
| Version Control | Git / GitHub |
| Deployment | Vercel (frontend) + Railway (backend) |
| Security Tools | HTTPS, PBKDF2+SHA-256 password hashing, JWT tokens, django-ratelimit, input sanitization |

---

## SYSTEM FEATURES

### Registration & Login

**Functions:**

- Account creation using PLMun email with secure password requirements.
- Admin-managed account activation before system access.
- Role-based access with 4 hierarchical levels (Student, Faculty, Staff, Admin).
- Duplicate registration prevention via email and username validation.
- Secure login with PBKDF2+SHA-256 hashed passwords.
- JWT token-based authentication with automatic refresh.
- Rate-limited login endpoint to prevent brute-force attacks.
- Idle auto-logout for unattended sessions.
- Full audit logging of all authentication events.

### Inventory Management

**Functions:**

- View and update real-time stock levels with role-based access filtering.
- Add / Edit / Delete inventory items (Staff and Admin only).
- Categorize items: Electronics, Furniture, Equipment, Supplies, Other.
- Track item status: Available, In Use, Maintenance, Retired.
- Set item access levels to control visibility per role.
- Configure returnable vs. non-returnable flags.
- Set borrow duration per item (Minutes, Hours, Days, Months).
- QR code generation for quick item identification.
- Auto-notifications for low stock (≤ 5) and out-of-stock (= 0) items.
- Image upload for item photos.
- Search, filter by category and status, paginated results.

### Send / Submit Request

**Functions:**

- Faculty, Staff, and Students submit supply/borrow requests with priority tagging (Low, Normal, High).
- Auto-check current stock availability before submission.
- Full request lifecycle: Pending → Approved/Rejected/Cancelled → Completed/Returned.
- Atomic stock deduction on approval (Django `F()` expression).
- Auto-calculation of expected return date based on item borrow duration.
- No self-approval enforcement.
- Comment threads for requester-approver communication.
- Notifications for every status change.
- Overdue detection with bulk notification to Staff+.

### Reports & Analytics

**Functions:**

- Generate inventory and request usage reports.
- Visual dashboard with statistics cards and charts.
- Track fulfillment rates, shortages, and demand trends.
- Export reports to PDF (jsPDF) and CSV (file-saver).
- Complete audit log trail for accountability.

### User Management (Admin Only)

**Functions:**

- View, search, and filter all users by role and status.
- Change user roles (promote/demote).
- Activate / deactivate user accounts.
- Delete users permanently.
- User statistics by role.
- Automatic overdue flagging.

---

## DATA FLOW DIAGRAM

### Level 0 — Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│          SUPPLY AND FACILITY INVENTORY MANAGEMENT SYSTEM        │
│                      (PLMun Inventory Nexus)                    │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  USER & ROLE    │  │    REQUEST      │  │   INVENTORY     │
│  MANAGEMENT     │  │   MANAGEMENT    │  │   MANAGEMENT    │
│                 │  │                 │  │                 │
│ • Registration  │  │ • Submit        │  │ • Add/Edit/Del  │
│ • Login/Logout  │  │ • Approve/Deny  │  │ • Stock Levels  │
│ • Role Assign   │  │ • Comments      │  │ • Categories    │
│ • Activation    │  │ • Overdue Check │  │ • Access Levels │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │ NOTIFICATION    │
                     │ SYSTEM          │
                     │                 │
                     │ • Status Alerts │
                     │ • Comments      │
                     │ • Overdue       │
                     └─────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │  REPORTING      │
                     │  MODULE         │
                     │                 │
                     │ • Dashboards    │
                     │ • PDF/CSV Export│
                     │ • Audit Logs   │
                     └─────────────────┘
```

### Level 1 — System Decomposition

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   STUDENT    │     │   FACULTY    │     │    STAFF     │     │    ADMIN     │
│              │     │              │     │              │     │              │
│ • Request    │     │ • Request    │     │ • Approve    │     │ • Full       │
│ • View Own   │     │ • Dashboard  │     │ • Inventory  │     │   Access     │
│              │     │ • Inventory  │     │ • Reports    │     │ • Users      │
│              │     │   (view)     │     │              │     │ • Settings   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       └────────────────────┴────────────────────┴────────────────────┘
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │     React Frontend (Vite)     │
                     │     RoleGuard + Zustand       │
                     └───────────────┬───────────────┘
                                     │  HTTP + JWT
                                     ▼
                     ┌───────────────────────────────┐
                     │   Django REST Framework API   │
                     │   Permission Classes + DRF    │
                     └───────────────┬───────────────┘
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │     PostgreSQL Database       │
                     │  Users │ Items │ Requests │   │
                     │  Comments │ Notifications │   │
                     │  Audit Logs                   │
                     └───────────────────────────────┘
```

---

## PROGRAMMING TOOLS

| Component | Technology |
|-----------|-----------|
| Front-End | React 18 + Vite 5 |
| Back-End | Django 6.0 + Django REST Framework |
| Database | PostgreSQL 18 |
| Authentication | SimpleJWT |
| State Management | Zustand |
| HTTP Client | Axios |
| Icons | Lucide React |
| PDF Export | jsPDF + AutoTable |
| CSV Export | file-saver |
| Version Control | Git / GitHub |
| Frontend Deployment | Vercel |
| Backend Deployment | Railway |
| Notifications | In-app notification system (database-backed) |

---

## PEOPLEWARE REQUIREMENTS

| User Type | Role |
|-----------|------|
| Students | Submit supply/borrow requests; track personal request history. |
| Faculty Members | Submit supply/facility requests; view dashboard and inventory catalog. |
| Staff / Inventory Officers | Manage approvals, issue items, update stock, and generate reports. |
| Admin / PLMun Management | Full system access: monitor usage, manage users, and configure settings. |
| IT Support Team | Maintain the system, manage deployments, and ensure uptime. |
