from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.authentication.models import User


class RegistrationTests(TestCase):
    """SEC-02: Registration always forces STUDENT role."""

    def setUp(self):
        self.client = APIClient()
        self.url = reverse('register')
        self.valid_payload = {
            'username': 'newuser',
            'email': 'new@plm.edu.ph',
            'password': 'TestPass123!',
            'password2': 'TestPass123!',
            'fullName': 'New User',
        }

    def test_register_creates_student(self):
        """Normal registration defaults to STUDENT."""
        resp = self.client.post(self.url, self.valid_payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='newuser')
        self.assertEqual(user.role, 'STUDENT')

    def test_register_ignores_admin_role(self):
        """Attempting to register as ADMIN is silently overridden to STUDENT."""
        payload = {**self.valid_payload, 'role': 'ADMIN', 'username': 'hacker'}
        resp = self.client.post(self.url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='hacker')
        self.assertEqual(user.role, 'STUDENT')

    def test_register_password_mismatch(self):
        """Mismatched passwords should be rejected."""
        payload = {**self.valid_payload, 'password2': 'wrong'}
        resp = self.client.post(self.url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(TestCase):
    """Basic login flow tests."""

    def setUp(self):
        self.client = APIClient()
        self.url = reverse('login')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@plm.edu.ph',
            password='TestPass123!',
            first_name='Test',
            last_name='User',
            role='STUDENT',
        )

    def test_login_with_email(self):
        """Users can log in with their email."""
        resp = self.client.post(self.url, {
            'email': 'test@plm.edu.ph',
            'password': 'TestPass123!',
        }, format='json')
        self.assertIn(resp.status_code, [status.HTTP_200_OK])
        self.assertIn('access', resp.data)

    def test_login_wrong_password(self):
        """Wrong password returns 401."""
        resp = self.client.post(self.url, {
            'email': 'test@plm.edu.ph',
            'password': 'WrongPass!',
        }, format='json')
        self.assertIn(resp.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST,
        ])


class RoleHierarchyTests(TestCase):
    """User model role hierarchy methods."""

    def test_admin_has_min_role_student(self):
        u = User(role='ADMIN')
        self.assertTrue(u.has_min_role('STUDENT'))

    def test_student_does_not_have_min_role_staff(self):
        u = User(role='STUDENT')
        self.assertFalse(u.has_min_role('STAFF'))

    def test_is_admin_property(self):
        self.assertTrue(User(role='ADMIN').is_admin)
        self.assertFalse(User(role='STAFF').is_admin)

    def test_is_staff_or_above(self):
        self.assertTrue(User(role='STAFF').is_staff_or_above)
        self.assertTrue(User(role='ADMIN').is_staff_or_above)
        self.assertFalse(User(role='FACULTY').is_staff_or_above)
