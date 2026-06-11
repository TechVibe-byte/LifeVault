# <p align="center">🌌 Hybrid Tracker</p>

<p align="center">
  <strong>The Premium, Offline-First Companion for Modern Hybrid Professionals</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Release-v2.5.0-blueviolet?style=for-the-badge" alt="Release" />
  <img src="https://img.shields.io/badge/Architecture-Offline--First-green?style=for-the-badge" alt="Architecture" />
  <img src="https://img.shields.io/badge/Security-Local--Only-orange?style=for-the-badge" alt="Security" />
  <img src="https://img.shields.io/badge/Platform-PWA-blue?style=for-the-badge" alt="Platform" />
</p>

<p align="center">
  A highly polished, ultra-secure, and mobile-first hybrid workplace logging companion. Hybrid Tracker enables seamless logging of Work-From-Home (WFH), office presence, off days, and associated expenses. It operates fully localized and keeps you effortlessly aligned with automated notification reporting via a custom Telegram Bot integration.
</p>

---

### 📊 System Specs & Technical Highlights

| System Property | Spec / Description | Tech Stack / Tooling |
| :--- | :--- | :--- |
| **Primary Engine** | Client-Optimized Single Page App | React 18+ (TS) & Vite |
| **Local Database** | High-performance client-side storage | IndexedDB via `Dexie.js` |
| **Reactive Store** | Lightweight dynamic state management | `Zustand` with localStorage sync |
| **UI Design System** | Tailwind Slate Minimalist Layouts | Tailwind CSS (v4 Utility Library) |
| **Push Broadcasts** | Instant, secure user-facing notifications | Telegram Bot API Gateway |
| **Offline Capabilities** | Asset Caching & Offline Launch | Service Workers via PWA |

---

## 📸 Interface Walkthrough & Live Screenshots

### 🖥️ 1. Dashboard & Streak Logger
The centralized dashboard offers live visual breakdowns of workplace ratios, current monthly metrics, and dynamic tracker loops. Seamlessly register your day with smart touch targets or view active streak milestones tracking WFH or Office consistencies.
```
┌────────────────────────────────────────────────────────┐
│                        DASHBOARD                       │
│  [ Office Mode ]  - 67% Office    [Streak: 2 Days]      │
│  [   WFH Mode  ]  - 33% WFH       Keep it up!           │
└────────────────────────────────────────────────────────┘
```
![Dashboard Screen](./screenshots/dashboard.jpg)

### 💰 2. Expense Audit Panel
Track and analyze all workplace transit costs, meal outlays, or work-from-home WiFi utility charges. Each log entry associates specific numeric expenditures with its matching date directly, converting your logs into precise telemetry for enterprise claims and tax season references.
```
┌────────────────────────────────────────────────────────┐
│                     EXPENSE LOGGER                     │
│  🚗 Travel Outlay: ₹500           🍔 Meal / Food: ₹250  │
│  🌐 WiFi / Mobile: ₹100                                 │
└────────────────────────────────────────────────────────┘
```
![Expense Audit](./screenshots/expenses.jpg)

### 🤖 3. Telegram Bot Settings & Live Chat ID Finder
Unlock automated message broadcasts. The Settings page houses bot configuration cards equipped with our unique **Live Chat ID Finder**. Simply insert your bot credentials and scan live updates instantly to map profile names, avoiding manual JSON parsing or API calls.
```
┌────────────────────────────────────────────────────────┐
│                    TELEGRAM SETTINGS                   │
│  Bot API Token: [••••••••••••••••••••••••••••••••••]   │
│  [ Retrieve Chat ID from Bot ]  <- Click to Auto-Fit   │
└────────────────────────────────────────────────────────┘
```
![Telegram Integration Panel](./screenshots/telegram_setup.jpg)

---

## ⚡ Core Capabilities

