# Trinity Teaching

Android classroom app for **Trinity International College**, Dillibazar Height, Kathmandu.
It is built for the Hikvision interactive teaching boards and also runs on Android tablets and phones.

**Flow:** Class → Shift → Group → Section → Subject → (Portion) → Teacher (assigned automatically) → Chapter presentations → Viewer

## The Android app

- **Full screen:** immersive mode, with the system bars hidden (swipe from the edge to show them). The screen stays on while the app is open.
- **Fully offline:** the app, fonts, logo and PDF renderer are all inside the APK.
- **Back button:** the Android Back button closes an open dialog first, then steps back through the flow, and exits from Home.
- **App ID:** `np.edu.trinity.teaching`

### Installing on a board or phone

1. Copy `release/TrinityTeaching-<version>.apk` to the device, for example by USB drive or file transfer.
2. Open it. If Android asks, allow **Install unknown apps** for your file manager.
3. Open **Trinity Teaching** from the app list.

Updates arrive inside the app (see **In-app updates** below). You only install the APK once.

### Sharing the APK over Wi-Fi

```bash
npm run share
```

This prints a link, such as `http://192.168.1.68:8080/`, and a QR code. On a phone or board connected to the same Wi-Fi, open the link or scan the code, then tap **Download for Android**.
If Windows asks whether Node.js may use the network, allow it on **Private networks**. Press Ctrl+C to stop sharing.

### Building the APK

```bash
npm install
npm run apk
```

This builds the app, copies it into the Android project (`android/`), compiles it, and writes `release/TrinityTeaching-<version>.apk`.

- **Tools needed:** JDK 21 and the Android SDK, with the Android 35 platform and build-tools 35.
  - On the original build PC they are in `%LOCALAPPDATA%\TrinityBuild` (JDK) and `%LOCALAPPDATA%\Android\Sdk` (SDK).
  - Anywhere else, set `JAVA_HOME` and `ANDROID_HOME`.
- **Android Studio:** you can also open `android/` there and choose Build → Build APK.
- **New APK builds** are only needed when the Android project itself changes. Normal changes go out as in-app updates. Before a new APK, bump `version` in `package.json`, and `versionCode` and `versionName` in `android/app/build.gradle`.

## The Windows app

The same app also ships as a Windows desktop application, with a standard setup wizard.

- **Install:** run `TrinityTeaching-Setup-<version>.exe` and follow the wizard.
  - It installs for the current user without admin rights, or for all users if you run it as administrator.
  - You can choose the install folder.
  - It creates **Desktop** and **Start menu** shortcuts, and appears in **Settings → Apps** with an uninstaller.
- **Running:** the app opens full screen. **F11** switches full screen on and off, and the **Exit** button on the home screen closes the app.
- **Offline and private:** it works fully offline. Uploaded presentations are stored in the app's own data folder and are kept when the app is updated.
- **Updates:** they arrive inside the app (see **In-app updates** below). You only run the setup once.
- **Unsigned:** the installer is not code-signed, so Windows SmartScreen may show "Windows protected your PC". Click **More info → Run anyway**. A code-signing certificate for the college would remove this warning.

### Building the installer

```bash
npm run windows
```

This writes `release/windows/TrinityTeaching-Setup-<version>.exe`.

- The desktop app shell is in `desktop/`: `main.cjs`, `preload.cjs` and `updater.cjs`.
- The installer settings are in `electron-builder.yml`.
- The icon and installer artwork are in `desktop/build/`.

For development in a desktop browser, run `npm run dev`.

## In-app updates

Installed apps (Windows and Android, 1.1.0 or newer) update themselves. There is no reinstalling, no setup wizard and no APK prompt, and uploaded presentations are kept.

### How it works

All of the app's screens and logic are one web bundle. The Windows and Android apps are thin shells around it.

1. The app checks the update channel when it starts and every 6 hours. A teacher can also tap **Check for updates** on the home screen.
2. When a newer version exists, the app downloads it in the background and checks its SHA-256 fingerprint.
3. It saves the update inside its own storage, and the home screen shows **Update ready — Restart now**.
4. Tapping it switches to the new version immediately. Otherwise the app switches the next time it starts.
5. **Windows safety net:** if a downloaded version fails to start within 20 seconds, the app goes back to the version that came with the install and does not try that update again.

The home screen shows the running version, for example "Version 1.1.0".

### Publishing an update

1. Raise `version` in `package.json`, for example 1.1.0 → 1.1.1.
2. Run:

   ```bash
   npm run publish-update -- -Notes "What changed"
   ```

