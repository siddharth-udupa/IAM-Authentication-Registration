# SecureID — IAM Authentication System & UI/UX Architecture

**SecureID** is an enterprise-grade Identity and Access Management (IAM) authentication system built with a modern, responsive UI/UX architecture and a secure Node.js / Express / TypeScript backend.

The system features a **reusable, state-driven frontend authentication flow** in `public/` matching high-end security application design standards, coupled with a robust backend supporting multi-factor authentication (MFA), OTP verification, rate limiting, and session management.

---

## 🎨 UI/UX Design System & Visual Language

The visual design prioritizes functional clarity, high readability, and enterprise security aesthetics over unnecessary visual noise.

### Design Tokens & Color Palette

| Token | Hex / Spec | Usage |
| :--- | :--- | :--- |
| **Primary Blue** | `#2445D8` | Main action buttons (`Login`, `Continue`), active states, selected radio indicators, interactive links, countdown timer emphasis |
| **Primary Hover / Active** | `#1D3AB8` / `#17309A` | Button hover and pressed feedback states |
| **Dark Text** | `#111827` | Headings, primary labels, and input values |
| **Secondary Text** | `#6B7280` | Subtitles, supporting descriptions, and helper text |
| **Subtle Border** | `#D9DDE5` | Default 1px input borders and container borders |
| **Error Red** | `#EF3340` | Error state borders, red header icons, inline validation error text, expired code state |
| **Soft Blue Icon BG** | `#EBF0FF` | Pale lavender/blue circular background for primary security & mail icons |
| **Soft Red Icon BG** | `#FDE8E8` | Pale red circular background for invalid/error security headers |
| **Soft Green Icon BG** | `#E6F7ED` | Pale green circular background for SMS verification card icon |
| **Soft Gray Icon BG** | `#F3F4F6` | Pale gray background for Authenticator App card icon |

### Geometry & Constraints
- **Input & Button Border Radius**: Restrained 8px (`rounded-lg`)
- **Verification Cards Radius**: 10px (`rounded-[10px]`)
- **Desktop Container Radius**: 8–16px with subtle shadow (`0 4px 20px rgba(0,0,0,0.08)`)
- **OTP Box Radius**: 6–8px square-ish fields (`40x44px` mobile, `44x48px` web)
- **Typography**: Inter / system-ui sans-serif font stack

---

## 📱 Dual-Layout Paradigm

The interface adapts seamlessly between desktop split-panel views and single-column mobile viewports.

### 1. Desktop View (`>= 768px`)
- **Horizontal Split-Screen Container**: Centered in the viewport (max-width `880px`, min-height `580px`).
- **Left Branding Panel (35% Width)**: Solid `#2445D8` background with subtle geometric shape overlays, centered white shield SVG icon, brand title `SecureID`, and tagline `Secure access to your account`.
- **Right Authentication Panel (65% Width)**: White background housing the active authentication form inside a constrained content container (`360-420px`), centered horizontally.
- **Enterprise Footer**: `© 2026 SecureID. All rights reserved.` anchored at the bottom.

### 2. Mobile View (`< 768px`)
- **Single-Column Vertical Layout**: Left blue panel is hidden. Content occupies the central portion of the viewport with 20-24px horizontal padding.
- **Header Icon**: Every main screen opens with a 56px soft circular background containing a centered 28px outline icon.

---

## 🔄 Authentication Journey & Application States

The UI implements a **single-page stateful architecture** where the entire authentication flow consists of 6 reactive states of one unified application:

```
[ 1. Login Default ] ──(Submit Credentials)──> [ 2. Login Invalid ] (if invalid)
         │
  (Valid Login)
         │
         ▼
[ 3. Choose Verification Method ] ──(Click Continue)──> [ 4. Email OTP ]
                                                             │
                                                   ┌─────────┴─────────┐
                                                   ▼                   ▼
                                         [ 5. Incorrect OTP ]   [ 6. Expired OTP ]
```

### State Details

1. **Login — Default**
   - Soft blue circular header with shield icon.
   - Title: `Welcome back!`, Subtitle: `Login to your account`.
   - Email/Username input (with user icon) and Password input (with lock icon & eye visibility toggle button).
   - Remember me checkbox & `Forgot password?` link.
   - Primary `Login` button (`#2445D8`), subtle `or` divider, `Continue with Google` OAuth button, and sign-up prompt.

