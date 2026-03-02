"""
PLMun Nexus — Security Penetration Testing Script
Ito yung test tool para i-check kung may vulnerabilities yung system
"""
import requests
import json
import time
import sys

BASE = "http://localhost:8000/api"
RESULTS = []

def log(test_name, status, detail=""):
    icon = "[PASS]" if status == "pass" else "[FAIL]" if status == "fail" else "[WARN]"
    RESULTS.append({"test": test_name, "status": status, "detail": detail})
    print(f"  {icon}: {test_name}")
    if detail:
        print(f"         → {detail}")

def get_tokens(email, password):
    """Login and return (access, refresh, user) or (None, None, None)."""
    try:
        r = requests.post(f"{BASE}/auth/login/", json={"email": email, "password": password})
        if r.status_code == 200:
            data = r.json()
            return data.get("access"), data.get("refresh"), data.get("user")
    except:
        pass
    return None, None, None

def auth_header(token):
    return {"Authorization": f"Bearer {token}"}

# ============================================================
print("\n" + "="*60)
print("  PLMun Nexus — SECURITY PENETRATION TEST")
print("="*60)

# --- Step 0: Get tokens for different roles ---
print("\n[*] Getting tokens for test accounts...")

admin_token, admin_refresh, admin_user = get_tokens("sectest_admin@test.com", "SecTest123!")
if not admin_token:
    print("    [!] Admin login failed")

student_token, student_refresh, student_user = get_tokens("sectest_student@test.com", "SecTest123!")
if not student_token:
    print("    [!] Student login failed")

if not admin_token:
    print("    [!] Could not login as admin - will test with limited scope")
if not student_token:
    print("    [!] Could not login as student - will test with limited scope")

# ============================================================
print("\n" + "-"*60)
print("  CATEGORY 1: AUTHENTICATION & SESSION ATTACKS")
print("-"*60)

# Test 1: Access protected endpoint without token
r = requests.get(f"{BASE}/items/")
if r.status_code == 401:
    log("No-token access blocked", "pass", f"Status: {r.status_code}")
else:
    log("No-token access blocked", "fail", f"Status: {r.status_code} - returned data!")

# Test 2: Access with garbage token
r = requests.get(f"{BASE}/items/", headers=auth_header("this.is.fake"))
if r.status_code == 401:
    log("Fake token rejected", "pass")
else:
    log("Fake token rejected", "fail", f"Status: {r.status_code}")

# Test 3: Access with tampered token (modify payload)
if admin_token:
    parts = admin_token.split(".")
    if len(parts) == 3:
        tampered = parts[0] + "." + "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9" + "." + parts[2]
        r = requests.get(f"{BASE}/items/", headers=auth_header(tampered))
        if r.status_code == 401:
            log("Tampered JWT rejected", "pass")
        else:
            log("Tampered JWT rejected", "fail", f"Status: {r.status_code}")

# Test 4: Role escalation via registration
r = requests.post(f"{BASE}/auth/register/", json={
    "username": f"hacktest_{int(time.time())}",
    "email": f"hacktest_{int(time.time())}@test.com",
    "password": "TestPass123!",
    "password2": "TestPass123!",
    "first_name": "Hack",
    "last_name": "Test",
    "role": "ADMIN"
})
if r.status_code in [200, 201]:
    data = r.json()
    user_role = data.get("user", {}).get("role", "unknown")
    if user_role == "ADMIN":
        log("Registration role escalation", "fail", "User registered as ADMIN!")
    else:
        log("Registration role escalation", "pass", f"Role forced to: {user_role}")
elif r.status_code == 429:
    log("Registration role escalation", "pass", "Rate limited (can't register too fast)")
else:
    log("Registration role escalation", "pass", f"Registration returned {r.status_code}")

# Test 5: Brute force rate limiting
print("\n  [*] Testing rate limiting (sending 12 rapid login attempts)...")
blocked = False
for i in range(12):
    r = requests.post(f"{BASE}/auth/login/", json={"email": "sectest_admin@test.com", "password": "wrongpassword"})
    if r.status_code == 429:
        log("Login rate limiting", "pass", f"Blocked after {i+1} attempts")
        blocked = True
        break
if not blocked:
    log("Login rate limiting", "fail", "12 attempts without being blocked!")

# ============================================================
print("\n" + "-"*60)
print("  CATEGORY 2: AUTHORIZATION & IDOR")
print("-"*60)

