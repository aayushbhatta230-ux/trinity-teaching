import { useState } from 'react';
import Icon from './Icon.jsx';
import { useBackHandler } from '../lib/native.js';

export default function ConfirmDialog({ title, message, confirmLabel = 'OK', onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  useBackHandler(true, () => { if (!busy) onCancel(); });
  return (
    <div className="overlay" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="dialog dialog-sm">
        <div className="dialog-body confirm-body">
          <Icon name="alert" size={72} />
          <h2 id="confirm-title">{title}</h2>
          <p>{message}</p>
        </div>
        <div className="dialog-foot">
          <button className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button
            className="btn-primary btn-danger"
            disabled={busy}
            onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}
          >
            <Icon name="trash" size={40} />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
