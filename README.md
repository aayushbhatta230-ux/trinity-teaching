# Trinity Teaching Resources

Touchscreen classroom application for **Trinity International College**, Dillibazar Height, Kathmandu.
It is built for the Hikvision interactive teaching boards and also works on tablets and phones.

**Flow:** Class → Shift → Group → Section → Subject → (Portion) → Teacher (assigned automatically) → Chapter presentations → Viewer

## Running it

### On a board or PC, with nothing installed

Run `npm run build` once, then copy **`dist/index.html`** to the board and open it in Chrome.
It is one self-contained file: scripts, styles, fonts, logo and the PDF renderer are all inlined, so it runs straight from disk (`file://`) or a USB stick, with no server and no internet.

### As an installable Chrome app

Serve the `dist/` folder over http(s), for example from the college intranet, or locally with:

```bash
npm start
```

Chrome then offers **Install app**. The installed app opens full-screen and keeps working offline after the first load.

### For development

```bash
npm install
npm run dev
```

## Presentations

The app shows only **chapter presentations uploaded by teachers**. There is no sample or demo content.

### Uploading

1. Go to the class, section, subject and portion.
2. On the Presentations screen, tap **Add presentation**.
3. Choose the PDF, for example from a USB drive.
4. Set the chapter number and title.
5. Choose **All my sections** or **Only this section**, then tap **Save to board**.

- **Format:** PDF only. In PowerPoint use **File → Save As → PDF**. Choosing a `.pptx` file shows this instruction instead of uploading.
- **Where files are stored:** on the board, in Chrome's own storage (IndexedDB). They work offline and from disk.
  - Each board keeps its own library, so upload on every board where the presentation is needed.
  - Clearing Chrome's site data for the app removes the uploads.
- **Removing files:** tap **Manage**, then tap a presentation to remove it. The app asks for confirmation first.
- **Who sees what:** a presentation shows only for its class and portion, and only while that teacher is assigned to it. If it was uploaded for "Only this section", it shows only in that section.

### Viewer

The viewer is read-only on purpose. It has no editing, pen, annotation or highlighting tools.

- Uploaded PDFs are rendered with Mozilla pdf.js, which is bundled into the app.
- Previous and Next buttons, a slide grid, and thumbnails
- Swipe to change slide, double-tap to zoom
- Zoom from Fit up to 300%, and full screen
- Keyboard and presentation clickers: ← → PgUp PgDn, + −, F

## Brand

- **Logo:** the official college logo, supplied as `src/assets/brand/trinity-logo-original.png`. The app uses transparent cuts of it:
  - `trinity-mark.png`, the knot
  - `trinity-wordmark.png`, the lettering
  - `trinity-logo.png`, the full stacked logo
  - The app icons are `public/icon-192.png` and `public/icon-512.png`.
- **Colours:** sampled from the logo: crimson `#AE2F32`, gold `#FAB032`, and a cream background.
- **Fonts:** Poppins for the interface and Noto Sans Devanagari for Nepali. Both are bundled.
- **Responsive layout:** sizes are in `rem`, and the root font size follows the screen.
  - A 1920×1080 board gets the reference size and a 4K board scales up.
  - Tablets and phones get layouts that reflow.

## Changing the school data (no code changes needed)

| What | File |
|---|---|
| Classes, shifts, groups, sections per shift, subjects per group, portions | `src/data/structure.js` |
| Teachers and **who teaches what** | `src/data/teachers.js` |
| College name, tagline, idle timeout | `src/data/institution.js` |

Teacher names are placeholders, such as "Physics Teacher 1", until the academic office supplies the real schedule. Replace the `name` values only. The teacher IDs link existing uploads to their teacher.

Each rule in `ASSIGNMENTS` maps a portion to a teacher, and `where` can narrow a rule:

```js
{ portion: 'math.analytical', teacher: 'T-MA1', where: { sections: ['A', 'B', 'C', 'D'] } },
{ portion: 'math.analytical', teacher: 'T-MA2', where: { sections: ['E', 'F', 'G', 'H'] } },
{ portion: 'phy.mechanics',   teacher: 'T-PM' },
```

`where` can use `cls`, `shift`, `group` and `sections`. If several rules match, the most specific one wins. See `resolveTeacher()` in `src/lib/catalog.js`.

## Kiosk behaviour

- The selection screens return to Home after 3 minutes without input. The viewer never times out.
- Long-press menus and pinch-zooming the whole interface are turned off.
