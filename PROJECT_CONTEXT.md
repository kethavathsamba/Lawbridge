# LawBridge - Complete Project Context

**Last Updated:** April 2026  
**Status:** Full-stack legal services platform with blockchain escrow integration

---

## 🎯 Project Overview

**LawBridge** is a comprehensive legal services platform that connects clients with qualified lawyers. It features user authentication, lawyer matching/discovery, case management, consultations, billing, payments, and blockchain-based escrow for secure fund management.

**Core Purpose:** Democratize legal services by providing a transparent, secure platform for legal service delivery.

---

## 🏗️ Tech Stack

### Frontend
- **Framework:** React 19 with Vite (fast dev server)
- **Routing:** React Router v7
- **Styling:** CSS modules
- **Blockchain Integration:** ethers.js v5
- **UI Icons:** Lucide React
- **Language:** JavaScript/JSX

### Backend
- **Framework:** FastAPI (Python)
- **Database:** MongoDB
- **Authentication:** JWT (python-jose)
- **Password Hashing:** Bcrypt
- **Server:** Uvicorn 
- **ORM:** Pydantic models 

### Blockchain
- **Language:** Solidity ^0.8.19
- **Token:** USDC (ERC20)
- **Features:** Escrow, ReentrancyGuard, Ownable
- **Purpose:** Secure escrow for legal service payments

### DevOps & Deployment
- **Frontend Deploy:** Vercel (configured)
- **Backend Deploy:** Render/Railway compatible
- **Database:** MongoDB Atlas (cloud)
- **Build Tool:** Vite
- **Linting:** ESLint

---

## 📁 Project Structure

```
lawbridge/
│
├── backend/                    # FastAPI + MongoDB microservice
│   ├── main.py                # Core app config, route registration
│   ├── database.py            # MongoDB connection
│   ├── models.py              # Pydantic schemas (User, Case, Lawyer, etc.)
│   ├── auth_utils.py          # JWT, password hashing, token validation
│   ├── deps.py                # FastAPI dependencies (current_user, etc.)
│   ├── seed.py                # Sample data generation
│   ├── requirements.txt        # Python dependencies
│   │
│   └── routers/               # API endpoints organized by domain
│       ├── auth.py            # Login, register, forgot password
│       ├── lawyers.py         # Lawyer listing, search, filters, profiles
│       ├── cases.py           # Create, list, update cases
│       ├── consultations.py   # Schedule, list, manage consultations
│       ├── clients.py         # Client profile management
│       ├── documents.py       # Legal document handling
│       ├── calendar.py        # Court dates, scheduling
│       ├── messages.py        # Lawyer-client messaging
│       ├── notes.py           # Case notes management
│       ├── legalhub.py        # Legal resources/hub
│       ├── admin.py           # Admin dashboard, verification
│       ├── billing.py         # Billing, invoicing
│       ├── payments.py        # Payment processing integration
│       ├── notifications.py   # User notifications
│       └── support.py         # Support tickets
│
├── src/                       # React frontend (Vite)
│   ├── main.jsx               # Entry point
│   ├── App.jsx                # Root component
│   ├── App.css                # Global styles
│   │
│   ├── context/
│   │   └── AuthContext.jsx    # Global auth state (login, user, token)
│   │
│   ├── services/
│   │   ├── api.js             # Axios/fetch wrapper for backend
│   │   ├── blockchain.js      # Web3 interactions
│   │   └── blockchain-config.js # Ethers.js setup
│   │
│   ├── components/
│   │   ├── WalletConnector.jsx # Metamask connection
│   │   └── WalletConnector.css
│   │
│   └── pages/                 # Page components (organized by role)
│       ├── Auth.jsx           # Login/Register page
│       ├── ForgotPassword.jsx
│       ├── Home.jsx
│       ├── LawyerSearch.jsx   # Lawyer discovery
│       ├── Payment.jsx        # Payment processing
│       ├── SupportChat.jsx
│       │
│       ├── client/            # Client-specific pages
│       │   ├── ClientDashboard.jsx
│       │   ├── ClientCases.jsx
│       │   ├── ClientConsultations.jsx
│       │   ├── ClientBilling.jsx
│       │   ├── ClientDocuments.jsx
│       │   └── ClientNotifications.jsx
│       │
│       ├── lawyer/            # Lawyer-specific pages
│       │   ├── LawyerDashboard.jsx
│       │   ├── LawyerProfile.jsx
│       │   ├── Consultations.jsx
│       │   ├── Cases.jsx
│       │   └── Research.jsx
│       │
│       └── admin/             # Admin-specific pages
│           ├── AdminDashboard.jsx
│           ├── AdminEscrowDashboard.jsx
│           ├── AdminUsers.jsx
│           ├── LawyerVerification.jsx
│           └── Reports.jsx
│
├── blockchain/
│   └── LawBridgeEscrow.sol    # Smart contract for payment escrow
│
├── public/                    # Static assets
├── vite.config.js             # Vite configuration
├── eslint.config.js           # Linting rules
├── package.json               # Frontend dependencies
├── README.md                  # Quick start guide
└── .env                       # Environment variables (local only)
```

