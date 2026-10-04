# Trinity Teaching Resources

Touchscreen classroom application for **Trinity International College**, Dillibazar Height, Kathmandu.
It is built for the Hikvision interactive teaching boards and also works on tablets and phones.

**Flow:** Class → Shift → Group → Section → Subject → (Portion) → Teacher (assigned automatically) → Resources → Viewer

## Running it

### On a board or PC, with nothing installed

Run `npm run build` once, then copy **`dist/index.html`** to the board and open it in Chrome.
It is one self-contained file: scripts, styles and fonts are all inlined, so it runs straight from disk (`file://`) or a USB stick, with no server and no internet.

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

## Design

- **Brand:** the Trinity gold (`#FEAD17`) and crimson knot mark, the cream background (`#FFDFB6`) and the Trajan-style serif wordmark, matching the college's official channels.
  - The mark is redrawn as SVG in `src/components/Logo.jsx` and `public/icon.svg`.
  - Swap in the official artwork files there if the college provides them.
- **Fonts:** Cinzel for the wordmark, Poppins for the interface, Noto Sans Devanagari for Nepali, and Caveat for handwritten notes. All fonts are bundled.
- **Responsive layout:** sizes are in `rem`, and the root font size follows the screen.
  - A 1920×1080 board gets the reference size and a 4K board scales up.
  - Tablets and phones get layouts that reflow; the breakpoints are at the end of the app section in `src/styles.css`.

## Changing the data (no code changes needed)

| What | File |
|---|---|
| Classes, shifts, groups, sections per shift, subjects per group, portions | `src/data/structure.js` |
| Teachers and **who teaches what** | `src/data/teachers.js` |
| Resources (sample generator, plus where to add real files) | `src/data/resources.js` |
| Sample lesson content used for the generated slides and PDFs | `src/data/curriculum.js` |
| College name, tagline, idle timeout | `src/data/institution.js` |

### Teachers

Teacher names are placeholders, such as "Physics Teacher 1", until the academic office supplies the real schedule. Replace the `name` values in `src/data/teachers.js`.

Each rule in `ASSIGNMENTS` maps a portion to a teacher, and `where` can narrow a rule:

```js
{ portion: 'math.analytical', teacher: 'T-MA1', where: { sections: ['A', 'B', 'C', 'D'] } },
{ portion: 'math.analytical', teacher: 'T-MA2', where: { sections: ['E', 'F', 'G', 'H'] } },
{ portion: 'phy.mechanics',   teacher: 'T-PM' },
```

`where` can use `cls`, `shift`, `group` and `sections`. If several rules match, the most specific one wins. See `resolveTeacher()` in `src/lib/catalog.js`.

### Resources

Every resource has `scope: { teacher, cls, portion, shift?, group?, sections? }`. The Resources screen shows only resources whose scope matches the current selection **and** the assigned teacher.

To add real files, put them in `public/files/…` and list them in `MANUAL_RESOURCES`:

- **Presentations and PDFs:** export the pages as images and list them, e.g. `pages: [{ image: 'files/x/01.png' }, …]`.
- **Videos:** set `src: 'files/x/lecture.mp4'`.

## Viewer

The viewer is read-only on purpose. It has no editing, pen, annotation or highlighting tools.

- Previous and Next buttons, a page grid, and thumbnails
- Swipe to change page, double-tap to zoom
- Zoom from Fit up to 300%, and full screen
- Keyboard and presentation clickers: ← → PgUp PgDn, + −, F

## Kiosk behaviour

- The selection screens return to Home after 3 minutes without input. The viewer never times out.
- Long-press menus and pinch-zooming the whole interface are turned off.
