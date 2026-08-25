# IAM Authentication & Registration System — UI/UX & Auth Specification

**SecureID** is an enterprise-grade Identity and Access Management (IAM) authentication platform built with a high-end, responsive UI/UX design system and a Node.js / Express / TypeScript backend.

The platform provides a **state-driven frontend authentication flow** in `public/` matching top-tier enterprise security application standards, coupled with a robust backend supporting multi-factor authentication (MFA), OTP verification, rate limiting, temporary account lockout, and dual Session/JWT security models.

---

## 🎨 UI/UX Design System & Aesthetics

The user interface prioritizes clarity, visual excellence, and enterprise security styling using standard CSS/Tailwind utilities, custom color palettes, and interactive micro-animations.

### Design Tokens & Color Palette

| Token | Hex / Spec | Usage |
| :--- | :--- | :--- |
| **Primary Blue** | `#2445D8` | Main CTA buttons (`Login`, `Continue`, `Verify`), active input ring highlights, selected radio indicators, and timer countdown emphasis |
| **Primary Hover / Active** | `#1D3AB8` / `#17309A` | Micro-animation hover and pressed feedback states |
| **Dark Text** | `#111827` | Headings, primary form labels, and typed input values |
| **Secondary Text** | `#6B7280` | Subtitles, supporting descriptions, and helper text |
| **Subtle Border** | `#D9DDE5` | Default 1px input borders and container borders |
| **Error Red** | `#EF3340` | Error state borders, red header icons, inline validation text, and expired code states |
| **Soft Blue Icon BG** | `#EBF0FF` | Lavender/blue circular background for primary security & email icons |
| **Soft Green Icon BG** | `#E6F7ED` | Soft green circular background for SMS verification icon |
| **Soft Red Icon BG** | `#FDE8E8` | Soft red circular background for failed login/error headers |

### Geometry & Component Radii
- **Form Inputs & Buttons**: Restrained 8px radius (`rounded-lg`)
- **Verification Method Cards**: 10px radius (`rounded-[10px]`)
- **Desktop Main Container**: 12–16px radius with elevated shadow (`0 12px 32px rgba(0,0,0,0.05)`)
- **6-Digit OTP Boxes**: Square-ish boxes (`40x44px` mobile, `44x48px` web)
- **Typography**: Inter / system-ui sans-serif font hierarchy

---

## 📱 Responsive Dual-Layout Paradigm

The interface dynamically adapts between desktop split-panel views and single-column mobile viewports:

### 1. Desktop Split-Panel View (`>= 768px`)
- **Horizontal Split Container**: Centered in the viewport (`max-w-[880px]`, `min-h-[580px]`).
- **Left Branding Panel (35% Width)**: Solid `#2445D8` background with subtle geometric shape overlays, centered white shield SVG logo, `SecureID` title, and tagline `Secure access to your account`.
- **Right Interaction Panel (65% Width)**: White background housing the active view inside a constrained container (`360–400px`).
- **Enterprise Footer**: `© 2026 SecureID. All rights reserved.` anchored at the bottom.

### 2. Mobile View (`< 768px`)
- **Single-Column Vertical Layout**: Left blue panel is hidden. Content occupies the viewport with 16–24px padding.
- **Centered Header**: Opening header with a 56px soft circular background containing a centered 28px outline icon.

---

## ⚡ Interactive UX Micro-Interactions

- **Single-Click / Double-Click Prevention**:
  - Action buttons (`Continue`, `Register`, `Verify`, `Resend code`) and selection cards disable immediately (`disabled = true`, `pointer-events-none`, and loading indicator) during active network requests.
  - Prevents duplicate form submissions or double-click API invocations.
- **Password Visibility Toggle**: Interactive eye icon toggling input type between `password` (masked with bold font tracking) and `text`.
- **6-Digit OTP Field Navigation**:
  - Focus advances automatically to the next box upon typing a digit.
  - Backspace moves focus to the previous box and clears the digit.
  - Full 6-digit clipboard paste support populates all 6 boxes automatically.
  - Uses `inputMode="numeric"` to invoke numeric keypads on iOS and Android devices.

