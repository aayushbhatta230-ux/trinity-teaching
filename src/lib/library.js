/**
 * Classroom presentation storage.
 *
 * Every classroom (section code: MA1, DB2, DI1 …) has its OWN database on the device
 * ("trinity-room-MA1", "trinity-room-DB2", …). A classroom screen only ever opens its own
 * database, so a presentation uploaded in MA1 cannot be listed or opened from any other
 * classroom. To use the same file in another classroom, the teacher uploads it there too.
 *
 * Record shape:
 *   { id, room, teacher, cls, shift, group, section, portion, chapter, title,
 *     fileName, size, pages, uploadedAt, slides: [{ n, text }], file: Blob }
 */
import { useCallback, useEffect, useState } from 'react';
import { sectionCode } from '../data/structure.js';

const STORE = 'presentations';
const ROOM_PREFIX = 'trinity-room-';
const LEGACY_DB = 'trinity-library'; // before v1.1: one shared database for the whole device

/** The classroom a selection belongs to, e.g. Class 11 · Morning · A → "MA1". */
export const roomOf = (sel) => sectionCode(sel.cls, sel.shift, sel.section);

const req2promise = (r) => new Promise((resolve, reject) => {
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});

const openRoomDb = (room) => {
  const r = indexedDB.open(ROOM_PREFIX + room, 1);
  r.onupgradeneeded = () => {
    const s = r.result.createObjectStore(STORE, { keyPath: 'id' });
    s.createIndex('byTeacherPortion', ['teacher', 'portion']);
  };
  return req2promise(r);
};

const roomDbs = new Map();
const roomDb = (room) => {
  if (!roomDbs.has(room)) roomDbs.set(room, openRoomDb(room));
  return roomDbs.get(room);
};

async function tx(room, mode, fn) {
  await migrated;
  const d = await roomDb(room);
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error('Storage transaction aborted'));
  });
}

/**
 * One-time move from the old shared database: presentations that were saved for
 * specific sections move into those classrooms. Ones saved for "all sections" stay
 * in the old database and are no longer shown anywhere (they are not deleted).
 */
const migrated = (async () => {
  try {
    const r = indexedDB.open(LEGACY_DB);
    let fresh = false;
    r.onupgradeneeded = () => { fresh = true; r.transaction.abort(); };
    const legacy = await req2promise(r).catch(() => null);
    if (!legacy || fresh || !legacy.objectStoreNames.contains(STORE)) { legacy?.close(); return; }
    const all = await req2promise(legacy.transaction(STORE).objectStore(STORE).getAll());
    for (const rec of all) {
      if (!Array.isArray(rec.sections) || !rec.sections.length) continue;
      for (const section of rec.sections) {
        const room = sectionCode(rec.cls, rec.shift, section);
        const d = await roomDb(room);
        const { sections, ...rest } = rec;
        await new Promise((resolve, reject) => {
          const t = d.transaction(STORE, 'readwrite');
          t.objectStore(STORE).put({ ...rest, section, room });
          t.oncomplete = resolve; t.onerror = () => reject(t.error);
        });
      }
      await new Promise((resolve) => {
        const t = legacy.transaction(STORE, 'readwrite');
        t.objectStore(STORE).delete(rec.id);
        t.oncomplete = resolve; t.onerror = resolve;
      });
    }
    legacy.close();
  } catch {
    // Migration problems must never block the app.
  }
})();

const newId = () => `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** This classroom's presentations for its assigned teacher and portion, ordered by chapter. */
export async function listPresentations(sel, teacherId) {
  const all = await tx(roomOf(sel), 'readonly', (s) => s.index('byTeacherPortion').getAll([teacherId, sel.portion]));
  return all
    .filter((p) => p.cls === sel.cls)
    .map(({ file, slides, ...meta }) => meta) // keep lists light; the file is loaded when opened
    .sort((a, b) => a.chapter - b.chapter || a.uploadedAt - b.uploadedAt);
}

/** A presentation from THIS classroom only (undefined if it belongs elsewhere). */
export const getPresentation = (sel, id) => tx(roomOf(sel), 'readonly', (s) => s.get(id));

export async function addPresentation(sel, meta, file) {
  const room = roomOf(sel);
  const record = {
    ...meta,
    id: newId(),
    room,
    cls: sel.cls,
    shift: sel.shift,
    group: sel.group,
    section: sel.section,
    portion: sel.portion,
    fileName: file.name,
    size: file.size,
    uploadedAt: Date.now(),
    file,
  };
  await tx(room, 'readwrite', (s) => s.put(record));
  // Ask the browser not to evict the library when the disk gets full.
  navigator.storage?.persist?.().catch(() => {});
  return record.id;
}

/** Saves slide text for a presentation uploaded before AI search existed. */
export const saveSlides = (sel, id, slides) => tx(roomOf(sel), 'readwrite', (s) => {
  const r = s.get(id);
  r.onsuccess = () => { if (r.result) s.put({ ...r.result, slides }); };
});

export const deletePresentation = (sel, id) => tx(roomOf(sel), 'readwrite', (s) => s.delete(id));

/** React hook: this classroom's list, with a reload function after uploads/deletes. */
export function usePresentations(sel, teacherId) {
  const [state, setState] = useState({ loading: true, items: [], error: null });
  const key = `${teacherId}|${sel.cls}|${sel.portion}|${sel.shift}|${sel.group}|${sel.section}`;
  const reload = useCallback(() => {
    if (!teacherId || !sel.section) { setState({ loading: false, items: [], error: null }); return; }
    listPresentations(sel, teacherId)
      .then((items) => setState({ loading: false, items, error: null }))
      .catch((error) => setState({ loading: false, items: [], error }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(reload, [reload]);
  return { ...state, reload };
}