if student_token:
    # Test 6: Student accessing admin endpoints
    admin_endpoints = [
        ("/auth/audit-logs/", "Audit logs"),
        ("/auth/backup/", "Backup export"),
        ("/users/", "User management"),
    ]
    for endpoint, name in admin_endpoints:
        r = requests.get(f"{BASE}{endpoint}", headers=auth_header(student_token))
        if r.status_code == 403:
            log(f"Student blocked from {name}", "pass")
        else:
            log(f"Student blocked from {name}", "fail", f"Status: {r.status_code}")

    # Test 7: Student trying to approve a request
    r = requests.get(f"{BASE}/requests/", headers=auth_header(student_token))
    if r.status_code == 200:
        data = r.json()
        req_list = data.get("results", data) if isinstance(data, dict) else data
        if req_list and len(req_list) > 0:
            req_id = req_list[0].get("id")
            r2 = requests.post(f"{BASE}/requests/{req_id}/approve/", headers=auth_header(student_token))
            if r2.status_code == 403:
                log("Student approve request blocked", "pass")
            else:
                log("Student approve request blocked", "fail", f"Status: {r2.status_code}")

    # Test 8: Student trying to create an inventory item (staff-only)
    r = requests.post(f"{BASE}/items/", 
        headers=auth_header(student_token),
        json={"name": "Hacked Item", "category": "ELECTRONICS", "quantity": 100})
    if r.status_code == 403:
        log("Student create item blocked", "pass")
    else:
        log("Student create item blocked", "fail", f"Status: {r.status_code}")

    # Test 9: Student trying to delete an inventory item
    r = requests.get(f"{BASE}/items/", headers=auth_header(student_token))
    if r.status_code == 200:
        data = r.json()
        items = data.get("results", data) if isinstance(data, dict) else data
        if items and len(items) > 0:
            item_id = items[0].get("id")
            r2 = requests.delete(f"{BASE}/items/{item_id}/", headers=auth_header(student_token))
            if r2.status_code == 403:
                log("Student delete item blocked", "pass")
            else:
                log("Student delete item blocked", "fail", f"Status: {r2.status_code}")

# Test 10: Role escalation via profile update
if student_token:
    r = requests.put(f"{BASE}/auth/profile/", 
        headers={**auth_header(student_token), "Content-Type": "application/json"},
        json={"role": "ADMIN", "first_name": "HackedAdmin"})
    if r.status_code == 200:
        data = r.json()
        if data.get("role") == "ADMIN":
            log("Profile role escalation", "fail", "Changed role to ADMIN via profile update!")
        else:
            log("Profile role escalation", "pass", f"Role still: {data.get('role')}")
    else:
        log("Profile role escalation", "pass", f"Update rejected: {r.status_code}")

# ============================================================
print("\n" + "-"*60)
print("  CATEGORY 3: INPUT VALIDATION & INJECTION")
print("-"*60)

test_token = admin_token or student_token

if test_token:
    # Test 11: XSS in item name
    xss_payload = '<script>alert("XSS")</script>'
    if admin_token:
        r = requests.post(f"{BASE}/items/",
            headers={**auth_header(admin_token), "Content-Type": "application/json"},
            json={"name": xss_payload, "category": "OTHER", "quantity": 1})
        if r.status_code in [200, 201]:
            item_name = r.json().get("name", "")
            if "<script>" in item_name:
                log("XSS in item name", "fail", f"Script tags preserved: {item_name}")
            else:
                log("XSS in item name", "pass", f"Sanitized to: {item_name}")
            # cleanup
            item_id = r.json().get("id")
            if item_id:
                requests.delete(f"{BASE}/items/{item_id}/", headers=auth_header(admin_token))
        else:
            log("XSS in item name", "pass", f"Creation rejected: {r.status_code}")

    # Test 12: XSS in registration fields
    ts = int(time.time())
    r = requests.post(f"{BASE}/auth/register/", json={
        "username": f"xsstest{ts}",
        "email": f"xss{ts}@test.com",
        "password": "TestPass123!",
        "password2": "TestPass123!",
        "first_name": '<img src=x onerror=alert("XSS")>',
        "last_name": "<b>bold</b>",
    })
    if r.status_code in [200, 201]:
        user_data = r.json().get("user", {})
        fn = user_data.get("first_name", "")
        ln = user_data.get("last_name", "")
        if "<" in fn or "<" in ln:
            log("XSS in registration fields", "fail", f"HTML preserved: fn={fn}, ln={ln}")
        else:
            log("XSS in registration fields", "pass", f"Sanitized: fn={fn}, ln={ln}")
    elif r.status_code == 429:
        log("XSS in registration fields", "partial", "Rate limited, can't test")
    else:
        log("XSS in registration fields", "pass", f"Registration rejected: {r.status_code}")

    # Test 13: SQL injection in search
    sqli_payloads = ["' OR 1=1 --", "'; DROP TABLE users; --", "\" OR \"1\"=\"1"]
    for payload in sqli_payloads:
        r = requests.get(f"{BASE}/items/?search={payload}", headers=auth_header(test_token))
        if r.status_code == 200:
            # If it returns data normally, Django ORM protected us
            log(f"SQLi search: {payload[:20]}", "pass", "ORM parameterized query")
        elif r.status_code == 500:
            log(f"SQLi search: {payload[:20]}", "fail", "Server error - possible injection!")
        break  # Only test first payload to avoid spam

    # Test 14: Negative quantity in request
    r = requests.get(f"{BASE}/items/", headers=auth_header(test_token))
    if r.status_code == 200:
        data = r.json()
        items = data.get("results", data) if isinstance(data, dict) else data
        if items and len(items) > 0:
            item = items[0]
            r2 = requests.post(f"{BASE}/requests/",
                headers={**auth_header(test_token), "Content-Type": "application/json"},
                json={"item": item["id"], "itemName": item["name"], "quantity": -5, "purpose": "test", "priority": "NORMAL"})
            if r2.status_code in [200, 201]:
                log("Negative quantity request", "fail", "Accepted -5 quantity!")
            else:
                log("Negative quantity request", "pass", f"Rejected: {r2.status_code}")

            # Test 15: Zero quantity request
            r3 = requests.post(f"{BASE}/requests/",
                headers={**auth_header(test_token), "Content-Type": "application/json"},
                json={"item": item["id"], "itemName": item["name"], "quantity": 0, "purpose": "test", "priority": "NORMAL"})
            if r3.status_code in [200, 201]:
                log("Zero quantity request", "fail", "Accepted 0 quantity!")
            else:
                log("Zero quantity request", "pass", f"Rejected: {r3.status_code}")

