"""
PLMun Nexus Security Audit Script
Tests: SQL injection, auth bypass, privilege escalation, IDOR, brute force, XSS payloads
Run: python security_audit.py
Requires: pip install requests
"""

import requests
import json
import sys
import io

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_URL = "http://127.0.0.1:8000/api"
PASS = "[PASS]"
FAIL = "[FAIL]"
WARN = "[WARN]"

results = []

def log(status, test_name, detail=""):
    icon = PASS if status == "pass" else (FAIL if status == "fail" else WARN)
    msg = f"  {icon}  {test_name}"
    if detail:
        msg += f" — {detail}"
    print(msg)
    results.append((status, test_name))

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

# ─── Setup: get valid tokens ──────────────────────────────────────────────────
section("SETUP: Obtaining test credentials")

# Try to login as admin
admin_token = None
student_token = None

try:
    r = requests.post(f"{BASE_URL}/auth/login/", json={"username": "admin", "password": "AuditTest@123"}, timeout=5)
    if r.status_code == 200:
        admin_token = r.json().get("access")
        log("pass", "Admin login successful")
    else:
        log("warn", "Admin login failed — some tests will be skipped", f"status={r.status_code}")
except Exception as e:
    log("warn", f"Cannot connect to backend: {e}", "Start the server first with: python manage.py runserver")
    sys.exit(1)

# Try to register a student for privilege escalation tests
try:
    r = requests.post(f"{BASE_URL}/auth/register/", json={
        "username": "sec_test_student",
        "email": "sectest@test.com",
        "password": "SecTest@123",
        "password2": "SecTest@123",
        "role": "STUDENT",
    }, timeout=5)
    if r.status_code in (200, 201):
        student_token = r.json().get("access")
        log("pass", "Student test account created")
    else:
        # Try login if already exists
        r2 = requests.post(f"{BASE_URL}/auth/login/", json={"username": "sec_test_student", "password": "SecTest@123"}, timeout=5)
        if r2.status_code == 200:
            student_token = r2.json().get("access")
            log("pass", "Student test account logged in (already existed)")
        else:
            log("warn", "Could not create/login student test account")
except Exception as e:
    log("warn", f"Student setup failed: {e}")


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ─── 1. SQL INJECTION TESTS ───────────────────────────────────────────────────
section("1. SQL INJECTION ATTACKS")

sql_payloads = [
    "' OR '1'='1",
    "' OR 1=1--",
    "admin'--",
    "' UNION SELECT username,password FROM auth_user--",
    "1; DROP TABLE inventory_item--",
    "' OR 'x'='x",
    "\" OR \"1\"=\"1",
]

for payload in sql_payloads:
    try:
        # Test login endpoint
        r = requests.post(f"{BASE_URL}/auth/login/", json={"username": payload, "password": payload}, timeout=5)
        if r.status_code == 200 and r.json().get("access"):
            log("fail", f"SQL Injection: Login bypass succeeded!", f"payload={payload!r}")
        elif r.status_code in (400, 401):
            log("pass", f"SQL Injection blocked on login", f"payload={payload[:30]!r}")
        else:
            log("warn", f"Unexpected response", f"status={r.status_code}, payload={payload[:30]!r}")

        # Test inventory search (if authenticated)
        if admin_token:
            r2 = requests.get(f"{BASE_URL}/inventory/?search={payload}", headers=auth_headers(admin_token), timeout=5)
            if r2.status_code == 200:
                log("pass", f"SQL Injection in search: returned safely", f"payload={payload[:30]!r}")
            else:
                log("warn", f"Search returned {r2.status_code}", f"payload={payload[:30]!r}")
    except Exception as e:
        log("warn", f"SQL injection test error: {e}")


# ─── 2. AUTHENTICATION BYPASS ────────────────────────────────────────────────
section("2. AUTHENTICATION BYPASS")

# Access protected endpoint without token
try:
    r = requests.get(f"{BASE_URL}/inventory/", timeout=5)
    if r.status_code == 401:
        log("pass", "Unauthenticated access to /inventory/ blocked (401)")
    elif r.status_code == 403:
        log("pass", "Unauthenticated access to /inventory/ blocked (403)")
    else:
        log("fail", "Unauthenticated access to /inventory/ NOT blocked", f"status={r.status_code}")
except Exception as e:
    log("warn", f"Test error: {e}")

# Access with fake/invalid token
try:
    r = requests.get(f"{BASE_URL}/inventory/", headers={"Authorization": "Bearer fake.token.here"}, timeout=5)
    if r.status_code == 401:
        log("pass", "Fake JWT token rejected (401)")
    else:
        log("fail", "Fake JWT token NOT rejected", f"status={r.status_code}")