*   **⚡ Offline-First Resilience**: Zero telemetry, zero external servers, and zero sync wait-times. State persistence is driven by standard transaction wrappers in `Dexie.js`, safely caching logs inside the sandboxed browser environment of `IndexedDB` so you can document attendance in basement parking lots or flight cabins without cellular connection.
*   **📂 Granular Expense Auditing**: Associate detailed fiscal variables when logging your daily status. Categorize transit expenses, lunch receipts, or virtual utility outlays with support for dynamic custom currency frameworks (e.g. ₹ INR, $ USD, etc.).
*   **📢 Automated Telegram Broadcasting**: Toggle settings to deploy styled HTML telegram briefings automatically to your private terminal chats or broadcast channels every time you save an update. Ensure your team or personal record-keepers are instantly updated.
*   **🔍 Live Chat ID Finder**: Enter your API token parameters and click the dynamic lookup action. Hybrid Tracker connects directly to Telegram’s `/getUpdates` streaming endpoint, scans for incoming pings from active profiles, and presents selectable names with one-click Chat ID assignment.

---

## 📂 Directory Architecture

Here is the structured folder landscape mapping our application layout:

```text
/src
├── App.tsx                     # Main application layout, header timeline, and active view router
├── index.css                   # Global @import "tailwindcss" styling and color declarations
├── types.ts                    # Shared strict TypeScript Interfaces, Types, and System Enums
├── main.tsx                    # System bootstrapping entry point for DOM hydration
├── components/                 # Presentation and interactive UI Views
│   ├── AttendanceView.tsx      # Main workspace logger, streak counters, and expense inputs
│   └── SettingsView.tsx        # Preferences dashboard, theme triggers, and Telegram connectors
├── db/                         # Client Databases
│   └── db.ts                   # Dexie.js database core with Dexie Schema registrations
├── lib/                        # Shared utility libraries
│   └── utils.ts                # Class merge utilities (`cn`)
├── store/                      # Zustand state containers
│   ├── useAppStore.ts          # Core state manager (Syncing Dexie models with reactive components)
│   └── useNavigationStore.ts   # Screen navigation store
└── utils/                      # Helper engines
    └── telegram.ts             # REST gateway to Telegram API for status rendering and test pings
```

---

## 🛠️ Step-by-Step Installation & Boot Guide

Follow these simple instructions to initialize your local workstation:

### 1. Install System Dependencies
Install the required packages declared within `package.json` to configure the Vite build framework:
```bash
npm install
```

### 2. Boot Up the Local Server
Launch the local Hot-Module-Replacement development server on your device:
```bash
npm run dev
```
Explore the workspace live at `http://localhost:3000`.

### 3. Compile Production Bundle
Build the applet into an optimized, self-contained single-page dynamic production format:
```bash
npm run build
```
The static file server assets are populated securely inside the `/dist` directory, fully primed for platform deployment.

---

## 🤖 Telegram Bot Configuration Quick-Start Checklist

Need to enable automated tracking notifications? Streamline your setup with this quick reference checklist:

1.  **Generate Your Bot**: Start a direct conversation with Telegram’s official [@BotFather](https://t.me/BotFather) and issue `/newbot`.
2.  **Retrieve Bot Token**: Complete BotFather's instructions to fetch your personal identifier token (similar to `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).
3.  **Initiate Chat**: Search for your newborn bot by its custom handle inside Telegram and select `[Start]` or dispatch an introductory text like `"hello"`.
4.  **Save Credentials**: Navigate to the **Settings** section of Hybrid Tracker, paste your unique token inside the **Bot API Token** input field, and save your preferences.
5.  **Let the App Scan**: Click **Retrieve Chat ID from Bot**. Locate your account name from the scanned list, click **Use ID**, and watch as your configuration is auto-filled instantly.
6.  **Verify Setup**: Click the **Send Test Ping** button to dispatch a beautifully formatted dummy log entry directly to your chat interface.

---

> ⚠️ **Security & Decoupled Architecture**: All Telegram integration calls are routed directly from your browser to Telegram's secure API. Your secrets, database keys, and location coordinates are stored strictly within your browser's local sandbox, keeping your telemetry private.
