# LawBridge

Legal assistance platform connecting users with lawyers. **React (Vite)** frontend + **Python (FastAPI)** backend + **MongoDB**.

## Features

- **Auth**: Register (client/lawyer), Login, JWT, Forgot password
- **Lawyers**: List with filters (search, specialization, location, language), profile, book consultation
- **Client dashboard**: Cases, consultations (from API)
- **Lawyer dashboard**: Profile management, consultation requests
- **Admin**: User list, lawyer verification, stats, case monitoring (use admin@lawbridge.com / admin123 after seed)

## Quick start (local)

### 1. MongoDB

- Install [MongoDB](https://www.mongodb.com/try/download/community) and run it, **or**
- Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and copy the connection string.

### 2. Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set MONGODB_URI (e.g. mongodb://localhost:27017 or your Atlas URI)
python seed.py
uvicorn main:app --reload --port 8000
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs  

### 3. Frontend

```bash
# from project root
cp .env.example .env
# .env: VITE_API_URL=http://localhost:8000
npm install
npm run dev
```

App: http://localhost:5173  

### 4. Logins (after seed)

| Role   | Email                 | Password   |
|--------|------------------------|------------|
| Admin  | admin@lawbridge.com    | admin123   |
| Lawyer | priya@lawbridge.com    | lawyer123  |
| Client | Register from the app  | (your pwd) |

---

## Deploy (production)

### Backend (e.g. Render / Railway)

1. **MongoDB**: Use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier). Create a cluster and get the connection string.
2. **Host backend**:
   - **Render**: New Web Service → Connect repo → Root: `backend` → Build: `pip install -r requirements.txt` → Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Set env vars: `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS=https://your-frontend-url.vercel.app`
3. **Seed data** (once): Run `python seed.py` locally with `MONGODB_URI` pointing to Atlas, or run it in a one-off shell on Render.

### Frontend (e.g. Vercel)

1. **Vercel**: Import repo → Framework: Vite → Root: `.`
2. **Env**: Add `VITE_API_URL=https://your-backend-url.onrender.com` (or your backend URL).
3. Deploy. Frontend will call the backend API for all data.

### CORS

- Backend `CORS_ORIGINS` must include the frontend origin (e.g. `https://lawbridge.vercel.app`). No trailing slash.

---

## Project layout

```
lawbridge/
├── backend/           # Python FastAPI + MongoDB
│   ├── main.py
│   ├── database.py
│   ├── auth_utils.py
│   ├── deps.py
│   ├── models.py
│   ├── seed.py
│   ├── requirements.txt
│   └── routers/
│       ├── auth.py
│       ├── lawyers.py
│       ├── cases.py
│       ├── consultations.py
│       └── admin.py
├── src/               # React frontend
│   ├── services/api.js
│   ├── context/AuthContext.jsx
│   ├── App.jsx
│   └── pages/
├── .env.example       # VITE_API_URL
└── package.json
```

All listing and form actions use the backend; data is **real-time** from MongoDB.
