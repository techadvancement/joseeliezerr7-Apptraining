# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Expo SDK 51 + Expo Router (file-based) + React Native 0.74 + React Native Web 0.19 + TypeScript (strict) + Supabase + i18next/react-i18next. Single codebase targets iOS, Android, and Web.

## Commands

```bash
npm run web         # expo start --web (http://localhost:8081)
npm run ios         # expo start --ios
npm run android     # expo start --android
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm test            # jest (preset: jest-expo)
npm test -- countries          # run a single test file by name fragment
npm run build:web   # expo export --platform web → ./dist
```

Path alias `@/*` is mapped to the repo root (see `tsconfig.json`). TypeScript explicitly **excludes `supabase/functions`** because those are Deno edge functions, not RN code.

## Big-picture architecture

### Routing & gating (`app/_layout.tsx`)

Root layout wraps everything in `GestureHandlerRootView → SafeAreaProvider → ToastProvider → AuthProvider → AuthGate → Stack`. It awaits `initI18n()` before rendering anything (renders a blank colored view until ready).

`AuthGate` is the single source of routing truth. It reconciles three states each render:
1. `session` from `useAuth()`
2. `onboarded` flag read from AsyncStorage by `hasSeenOnboarding()`
3. Current `segments` from `useSegments()`

Branches: not onboarded → `(auth)/onboarding`; onboarded + no session → `(auth)/login`; onboarded + session → `(app)`. Anything that needs to change routing belongs in this effect, not scattered in screens.

`app/(app)/_layout.tsx` is a `Tabs` layout. Routes that exist under `(app)/` but should not appear in the tab bar (`admin`, `series`, `legal`, `search`) are declared with `href: null`.

### Supabase client + mock fallback

`lib/supabase.ts` exports a singleton `supabase` client that uses **platform-specific storage**: AsyncStorage on web, expo-secure-store wrapped as `SecureStoreAdapter` on native. Don't import `@supabase/supabase-js` directly elsewhere.

`SUPABASE_CONFIGURED` and `USING_MOCKS` (in `lib/api.ts`) are real load-bearing flags: **if `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` are not set the app still boots** using `lib/mockData.ts`. Every fetcher in `lib/api.ts` branches on `hasSupabase` and returns mocks otherwise. New API functions must follow the same pattern or the app will throw when run without `.env`.

Env vars are read from `process.env.EXPO_PUBLIC_*` **or** `Constants.expoConfig.extra.{supabaseUrl,supabaseAnonKey}` (`app.json` → `expo.extra`). Either source is acceptable.

### Bilingual content model

Every content table (`videos`, `manuals`, `video_categories`, `series`) stores `*_en` and `*_es` columns side by side. The UI picks the field at render time based on `i18n.language`:

```ts
const title = i18n.language === 'es' ? video.title_es : video.title_en;
```

For static UI strings use `t('namespace.key')`. Both `locales/en.json` and `locales/es.json` must stay at key parity — verify with a flatten + diff before committing locale changes. i18next is configured with `compatibilityJSON: 'v4'`, so plurals use `_one`/`_other` suffixes and are looked up via `t('series.lessons', { count })`.

Language is persisted in AsyncStorage under `app.lang` (key set in `lib/i18n.ts`). System language is the initial fallback.

### Auth flow

`lib/auth.tsx` exposes `useAuth()` → `{ session, user, profile, signIn, signUp, signOut, refreshProfile, updateProfile, deleteAccount }`. When `SUPABASE_CONFIGURED` is false the provider short-circuits to a `DEMO_USER`/`DEMO_PROFILE` so the rest of the app works without a backend.

`profiles.role` (nullable `'user' | 'admin'`) gates the admin section. Real enforcement lives in Supabase RLS policies — `lib/admin.ts` is defense-in-depth only.

`lib/useAuthDeepLink.ts` is mounted inside `AuthGate` to handle OAuth + magic-link return URLs.

### Database & edge functions (`supabase/`)

`supabase/schema.sql` is the canonical schema (apply via SQL Editor). It declares: `profiles`, `video_categories`, `videos`, `manuals`, `bookmarks`, `video_notes`, `video_progress`, plus a `delete_account()` RPC, RLS policies, `updated_at` triggers, and a trigger that auto-creates a `profiles` row from `auth.users`. Note: the `series` table referenced by `lib/supabase.ts` / `lib/admin.ts` and the `role` column on `profiles` are used by app code but **are not in the committed `schema.sql`** — confirm they exist in the target Supabase project before assuming the schema is complete.

`supabase/functions/notify-new-video/` is a Deno edge function deployed separately (`supabase functions deploy notify-new-video`). Triggered by a `videos` INSERT webhook; sends Expo push notifications.

Three public storage buckets are required: `videos`, `thumbnails`, `manuals`. `lib/admin.ts` builds public URLs against `${SUPABASE_URL}/storage/v1/object/public`.

### Layout conventions

- `components/ui/Screen.tsx` is the standard page wrapper (handles safe area + padding).
- `components/Toast.tsx` provides `useToast()` — preferred over `Alert` for non-blocking feedback.
- Theme tokens live in `constants/theme.ts` (`colors`, `spacing`, `radius`, `typography`, `shadow`). Don't introduce raw hex values in screens.
- On **web only** the root view is constrained to a 520 px max-width centered column (see `RootLayout` styles). Layouts should look right inside that frame, not at full desktop width.

## Conventions worth following

- Admin screens (`app/(app)/admin/*`) and user-facing screens both use `useTranslation()` — when adding text, pick or add a key in both locale files rather than hardcoding.
- Mock data in `lib/mockData.ts` only covers the original tables (videos/manuals/categories); features added after (series, progress, notes, bookmarks) won't render usable data in mock mode.
- The web build is `metro` bundler with `output: 'single'` (see `app.json`).
