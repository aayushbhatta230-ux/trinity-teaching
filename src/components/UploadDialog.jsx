import { useState } from 'react';
import Icon from './Icon.jsx';
import { addPresentation } from '../lib/library.js';
import { openPdf, isPdf } from '../lib/pdf.js';
import { formatSize, titleFromFileName } from '../lib/format.js';
import { getClass, getPortion, getSubject, hasPortionChoice } from '../lib/catalog.js';
import { sectionCode } from '../data/structure.js';

const MAX_CHAPTER = 40;
const userError = (message) => Object.assign(new Error(message), { forUser: true });

/** Touch-friendly form for a teacher to add one chapter presentation (PDF) to this board. */
export default function UploadDialog({ sel, teacher, defaultChapter, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(0);
  const [title, setTitle] = useState('');
  const [chapter, setChapter] = useState(Math.min(defaultChapter, MAX_CHAPTER));
  const [scope, setScope] = useState('all');
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
      if (/\.pptx?$/i.test(f.name)) {
        throw userError('This is a PowerPoint file. In PowerPoint choose File → Save As → PDF, then upload the PDF.');
      }
      if (!(await isPdf(f))) throw userError('This file is not a PDF. Please choose a PDF file.');
      const doc = await openPdf(f);
      setPages(doc.numPages);
      doc.destroy();
      setFile(f);
      if (!title) setTitle(titleFromFileName(f.name));
      setStatus({ busy: false, error: '' });
    } catch (err) {
      setFile(null);
      setStatus({ busy: false, error: err?.forUser ? err.message : 'This PDF could not be opened. It may be damaged or password-protected.' });
    }
  };

  const save = async () => {
    setStatus({ busy: true, error: '' });
    try {
      await addPresentation(
        {
          teacher: teacher.id,
          cls: sel.cls,
          portion: sel.portion,
          shift: sel.shift,
          group: sel.group,
          sections: scope === 'section' ? [sel.section] : null,
          chapter,
          title: title.trim(),
          pages,
        },
        file
      );
      onSaved();
    } catch (err) {
      const full = err?.name === 'QuotaExceededError';
      setStatus({ busy: false, error: full ? 'The board is out of storage space. Remove old presentations and try again.' : 'Saving failed. Please try again.' });
    }
  };

  const canSave = file && title.trim() && !status.busy;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="upload-title">
      <div className="dialog">
        <div className="dialog-head">
          <div>
            <h2 id="upload-title">Add presentation</h2>
            <p>{where} · {teacher.name}</p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><Icon name="close" size={44} /></button>
        </div>

        <div className="dialog-body">
          <label className={`file-drop ${file ? 'has-file' : ''}`}>
            <input type="file" accept="application/pdf,.pdf" onChange={pick} disabled={status.busy} />
            <Icon name={file ? 'pdf' : 'upload'} size={64} stroke={1.6} />
            {file ? (
              <span className="file-drop-text">
                <b>{file.name}</b>
                <span>{pages} {pages === 1 ? 'slide' : 'slides'} · {formatSize(file.size)} · tap to choose a different file</span>
              </span>
            ) : (
              <span className="file-drop-text">
                <b>{status.busy ? 'Reading file…' : 'Choose PDF file'}</b>
                <span>From a USB drive or this board. In PowerPoint use File → Save As → PDF.</span>
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

          <div className="field">
            <span className="field-label">Show to</span>
            <div className="segmented">
              <button className={scope === 'all' ? 'is-active' : ''} onClick={() => setScope('all')}>
                All my sections of {getClass(sel.cls).label}
              </button>
              <button className={scope === 'section' ? 'is-active' : ''} onClick={() => setScope('section')}>
                Only Section {sel.section} ({sectionCode(sel.cls, sel.shift, sel.section)})
              </button>
            </div>
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