---

## 🛡️ IAM Authentication Architecture & Journeys

The platform enforces all security decisions on the backend while presenting reactive user journeys on the frontend.

```text
┌─────────────────────────────┐
│     HTML / CSS / JavaScript │
└──────────────┬──────────────┘
               │  HTTP / JSON
┌──────────────▼──────────────┐
│       Node.js + Express     │
├─────────────────────────────┤
│ Registration                │
│ Authentication              │
│ OTP / MFA                   │
│ Session Management          │
│ JWT                         │
└──────────────┬──────────────┘
               │  Drizzle ORM
┌──────────────▼──────────────┐
│   PostgreSQL Database DB    │
└─────────────────────────────┘
```

### 1. Registration Journey
Flow:
```text
Registration Form ──> Email OTP ──> SMS OTP ──> MFA Enabled ──> Registration Success ──> Login
```

- **`POST /api/register`**: Validates user data, hashes password using `bcryptjs` (salt rounds: 10), creates the user account in PostgreSQL, generates a server-side 6-digit OTP challenge, stores the bcrypt hash of the OTP, and logs `[SIMULATED EMAIL - REGISTRATION]` to the server console.
- **`POST /api/verify-email-otp`**: Verifies submitted OTP against the stored bcrypt hash. Upon success, marks `emailVerified: true` and automatically initiates the SMS OTP step if phone/MFA is configured.
- **`POST /api/send-sms-otp` & `POST /api/verify-sms-otp`**: Generates and verifies SMS OTP challenge (`[SIMULATED SMS - REGISTRATION]`). Upon success, sets `phoneVerified: true` and `mfaEnabled: true`.

### 2. Login & Multi-Factor Authentication (MFA) Journey
Flow:
```text
Login ──> Credential Check ──> MFA Required? ──> Choose Channel (Email / SMS) ──> Verify OTP ──> Create Session & JWT
```

- **Credential Validation (`POST /api/login`)**: Checks email and password.
- **Failed-Login Protection & Lockout**:
  - Increments `failedLoginAttempts` on wrong password.
  - If failed attempts reach 5, the account is temporarily locked out for 15 minutes (`lockoutUntil`), returning HTTP `423 Locked`.
- **MFA Requirement & Channel Selection**:
  - If MFA is enabled, returns `mfaRequired: true`.
  - User chooses between **Email OTP** and **SMS OTP** (Authenticator option removed for clean SMS/Email parity).
  - Selecting a channel triggers code generation and outputs `[SIMULATED EMAIL - LOGIN MFA]` or `[SIMULATED SMS - LOGIN MFA]` to the server terminal log.
- **OTP Verification (`POST /api/verify-login-otp`)**:
  - Validates submitted code against stored bcrypt hash.
  - Enforces 3-attempt maximum limits and short expiry durations.
  - On success, resets `failedLoginAttempts` and creates user session.

### 3. Dual Session + JWT Authentication Architecture

The system implements both session-based authentication and token-based authentication:

#### Session Authentication
- Creates server-side session in database `sessions` table.
- Sets secure HTTP-only cookies:
  ```http
  Set-Cookie: accessToken=<JWT>; Path=/; HttpOnly; SameSite=Lax
  Set-Cookie: sessionId=<UUID>; Path=/; HttpOnly; SameSite=Lax
  ```
- **`GET /api/me`**: Validates session cookie or JWT and returns sanitized user profile (`passwordHash` stripped).
- **`POST /api/logout`**: Destroys server-side session in database and clears cookies.

#### JWT Authentication
- **`POST /api/token`**: Issues short-lived access token signed with `JWT_SECRET`.
- **`GET /api/protected`**: Protected API route requiring `Authorization: Bearer <JWT>` header. Demonstrates backend JWT verification.
- Frontend does **not** store tokens in `localStorage`.

