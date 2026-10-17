# Dev setup and testing on Android (from a Mac)

## Stage 1: start immediately (no Android SDK needed)
1. Install **Expo Go** from the Play Store on your Android phone.
2. `npx expo start` in the repo → scan the QR code with Expo Go.
   - The phone and Mac must be on the same Wi-Fi. Otherwise use `npx expo start --tunnel`.
3. Every save hot-reloads on the phone in about a second.

Expo Go is enough for UI, SQLite, i18n/RTL, prayer-time maths and simple local notifications.

## Stage 2: development build (when we need real notifications, actions and the app icon)
Expo Go can't do notification action buttons, a custom app icon/name, or some native config.
That calls for a **development build**, which is your own app containing the Expo dev tools.

- **Cloud, easiest:** `npx eas build --profile development --platform android` → install the APK link on the phone → `npx expo start --dev-client`.
- **Local, faster loop:** install Android Studio and JDK 17, enable USB debugging on the phone,
  plug it in → `npx expo run:android`.
  ```
  brew install --cask android-studio zulu@17
  # Android Studio → SDK Manager → install the SDK + platform-tools
  # ~/.zshrc: export ANDROID_HOME=$HOME/Library/Android/sdk; export PATH=$PATH:$ANDROID_HOME/platform-tools
  ```
- **Emulator (optional):** Android Studio → Device Manager → a Pixel device with an **arm64** system image (Apple Silicon).
  Good for testing other screen sizes and Android versions.

## Stage 3: real-world testing before release
- Notifications: test with the screen locked, Doze/battery saver on, and after a reboot.
  On Samsung/Xiaomi, check the "battery optimization" exemption.
- Play Console ($25 one-time) → **Internal testing** (instant, up to 100 testers) →
  **Closed testing: 12 testers opted in for 14 days**, required for new personal accounts before production.
  Start recruiting testers (family, friends, a mosque group) early.

## Automated tests
- Unit: the estimate formula, ledger maths and plan projection (Jest). These are pure functions and the highest value.
- E2E later: Maestro flows (onboarding, log + undo).

## Notes from setting this up on this Mac (Oct 2026)
- SDK: `~/Library/Android/sdk`, with platform 37.0, build-tools 37.0.0, NDK 27.1.12297006, emulator image `android-36;google_apis;arm64-v8a` (AVD `qadaa_pixel`)
- JDK: `brew install openjdk@17`; export `JAVA_HOME=/opt/homebrew/opt/openjdk@17`
- On this network GitHub downloads time out, so Gradle was fetched from a mirror and **verified against the official SHA-256**; `android/` (generated, gitignored) points the wrapper to `~/Library/Android/gradle-9.4.1-bin.zip`. Re-running `expo prebuild` resets it.
- Fast dev build for the emulator: `cd android && ./gradlew app:assembleDebug -PreactNativeArchitectures=arm64-v8a`
- Run: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk && adb reverse tcp:8081 tcp:8081 && npx expo start`