except Exception as e:
    log("warn", f"Test error: {e}")

# Access with malformed Authorization header
try:
    r = requests.get(f"{BASE_URL}/inventory/", headers={"Authorization": "Basic YWRtaW46YWRtaW4="}, timeout=5)
    if r.status_code == 401:
        log("pass", "Basic auth header rejected (401)")
    else:
        log("warn", "Basic auth header not explicitly rejected", f"status={r.status_code}")
except Exception as e:
    log("warn", f"Test error: {e}")

# Access with empty token
try:
    r = requests.get(f"{BASE_URL}/inventory/", headers={"Authorization": "Bearer "}, timeout=5)
    if r.status_code == 401:
        log("pass", "Empty Bearer token rejected (401)")
    else:
        log("warn", "Empty Bearer token not rejected", f"status={r.status_code}")
except Exception as e:
    log("warn", f"Test error: {e}")


# ─── 3. PRIVILEGE ESCALATION ─────────────────────────────────────────────────
section("3. PRIVILEGE ESCALATION")

if student_token:
    # Student tries to access admin-only backup endpoint
    try:
        r = requests.get(f"{BASE_URL}/auth/backup/", headers=auth_headers(student_token), timeout=5)
        if r.status_code == 403:
            log("pass", "Student blocked from admin backup endpoint (403)")
        elif r.status_code == 401:
            log("pass", "Student blocked from admin backup endpoint (401)")
        else:
            log("fail", "Student accessed admin backup endpoint!", f"status={r.status_code}")
    except Exception as e:
        log("warn", f"Test error: {e}")

    # Student tries to approve a request
    try:
        r = requests.post(f"{BASE_URL}/requests/1/approve/", headers=auth_headers(student_token), json={}, timeout=5)
        if r.status_code in (403, 404):
            log("pass", f"Student blocked from approving requests ({r.status_code})")
        else:
            log("fail", "Student was able to approve a request!", f"status={r.status_code}")
    except Exception as e:
        log("warn", f"Test error: {e}")

    # Student tries to create inventory item
    try:
        r = requests.post(f"{BASE_URL}/inventory/", headers=auth_headers(student_token), json={
            "name": "Hacked Item", "category": "ELECTRONICS", "quantity": 999,
        }, timeout=5)
        if r.status_code == 403:
            log("pass", "Student blocked from creating inventory items (403)")
        else:
            log("fail", "Student was able to create inventory item!", f"status={r.status_code}")
    except Exception as e:
        log("warn", f"Test error: {e}")

    # Student tries to delete inventory item
    try:
        r = requests.delete(f"{BASE_URL}/inventory/1/", headers=auth_headers(student_token), timeout=5)
        if r.status_code in (403, 404):
            log("pass", f"Student blocked from deleting inventory items ({r.status_code})")
        else:
            log("fail", "Student was able to delete inventory item!", f"status={r.status_code}")
    except Exception as e:
        log("warn", f"Test error: {e}")

    # Student tries to toggle another user's status (admin-only)
    try:
        r = requests.post(f"{BASE_URL}/users/1/toggle_status/", headers=auth_headers(student_token), json={}, timeout=5)
        if r.status_code in (403, 404):
            log("pass", f"Student blocked from toggling user status ({r.status_code})")
        else:
            log("fail", "Student was able to toggle user status!", f"status={r.status_code}")
    except Exception as e:
        log("warn", f"Test error: {e}")
else:
    log("warn", "Privilege escalation tests skipped (no student token)")


# ─── 4. IDOR (Insecure Direct Object Reference) ──────────────────────────────
section("4. IDOR ATTACKS")

if student_token and admin_token:
    # Student tries to read another user's profile by ID
    try:
        r = requests.get(f"{BASE_URL}/users/1/", headers=auth_headers(student_token), timeout=5)
        if r.status_code in (403, 404):
            log("pass", f"Student blocked from reading other user profiles ({r.status_code})")
        elif r.status_code == 200:
            log("warn", "Student can read user profiles (check if this is intended)", f"status={r.status_code}")
        else:
            log("warn", f"Unexpected response: {r.status_code}")
    except Exception as e:
        log("warn", f"Test error: {e}")

    # Student tries to cancel another user's request
    try:
        r = requests.post(f"{BASE_URL}/requests/1/cancel/", headers=auth_headers(student_token), json={}, timeout=5)
        if r.status_code in (400, 403, 404):
            log("pass", f"Student blocked from cancelling others' requests ({r.status_code})")
        else:
            log("warn", f"Unexpected response for cancel: {r.status_code}")
    except Exception as e:
        log("warn", f"Test error: {e}")
