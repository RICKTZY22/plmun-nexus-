# PLMun Nexus — Deployment Guide

## Prerequisites

- **Python 3.10+** with pip
- **Node.js 18+** with npm
- **PostgreSQL 14+**
- A server with SSH access (e.g., Ubuntu 22.04)

---

## 1. Clone & Configure

```bash
git clone https://github.com/<org>/plmun-nexus.git
cd plmun-nexus
```

### Backend `.env`

```bash
cp Backend/.env.example Backend/.env
# Edit Backend/.env with production values:
#   SECRET_KEY=<random 50-char string>
#   DEBUG=False
#   DATABASE_URL=postgres://user:pass@localhost:5432/plmundb
#   ALLOWED_HOSTS=yourdomain.com
```

---

## 2. Backend (Django)

```bash
cd Backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn              # production WSGI server

# Database setup
python manage.py migrate
python manage.py collectstatic --no-input
python manage.py createsuperuser  # create admin account

# Run with Gunicorn
gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120
```

### Nginx reverse proxy (recommended)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /media/ {
        alias /path/to/plmun-nexus/Backend/media/;
    }

    location / {
        root /path/to/plmun-nexus/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 3. Frontend (Vite/React)

```bash
cd frontend

# Install & build
npm ci
npm run build
# Output: frontend/dist/
```

The `dist/` folder contains static files. Serve them with Nginx (see above) or any static file server.

### Environment variables

Edit `frontend/.env.production` if the API URL differs from the default:

```
VITE_API_URL=https://yourdomain.com/api
```

---

## 4. CORS Configuration

In `Backend/config/settings.py`, update `CORS_ALLOWED_ORIGINS`:

```python
CORS_ALLOWED_ORIGINS = [
    'https://yourdomain.com',
]
```

---

## 5. SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 6. Systemd Service (optional)

```ini
# /etc/systemd/system/plmun-nexus.service
[Unit]
Description=PLMun Nexus Backend
After=network.target postgresql.service

[Service]
User=deploy
WorkingDirectory=/path/to/plmun-nexus/Backend
EnvironmentFile=/path/to/plmun-nexus/Backend/.env
ExecStart=/path/to/plmun-nexus/Backend/venv/bin/gunicorn \
    config.wsgi:application --bind 0.0.0.0:8000 --workers 3
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable plmun-nexus
sudo systemctl start plmun-nexus
```

---

## Quick Reference

| Component | Dev Command | Prod Command |
|-----------|------------|--------------|
| Backend   | `python manage.py runserver` | `gunicorn config.wsgi:application` |
| Frontend  | `npm run dev` | `npm run build` → serve `dist/` |
| Database  | auto via Django | `python manage.py migrate` |