### 4. Evaluator Testing API
To facilitate evaluator automated testing, test endpoints retrieve generated OTP codes directly from server memory without exposing database bcrypt hashes:
- `GET /api/test/otp/:challengeId`: Returns challenge details `{ challengeId, target, type, channel, otp, expiresAt, maxAttempts }`.
- `GET /api/test/otps`: Returns recent active test OTP challenges.

---

## 📡 API Endpoint Reference

| Method | Endpoint | Purpose | Access Control |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/register` | Register new account & generate Email OTP | Public |
| `POST` | `/api/send-email-otp` | Send / resend Email OTP code | Public / Rate Limited |
| `POST` | `/api/verify-email-otp` | Verify Email OTP code | Public / Rate Limited |
| `POST` | `/api/send-sms-otp` | Send / resend SMS OTP code | Public / Rate Limited |
| `POST` | `/api/verify-sms-otp` | Verify SMS OTP code & complete MFA | Public / Rate Limited |
| `POST` | `/api/login` | Validate credentials & trigger MFA | Public / Rate Limited |
| `POST` | `/api/verify-login-otp` | Verify MFA code & create session | Public / Rate Limited |
| `GET` | `/api/me` | Fetch authenticated user profile | Authenticated (Session / Cookie / JWT) |
| `POST` | `/api/logout` | Invalidate session & clear cookies | Authenticated |
| `POST` | `/api/token` | Issue new JWT access token | Public (Valid Session ID / Refresh Token) |
| `GET` | `/api/protected` | Test JWT protected endpoint | Authenticated (`Bearer <JWT>`) |
| `GET` | `/api/test/otp/:challengeId` | Evaluator test route: fetch OTP code | Public (Test Mode) |
| `GET` | `/api/test/otps` | Evaluator test route: list recent OTPs | Public (Test Mode) |

---

## 📁 Directory Structure

```text
Auth-System(assignment)/
├── .env                        # Environment variables (DATABASE_URL, PORT)
├── drizzle.config.ts           # Drizzle ORM configuration
├── package.json                # Dependencies and scripts
├── public/                     # Frontend visual layout & scripts
│   ├── index.html              # Login & MFA container page
│   ├── signup.html             # Multi-step registration page
│   ├── dashboard.html          # Dashboard & API tester page
│   ├── styles.css              # Compiled Tailwind CSS bundle
│   └── js/
│       ├── app.js              # Entry point & state view coordinator
│       ├── api.js              # Fetch wrapper & API client
│       ├── state.js            # Central reactive state engine
│       ├── timer.js            # OTP countdown timer manager
│       ├── signup.js           # Multi-step signup logic controller
│       ├── dashboard.js        # User dashboard & protected route tester
│       └── views/
│           ├── loginView.js    # Login view renderer
│           ├── chooseMethodView.js # Email vs SMS OTP channel selector
│           └── otpView.js      # 6-digit OTP input view renderer
└── src/                        # Express TypeScript backend
    ├── app.ts                  # Express application setup & middleware
    ├── server.ts               # HTTP server bootstrap
    ├── controllers/
    │   └── auth.controller.ts  # Auth controllers (register, login, verify, logout)
    ├── db/
    │   ├── db.ts               # PostgreSQL database connection
    │   └── schema.ts           # Drizzle ORM schema (users, sessions, otps)
    ├── middleware/
    │   ├── auth.ts             # Cookie & Bearer JWT authentication middleware
    │   └── rateLimiter.ts      # Rate limiters & lockout protection
    ├── models/
    │   ├── user.model.ts       # User database operations
    │   ├── session.model.ts    # Session database operations
    │   └── otp.model.ts        # OTP challenge creation & bcrypt verification
    └── routes/
        └── auth.ts             # API route definitions
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18+)
- pnpm package manager (`npm install -g pnpm`)

### Installation & Setup
```bash
# Install dependencies
pnpm install

# Start development server (Tailwind watch + TSX server watch)
pnpm dev
```

### Production Build & Run
```bash
# Compile CSS and TypeScript
pnpm build

# Start production server
pnpm start
```
The application will run at **http://localhost:3000**.