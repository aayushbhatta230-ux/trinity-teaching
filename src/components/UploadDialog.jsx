import { useState } from 'react';
import Icon from './Icon.jsx';
import { addPresentation } from '../lib/library.js';
import { ACCEPT, KINDS, detectKind, openDocument } from '../lib/documents.js';
import { formatSize, titleFromFileName } from '../lib/format.js';
import { getClass, getPortion, getSubject, hasPortionChoice } from '../lib/catalog.js';
import { sectionCode } from '../data/structure.js';
import { useBackHandler } from '../lib/native.js';

const MAX_CHAPTER = 40;

/** Touch-friendly form for a teacher to add one chapter presentation (PDF, PowerPoint or text) to this board. */
export default function UploadDialog({ sel, teacher, defaultChapter, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(0);
  const [slides, setSlides] = useState([]);
  const [kind, setKind] = useState('pdf');
  const [title, setTitle] = useState('');
  const [chapter, setChapter] = useState(Math.min(defaultChapter, MAX_CHAPTER));
  const [status, setStatus] = useState({ busy: false, error: '' });

  const subject = getSubject(sel.subject);
  const where = [
    hasPortionChoice(sel.subject) ? `${subject.label} › ${getPortion(sel.portion).label}` : subject.label,
    getClass(sel.cls).label,
  ].join(' · ');

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setStatus({ busy: true, error: '' });
    try {
      const k = await detectKind(f);
      const doc = await openDocument({ kind: k, file: f });
      setPages(doc.numPages);
      // Slide text lets Ask AI search and navigate this presentation.
      setSlides(await doc.extractSlides());
      doc.destroy();
      setKind(k);
      setFile(f);
      if (!title) setTitle(titleFromFileName(f.name));
      setStatus({ busy: false, error: '' });
    } catch (err) {
      setFile(null);
      setStatus({ busy: false, error: err?.forUser ? err.message : 'This file could not be opened. It may be damaged or password-protected.' });
    }
  };

  const save = async () => {
    setStatus({ busy: true, error: '' });
    try {
      await addPresentation(
        sel,
        {
          teacher: teacher.id,
          chapter,
          title: title.trim(),
          pages,
          slides,
          kind,
        },
        file
      );
      onSaved();
    } catch (err) {
      const full = err?.name === 'QuotaExceededError';
      setStatus({ busy: false, error: full ? 'The board is out of storage space. Remove old presentations and try again.' : 'Saving failed. Please try again.' });
    }
  };

  useBackHandler(true, () => { if (!status.busy) onClose(); });

  const canSave = file && title.trim() && !status.busy;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="upload-title">
      <div className="dialog">
        <div className="dialog-head">
          <div>
            <h2 id="upload-title">Add presentation</h2>
            <p>{sectionCode(sel.cls, sel.shift, sel.section)} · {where} · {teacher.name}</p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><Icon name="close" size={44} /></button>
        </div>

        <div className="dialog-body">
          <label className={`file-drop ${file ? 'has-file' : ''}`}>
            <input type="file" accept={ACCEPT} onChange={pick} disabled={status.busy} />
            <Icon name={file ? 'pdf' : 'upload'} size={64} stroke={1.6} />
            {file ? (
              <span className="file-drop-text">
                <b>{file.name}</b>
                <span>{KINDS[kind].label} · {pages} {kind === 'txt' ? (pages === 1 ? 'page' : 'pages') : (pages === 1 ? 'slide' : 'slides')} · {formatSize(file.size)} · tap to choose a different file</span>
              </span>
            ) : (
              <span className="file-drop-text">
                <b>{status.busy ? 'Reading file…' : 'Choose a file'}</b>
                <span>PDF, PowerPoint (.pptx) or text (.txt), from a USB drive or this board.</span>
              </span>
            )}
          </label>

          <div className="field-row">
            <div className="field">
              <span className="field-label">Chapter</span>
              <div className="stepper-input">
                <button onClick={() => setChapter((c) => Math.max(1, c - 1))} disabled={chapter <= 1} aria-label="Previous chapter number">
                  <Icon name="minus" size={40} stroke={2.25} />
                </button>
                <span className="stepper-value">{chapter}</span>
                <button onClick={() => setChapter((c) => Math.min(MAX_CHAPTER, c + 1))} disabled={chapter >= MAX_CHAPTER} aria-label="Next chapter number">
                  <Icon name="plus" size={40} stroke={2.25} />
                </button>
              </div>
            </div>
            <label className="field field-grow">
              <span className="field-label">Chapter title</span>
              <input
                className="text-input"
                value={title}
                maxLength={120}
                placeholder="e.g. Introduction to Mechanics"
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          </div>

          <div className="room-note">
            <Icon name="shield" size={36} />
            <span>Saved for classroom <b>{sectionCode(sel.cls, sel.shift, sel.section)}</b> only. Other classrooms cannot see or open it.</span>
          </div>

          {status.error && (
            <div className="dialog-error" role="alert"><Icon name="alert" size={36} /> {status.error}</div>
          )}
        </div>

        <div className="dialog-foot">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={!canSave}>
            <Icon name="check" size={44} stroke={2.25} />
            <span>{status.busy && file ? 'Saving…' : 'Save to board'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