# ============================================================
print("\n" + "-"*60)
print("  CATEGORY 4: BUSINESS LOGIC")
print("-"*60)

# Test 16: Self-approval (if we have a staff/admin account)
if admin_token and admin_user:
    # Create a request as admin, then try to approve it ourselves
    r = requests.get(f"{BASE}/items/", headers=auth_header(admin_token))
    if r.status_code == 200:
        data = r.json()
        items = data.get("results", data) if isinstance(data, dict) else data
        if items and len(items) > 0:
            # Create request
            r2 = requests.post(f"{BASE}/requests/",
                headers={**auth_header(admin_token), "Content-Type": "application/json"},
                json={"item": items[0]["id"], "itemName": items[0]["name"], "quantity": 1, "purpose": "Self-approve test", "priority": "NORMAL"})
            if r2.status_code in [200, 201]:
                req_id = r2.json().get("id")
                # Try to approve own request
                r3 = requests.post(f"{BASE}/requests/{req_id}/approve/", headers=auth_header(admin_token))
                if r3.status_code == 200:
                    log("Self-approval prevention", "fail", "Admin approved their own request!")
                else:
                    log("Self-approval prevention", "pass", f"Blocked: {r3.status_code}")
                # Clean up - cancel it
                requests.post(f"{BASE}/requests/{req_id}/cancel/", headers=auth_header(admin_token))

# Test 17: Cancel already-approved request
if admin_token and student_token:
    pass  # This would need coordinated student request + admin approval

# ============================================================
print("\n" + "-"*60)
print("  CATEGORY 5: API & HEADERS SECURITY")
print("-"*60)

# Test 18: Security headers
r = requests.get(f"{BASE}/auth/login/", allow_redirects=False)
headers_to_check = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
}
for header, expected in headers_to_check.items():
    value = r.headers.get(header)
    if value:
        log(f"Header: {header}", "pass", f"Value: {value}")
    else:
        log(f"Header: {header}", "fail", "Missing!")

# Test 19: Debug mode detection
r = requests.get("http://localhost:8000/nonexistent-page-12345/")
if r.status_code == 404:
    body = r.text
    if "Traceback" in body or "DEBUG" in body or "settings.py" in body:
        log("Debug mode leak", "fail", "Debug info exposed in 404!")
    else:
        log("Debug mode leak", "pass", "No debug info in error page")

# Test 20: Information leakage in error responses
r = requests.post(f"{BASE}/auth/login/", json={"email": "nonexistent@test.com", "password": "wrong"})
body = r.text.lower()
if "no active account" in body or "invalid credentials" in body or "no account" in body:
    # Generic error message is good - doesn't reveal if email exists
    log("Login error info leak", "pass", "Generic error message used")
elif "password" in body and "incorrect" in body:
    log("Login error info leak", "fail", "Reveals that email exists but password is wrong")
else:
    log("Login error info leak", "pass", f"Error: {r.text[:80]}")

# ============================================================
# SUMMARY
print("\n" + "="*60)
print("  SUMMARY")
print("="*60)

passed = sum(1 for r in RESULTS if r["status"] == "pass")
failed = sum(1 for r in RESULTS if r["status"] == "fail")
partial = sum(1 for r in RESULTS if r["status"] == "partial")
total = len(RESULTS)

print(f"\n  Total Tests: {total}")
print(f"  [PASS] Passed:   {passed}")
print(f"  [FAIL] Failed:   {failed}")
print(f"  [WARN] Partial:  {partial}")
print(f"\n  Security Score: {passed}/{total} ({int(passed/total*100) if total else 0}%)")

if failed > 0:
    print(f"\n  VULNERABILITIES FOUND:")
    for r in RESULTS:
        if r["status"] == "fail":
            print(f"    [FAIL] {r['test']}: {r['detail']}")

print("\n" + "="*60)

# Dump results to JSON for reliable reading
import os
results_path = os.path.join(os.path.dirname(__file__), 'security_results.json')
with open(results_path, 'w') as f:
    json.dump({"results": RESULTS, "summary": {"total": total, "passed": passed, "failed": failed, "partial": partial}}, f, indent=2)
print(f"\nResults saved to: {results_path}")
