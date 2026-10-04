import FlowLayout, { contextChips } from './Layout.jsx';
import Icon from '../components/Icon.jsx';
import { getSubject, getPortion, hasPortionChoice, resolveTeacher } from '../lib/catalog.js';
import { usePresentations } from '../lib/library.js';

export default function TeacherScreen({ sel, go }) {
  const teacher = resolveTeacher(sel);
  const subject = getSubject(sel.subject);
  const portion = getPortion(sel.portion);
  const { items, loading } = usePresentations(sel, teacher?.id);

  return (
    <FlowLayout sel={sel} step="teacher" go={go} title="Teacher Assigned" chips={contextChips(sel)}>
      {teacher ? (
        <div className="teacher">
          <div className="teacher-card">
            <div className="teacher-avatar"><Icon name="user" size={88} stroke={1.5} /></div>
            <div className="teacher-info">
              <div className="teacher-name">{teacher.name}</div>
              <div className="teacher-subject">{subject.label}</div>
              {hasPortionChoice(sel.subject) && <div className="teacher-portion">{portion.label}</div>}
            </div>
          </div>
          <div className="teacher-note">
            <Icon name="shield" size={40} />
            <span>Assigned automatically from the teaching schedule. Only this teacher’s presentations for this class are shown.</span>
          </div>
          <button className="btn-primary btn-wide" onClick={go.resources}>
            <span>Open Presentations</span>
            {!loading && <span className="btn-count">{items.length}</span>}
            <Icon name="arrow" size={48} stroke={2} />
          </button>
        </div>
      ) : (
        <div className="empty">
          <Icon name="alert" size={96} />
          <h2>No teacher is assigned to this class yet</h2>
          <p>Ask the academic office to add a mapping for this portion in the teaching schedule.</p>
        </div>
      )}
    </FlowLayout>
  );
}
