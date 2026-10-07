import { useState } from 'react';
import FlowLayout, { contextChips } from './Layout.jsx';
import Icon from '../components/Icon.jsx';
import UploadDialog from '../components/UploadDialog.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { getSubject, getPortion, hasPortionChoice, resolveTeacher } from '../lib/catalog.js';
import { usePresentations, deletePresentation } from '../lib/library.js';
import { formatDate, formatSize } from '../lib/format.js';
import { isNativeApp } from '../lib/native.js';

/** Chapter-wise presentations uploaded by the assigned teacher for this class. */
export default function ResourcesScreen({ sel, go }) {
  const teacher = resolveTeacher(sel);
  const { items, loading, error, reload } = usePresentations(sel, teacher?.id);
  const [uploading, setUploading] = useState(false);
  const [managing, setManaging] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const subject = getSubject(sel.subject);
  const title = hasPortionChoice(sel.subject) ? `${subject.label} › ${getPortion(sel.portion).label}` : subject.label;
  const nextChapter = items.reduce((m, p) => Math.max(m, p.chapter), 0) + 1;

  return (
    <FlowLayout
      sel={sel} step="resources" go={go} title={title} ribbon={false} tight
      chips={contextChips(sel, 'subject')}
      aside={teacher && (
        <div className="teacher-chip">
          <Icon name="user" size={34} />
          <span>{teacher.name}</span>
        </div>
      )}
    >
      {teacher && (
        <div className="library-bar">
          <h2 className="library-heading">
            Presentations <span className="library-count">{items.length}</span>
          </h2>
          <div className="library-actions">
            {items.length > 0 && (
              <button className={`btn-secondary ${managing ? 'is-on' : ''}`} onClick={() => setManaging(!managing)}>
                <Icon name={managing ? 'check' : 'settings'} size={34} />
                <span>{managing ? 'Done' : 'Manage'}</span>
              </button>
            )}
            <button className="btn-add" onClick={() => setUploading(true)}>
              <Icon name="upload" size={38} stroke={2} />
              <span>Add presentation</span>
            </button>
          </div>
        </div>
      )}

      {loading ? null : error ? (
        <div className="empty">
          <Icon name="alert" size={96} />
          <h2>This board’s storage is not available</h2>
          <p>{isNativeApp ? 'Restart the app. If this keeps happening, check that the device has free storage.' : 'Open the app in Chrome (not in a private window) to upload and view presentations.'}</p>
        </div>
      ) : items.length ? (
        <div className="files">
          {items.map((p) => (
            <button
              key={p.id}
              className={`file ${managing ? 'is-managing' : ''}`}
              onClick={() => (managing ? setToDelete(p) : go.open(p.id))}
            >
              <span className="chapter-badge">
                <span className="chapter-badge-label">Chapter</span>
                <span className="chapter-badge-num">{p.chapter}</span>
              </span>
              <span className="file-main">
                <span className="file-title">{p.title}</span>
                <span className="file-desc">
                  {p.kind === 'pptx' ? 'PowerPoint · ' : p.kind === 'txt' ? 'Text · ' : ''}{p.pages} {p.kind === 'txt' ? (p.pages === 1 ? 'page' : 'pages') : (p.pages === 1 ? 'slide' : 'slides')} · {formatSize(p.size)}
                  
                </span>
              </span>
              <span className="file-meta">
                <span>Uploaded</span>
                <span>{formatDate(p.uploadedAt)}</span>
              </span>
              <Icon name={managing ? 'trash' : 'next'} size={44} className={managing ? 'file-delete' : 'file-chevron'} />
            </button>
          ))}
        </div>
      ) : teacher ? (
        <div className="empty">
          <Icon name="presentation" size={110} stroke={1.4} />
          <h2>No presentations uploaded yet</h2>
          <p>Tap <b>Add presentation</b> to add chapter slides as PDF, PowerPoint (.pptx) or a text file.</p>
        </div>
      ) : (
        <div className="empty">
          <Icon name="alert" size={96} />
          <h2>No teacher is assigned to this class yet</h2>
        </div>
      )}

      {uploading && (
        <UploadDialog
          sel={sel}
          teacher={teacher}
          defaultChapter={nextChapter}
          onClose={() => setUploading(false)}
          onSaved={() => { setUploading(false); reload(); }}
        />
      )}
      {toDelete && (
        <ConfirmDialog
          title="Remove this presentation?"
          message={`Chapter ${toDelete.chapter} – ${toDelete.title} will be removed from this board.`}
          confirmLabel="Remove"
          onCancel={() => setToDelete(null)}
          onConfirm={async () => {
            await deletePresentation(sel, toDelete.id);
            setToDelete(null);
            reload();
          }}
        />
      )}
    </FlowLayout>
  );
}