---

## 🔐 Authentication & Authorization

### Flow
1. **Registration:** User signs up (role: client, lawyer, admin)
2. **Login:** Email + password → JWT token stored in localStorage
3. **Token:** Included in all API requests (`Authorization: Bearer {token}`)
4. **Verification:** Backend validates token with JWT_SECRET
5. **Admin Lawyers:** Must pass lawyer verification before visibility

### Roles
- **Client:** Book consultations, manage cases, track billing
- **Lawyer:** Profile management, consultation requests, case tracking
- **Admin:** User management, lawyer verification, platform monitoring

### Key Auth Functions
- `login()` - Validate credentials, return JWT
- `register()` - Create new user
- `refresh_token()` - Extend session
- `forgot_password()` - Email-based reset

---

## 💾 Database Schema (MongoDB Collections)

### Collections
- **users** - Authentication & profile (client/lawyer/admin)
- **cases** - Legal cases associated with lawyer-client pairs
- **consultations** - Consultation sessions (scheduling, status)
- **documents** - Legal documents & templates
- **calendar_events** - Court dates, deadlines
- **messages** - Chat between lawyers and clients
- **billing** - Invoices, payment tracking
- **payments** - Payment records (Stripe/escrow)
- **notifications** - User alerts
- **support_tickets** - Support issues
- **admin_logs** - Admin actions for audit trail

---

## 🌐 API Endpoints Summary

### Auth Routes (`/auth`)
- `POST /auth/register` - New user
- `POST /auth/login` - Login user
- `POST /auth/forgot-password` - Email reset link
- `POST /auth/reset-password` - Reset with token

### Lawyers Routes (`/lawyers`)
- `GET /lawyers` - List all verified lawyers (with filters)
- `GET /lawyers/{id}` - Lawyer profile details
- `GET /lawyers/search?specialization=...&location=...` - Search/filter

### Cases Routes (`/cases`)
- `POST /cases` - Create new case
- `GET /cases` - List user's cases
- `GET /cases/{id}` - Case details
- `PUT /cases/{id}` - Update case

### Consultations Routes (`/consultations`)
- `POST /consultations` - Book consultation
- `GET /consultations` - List consultations
- `PUT /consultations/{id}/approve` - Admin approve

### Payments Routes (`/payments`)
- `POST /payments/initiate` - Start payment
- `POST /payments/confirm` - Confirm payment
- `GET /payments/status/{id}` - Check payment status

### Admin Routes (`/admin`)
- `GET /admin/users` - All users
- `GET /admin/lawyers/pending` - Lawyers awaiting verification
- `PUT /admin/lawyers/{id}/verify` - Approve lawyer
- `GET /admin/reports` - Platform statistics

### Billing Routes (`/billing`)
- `GET /billing/invoices` - List invoices
- `POST /billing/invoice` - Create invoice

---

## 🔗 Blockchain Integration

### Smart Contract: `LawBridgeEscrow.sol`

**Purpose:** Secure escrow for lawyer service payments

**Key Features:**
- **Deposit escrow:** Client locks USDC for legal services
- **Installments:** Lawyer can request payment in milestones
- **Client approval:** Client approves/rejects before release
- **Platform fee:** 2% fee for platform operations
- **Security:** ReentrancyGuard, Ownable pattern

