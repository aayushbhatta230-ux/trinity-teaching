import { useMemo, useState } from 'react';
import FlowLayout, { contextChips } from './Layout.jsx';
import Icon from '../components/Icon.jsx';
import { RESOURCE_TYPES } from '../data/resources.js';
import { getSubject, getPortion, hasPortionChoice, resolveTeacher, resourcesFor } from '../lib/catalog.js';

export const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const formatSize = (mb) => (mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(mb * 1024)} KB`);

export default function ResourcesScreen({ sel, go }) {
  const teacher = resolveTeacher(sel);
  const all = useMemo(() => (teacher ? resourcesFor(sel, teacher.id) : []), [sel, teacher]);
  const [tab, setTab] = useState('all');
  const tabs = [{ id: 'all', label: 'All' }, ...RESOURCE_TYPES].map((t) => ({
    ...t, count: t.id === 'all' ? all.length : all.filter((r) => r.type === t.id).length,
  }));
  const shown = tab === 'all' ? all : all.filter((r) => r.type === tab);

  const subject = getSubject(sel.subject);
  const title = hasPortionChoice(sel.subject) ? `${subject.label} › ${getPortion(sel.portion).label}` : subject.label;

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
      <div className="tabs" role="tablist">
        {tabs.filter((t) => t.id === 'all' || t.count > 0).map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            <span className="tab-count">{t.count}</span>
          </button>
        ))}
      </div>
      {shown.length ? (
        <div className="files">
          {shown.map((r) => (
            <button key={r.id} className="file" onClick={() => go.open(r.id)}>
              <span className={`file-icon type-${r.type}`}>
                <Icon name={r.type} size={52} stroke={1.6} />
                <span className="file-ext">{r.ext.toUpperCase()}</span>
              </span>
              <span className="file-main">
                <span className="file-title">{r.title}</span>
                <span className="file-desc">{r.description}</span>
              </span>
              <span className="file-meta">
                <span>{formatDate(r.date)}</span>
                <span>{formatSize(r.sizeMB)}</span>
              </span>
              <Icon name="next" size={44} className="file-chevron" />
            </button>
          ))}
        </div>
      ) : (
        <div className="empty">
          <Icon name="other" size={96} />
          <h2>No resources uploaded yet</h2>
          <p>Nothing has been shared for this class and portion.</p>
        </div>
      )}
    </FlowLayout>
  );
}
