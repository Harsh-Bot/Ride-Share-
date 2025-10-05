# SFU Ride Share (Expo + React Native)

## Overview
Expo-managed React Native app for the SFU Ride Share hackathon MVP. The project now includes a functional Home experience with campus selectors, sign-in profile capture, and comprehensive testing scaffolding (Jest + React Native Testing Library + Playwright) to accelerate future backend integration.

## Structure
- `App.tsx` – Global providers, navigation container, status bar
- `src/navigation` – Auth stack, main tab navigator, deep linking config
- `src/features` – Domain modules (auth, rides, chat, incentives, ratings, home)
- `src/store` – Zustand stores (profile state, role placeholders)
- `src/services` – Firebase stubs plus API placeholders for profile/maps integrations
- `src/theme` – Navigation theming + future color mode support
- `src/utils` – Helpers (e.g., SFU email validation)
- `playwright` – Web e2e specs (skipped until Expo web server available)

## Key Features
- **Home Tab (formerly “Map”)**
  - Header illustration (`assets/images/homepage.png`)
  - Greeting sourced from profile nickname (`Hey, <nickname>!`)
  - Role toggle (`Driver` / `Rider`) persisted in `useRoleStore`
  - Free-form origin address input + destination campus selector (Burnaby or Surrey)
  - Quick actions to LiveRide & ScheduledRides that carry role/origin/destination context downstream (backend TODOs)
- **Sign-In Enhancements**
  - Captures nickname (2–20 chars) and gender preference (male/female/rather not say)
  - Stores profile data in `useProfileStore` (in-memory; AsyncStorage TODO)
  - Continues existing SFU email verification flow
- **API Placeholders**
  - `src/services/api/profile.ts` & `maps.ts` throw explicit TODO errors for backend wiring

## Testing & Tooling
- **Unit / Integration**: Jest (via `jest-expo`) + React Native Testing Library
  - Coverage threshold set to 80%+ in `jest.config.js`
  - Store, Home, Sign-In, navigation, and API stubs all covered
- **E2E (Web)**: Playwright specs (`npm run test:e2e` uses `--reporter=list`)
  - Tests default to `skip` unless `PLAYWRIGHT_BASE_URL` is provided (e.g., Expo web dev server)
- **CI**: `.github/workflows/test.yml` runs lint, typecheck, Jest, and Playwright suites

## Keyboard Avoidance
- Use `KeyboardSafe` (`src/components/layout/KeyboardSafe.tsx`) to ensure inputs and primary CTAs remain reachable when the on-screen keyboard opens.
- Props:
  - `scroll` — wrap content in a `ScrollView` for long forms (Sign-In uses this)
  - `keyboardVerticalOffset` — additional offset for iOS headers
  - `contentContainerStyle` — style for the inner container
  - `testID` — testing identifier
- iOS uses `behavior="padding"`; Android uses `behavior="height"`.

## Icons
- Tab bar icons use Material Icons via `@expo/vector-icons/MaterialIcons`.
- Current mapping (`src/navigation/MainTabs.tsx`):
  - Home → `home`
  - LiveRides → `directions-car`
  - ScheduledRides → `query-builder`
  - Chat → `chat`
  - Profile → `account-box`

## Scripts
```bash
npm install        # install dependencies
npm run start      # launch Expo dev server (Metro)
npm run lint       # eslint on all TS/TSX files
npm run typecheck  # strict TypeScript check (no emit)
npm test           # Jest test suite
npm run test:ci    # Jest in CI mode
npm run test:e2e   # Playwright (requires running Expo web; reporter=list)
```

## Firebase Emulator Setup
1. Copy `.env.example` to `.env.local` (or `.env`) and adjust values as needed.
   - Replace `127.0.0.1` in the emulator host entries with your computer's LAN IP when testing on a physical device so Expo Go can reach the emulators.
2. Start the Firebase emulators locally:
   ```bash
   npx firebase emulators:start --only auth,firestore,functions
   ```
   (The Playwright test harness auto-starts emulators when missing.)
3. Launch Expo with a clean cache so the environment changes take effect:
   ```bash
   npx expo start -c
   ```

The app now reads emulator host config from `EXPO_PUBLIC_*` environment variables or `expo.extra.firebase` values produced by `app.config.js`. Firestore, Auth, and Functions automatically connect to emulators whenever those values are present.

## Assets
- `assets/images/homepage.png` – Home tab header illustration
- `assets/images/logo.png` – App icon/splash
- `assets/images/welcome-illustration.png` – Welcome screen art

## TODOs / Next Steps
- Hook profile nickname/gender to backend (Firebase) and persist with AsyncStorage
- Replace campus selectors with Google Places Autocomplete & directions APIs
- Pass rider/driver context when navigating to LiveRide/ScheduledRides
- Flesh out LiveRide/ScheduledRides map experience with Expo Maps / Google Maps SDK
