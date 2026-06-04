# 🌌 LifeVault

**Your private, 100% offline personal command center. No cloud, no tracking. All your data stays on this device.**

LifeVault is a highly polished, mobile-first Progressive Web App (PWA) designed to help you manage important life events, office attendance, and daily tasks—all while keeping your data absolutely secure and localized.

Built with a stunning **Elegant Dark Glassmorphism** design theme, it feels like a native app and works seamlessly without an internet connection.

---

## ✨ Core Features

*   **100% Offline-First:** Powered by IndexedDB. Zero cloud databases. Zero telemetry.
*   **Progressive Web App (PWA):** Installable on iOS and Android. Fast startup and offline availability.
*   **Smart Calendar System:** Track birthdays, anniversaries, office reporting days, and custom family events with beautiful visual indicators.
*   **Office Attendance Tracker:** Log your work days (Office, WFH, Leave, Holiday). Visualize your streaks, monthly percentages, and view a detailed calendar heatmap.
*   **Daily Action Tracker:** A streamlined checklist to keep you focused on your daily goals with a satisfying visual progress bar.
*   **Premium Glassmorphism UI:** Frosted glass cards, smooth rendering, elegant dark mode, and intentional spacing.
*   **Total Data Ownership:** Export your entire vault to a JSON backup and restore it anytime.
*   **Localization (India):** Real-time device clock tailored to the `Asia/Kolkata` timezone with a customizable 12H/24H format switcher.

---

## 🛠️ Technology Stack

*   **Frontend Framework:** React 19 + TypeScript + Vite
*   **Styling:** Tailwind CSS (Modern v4)
*   **Local Database:** IndexedDB via `dexie` & `dexie-react-hooks`
*   **State Management:** `zustand` (with LocalStorage persistence for user preferences)
*   **Date & Time:** `date-fns` for precise calendar mathematics
*   **Data Visualization:** `recharts` for attendance tracking pies and charts
*   **Icons:** `lucide-react`
*   **PWA:** `vite-plugin-pwa` generating Workbox service workers

---

## 🚀 Getting Started (Development)

To run LifeVault locally:

### 1. Install dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
```
Once built, you can serve the `dist/` directory using any static file server.

---

## 🔒 Privacy & Architecture Philosophy

* **Privacy is a Default, Not a Feature.** No authentication, no registration, no backend servers.
* **Resilience:** The application architecture is designed such that even if the host server goes down, installed PWAs will continue to function flawlessly.
* **No Tech-Larping:** LifeVault prioritizes human readability over complex logging.

---

*Built with LifeVault Framework v2.4 (React/Tailwind Architecture)*
