/**
 * The board's presentation library: chapter presentations uploaded by teachers,
 * stored in this browser's IndexedDB so they stay available offline and when the
 * app is opened straight from disk.
 *
 * Record shape:
 *   { id, teacher, cls, portion, shift, group, sections, chapter, title,
 *     fileName, size, pages, uploadedAt, file: Blob }
 * Morning and Day are separate: a presentation only ever shows in the shift (and group)
 * it was uploaded for. `sections: null` means every section of that shift and group;
 * an array limits it to those sections.
 */
import { useCallback, useEffect, useState } from 'react';

const DB_NAME = 'trinity-library';
const STORE = 'presentations';
let dbPromise;

function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const s = req.result.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('byTeacherClassPortion', ['teacher', 'cls', 'portion']);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

const tx = async (mode, fn) => {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error('Storage transaction aborted'));
  });
};

const newId = () => `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Presentations for this exact selection and its assigned teacher, ordered by chapter. */
export async function listPresentations(sel, teacherId) {
  const all = await tx('readonly', (s) => s.index('byTeacherClassPortion').getAll([teacherId, sel.cls, sel.portion]));
  return all
    .filter((p) => p.shift === sel.shift && p.group === sel.group && (!p.sections || p.sections.includes(sel.section)))
    .map(({ file, ...meta }) => meta) // keep lists light; the file is loaded when opened
    .sort((a, b) => a.chapter - b.chapter || a.uploadedAt - b.uploadedAt);
}

export const getPresentation = (id) => tx('readonly', (s) => s.get(id));

export async function addPresentation(meta, file) {
  const record = { ...meta, id: newId(), fileName: file.name, size: file.size, uploadedAt: Date.now(), file };
  await tx('readwrite', (s) => s.put(record));
  // Ask the browser not to evict the library when the disk gets full.
  navigator.storage?.persist?.().catch(() => {});
  return record.id;
}

export const deletePresentation = (id) => tx('readwrite', (s) => s.delete(id));

/** React hook: the list for a selection, with a reload function after uploads/deletes. */
export function usePresentations(sel, teacherId) {
  const [state, setState] = useState({ loading: true, items: [], error: null });
  const key = `${teacherId}|${sel.cls}|${sel.portion}|${sel.shift}|${sel.group}|${sel.section}`;
  const reload = useCallback(() => {
    if (!teacherId) { setState({ loading: false, items: [], error: null }); return; }
    listPresentations(sel, teacherId)
      .then((items) => setState({ loading: false, items, error: null }))
      .catch((error) => setState({ loading: false, items: [], error }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(reload, [reload]);
  return { ...state, reload };
}