This builds the bundle and uploads `app.html` and `update.json` to the `live` release of [trinity-teaching-app](https://github.com/aayushbhatta230-ux/trinity-teaching-app/releases/tag/live). That release is a pre-release, so the normal download links are unaffected.

- **Requirement:** the device needs internet to check for and download updates. Teaching works offline either way.
- **When a new install is still needed:** only when the Windows or Android shell changes, that is `desktop/*.cjs` or the `android/` project.
  - In that case, publish with `-MinShell <new version>` and build new installers.
  - Older apps then show "Version X needs a new install of the app" instead of updating.

## Presentations

The app shows only **chapter presentations uploaded by teachers**. There is no sample or demo content.

### Uploading

1. Go to the class, section, subject and portion.
2. On the Presentations screen, tap **Add presentation**.
3. Choose the PDF, for example from a USB drive, Downloads or Google Drive.
4. Set the chapter number and title, then tap **Save to board**.

- **Format:** PDF only. In PowerPoint use **File → Save As → PDF**. Choosing a `.pptx` file shows this instruction instead of uploading.
- **Removing files:** tap **Manage**, then tap a presentation to remove it. The app asks for confirmation first.

### Every classroom has its own storage

Each classroom (section code: MA1, DB1, DI2 …) has its **own separate storage**, for example `trinity-room-MA1`.

- A presentation uploaded in MA1 is stored only in MA1. It cannot be listed or opened from any other classroom, including the other shift, and including its direct link.
- There is no "share with all sections" option. If a teacher wants the same PDF in another classroom, they upload it there as well.
- Within a classroom, a presentation shows only for its class and portion, and only while that teacher is assigned to it.
- Storage is on the device, inside the app's private data, and works offline. Uninstalling the app, or **Clear storage** in Android settings, removes it.
- **Older uploads (before 1.1):**
  - Uploads saved for one section move into that classroom's storage automatically.
  - Uploads saved with the old "all sections" option are no longer shown anywhere. They are kept in the old shared database, not deleted. Re-upload them in each classroom that needs them.

### Viewer

The viewer is read-only on purpose. It has no editing, pen, annotation or highlighting tools.

- Uploaded PDFs are rendered with Mozilla pdf.js, which is bundled into the app.
- Previous and Next buttons, a slide grid, and thumbnails
- Swipe to change slide, double-tap to zoom
- Zoom from Fit up to 300%
- **Full Screen** hides the header and thumbnails.
- Keyboard and presentation clickers: ← → PgUp PgDn, + −, F

## Brand

- **Logo:** the official college logo, supplied as `src/assets/brand/trinity-logo-original.png`. The app uses transparent cuts of it:
  - `trinity-mark.png`, the knot
  - `trinity-wordmark.png`, the lettering
  - `trinity-logo.png`, the full stacked logo
- **Android icons and splash screens:** generated from the official mark and logo, in `android/app/src/main/res/mipmap-*` and `drawable*/splash.png`.
- **Colours:** sampled from the logo: crimson `#AE2F32`, gold `#FAB032`, and a cream background.
- **Fonts:** Poppins for the interface and Noto Sans Devanagari for Nepali. Both are bundled.
- **Screen sizes:** the layout adapts from phones to 4K boards.

## Changing the school data

| What | File |
|---|---|
| Classes, shifts, groups, sections per shift, subjects per group, portions | `src/data/structure.js` |
| Teachers and **who teaches what** | `src/data/teachers.js` |
| College name, tagline, idle timeout | `src/data/institution.js` |

Rebuild the APK after changing any of these.

Teacher names are placeholders, such as "Physics Teacher 1", until the academic office supplies the real schedule. Replace the `name` values only. The teacher IDs link existing uploads to their teacher.

Each rule in `ASSIGNMENTS` maps a portion to a teacher, and `where` can narrow a rule:

```js
{ portion: 'math.algebra',  teacher: 'T-MAL' },
// Split one portion between two teachers by section:
{ portion: 'phy.mechanics', teacher: 'T-PM',  where: { sections: ['A', 'B', 'C', 'D'] } },
{ portion: 'phy.mechanics', teacher: 'T-PM2', where: { sections: ['E', 'F', 'G', 'H'] } },
```

`where` can use `cls`, `shift`, `group` and `sections`. If several rules match, the most specific one wins. See `resolveTeacher()` in `src/lib/catalog.js`.

## Kiosk behaviour

- The selection screens return to Home after 3 minutes without input. This is paused while a dialog is open. The viewer never times out.
- Long-press menus and pinch-zooming the whole interface are turned off.