else:
    log("warn", "IDOR tests skipped (missing tokens)")


# ─── 5. XSS PAYLOAD INJECTION ────────────────────────────────────────────────
section("5. XSS PAYLOAD INJECTION")

xss_payloads = [
    "<script>alert('xss')</script>",
    "javascript:alert(1)",
    "<img src=x onerror=alert(1)>",
    "';alert('xss');//",
]

if admin_token:
    for payload in xss_payloads:
        try:
            # Try injecting XSS into inventory item name
            r = requests.post(f"{BASE_URL}/inventory/", headers=auth_headers(admin_token), json={
                "name": payload,
                "category": "ELECTRONICS",
                "quantity": 1,
                "status": "AVAILABLE",
                "access_level": "STUDENT",
            }, timeout=5)
            if r.status_code in (200, 201):
                # Check if the payload was stored as-is (backend should just store it, frontend escapes it)
                item_name = r.json().get("name", "")
                if item_name == payload:
                    log("pass", f"XSS payload stored as plain text (React auto-escapes in DOM)", f"payload={payload[:40]!r}")
                    # Clean up
                    item_id = r.json().get("id")
                    if item_id:
                        requests.delete(f"{BASE_URL}/inventory/{item_id}/", headers=auth_headers(admin_token), timeout=5)
                else:
                    log("warn", f"XSS payload was modified by backend", f"stored={item_name[:40]!r}")
            elif r.status_code == 400:
                log("pass", f"XSS payload rejected by backend validation", f"payload={payload[:40]!r}")
            else:
                log("warn", f"Unexpected response: {r.status_code}")
        except Exception as e:
            log("warn", f"Test error: {e}")
else:
    log("warn", "XSS tests skipped (no admin token)")


# ─── 6. SELF-APPROVAL PREVENTION ─────────────────────────────────────────────
section("6. BUSINESS LOGIC — SELF-APPROVAL PREVENTION")

if admin_token:
    # Get admin user info
    try:
        me = requests.get(f"{BASE_URL}/auth/profile/", headers=auth_headers(admin_token), timeout=5)
        if me.status_code == 200:
            admin_id = me.json().get("id")
            # Find a request made by admin and try to approve it
            reqs = requests.get(f"{BASE_URL}/requests/", headers=auth_headers(admin_token), timeout=5)
            if reqs.status_code == 200:
                admin_requests = [r for r in reqs.json() if r.get("requestedById") == admin_id and r.get("status") == "PENDING"]
                if admin_requests:
                    req_id = admin_requests[0]["id"]
                    r = requests.post(f"{BASE_URL}/requests/{req_id}/approve/", headers=auth_headers(admin_token), json={}, timeout=5)
                    if r.status_code == 403:
                        log("pass", "Self-approval correctly blocked (403)")
                    else:
                        log("fail", "Self-approval NOT blocked!", f"status={r.status_code}")
                else:
                    log("warn", "No pending admin requests to test self-approval")
    except Exception as e:
        log("warn", f"Self-approval test error: {e}")


# ─── 7. RATE LIMITING / BRUTE FORCE ──────────────────────────────────────────
section("7. BRUTE FORCE PROTECTION")

brute_blocked = False
for i in range(10):
    try:
        r = requests.post(f"{BASE_URL}/auth/login/", json={"username": "admin", "password": f"wrong{i}"}, timeout=5)
        if r.status_code == 429:
            log("pass", f"Rate limiting triggered after {i+1} attempts (429)")
            brute_blocked = True
            break
    except Exception as e:
        break

if not brute_blocked:
    log("warn", "No rate limiting detected on login endpoint — consider adding django-ratelimit or throttling")


# ─── SUMMARY ──────────────────────────────────────────────────────────────────
section("SECURITY AUDIT SUMMARY")

passed = sum(1 for s, _ in results if s == "pass")
failed = sum(1 for s, _ in results if s == "fail")
warned = sum(1 for s, _ in results if s == "warn")
total = len(results)

print(f"\n  Total checks: {total}")
print(f"  {PASS} Passed:   {passed}")
print(f"  {FAIL} Failed:   {failed}")
print(f"  {WARN} Warnings: {warned}")

if failed > 0:
    print(f"\n  ⚠️  CRITICAL: {failed} security check(s) FAILED. Review immediately.")
    sys.exit(1)
elif warned > 0:
    print(f"\n  ℹ️  {warned} warning(s) found. Review recommended.")
else:
    print(f"\n  🎉 All security checks passed!")
