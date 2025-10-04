# SFU Ride Share (Expo + React Native)

## Overview
Skeleton Expo-managed React Native project for the SFU Ride Share hackathon MVP. This initial commit wires up project tooling, navigation shells, context providers, and feature scaffolding for the core requirements (auth, live rides, scheduled rides, chat, incentives, ratings). Implementation hooks are intentionally left as TODOs to unblock rapid feature development during the build sprint.

## Structure
- `App.tsx` – Global providers, navigation container, and status bar
- `src/navigation` – Auth stack, main tab navigator, and deep linking config
- `src/contexts` – Auth + notifications context placeholders
- `src/features` – Domain modules for auth, rides, chat, incentives, ratings
- `src/services` – Firebase and API client stubs
- `src/store` – Zustand role selector placeholder
- `src/theme` – Navigation theming + future color mode support
- `src/utils` – Helpers (e.g., SFU email validation)

## Getting Started
1. Install dependencies (requires Node 18+ and npm 9+):
   ```bash
   npm install
   ```
2. Create a Firebase project and update `src/services/firebase/config.ts`.
3. Configure Expo App Links & Firebase Dynamic Links for magic-link authentication.
4. Launch the Expo dev server:
   ```bash
   npm run start
   ```

## Next Steps
- Implement Firebase auth flows (magic link, domain enforcement, recent-login checks).
- Build Firestore data models for live rides, scheduled rides, chat sessions, and ratings.
- Wire up push notifications, abuse protections, incentive calculations, and admin tooling.
- Add automated tests and CI checks once features solidify.
