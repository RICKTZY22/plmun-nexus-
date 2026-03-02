# TODO List

## Priority: Kailangan gawin ASAP
- [ ] ayusin yung dark mode colors sa select dropdowns (InventoryFormModal)
- [ ] mag-add ng loading skeleton sa Dashboard habang nag-fefetch
- [ ] i-test yung overdue scanner kung tama ba yung pag-flag ng users
- [ ] i-update yung README para sa latest setup instructions

## Nice to Have
- [ ] gawing configurable yung low stock threshold (hindi laging 5)
- [ ] mag-add ng "condition" field sa Item model (para alam kung sira na)
- [ ] pagination sa inventory views (mabagal na kapag marami)
- [ ] bulk operations sa User management (bulk delete, bulk role change)
- [ ] max quantity validation sa RequestCreateSerializer
- [ ] comment edit history (para alam kung in-edit)
- [ ] mag-add ng student_year field sa User model

## Done na ✅
- [x] JWT authentication with refresh token
- [x] role-based access control (4 roles)
- [x] inventory CRUD with image upload
- [x] request workflow (approve/reject/return)
- [x] comment system with real-time polling
- [x] notification system with deduplication
- [x] overdue detection at auto-flagging
- [x] audit logging (17 action types)
- [x] dark mode
- [x] maintenance mode
- [x] data export (CSV/PDF)
- [x] rate limiting sa login/register
- [x] idle session timeout (30 minutes)
- [x] atomic stock operations with F() expressions
- [x] i-cleanup yung AI-generated comments

## Bugs
- [ ] flash messages overlap pag mabilis mag-click sa Settings
- [ ] pie chart error kapag walang items (division by 0)
- [ ] idle timer counts down even when tab is in background
- [ ] yung quantity input sa InventoryFormModal, accepts 0 pero di naman valid
