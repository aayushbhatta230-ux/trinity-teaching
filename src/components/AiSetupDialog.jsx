/**
 * Board setup for AI (opened by pressing and holding the logo on the home screen).
 * Also shows this screen's details, which help when a board displays the app oddly.
 */
import { useState } from 'react';
import Icon from './Icon.jsx';
import { getAiConfig, isBuiltInAi, normaliseUrl, setAiConfig, testAiConfig } from '../lib/ai.js';
import { useBackHandler } from '../lib/native.js';
import { WEB_VERSION } from '../lib/updates.js';

function deviceInfo() {
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return [
    ['App version', WEB_VERSION],
    ['Window', `${window.innerWidth} × ${window.innerHeight}`],
    ['Screen', `${window.screen?.width} × ${window.screen?.height} @ ${window.devicePixelRatio || 1}x`],
    ['Text size', `${root.toFixed(1)}px`],
    ['Browser', navigator.userAgent],
  ];
}

export default function AiSetupDialog({ onClose }) {
  const saved = getAiConfig();
  const [url, setUrl] = useState(saved?.url || '');
  const [code, setCode] = useState(saved?.code || '');
  const [status, setStatus] = useState({ busy: false, message: '', ok: false });
  useBackHandler(true, () => { if (!status.busy) onClose(); });

  const save = async () => {
    const cfg = { url: normaliseUrl(url), code: code.trim() };
    setStatus({ busy: true, message: 'Connecting…', ok: false });
    try {
      const h = await testAiConfig(cfg);
      setAiConfig(cfg);
      setStatus({
        busy: false, ok: true,
        message: `Connected. ${h.pastQuestions} past questions in the bank.${h.demo ? ' (Server is in demo mode.)' : ''}`,
      });
    } catch (e) {
      setStatus({ busy: false, ok: false, message: e.message });
    }
  };

  const custom = !isBuiltInAi();
  const reset = () => {
    setAiConfig(null);
    const c = getAiConfig();
    setUrl(c?.url || ''); setCode(c?.code || '');
    setStatus({ busy: false, ok: !!c, message: c ? 'This board uses the college AI server built into the app.' : 'AI is off on this board.' });
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="ai-setup-title">
      <div className="dialog">
        <div className="dialog-head">
          <div>
            <h2 id="ai-setup-title">AI setup for this board</h2>
            <p>The college AI server is built into the app. Change it here only if IT asks you to.</p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><Icon name="close" size={44} /></button>
        </div>
        <div className="dialog-body">
          <label className="field">
            <span className="field-label">AI server address</span>
            <input className="text-input" value={url} placeholder="trinity-ai.example.workers.dev" autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">School access code</span>
            <input className="text-input" type="password" value={code} autoComplete="off" onChange={(e) => setCode(e.target.value)} />
          </label>
          {status.message && (
            <div className={status.ok ? 'room-note' : 'dialog-error'} role="status">
              <Icon name={status.ok ? 'check' : 'alert'} size={36} /> <span>{status.message}</span>
            </div>
          )}
          <details className="device-info">
            <summary>Screen details (for support)</summary>
            <dl>{deviceInfo().map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          </details>
        </div>
        <div className="dialog-foot">
          {saved && custom && <button className="btn-secondary" onClick={reset} disabled={status.busy}>Use college server</button>}
          <button className="btn-primary" onClick={save} disabled={!url.trim() || !code.trim() || status.busy}>
            <Icon name="check" size={44} stroke={2.25} /><span>{status.busy ? 'Connecting…' : 'Save and test'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