2. **Login — Invalid Credentials**
   - Preserves exact default login layout structure to avoid jarring layout shifts.
   - Header icon switches to red shield in a pale red circular background.
   - Inputs highlighted with red borders (`#EF3340`) and warning indicator icon.
   - Left-aligned small red error text directly below password: `Invalid email or password. Please try again.`

3. **Choose Verification Method**
   - Top-left back arrow button.
   - Shield icon header with title `Verify your identity` and subtitle `Choose a method to continue`.
   - Three selection cards:
     - **Email OTP** (Selected by default): Blue mail icon, pale blue background, subtle blue-tinted card fill, filled blue radio.
     - **SMS OTP**: Green message icon, pale green background, subtle gray border, empty radio.
     - **Authenticator App**: Lock icon, pale gray background, subtle gray border, empty radio.
   - Primary `Continue` button.

4. **Email OTP (Normal Countdown)**
   - Top-left back arrow button.
   - Header: Mail icon in pale blue background, title `Email Verification`.
   - Subtitle: `Enter the 6-digit code sent to` bold email (e.g. `priya.sharma@email.com`).
   - 6 individual numeric OTP fields with auto-advance, backspace navigation, and 6-digit paste handling (`inputMode="numeric"`).
   - Live expiration countdown: `Code expires in 02:45` (timer highlighted in primary blue).
   - Resend cooldown: `Resend code (00:25)` (initially disabled, becomes active blue link when cooldown hits zero).

5. **Email OTP (Incorrect OTP)**
   - Preserves OTP field layout; incorrect digit box highlighted with red border (`#EF3340`).
   - Error messages below OTP fields:
     `Incorrect code. Please try again.`
     `You have 2 attempts left.`
   - Continuous live timer and resend cooldown.

6. **Email OTP (Expired State)**
   - Empty OTP input fields (`[ ] [ ] [ ] [ ] [ ] [ ]`) in disabled state.
   - Red message: `Code expired.`
   - Active blue action link: `Resend code`.
   - Cooldown notice: `You can request a new code in 00:28`.

---

## 🏗️ Modular Frontend Code Architecture

The frontend is built with modular ES JavaScript files in `public/js/`:

```
public/
├── index.html                # Responsive desktop split-screen & mobile layout
├── styles.css                # Compiled Tailwind CSS bundle
└── js/
    ├── state.js              # Central reactive state store & subscriber engine
    ├── icons.js              # SVG outline enterprise icon set helper
    ├── timer.js              # Live OTP countdown timer manager
    ├── app.js                # Main application bootstrap & view coordinator
    └── views/
        ├── loginView.js      # Default & Invalid Login renderer + password toggle
        ├── chooseMethodView.js # Verification method selection card renderer
        └── otpView.js        # OTP input fields, paste handler & state error renderer
```

---

## ⚡ Interactive OTP Mechanics & Form Behaviors

- **Password Visibility Toggle**: Interactive eye icon toggling input type between `password` (masked with bold font tracking) and `text`.
- **Keyboard Navigation**: Focus automatically advances to the next OTP box upon typing a number, and backspace gracefully moves focus to the previous input field.
- **Clipboard Paste Support**: Pasting a full 6-digit verification code automatically populates all 6 OTP boxes and initiates verification.
- **Mobile Keyboard**: OTP inputs use `inputMode="numeric"` to trigger numeric keypads on iOS and Android devices without obstructing form controls.

---

## 🛡️ Backend Auth Integration & Security Features

The express backend (`src/`) complements the UI with enterprise security enforcement:

- 🔒 **Password Hashing**: Passwords stored as `bcryptjs` salt hashes.
- ⏱️ **Rate Limiting & Lockout**: Server-side rate limiting on login attempts (`loginRateLimiter`), OTP resends (`otpResendRateLimiter`), and OTP verification (`otpVerifyRateLimiter`).
- 🎟️ **MFA & OTP Lifecycle**: OTPs expire automatically (5-10 min window) and are marked `used` immediately upon verification to prevent replay attacks.
- 🔑 **Token & Session Management**: Dual support for HTTP-only cookies and Bearer JWT tokens with PostgreSQL session tracking.

---

## 🏃 Getting Started & Build Commands

### Prerequisites
- Node.js (v18+)
- pnpm package manager

### Development Server
Starts Tailwind CSS watcher and TSX server watch mode:
```bash
pnpm dev
```

### Production Build
Compiles CSS bundle to `public/styles.css` and TypeScript code to `dist/`:
```bash
pnpm build
pnpm start
```