**Key Functions:**
- `createEscrow(lawyer, amount, caseId)` - Initialize escrow
- `depositFunds(escrowId, amount)` - Client deposits USDC
- `requestInstallment(escrowId, amount, note)` - Lawyer requests payment
- `approveInstallment(installmentId)` - Client approves payment
- `releaseInstallment(installmentId)` - Admin releases funds
- `cancelEscrow(escrowId)` - Refund to client

**Status Enums:**
- **EscrowStatus:** Pending → Active → Completed/Cancelled
- **InstallmentStatus:** Pending → Approved/Rejected → Released

**Events:**
- `EscrowCreated`, `EscrowFunded`, `InstallmentRequested`, `InstallmentApproved`, `FundsReleased`

---

## 🚀 Local Development Setup

### Backend
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with MongoDB URI
python seed.py
uvicorn main:app --reload --port 8000
```

**Environment Variables:**
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for token signing
- `CORS_ORIGINS` - Allowed frontend origin
- `STRIPE_API_KEY` - Stripe (if using)
- `SMTP_SERVER` - Email for password reset

**Available Logins (after seed):**
- Admin: `admin@lawbridge.com` / `admin123`
- Lawyer: `priya@lawbridge.com` / `lawyer123`
- Client: Register from app

### Frontend
```bash
npm install
cp .env.example .env
# .env: VITE_API_URL=http://localhost:8000
npm run dev
```

**Access:** http://localhost:5173

### Blockchain (Hardhat/Remix)
- Compile: `npx hardhat compile`
- Deploy to testnet (Sepolia/Amoy)
- Set contract address in frontend `.env`

---

## 🎨 Key Features Breakdown

### 1. **Lawyer Discovery & Matching**
- Search by specialization (criminal, corporate, family, etc.)
- Filter by location, languages, experience
- View lawyer profiles with ratings/reviews
- Book consultations

### 2. **Case Management**
- Create case with description, date
- Link to lawyer
- Track status (open, active, resolved)
- Attach documents

### 3. **Billing & Payments**
- Fixed pricing or hourly rates
- Payment in USDC via escrow
- Installment-based releases
- Invoice generation

### 4. **Consultations**
- Schedule consultation date/time
- Video/chat capability
- Consultation notes
- Follow-up actions

### 5. **Admin Dashboard**
- Lawyer verification queue
- User management
- Case monitoring
- Platform statistics (revenue, active cases)
- Escrow management

### 6. **Notifications**
- Email alerts (new consultations, payments)
- In-app notifications
- Real-time updates (via WebSocket/polling)

---

## 🔄 Common Workflows

### Client Booking a Lawyer
1. Client searches/filters lawyers
2. Views lawyer profile
3. Books consultation
4. Admin/Lawyer approves
5. Payment (via escrow)
6. Consultation occurs
7. Case completed

### Lawyer Invoice & Payment
1. Lawyer completes work
2. Creates invoice/requests installment
3. Client reviews & approves in escrow
4. Admin releases funds
5. Payment to lawyer wallet

### Admin Verification
1. New lawyer registers
2. Appears in "Pending Verification" queue
3. Admin reviews credentials
4. Admin approves/rejects
5. If approved, visible to clients

---

## 📊 Performance Considerations

- **Frontend:** Vite for fast HMR
- **Backend:** Async FastAPI endpoints
- **Database:** MongoDB indexes on frequently queried fields (userId, lawyerId, status)
- **Blockchain:** Batched transactions to save gas
- **Caching:** Consider Redis for user sessions/lawyer lists

---

## 🐛 Known Issues & TODOs

Check [INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md) and [PAYMENT_DEBUG_GUIDE.md](./PAYMENT_DEBUG_GUIDE.md) for:
- Payment flow debugging
- Blockchain integration issues
- Known bugs & fixes

---

## 📚 Additional Resources

- **API Docs:** http://localhost:8000/docs (Swagger)
- **Frontend:** http://localhost:5173
- **Smart Contract:** Deployed on testnet (see `.env`)
- **Database:** MongoDB Atlas or local

---

## 🤝 Quick Questions to Ask ChatGPT with This Context

- "How do I add X feature?"
- "Debug this error in [file]"
- "Refactor this component for performance"
- "Write tests for this endpoint"
- "How should I structure [new feature]?"

